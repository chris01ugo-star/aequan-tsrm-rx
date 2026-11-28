import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import type { RoomGeometryState } from "@/types/rx";
import type { StudioLook } from "@/lib/room3dMaterials";

export type PhantomRig = {
  /** Rig ruotato da decubito, proiezione e rotazione assiale. Origine locale: T7. */
  patient: THREE.Group;
  /** Contenitore del corpo. Un `.glb` esterno, se presente, viene aggiunto qui. */
  patientBody: THREE.Group;
  skinMeshes: THREE.Mesh[];
  torso: THREE.Mesh;
  gown: THREE.Object3D;
  skeleton: THREE.Group;
  lungs: THREE.Object3D;
  scapL: THREE.Object3D;
  scapR: THREE.Object3D;
  armL: THREE.Object3D;
  armR: THREE.Object3D;
  legL: THREE.Object3D;
  legR: THREE.Object3D;
  shankL: THREE.Object3D;
  shankR: THREE.Object3D;
  t7: THREE.Object3D;
  scapMark: THREE.Object3D;
  surfaceMarks: THREE.Object3D;
  releaseExternal: () => void;
};

type Track = (geometry: THREE.BufferGeometry) => THREE.BufferGeometry;

function mesh(track: Track, geometry: THREE.BufferGeometry, material: THREE.Material) {
  const body = new THREE.Mesh(track(geometry), material);
  body.castShadow = true;
  body.renderOrder = 2;
  return body;
}

function arm(track: Track, skin: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const deltoid = mesh(track, new THREE.SphereGeometry(4.8, 14, 12), skin);
  deltoid.scale.set(1.05, 0.85, 0.82);
  const upper = mesh(track, new THREE.CapsuleGeometry(2.55, 18, 4, 8), skin);
  upper.position.y = -13;
  const elbow = mesh(track, new THREE.SphereGeometry(2.35, 10, 8), skin);
  elbow.position.y = -23.5;
  const fore = mesh(track, new THREE.CapsuleGeometry(2.05, 16, 3, 8), skin);
  fore.position.y = -34;
  const hand = mesh(track, new THREE.BoxGeometry(3.3, 7.2, 1.5), skin);
  hand.position.set(0, -45.2, 0.2);
  const thumb = mesh(track, new THREE.BoxGeometry(1.1, 2.4, 1.1), skin);
  thumb.position.set(1.5, -42.2, 0.8);
  group.add(deltoid, upper, elbow, fore, hand, thumb);
  return group;
}

function leg(track: Track, skin: THREE.Material, side: number): { group: THREE.Group; shank: THREE.Group } {
  const group = new THREE.Group();
  group.position.set(side * 7.4, -34, 0.4);
  const thigh = mesh(track, new THREE.CapsuleGeometry(5.5, 36, 5, 10), skin);
  thigh.position.y = -22;
  const knee = mesh(track, new THREE.SphereGeometry(4.15, 12, 10), skin);
  knee.position.y = -42;
  knee.scale.set(1, 0.85, 0.95);
  const shank = new THREE.Group();
  shank.position.y = -42;
  const calf = mesh(track, new THREE.CapsuleGeometry(3.7, 34, 4, 8), skin);
  calf.position.y = -24;
  const ankle = mesh(track, new THREE.SphereGeometry(2.35, 10, 8), skin);
  ankle.position.y = -46;
  const foot = mesh(track, new THREE.BoxGeometry(6.4, 3.2, 13.5), skin);
  foot.position.set(0, -49.6, 3.6);
  shank.add(calf, ankle, foot);
  group.add(thigh, knee, shank);
  return { group, shank };
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
  const reach = 11.2 + Math.sin((index / 11) * Math.PI) * 3.4;
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(side * 1.5, y, -6.2),
    new THREE.Vector3(side * reach, y + 0.5, -1.1),
    new THREE.Vector3(side * (reach - 0.8), y - 1.4, 5.2),
    new THREE.Vector3(side * 3.6, y - 2.8, 8.2),
  ]);
  return new THREE.Mesh(track(new THREE.TubeGeometry(curve, 8, 0.3, 5, false)), bone);
}

function clavicle(track: Track, bone: THREE.Material, side: number): THREE.Mesh {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(side * 1.2, 16.4, 6.6),
    new THREE.Vector3(side * 5.2, 17.8, 5.4),
    new THREE.Vector3(side * 9.4, 16.4, 3.2),
    new THREE.Vector3(side * 13.6, 15.1, 0.8),
  ]);
  return new THREE.Mesh(track(new THREE.TubeGeometry(curve, 10, 0.46, 5, false)), bone);
}

