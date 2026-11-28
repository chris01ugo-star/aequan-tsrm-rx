import * as THREE from "three";
import { createEquipment } from "@/lib/room3dEquipment";
import { createStudioLook } from "@/lib/room3dMaterials";
import { createPhantom, posePhantom } from "@/lib/room3dPhantom";
import { DEFAULT_HABITUS, toRoomGeometry } from "@/lib/rxGeometry";
import type { Technique } from "@/types/rx";

export type RoomMode = "training" | "exam";

const AP_CM = DEFAULT_HABITUS.apDiameterCm;
const LAT_CM = DEFAULT_HABITUS.lateralWidthCm;
const ERECT_DET = new THREE.Vector3(0, 128, 0);
const SUPINE_DET = new THREE.Vector3(0, 78, 0);

/**
 * Sala, fantoccio e fascio in centimetri. Un solo scene graph.
 * L'origine del paziente è T7. Il detettore resta fisso: la centratura
 * sposta il paziente, così campo, laser e camere restano sul piano fisico.
 */
export function createRoomScene(renderer: THREE.WebGLRenderer): {
  scene: THREE.Scene;
  update: (technique: Technique, mode: RoomMode) => void;
  dispose: () => void;
} {
  const look = createStudioLook(renderer);
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1320);
  scene.environment = look.environment.texture;
  scene.environmentIntensity = 0.55;

  const key = look.key;
  const rim = new THREE.DirectionalLight(0x6ba3de, 1.15);
  rim.position.set(180, 190, -40);
  const fill = new THREE.DirectionalLight(0xd8e2f0, 0.38);
  fill.position.set(-90, 70, 160);
  scene.add(key, rim, fill);

  const geometries: THREE.BufferGeometry[] = [];
  const track = (geometry: THREE.BufferGeometry) => {
    geometries.push(geometry);
    return geometry;
  };

  const room = createEquipment(scene, look, track);
  const phantom = createPhantom(look, track);
  scene.add(phantom.patient);

  const focal = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const detCenter = new THREE.Vector3();
  const cranial = new THREE.Vector3();
  const toward = new THREE.Vector3();
  const lat = new THREE.Vector3(1, 0, 0);
  const corner = new THREE.Vector3();
  let displayKey = "";

  const writeVertex = (array: Float32Array, index: number, point: THREE.Vector3) => {
    array[index] = point.x;
    array[index + 1] = point.y;
    array[index + 2] = point.z;
  };

  const update = (technique: Technique, mode: RoomMode) => {
    const state = toRoomGeometry(technique);
    const supine = state.decubitus === "supino";
    const training = mode === "training";
    const skin = training ? look.fresnelSkin : look.examSkin;

    room.focus.visible = training;
    room.centralRay.visible = training;
    room.stand.visible = !supine;
    room.table.visible = supine;
    detCenter.copy(supine ? SUPINE_DET : ERECT_DET);

    room.aecGroup.visible = training;
    room.aecGroup.position.copy(detCenter);
    if (supine) {
      room.aecGroup.rotation.set(Math.PI / 2, 0, 0);
      room.aecGroup.position.y = 79.5;
    } else {
      room.aecGroup.rotation.set(0, 0, 0);
      room.aecGroup.position.z = 1.6;
    }
    const setChamber = (mesh: THREE.Mesh, active: boolean) => {
      const material = mesh.material as THREE.MeshBasicMaterial;
      material.opacity = active ? 0.5 : 0.12;
      material.color.setHex(active ? 0xf8fafc : 0x6ba3de);
    };
    setChamber(room.chamberRight, technique.aecChambers.right);
    setChamber(room.chamberCenter, technique.aecChambers.center);
    setChamber(room.chamberLeft, technique.aecChambers.left);

    const aligned =
      Math.abs(state.patientRotationDeg) < 1 &&
      Math.abs(state.centeringOffsetXCm) < 0.6 &&
      Math.abs(state.centeringOffsetYCm) < 0.6;
    const led = aligned ? 0x6ba3de : 0x22c55e;
    room.led.color.setHex(led);
    room.led.emissive.setHex(led);

    if (supine) {
      cranial.set(0, 0, -1);
      toward.set(0, -1, 0);
    } else {
      cranial.set(0, 1, 0);
      toward.set(0, 0, 1);
    }
    const cc = THREE.MathUtils.degToRad(state.tubeAngulationCCDeg);
    const ml = THREE.MathUtils.degToRad(state.tubeAngulationMLDeg);
    dir
      .set(0, 0, 0)
      .addScaledVector(toward, Math.cos(cc) * Math.cos(ml))
      .addScaledVector(cranial, Math.sin(cc))
      .addScaledVector(lat, Math.sin(ml))
      .normalize();
    focal.copy(detCenter).addScaledVector(dir, -state.sidCm);
    room.tube.position.copy(focal);
    room.tube.lookAt(detCenter);

    room.column.position.set(focal.x, (focal.y + 236) / 2, focal.z);
    room.column.scale.y = Math.max(8, 236 - focal.y);

    const yaw = state.projection === "LL" ? Math.PI / 2 : state.projection === "AP" && !supine ? Math.PI : 0;
    const spin = THREE.MathUtils.degToRad(state.patientRotationDeg);
    if (supine) {
      phantom.patient.rotation.set(-Math.PI / 2, spin, 0);
      phantom.patient.position.set(state.centeringOffsetXCm, 96, state.centeringOffsetYCm);
    } else {
      const gap = state.projection === "LL" ? LAT_CM * 0.5 + 3 : AP_CM * 0.5 + 2;
      phantom.patient.rotation.set(0, yaw + spin, 0);
      phantom.patient.position.set(state.centeringOffsetXCm, detCenter.y - state.centeringOffsetYCm, -gap);
    }
    posePhantom(phantom, state, training, skin);

    const openX = 0.9 + (state.collimationWidthCm / 43) * 3.1;
    const openY = 0.9 + (state.collimationHeightCm / 43) * 2.6;
    room.bladeLeft.position.set(-openX, 0, -3.2);
    room.bladeRight.position.set(openX, 0, -3.2);
    room.bladeTop.position.set(0, openY, -3.2);
    room.bladeBottom.position.set(0, -openY, -3.2);

    const readout = `${state.sidCm}|${state.tubeAngulationCCDeg}|${state.tubeAngulationMLDeg}`;
    if (readout !== displayKey) {
      displayKey = readout;
      room.paintDisplay(state.sidCm, state.tubeAngulationCCDeg, state.tubeAngulationMLDeg);
    }

    const halfW = state.collimationWidthCm / 2;
    const halfH = state.collimationHeightCm / 2;
    const beamGeo = room.beam.geometry;
    const positions = beamGeo.attributes.position as THREE.BufferAttribute;
    const beamArray = positions.array as Float32Array;
    writeVertex(beamArray, 0, focal);
    const fieldGeo = room.field.geometry;
    const signs = [
      [1, 1],
      [-1, 1],
      [-1, -1],
      [1, -1],
    ];
    signs.forEach(([sx, sy], index) => {
      corner.copy(detCenter).addScaledVector(lat, sx * halfW).addScaledVector(cranial, sy * halfH);
      writeVertex(beamArray, (index + 1) * 3, corner);
      const fieldArray = (fieldGeo.attributes.position as THREE.BufferAttribute).array as Float32Array;
      writeVertex(fieldArray, index * 3, corner);
    });
    positions.needsUpdate = true;
    (fieldGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    const thickness = state.projection === "LL" ? LAT_CM : AP_CM;
    const entrance = focal.clone().addScaledVector(dir, Math.max(12, state.sidCm - thickness));
    const laserGeo = room.laser.geometry;
    const laserArray = (laserGeo.attributes.position as THREE.BufferAttribute).array as Float32Array;
    const arm = 9;
    writeVertex(laserArray, 0, entrance.clone().addScaledVector(lat, -arm));
    writeVertex(laserArray, 3, entrance.clone().addScaledVector(lat, arm));
    writeVertex(laserArray, 6, entrance.clone().addScaledVector(cranial, -arm));
    writeVertex(laserArray, 9, entrance.clone().addScaledVector(cranial, arm));
    (laserGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    room.laserGlow.position.copy(entrance).addScaledVector(dir, -0.8);
    room.laserGlow.lookAt(focal);

    const rayGeo = room.centralRay.geometry;
    const rayArray = (rayGeo.attributes.position as THREE.BufferAttribute).array as Float32Array;
    writeVertex(rayArray, 0, focal);
    writeVertex(rayArray, 3, detCenter);
    (rayGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  };

  const dispose = () => {
    phantom.releaseExternal();
    geometries.forEach((geometry) => geometry.dispose());
    room.dispose();
    look.dispose();
    scene.clear();
  };

  return { scene, update, dispose };
}
