import * as THREE from "three";
import type { RoomGeometryState } from "@/types/rx";
import type { StudioLook } from "@/lib/room3dMaterials";

export type PhantomRig = {
  /** Rig ruotato da decubito, proiezione e rotazione assiale. */
  patient: THREE.Group;
  /**
   * Corpo scolpito. Per un GLB esterno, sostituire i figli di questo gruppo
   * lasciando `patient` come unico nodo di posizionamento:
   *
   * import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
   * const gltf = await new GLTFLoader().loadAsync("/anatomy/phantom.glb");
   * patientBody.clear();
   * patientBody.add(gltf.scene);
   */
  patientBody: THREE.Group;
  skinMeshes: THREE.Mesh[];
  gown: THREE.Object3D;
  skeleton: THREE.Group;
  lungs: THREE.Object3D;
  scapL: THREE.Object3D;
  scapR: THREE.Object3D;
  armL: THREE.Object3D;
  armR: THREE.Object3D;
  t7: THREE.Object3D;
  scapMark: THREE.Object3D;
  surfaceMarks: THREE.Object3D;
};

type Track = (geometry: THREE.BufferGeometry) => THREE.BufferGeometry;

function arm(track: Track, skin: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const upper = new THREE.Mesh(track(new THREE.CapsuleGeometry(2.7, 16, 4, 8)), skin);
  upper.position.y = -8;
  const fore = new THREE.Mesh(track(new THREE.CapsuleGeometry(2.2, 14, 3, 8)), skin);
  fore.position.y = -24;
  const hand = new THREE.Mesh(track(new THREE.BoxGeometry(3.4, 6, 1.4)), skin);
  hand.position.y = -34;
  group.add(upper, fore, hand);
  return group;
}

function vertebra(track: Track, bone: THREE.Material, y: number, scale: number): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.Mesh(track(new THREE.CylinderGeometry(1, 1, 1.15, 8)), bone);
  const arch = new THREE.Mesh(track(new THREE.BoxGeometry(1.8, 0.55, 0.7)), bone);
  arch.position.z = -1.15;
  const spinous = new THREE.Mesh(track(new THREE.BoxGeometry(0.32, 0.4, 1.15)), bone);
  spinous.position.z = -1.85;
  group.add(body, arch, spinous);
  group.position.set(0, y, -7.1);
  group.scale.setScalar(scale);
  return group;
}

function rib(track: Track, bone: THREE.Material, side: number, y: number, index: number): THREE.Mesh {
  const reach = 11.5 + index * 0.18;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(side * 1.6, y, -6.2),
    new THREE.Vector3(side * reach, y + 0.4, -1.2),
    new THREE.Vector3(side * (reach - 1.2), y - 1.6, 5.4),
    new THREE.Vector3(side * 4.2, y - 3.4, 8.1),
  ]);
  return new THREE.Mesh(track(new THREE.TubeGeometry(curve, 7, 0.32, 4, false)), bone);
}

function clavicle(track: Track, bone: THREE.Material, side: number): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(side * 1.4, 16.2, 6.4),
    new THREE.Vector3(side * 5.5, 17.4, 5.2),
    new THREE.Vector3(side * 9.2, 16.2, 3.4),
    new THREE.Vector3(side * 13.2, 15.2, 1.2),
  ]);
  return new THREE.Mesh(track(new THREE.TubeGeometry(curve, 8, 0.48, 5, false)), bone);
}

function scapulaShape(track: Track, bone: THREE.Material, side: number): THREE.Group {
  const shape = new THREE.Shape();
  shape.moveTo(0, 6.2);
  shape.lineTo(4.6, -5.4);
  shape.lineTo(-0.4, -4.2);
  shape.lineTo(-1.6, 1.4);
  const geo = track(new THREE.ExtrudeGeometry(shape, { depth: 0.45, bevelEnabled: false }));
  const blade = new THREE.Mesh(geo, bone);
  const spine = new THREE.Mesh(track(new THREE.BoxGeometry(4.2, 0.35, 0.5)), bone);
  spine.position.set(1.6, 2.2, 0.4);
  const acromion = new THREE.Mesh(track(new THREE.BoxGeometry(1.6, 0.7, 0.7)), bone);
  acromion.position.set(0.2, 6.2, 0.5);
  const group = new THREE.Group();
  group.add(blade, spine, acromion);
  group.scale.x = side;
  return group;
}