function scapulaShape(track: Track, bone: THREE.Material, side: number): THREE.Group {
  const shape = new THREE.Shape();
  shape.moveTo(0, 6.4);
  shape.lineTo(4.8, -5.6);
  shape.lineTo(-0.3, -4.4);
  shape.lineTo(-1.7, 1.5);
  const blade = new THREE.Mesh(track(new THREE.ExtrudeGeometry(shape, { depth: 0.42, bevelEnabled: false })), bone);
  const spine = new THREE.Mesh(track(new THREE.BoxGeometry(4.4, 0.32, 0.48)), bone);
  spine.position.set(1.6, 2.2, 0.4);
  const acromion = new THREE.Mesh(track(new THREE.BoxGeometry(1.7, 0.65, 0.65)), bone);
  acromion.position.set(0.2, 6.3, 0.5);
  const group = new THREE.Group();
  group.add(blade, spine, acromion);
  group.scale.x = side;
  return group;
}

function skull(track: Track, bone: THREE.Material, socket: THREE.Material): THREE.Group {
  const group = new THREE.Group();
  const cranium = new THREE.Mesh(track(new THREE.SphereGeometry(5.1, 18, 14)), bone);
  cranium.scale.set(1.02, 1.12, 1.08);
  cranium.position.set(0, 41.5, -0.4);
  const brow = new THREE.Mesh(track(new THREE.SphereGeometry(2.1, 10, 8)), bone);
  brow.scale.set(2.4, 0.45, 0.7);
  brow.position.set(0, 43.2, 4.6);
  const jaw = new THREE.Mesh(track(new THREE.SphereGeometry(3.4, 12, 10)), bone);
  jaw.scale.set(1.35, 0.48, 0.72);
  jaw.position.set(0, 35.6, 1.6);
  const orbitL = new THREE.Mesh(track(new THREE.SphereGeometry(1.15, 10, 8)), socket);
  const orbitR = orbitL.clone();
  orbitL.position.set(-2.1, 41.6, 5.1);
  orbitR.position.set(2.1, 41.6, 5.1);
  const nose = new THREE.Mesh(track(new THREE.ConeGeometry(0.7, 2.2, 6)), bone);
  nose.position.set(0, 39.4, 6.4);
  nose.rotation.x = Math.PI / 2;
  group.add(cranium, brow, jaw, orbitL, orbitR, nose);
  return group;
}

/** Centra il modello sul bounding box e lo aggancia a `patientBody`. */
function mountPatientGlb(
  source: THREE.Object3D,
  host: THREE.Group,
  procedural: THREE.Object3D,
  track: Track,
  owned: THREE.Material[],
) {
  const box = new THREE.Box3().setFromObject(source);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = 175 / Math.max(size.y, 0.001);
  source.scale.setScalar(scale);
  source.position.copy(center).multiplyScalar(-scale);
  source.traverse((node) => {
    const item = node as THREE.Mesh;
    if (!item.isMesh) return;
    track(item.geometry);
    const material = item.material;
    if (Array.isArray(material)) material.forEach((entry) => owned.push(entry));
    else owned.push(material);
  });
  procedural.visible = false;
  host.add(source);
}

function loadExternalPatient(host: THREE.Group, procedural: THREE.Object3D, track: Track, owned: THREE.Material[]) {
  let cancelled = false;
  if (typeof window !== "undefined") {
    fetch("/models/patient.glb", { method: "HEAD" })
      .then((response) => {
        if (cancelled || !response.ok) return;
        const loader = new GLTFLoader();
        loader.load(
          "/models/patient.glb",
          (gltf) => {
            if (cancelled) return;
            mountPatientGlb(gltf.scene, host, procedural, track, owned);
          },
          undefined,
          () => {
            procedural.visible = true;
          },
        );
      })
      .catch(() => {
        procedural.visible = true;
      });
  }
  return () => {
    cancelled = true;
  };
}

