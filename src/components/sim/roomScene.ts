import * as THREE from "three";
import { DEFAULT_HABITUS, toRoomGeometry } from "@/lib/rxGeometry";
import type { Technique } from "@/types/rx";

export type RoomMode = "training" | "exam";

const AP_CM = DEFAULT_HABITUS.apDiameterCm;
const LAT_CM = DEFAULT_HABITUS.lateralWidthCm;
const ERECT_DET = new THREE.Vector3(0, 128, 0);
const SUPINE_DET = new THREE.Vector3(0, 78, 0);

/**
 * Sala, fantoccio e fascio in centimetri. Un solo scene graph, aggiornato sul posto.
 * L'origine del paziente è T7.
 */
export function createRoomScene(): {
  scene: THREE.Scene;
  update: (technique: Technique, mode: RoomMode) => void;
  dispose: () => void;
} {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b1320);

  const geometries: THREE.BufferGeometry[] = [];
  const materials: THREE.Material[] = [];

  const trackGeo = (geometry: THREE.BufferGeometry) => {
    geometries.push(geometry);
    return geometry;
  };
  const trackMat = <T extends THREE.Material>(material: T) => {
    materials.push(material);
    return material;
  };

  const skinMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xcbb9a6,
      roughness: 0.82,
      metalness: 0,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
    }),
  );
  const boneMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0xe7eef5,
      roughness: 0.48,
      metalness: 0.04,
      emissive: 0x132033,
      emissiveIntensity: 0.35,
    }),
  );
  const lungMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x6ba3de,
      roughness: 0.7,
      transparent: true,
      opacity: 0.38,
      depthWrite: false,
    }),
  );
  const heartMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x8d4548,
      roughness: 0.62,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    }),
  );
  const metalMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x1e324e, roughness: 0.62, metalness: 0.18 }),
  );
  const darkMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x111d30, roughness: 0.8, metalness: 0.08 }),
  );
  const detectorMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x16253b, roughness: 0.45, metalness: 0.25 }),
  );
  const floorMat = trackMat(
    new THREE.MeshStandardMaterial({ color: 0x0b1320, roughness: 0.94, metalness: 0.02 }),
  );
  const glassMat = trackMat(
    new THREE.MeshStandardMaterial({
      color: 0x6ba3de,
      transparent: true,
      opacity: 0.16,
      roughness: 0.15,
      metalness: 0.05,
      depthWrite: false,
    }),
  );
  const beamMat = trackMat(
    new THREE.MeshBasicMaterial({
      color: 0x6ba3de,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  const fieldMat = trackMat(new THREE.LineBasicMaterial({ color: 0xf39c12 }));
  const laserMat = trackMat(new THREE.LineBasicMaterial({ color: 0xf39c12 }));
  const rayMat = trackMat(new THREE.LineBasicMaterial({ color: 0x6ba3de }));
  const markMat = trackMat(new THREE.MeshBasicMaterial({ color: 0xf39c12 }));

  scene.add(new THREE.HemisphereLight(0xf8fafc, 0x1e324e, 1.15));
  const key = new THREE.DirectionalLight(0xf8fafc, 1.45);
  key.position.set(-80, 260, -120);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0x9ec4ef, 0.55);
  fill.position.set(80, 140, 40);
  scene.add(fill);

  const floor = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(320, 280)), floorMat);
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const grid = new THREE.GridHelper(260, 26, 0x2a486d, 0x16253b);
  grid.position.y = 0.05;
  scene.add(grid);

  const ceiling = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(320, 280)), darkMat);
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 244;
  scene.add(ceiling);

  const wall = new THREE.Mesh(trackGeo(new THREE.PlaneGeometry(180, 210)), darkMat);
  wall.position.set(0, 118, 42);
  scene.add(wall);

  const stand = new THREE.Group();
  scene.add(stand);
  const column = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(8, 210, 10)), metalMat);
  column.position.set(28, 105, 8);
  stand.add(column);
  const bucky = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(52, 58, 6)), metalMat);
  bucky.position.set(0, ERECT_DET.y, 4);
  stand.add(bucky);
  const detector = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(43, 43, 1.4)), detectorMat);
  detector.position.copy(ERECT_DET);
  detector.position.z = 0.8;
  stand.add(detector);

  const chamberBox = new THREE.BoxGeometry(6.2, 10.4, 0.2);
  const chamberGeo = trackGeo(new THREE.EdgesGeometry(chamberBox));
  chamberBox.dispose();
  const chamberMat = (opacity: number) =>
    trackMat(new THREE.LineBasicMaterial({ color: 0x6ba3de, transparent: true, opacity }));
  const chamberRight = new THREE.LineSegments(chamberGeo, chamberMat(0.95));
  const chamberCenter = new THREE.LineSegments(chamberGeo, chamberMat(0.95));
  const chamberLeft = new THREE.LineSegments(chamberGeo, chamberMat(0.95));
  chamberRight.position.set(-9, -3, 0.4);
  chamberCenter.position.set(0, -7.5, 0.4);
  chamberLeft.position.set(9, -3, 0.4);
  const aecGroup = new THREE.Group();
  aecGroup.add(chamberRight, chamberCenter, chamberLeft);
  scene.add(aecGroup);

  const table = new THREE.Group();
  scene.add(table);
  const tableTop = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(210, 2.2, 78)), glassMat);
  tableTop.position.set(0, 84, 0);
  table.add(tableTop);
  const tableBucky = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(48, 2, 48)), detectorMat);
  tableBucky.position.set(0, 76, 0);
  table.add(tableBucky);
  table.visible = false;

  const rail = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(10, 6, 280)), metalMat);
  rail.position.set(0, 236, -70);
  scene.add(rail);
  const hanger = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.3, 1.3, 1, 10)), metalMat);
  scene.add(hanger);

  const tube = new THREE.Group();
  scene.add(tube);
  const housing = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(22, 18, 28)), metalMat);
  housing.position.z = -16;
  housing.layers.set(1);
  tube.add(housing);
  const collimator = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(16, 14, 10)), darkMat);
  collimator.position.z = 6;
  collimator.layers.set(1);
  tube.add(collimator);
  const focus = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(1.1, 12, 10)), markMat);
  tube.add(focus);

  const beamGeo = trackGeo(new THREE.BufferGeometry());
  beamGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(15), 3));
  beamGeo.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1]);
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.frustumCulled = false;
  scene.add(beam);

  const fieldGeo = trackGeo(new THREE.BufferGeometry());
  fieldGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(12), 3));
  const field = new THREE.LineLoop(fieldGeo, fieldMat);
  field.frustumCulled = false;
  scene.add(field);

  const laserGeo = trackGeo(new THREE.BufferGeometry());
  laserGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(12), 3));
  const laser = new THREE.LineSegments(laserGeo, laserMat);
  laser.frustumCulled = false;
  scene.add(laser);

  const rayGeo = trackGeo(new THREE.BufferGeometry());
  rayGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
  const centralRay = new THREE.Line(rayGeo, rayMat);
  centralRay.frustumCulled = false;
  scene.add(centralRay);

  const patient = new THREE.Group();
  patient.rotation.order = "YXZ";
  scene.add(patient);

  const addSkin = (geometry: THREE.BufferGeometry, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) => {
    const body = new THREE.Mesh(trackGeo(geometry), skinMat);
    body.position.set(x, y, z);
    body.scale.set(sx, sy, sz);
    patient.add(body);
    return body;
  };

  addSkin(new THREE.SphereGeometry(9, 24, 18), 0, 40, 1);
  addSkin(new THREE.CylinderGeometry(5.1, 5.6, 9, 16), 0, 28, 1);
  addSkin(new THREE.SphereGeometry(15, 28, 20), 0, 4, 0, 1.12, 1.02, 0.72);
  addSkin(new THREE.SphereGeometry(13, 24, 16), 0, -16, 0.5, 1.08, 0.86, 0.78);
  addSkin(new THREE.SphereGeometry(12, 22, 14), 0, -30, 0, 1.16, 0.62, 0.82);

  const armMat = skinMat;
  const armL = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(3.1, 24, 4, 10)), armMat);
  const armR = new THREE.Mesh(trackGeo(new THREE.CapsuleGeometry(3.1, 24, 4, 10)), armMat);
  patient.add(armL, armR);

  const skeleton = new THREE.Group();
  patient.add(skeleton);
  const spine = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(1.7, 1.7, 48, 10)), boneMat);
  spine.position.set(0, -4, -7);
  skeleton.add(spine);
  for (let i = 0; i < 12; i += 1) {
    const body = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(4.2, 2.1, 3.2)), boneMat);
    body.position.set(0, 16 - i * 3.6, -7);
    skeleton.add(body);
  }
  for (let i = 0; i < 8; i += 1) {
    const y = 14 - i * 3.3;
    for (const side of [-1, 1]) {
      const curve = new THREE.QuadraticBezierCurve3(
        new THREE.Vector3(side * 1.8, y, -5.5),
        new THREE.Vector3(side * (12.5 + i * 0.15), y + 1.2, 1.5),
        new THREE.Vector3(side * 5.5, y - 4.2, 7.2),
      );
      const rib = new THREE.Mesh(trackGeo(new THREE.TubeGeometry(curve, 8, 0.38, 5, false)), boneMat);
      skeleton.add(rib);
    }
  }
  const sternum = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(2.3, 16, 1.2)), boneMat);
  sternum.position.set(0, 6, 8.2);
  skeleton.add(sternum);
  const clavicleGeo = trackGeo(new THREE.CylinderGeometry(0.65, 0.65, 16, 8));
  const clavL = new THREE.Mesh(clavicleGeo, boneMat);
  const clavR = new THREE.Mesh(clavicleGeo, boneMat);
  clavL.position.set(-8, 15, 4.5);
  clavR.position.set(8, 15, 4.5);
  clavL.rotation.set(0.35, 0.2, Math.PI / 2.35);
  clavR.rotation.set(0.35, -0.2, -Math.PI / 2.35);
  skeleton.add(clavL, clavR);

  const scapulaGeo = trackGeo(new THREE.BoxGeometry(8.5, 13, 0.7));
  const scapL = new THREE.Mesh(scapulaGeo, boneMat);
  const scapR = new THREE.Mesh(scapulaGeo, boneMat);
  skeleton.add(scapL, scapR);

  const lungGeo = trackGeo(new THREE.SphereGeometry(1, 20, 14));
  const lungL = new THREE.Mesh(lungGeo, lungMat);
  const lungR = new THREE.Mesh(lungGeo, lungMat);
  lungL.scale.set(7.2, 12, 8);
  lungR.scale.set(7.6, 13, 8.2);
  lungL.position.set(7, 2, 0.5);
  lungR.position.set(-7.2, 1, 0.2);
  skeleton.add(lungL, lungR);
  const heart = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(1, 18, 12)), heartMat);
  heart.scale.set(6.2, 7.2, 5.4);
  heart.position.set(2.4, -2, 3.6);
  skeleton.add(heart);

  const t7 = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(2.3, 0.18, 8, 20)), markMat);
  t7.position.set(0, 0, -11.4);
  t7.rotation.x = Math.PI / 2;
  patient.add(t7);
  const notch = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.7, 10, 8)), markMat);
  notch.position.set(0, 16.5, 10.6);
  patient.add(notch);
  const scapTip = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.55, 10, 8)), markMat);
  scapTip.position.set(0, 0, -11.2);
  patient.add(scapTip);

  const focal = new THREE.Vector3();
  const dir = new THREE.Vector3();
  const detCenter = new THREE.Vector3();
  const cranial = new THREE.Vector3();
  const toward = new THREE.Vector3();
  const lat = new THREE.Vector3(1, 0, 0);
  const corner = new THREE.Vector3();

  const writeVertex = (array: Float32Array, index: number, point: THREE.Vector3) => {
    array[index] = point.x;
    array[index + 1] = point.y;
    array[index + 2] = point.z;
  };

  const update = (technique: Technique, mode: RoomMode) => {
    const state = toRoomGeometry(technique);
    const supine = state.decubitus === "supino";
    const training = mode === "training";

    skinMat.opacity = training ? 0.45 : 1;
    skinMat.depthWrite = !training;
    skeleton.visible = training;
    t7.visible = training;
    centralRay.visible = training;
    focus.visible = training;
    notch.visible = true;
    scapTip.visible = true;

    stand.visible = !supine;
    table.visible = supine;
    detCenter.copy(supine ? SUPINE_DET : ERECT_DET);
    const showAec = training && technique.exposureMode === "aec";
    aecGroup.visible = showAec;
    aecGroup.position.copy(detCenter);
    if (supine) {
      aecGroup.rotation.x = Math.PI / 2;
      aecGroup.position.y = 79.5;
    } else {
      aecGroup.rotation.x = 0;
      aecGroup.position.z = 1.6;
    }
    const setChamber = (line: THREE.LineSegments, active: boolean) => {
      const material = line.material as THREE.LineBasicMaterial;
      material.opacity = active ? 0.95 : 0.22;
      material.color.setHex(active ? 0xf8fafc : 0x6ba3de);
    };
    setChamber(chamberRight, technique.aecChambers.right);
    setChamber(chamberCenter, technique.aecChambers.center);
    setChamber(chamberLeft, technique.aecChambers.left);

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
    tube.position.copy(focal);
    tube.lookAt(detCenter);

    hanger.position.set(focal.x, (focal.y + 236) / 2, focal.z);
    hanger.scale.y = Math.max(8, 236 - focal.y);

    const yaw =
      state.projection === "LL" ? Math.PI / 2 : state.projection === "AP" && !supine ? Math.PI : 0;
    const spin = THREE.MathUtils.degToRad(state.patientRotationDeg);
    if (supine) {
      patient.rotation.set(-Math.PI / 2, spin, 0);
      patient.position.set(state.centeringOffsetXCm, 96, state.centeringOffsetYCm);
    } else {
      const gap = state.projection === "LL" ? LAT_CM * 0.5 + 3 : AP_CM * 0.5 + 2;
      patient.rotation.set(0, yaw + spin, 0);
      patient.position.set(state.centeringOffsetXCm, detCenter.y - state.centeringOffsetYCm, -gap);
    }

    const rolled = state.shouldersRolledForward;
    armL.position.set(rolled ? -19 : -17.5, rolled ? 8 : 4, rolled ? 7 : 0.5);
    armR.position.set(rolled ? 19 : 17.5, rolled ? 8 : 4, rolled ? 7 : 0.5);
    armL.rotation.set(rolled ? 0.85 : 0.12, 0, rolled ? 0.55 : 0.18);
    armR.rotation.set(rolled ? 0.85 : 0.12, 0, rolled ? -0.55 : -0.18);
    scapL.position.set(rolled ? -16.2 : -9.2, 5.5, rolled ? -5.5 : -10.4);
    scapR.position.set(rolled ? 16.2 : 9.2, 5.5, rolled ? -5.5 : -10.4);
    scapL.rotation.set(0.15, rolled ? 1.05 : 0.28, rolled ? 0.45 : 0.08);
    scapR.rotation.set(0.15, rolled ? -1.05 : -0.28, rolled ? -0.45 : -0.08);

    const halfW = state.collimationWidthCm / 2;
    const halfH = state.collimationHeightCm / 2;
    const positions = beamGeo.attributes.position as THREE.BufferAttribute;
    const beamArray = positions.array as Float32Array;
    writeVertex(beamArray, 0, focal);
    const signs = [
      [1, 1],
      [-1, 1],
      [-1, -1],
      [1, -1],
    ];
    signs.forEach(([sx, sy], index) => {
      corner
        .copy(detCenter)
        .addScaledVector(lat, sx * halfW)
        .addScaledVector(cranial, sy * halfH);
      writeVertex(beamArray, (index + 1) * 3, corner);
      const fieldArray = (fieldGeo.attributes.position as THREE.BufferAttribute).array as Float32Array;
      writeVertex(fieldArray, index * 3, corner);
    });
    positions.needsUpdate = true;
    (fieldGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    const thickness = state.projection === "LL" ? LAT_CM : AP_CM;
    const entrance = focal.clone().addScaledVector(dir, Math.max(12, state.sidCm - thickness));
    const laserArray = (laserGeo.attributes.position as THREE.BufferAttribute).array as Float32Array;
    const arm = 7;
    writeVertex(laserArray, 0, entrance.clone().addScaledVector(lat, -arm));
    writeVertex(laserArray, 3, entrance.clone().addScaledVector(lat, arm));
    writeVertex(laserArray, 6, entrance.clone().addScaledVector(cranial, -arm));
    writeVertex(laserArray, 9, entrance.clone().addScaledVector(cranial, arm));
    (laserGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;

    const rayArray = (rayGeo.attributes.position as THREE.BufferAttribute).array as Float32Array;
    writeVertex(rayArray, 0, focal);
    writeVertex(rayArray, 3, detCenter);
    (rayGeo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
  };

  const dispose = () => {
    geometries.forEach((geometry) => geometry.dispose());
    materials.forEach((material) => material.dispose());
    grid.geometry.dispose();
    const gridMaterial = grid.material;
    if (Array.isArray(gridMaterial)) gridMaterial.forEach((material) => material.dispose());
    else gridMaterial.dispose();
    scene.clear();
  };

  return { scene, update, dispose };
}