/** Fantoccio scolpito, scheletro e organi. L'origine locale è T7. */
export function createPhantom(look: StudioLook, track: Track): PhantomRig {
  const patient = new THREE.Group();
  patient.rotation.order = "YXZ";
  const patientBody = new THREE.Group();
  patient.add(patientBody);

  const profile = [
    [10.4, -36],
    [14.2, -28],
    [9.6, -16],
    [12.4, -4],
    [15.6, 8],
    [14.8, 15],
    [6.2, 21],
    [4.5, 28],
    [7.4, 35],
    [8.8, 43],
    [8.3, 49],
    [5, 53],
  ].map(([radius, y]) => new THREE.Vector2(radius, y));
  const torso = new THREE.Mesh(track(new THREE.LatheGeometry(profile, 20)), look.fresnelSkin);
  torso.scale.z = 0.74;
  torso.castShadow = true;
  const nose = new THREE.Mesh(track(new THREE.SphereGeometry(1.3, 10, 8)), look.fresnelSkin);
  nose.position.set(0, 44, 6.4);
  nose.scale.set(0.7, 0.85, 1);
  const jaw = new THREE.Mesh(track(new THREE.SphereGeometry(2.2, 10, 8)), look.fresnelSkin);
  jaw.position.set(0, 39.5, 4.2);
  jaw.scale.set(1.3, 0.55, 0.7);
  const shoulderL = new THREE.Mesh(track(new THREE.SphereGeometry(5.2, 12, 10)), look.fresnelSkin);
  const shoulderR = shoulderL.clone();
  shoulderL.position.set(-12.5, 14, 0);
  shoulderR.position.set(12.5, 14, 0);
  shoulderL.scale.set(1.1, 0.7, 0.75);
  shoulderR.scale.set(1.1, 0.7, 0.75);
  const skinMeshes: THREE.Mesh[] = [torso, nose, jaw, shoulderL, shoulderR];
  skinMeshes.forEach((mesh) => {
    mesh.renderOrder = 2;
  });
  patientBody.add(torso, nose, jaw, shoulderL, shoulderR);

  const gown = new THREE.Mesh(track(new THREE.CylinderGeometry(12.4, 11.2, 22, 16)), look.gown);
  gown.position.set(0, -16, 0.4);
  gown.scale.z = 0.78;
  gown.visible = false;
  patientBody.add(gown);

  const armL = arm(track, look.fresnelSkin);
  const armR = arm(track, look.fresnelSkin);
  armL.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.renderOrder = 2;
    skinMeshes.push(mesh);
  });
  armR.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    mesh.renderOrder = 2;
    skinMeshes.push(mesh);
  });
  patientBody.add(armL, armR);

  const surface = new THREE.Group();
  const bump = (x: number, y: number, z: number, s = 0.7) => {
    const mesh = new THREE.Mesh(track(new THREE.SphereGeometry(s, 8, 6)), look.examSkin);
    mesh.position.set(x, y, z);
    surface.add(mesh);
  };
  bump(0, 18.2, 9.2, 0.55);
  bump(-6, 16.4, 7.2, 0.45);
  bump(6, 16.4, 7.2, 0.45);
  bump(0, -2, 9.4, 0.4);
  bump(0, 20, -8.2, 0.5);
  patientBody.add(surface);

  const skeleton = new THREE.Group();
  patientBody.add(skeleton);
  for (let i = 0; i < 4; i += 1) skeleton.add(vertebra(track, look.bone, 22 - i * 2.1, 0.72));
  for (let i = 0; i < 12; i += 1) skeleton.add(vertebra(track, look.bone, 14 - i * 2.5, 1));
  for (let i = 0; i < 12; i += 1) {
    const y = 13.2 - i * 2.35;
    skeleton.add(rib(track, look.bone, -1, y, i));
    skeleton.add(rib(track, look.bone, 1, y, i));
  }
  const manubrium = new THREE.Mesh(track(new THREE.BoxGeometry(3.4, 3.2, 0.9)), look.bone);
  manubrium.position.set(0, 15.2, 8.4);
  const sternalBody = new THREE.Mesh(track(new THREE.BoxGeometry(2.2, 10, 0.8)), look.bone);
  sternalBody.position.set(0, 8, 8.5);
  const xiphoid = new THREE.Mesh(track(new THREE.BoxGeometry(0.8, 2.2, 0.5)), look.bone);
  xiphoid.position.set(0, 1.6, 8.7);
  skeleton.add(manubrium, sternalBody, xiphoid, clavicle(track, look.bone, -1), clavicle(track, look.bone, 1));

  const scapL = scapulaShape(track, look.bone, -1);
  const scapR = scapulaShape(track, look.bone, 1);
  skeleton.add(scapL, scapR);

  const trachea = new THREE.Mesh(
    track(new THREE.CylinderGeometry(0.55, 0.55, 8, 6)),
    look.bone,
  );
  trachea.position.set(0, 12, 2.2);
  const lungs = new THREE.Group();
  const lungL = new THREE.Mesh(track(new THREE.SphereGeometry(1, 16, 12)), look.lung);
  const lungR = new THREE.Mesh(track(new THREE.SphereGeometry(1, 16, 12)), look.lung);
  lungL.scale.set(6.4, 11, 7);
  lungR.scale.set(6.8, 12, 7.2);
  lungL.position.set(6.4, 2, 0.6);
  lungR.position.set(-6.6, 1.2, 0.2);
  const heart = new THREE.Mesh(track(new THREE.SphereGeometry(1, 14, 10)), look.heart);
  heart.scale.set(5.4, 6.2, 4.6);
  heart.position.set(2.2, -1.4, 3.2);
  const aorta = new THREE.Mesh(track(new THREE.TorusGeometry(2.2, 0.45, 6, 12, Math.PI)), look.heart);
  aorta.position.set(0.4, 8.5, 2.4);
  aorta.rotation.z = Math.PI;
  lungs.add(trachea, lungL, lungR, heart, aorta);
  lungs.renderOrder = 1;
  skeleton.add(lungs);

  const t7 = new THREE.Mesh(track(new THREE.SphereGeometry(0.55, 8, 6)), look.mark);
  t7.position.set(0, 0, -10.2);
  const scapMark = new THREE.Mesh(track(new THREE.SphereGeometry(0.45, 8, 6)), look.mark);
  scapMark.position.set(11, 2, -9.4);
  patientBody.add(t7, scapMark);

  return {
    patient,
    patientBody,
    skinMeshes,
    gown,
    skeleton,
    lungs,
    scapL,
    scapR,
    armL,
    armR,
    t7,
    scapMark,
    surfaceMarks: surface,
  };
}