/** Fantoccio a figura intera, 175 cm, origine locale su T7. */
export function createPhantom(look: StudioLook, track: Track): PhantomRig {
  const patient = new THREE.Group();
  patient.rotation.order = "YXZ";
  const patientBody = new THREE.Group();
  patient.add(patientBody);
  const procedural = new THREE.Group();
  patientBody.add(procedural);
  const owned: THREE.Material[] = [];

  const profile = [
    [12.4, -42],
    [15.2, -32],
    [12.4, -20],
    [13.8, -6],
    [15.6, 6],
    [16.8, 14],
    [14.2, 20],
    [6.6, 26],
  ].map(([radius, y]) => new THREE.Vector2(radius, y));
  const torso = mesh(track, new THREE.LatheGeometry(profile, 24), look.fresnelSkin);
  torso.scale.z = 0.7;

  const neck = mesh(track, new THREE.CapsuleGeometry(4.35, 6.5, 4, 10), look.fresnelSkin);
  neck.position.set(0, 29.5, -0.2);

  const head = new THREE.Group();
  const headProfile = [
    [2.2, 49.2],
    [5.4, 47.2],
    [7.1, 43.5],
    [7.3, 39.5],
    [6.2, 36.2],
    [6.8, 34.2],
    [4.2, 32.4],
  ].map(([radius, y]) => new THREE.Vector2(radius, y));
  const cranium = mesh(track, new THREE.LatheGeometry(headProfile, 20), look.fresnelSkin);
  cranium.scale.z = 0.86;
  const brow = mesh(track, new THREE.SphereGeometry(1.5, 10, 8), look.fresnelSkin);
  brow.scale.set(3.1, 0.45, 0.7);
  brow.position.set(0, 43.6, 5.4);
  const jaw = mesh(track, new THREE.SphereGeometry(2.4, 12, 10), look.fresnelSkin);
  jaw.scale.set(2.1, 0.7, 1.05);
  jaw.position.set(0, 34.6, 2.4);
  const nose = mesh(track, new THREE.SphereGeometry(0.85, 10, 8), look.fresnelSkin);
  nose.scale.set(0.75, 1.1, 1.35);
  nose.position.set(0, 39.4, 6.8);
  const earGeo = track(new THREE.SphereGeometry(1.15, 8, 6));
  const earL = new THREE.Mesh(earGeo, look.fresnelSkin);
  const earR = new THREE.Mesh(earGeo, look.fresnelSkin);
  earL.scale.set(0.45, 1, 0.7);
  earR.scale.set(0.45, 1, 0.7);
  earL.position.set(-7.1, 41.2, 0);
  earR.position.set(7.1, 41.2, 0);
  earL.castShadow = true;
  earR.castShadow = true;
  earL.renderOrder = 2;
  earR.renderOrder = 2;
  head.add(cranium, brow, jaw, nose, earL, earR);

  const gownProfile = [
    [13.2, -40],
    [16.4, -30],
    [13.6, -18],
    [15.2, -4],
    [17.6, 8],
    [18.2, 15],
    [12.4, 19],
  ].map(([radius, y]) => new THREE.Vector2(radius, y));
  const gown = mesh(track, new THREE.LatheGeometry(gownProfile, 20), look.gown);
  gown.scale.z = 0.74;
  gown.visible = false;
  gown.castShadow = true;

  const skinMeshes: THREE.Mesh[] = [];
  const collect = (root: THREE.Object3D) => {
    root.traverse((node) => {
      const item = node as THREE.Mesh;
      if (item.isMesh && item.material === look.fresnelSkin) skinMeshes.push(item);
    });
  };

  const armL = arm(track, look.fresnelSkin);
  const armR = arm(track, look.fresnelSkin);
  const leftLeg = leg(track, look.fresnelSkin, -1);
  const rightLeg = leg(track, look.fresnelSkin, 1);
  procedural.add(torso, neck, head, gown, armL, armR, leftLeg.group, rightLeg.group);
  collect(procedural);

  const surface = new THREE.Group();
  const bump = (x: number, y: number, z: number, s = 0.55) => {
    const mark = new THREE.Mesh(track(new THREE.SphereGeometry(s, 8, 6)), look.examSkin);
    mark.position.set(x, y, z);
    surface.add(mark);
  };
  bump(0, 16.8, 9.4, 0.5);
  bump(-7.2, 15.6, 6.4, 0.42);
  bump(7.2, 15.6, 6.4, 0.42);
  bump(0, -4, 9.2, 0.38);
  bump(0, 22, -7.6, 0.48);
  procedural.add(surface);

  const skeleton = new THREE.Group();
  procedural.add(skeleton);
  skeleton.add(skull(track, look.bone, look.anthracite));
  for (let i = 0; i < 7; i += 1) skeleton.add(vertebra(track, look.bone, 30 - i * 1.7, 0.62));
  for (let i = 0; i < 12; i += 1) skeleton.add(vertebra(track, look.bone, 16.5 - i * 2.15, 0.96));
  for (let i = 0; i < 5; i += 1) skeleton.add(vertebra(track, look.bone, -12 - i * 3.1, 1.18));
  for (let i = 0; i < 12; i += 1) {
    const y = 14.6 - i * 2.15;
    skeleton.add(rib(track, look.bone, -1, y, i));
    skeleton.add(rib(track, look.bone, 1, y, i));
  }
  const manubrium = new THREE.Mesh(track(new THREE.BoxGeometry(3.6, 3.4, 0.85)), look.bone);
  manubrium.position.set(0, 14.8, 8.5);
  const sternalBody = new THREE.Mesh(track(new THREE.BoxGeometry(2.15, 11, 0.75)), look.bone);
  sternalBody.position.set(0, 7.2, 8.7);
  const xiphoid = new THREE.Mesh(track(new THREE.BoxGeometry(0.7, 2.1, 0.45)), look.bone);
  xiphoid.position.set(0, 0.6, 8.8);
  skeleton.add(manubrium, sternalBody, xiphoid, clavicle(track, look.bone, -1), clavicle(track, look.bone, 1));

  const scapL = scapulaShape(track, look.bone, -1);
  const scapR = scapulaShape(track, look.bone, 1);
  skeleton.add(scapL, scapR);

  const trachea = new THREE.Mesh(track(new THREE.CylinderGeometry(0.7, 0.55, 14, 8)), look.bone);
  trachea.position.set(0, 18, 1.4);
  const lungs = new THREE.Group();
  const lungL = new THREE.Mesh(track(new THREE.SphereGeometry(1, 18, 14)), look.lung);
  const lungR = new THREE.Mesh(track(new THREE.SphereGeometry(1, 18, 14)), look.lung);
  lungL.scale.set(6.2, 12.4, 7.2);
  lungR.scale.set(6.8, 13.2, 7.4);
  lungL.position.set(6.2, 1.4, 0.4);
  lungR.position.set(-6.5, 0.6, 0.1);
  const heart = new THREE.Mesh(track(new THREE.SphereGeometry(1, 16, 12)), look.heart);
  heart.scale.set(5.2, 6.4, 4.5);
  heart.position.set(2.1, -1.6, 3.1);
  lungs.add(trachea, lungL, lungR, heart);
  lungs.renderOrder = 1;
  skeleton.add(lungs);

  const t7 = new THREE.Mesh(track(new THREE.SphereGeometry(0.5, 8, 6)), look.mark);
  t7.position.set(0, 0, -10.2);
  const scapMark = new THREE.Mesh(track(new THREE.SphereGeometry(0.4, 8, 6)), look.mark);
  scapMark.position.set(11, 2, -9.4);
  procedural.add(t7, scapMark);

  const cancelLoad = loadExternalPatient(patientBody, procedural, track, owned);

  return {
    patient,
    patientBody,
    skinMeshes,
    torso,
    gown,
    skeleton,
    lungs,
    scapL,
    scapR,
    armL,
    armR,
    legL: leftLeg.group,
    legR: rightLeg.group,
    shankL: leftLeg.shank,
    shankR: rightLeg.shank,
    t7,
    scapMark,
    surfaceMarks: surface,
    releaseExternal: () => {
      cancelLoad();
      owned.forEach((material) => material.dispose());
      owned.length = 0;
    },
  };
}