/** Pose di braccia, scapole e respiro. Non sposta il rig: ci pensa la sala. */
export function posePhantom(rig: PhantomRig, state: RoomGeometryState, training: boolean, skin: THREE.Material): void {
  rig.skinMeshes.forEach((mesh) => {
    mesh.material = skin;
  });
  rig.gown.visible = !training;
  rig.skeleton.visible = training;
  rig.t7.visible = training;
  rig.scapMark.visible = training;
  rig.surfaceMarks.visible = !training;
  const breath = state.respiration === "apnea_inspiratoria" ? 1.08 : state.respiration === "apnea_espiratoria" ? 0.9 : 1;
  rig.lungs.scale.set(1, breath, 1);

  const supine = state.decubitus === "supino";
  const lateral = state.projection === "LL";
  const rolled = state.shouldersRolledForward && !supine && !lateral;
  if (lateral) {
    rig.armL.position.set(-8, 28, 2);
    rig.armR.position.set(8, 28, 2);
    rig.armL.rotation.set(2.6, 0, 0.35);
    rig.armR.rotation.set(2.6, 0, -0.35);
  } else if (supine) {
    rig.armL.position.set(-16, 2, 1);
    rig.armR.position.set(16, 2, 1);
    rig.armL.rotation.set(0.15, 0, 0.08);
    rig.armR.rotation.set(0.15, 0, -0.08);
  } else if (rolled) {
    rig.armL.position.set(-15, 6, 8);
    rig.armR.position.set(15, 6, 8);
    rig.armL.rotation.set(0.9, 0.2, 0.7);
    rig.armR.rotation.set(0.9, -0.2, -0.7);
  } else {
    rig.armL.position.set(-16.5, 4, 1);
    rig.armR.position.set(16.5, 4, 1);
    rig.armL.rotation.set(0.2, 0, 0.12);
    rig.armR.rotation.set(0.2, 0, -0.12);
  }
  rig.scapL.position.set(rolled ? -15.5 : -10.5, 6, rolled ? -4.2 : -9.6);
  rig.scapR.position.set(rolled ? 15.5 : 10.5, 6, rolled ? -4.2 : -9.6);
  rig.scapL.rotation.set(0.2, rolled ? 0.9 : 0.25, rolled ? 0.35 : 0);
  rig.scapR.rotation.set(0.2, rolled ? -0.9 : -0.25, rolled ? -0.35 : 0);
}