/** Pose di braccia, gambe, scapole e respiro. Non sposta il rig: ci pensa la sala. */
export function posePhantom(rig: PhantomRig, state: RoomGeometryState, training: boolean, skin: THREE.Material): void {
  rig.skinMeshes.forEach((item) => {
    item.material = skin;
  });
  rig.torso.visible = training;
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
    rig.armL.position.set(-6, 30, 1);
    rig.armR.position.set(6, 30, 1);
    rig.armL.rotation.set(2.7, 0, 0.25);
    rig.armR.rotation.set(2.7, 0, -0.25);
  } else if (supine) {
    rig.armL.position.set(-17.5, 12, 1);
    rig.armR.position.set(17.5, 12, 1);
    rig.armL.rotation.set(0.12, 0, 0.18);
    rig.armR.rotation.set(0.12, 0, -0.18);
  } else if (rolled) {
    rig.armL.position.set(-15.5, 13, 6);
    rig.armR.position.set(15.5, 13, 6);
    rig.armL.rotation.set(1.05, 0.15, 0.55);
    rig.armR.rotation.set(1.05, -0.15, -0.55);
  } else {
    rig.armL.position.set(-16.5, 14, 0.5);
    rig.armR.position.set(16.5, 14, 0.5);
    rig.armL.rotation.set(0.08, 0, 0.14);
    rig.armR.rotation.set(0.08, 0, -0.14);
  }
  rig.legL.rotation.set(supine ? -0.18 : 0, 0, supine ? 0.04 : 0);
  rig.legR.rotation.set(supine ? -0.18 : 0, 0, supine ? -0.04 : 0);
  rig.shankL.rotation.set(supine ? 0.42 : 0, 0, 0);
  rig.shankR.rotation.set(supine ? 0.42 : 0, 0, 0);
  rig.scapL.position.set(rolled ? -15.5 : -11.2, 8, rolled ? -4.2 : -9.2);
  rig.scapR.position.set(rolled ? 15.5 : 11.2, 8, rolled ? -4.2 : -9.2);
  rig.scapL.rotation.set(0.2, rolled ? 0.9 : 0.25, rolled ? 0.35 : 0);
  rig.scapR.rotation.set(0.2, rolled ? -0.9 : -0.25, rolled ? -0.35 : 0);
}
