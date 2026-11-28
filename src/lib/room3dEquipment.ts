import * as THREE from "three";
import { createHeadDisplay, type StudioLook } from "@/lib/room3dMaterials";

const ERECT_Y = 128;

export type RoomEquipment = {
  stand: THREE.Group;
  table: THREE.Group;
  tube: THREE.Group;
  column: THREE.Group;
  aecGroup: THREE.Group;
  chamberRight: THREE.Mesh;
  chamberCenter: THREE.Mesh;
  chamberLeft: THREE.Mesh;
  beam: THREE.Mesh;
  field: THREE.LineLoop;
  laser: THREE.LineSegments;
  laserGlow: THREE.Mesh;
  centralRay: THREE.Line;
  focus: THREE.Mesh;
  bladeLeft: THREE.Mesh;
  bladeRight: THREE.Mesh;
  bladeTop: THREE.Mesh;
  bladeBottom: THREE.Mesh;
  led: THREE.MeshStandardMaterial;
  paintDisplay: (sid: number, cc: number, ml: number) => void;
  grid: THREE.GridHelper;
  dispose: () => void;
};

type Track = (geometry: THREE.BufferGeometry) => THREE.BufferGeometry;

function box(track: Track, size: [number, number, number], material: THREE.Material, x: number, y: number, z: number) {
  const mesh = new THREE.Mesh(track(new THREE.BoxGeometry(size[0], size[1], size[2])), material);
  mesh.position.set(x, y, z);
  return mesh;
}

/** Sala, stativo, lettino, sospensione e fascio. Le pose arrivano da `roomScene`. */
export function createEquipment(scene: THREE.Scene, look: StudioLook, track: Track): RoomEquipment {
  const extras: THREE.Material[] = [];
  const extraTextures: THREE.Texture[] = [];
  const own = <T extends THREE.Material>(material: T) => {
    extras.push(material);
    return material;
  };

  const floor = new THREE.Mesh(track(new THREE.PlaneGeometry(420, 360)), look.floor);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const grid = new THREE.GridHelper(400, 8, 0x2a486d, 0x1e324e);
  grid.position.y = 0.08;
  scene.add(grid);
  const axisGeo = track(new THREE.BufferGeometry());
  axisGeo.setAttribute(
    "position",
    new THREE.BufferAttribute(new Float32Array([0, 0.12, -160, 0, 0.12, 40]), 3),
  );
  scene.add(new THREE.Line(axisGeo, new THREE.LineBasicMaterial({ color: 0x2a486d })));
  extras.push((scene.children[scene.children.length - 1] as THREE.Line).material as THREE.Material);

  const stripMat = own(new THREE.MeshStandardMaterial({ color: 0x2a486d, roughness: 0.6, metalness: 0.2 }));
  scene.add(box(track, [400, 0.4, 1.2], stripMat, 0, 0.2, 170));
  scene.add(box(track, [400, 0.4, 1.2], stripMat, 0, 0.2, -170));
  scene.add(box(track, [1.2, 0.4, 340], stripMat, 200, 0.2, 0));
  scene.add(box(track, [1.2, 0.4, 340], stripMat, -200, 0.2, 0));

  const ceiling = new THREE.Mesh(
    track(new THREE.PlaneGeometry(420, 360)),
    own(new THREE.MeshStandardMaterial({ color: 0x101a2a, roughness: 0.9, metalness: 0.05 })),
  );
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.y = 248;
  scene.add(ceiling);

  const wallMat = own(new THREE.MeshStandardMaterial({ color: 0x16253b, roughness: 0.86, metalness: 0.04 }));
  const back = new THREE.Mesh(track(new THREE.PlaneGeometry(280, 230)), wallMat);
  back.position.set(0, 118, 52);
  back.receiveShadow = true;
  scene.add(back);

  const control = new THREE.Group();
  control.position.set(-188, 0, -20);
  scene.add(control);
  const sideWall = new THREE.Mesh(track(new THREE.PlaneGeometry(220, 230)), wallMat);
  sideWall.rotation.y = Math.PI / 2;
  sideWall.position.y = 118;
  control.add(sideWall);
  const frame = box(track, [2.2, 78, 118], look.brushed, 1.2, 132, 0);
  control.add(frame);
  const glass = new THREE.Mesh(track(new THREE.PlaneGeometry(108, 68)), look.leadGlass);
  glass.rotation.y = Math.PI / 2;
  glass.position.set(2.4, 132, 0);
  glass.renderOrder = 3;
  control.add(glass);
  const consoleDesk = box(track, [16, 8, 70], look.anthracite, -10, 96, 0);
  const monitor = box(track, [2, 22, 36], look.screen, -16, 118, 0);
  control.add(consoleDesk, monitor);
  const lamp = new THREE.Mesh(track(new THREE.BoxGeometry(3, 8, 28)), look.lamp);
  lamp.position.set(3, 176, 78);
  control.add(lamp);

  const stand = new THREE.Group();
  scene.add(stand);
  const column = box(track, [9, 214, 12], look.brushed, 30, 107, 10);
  column.castShadow = true;
  const guide = box(track, [2.2, 188, 1.4], look.anthracite, 24.2, 110, 10);
  const carriage = box(track, [46, 8, 10], look.medicalWhite, 4, ERECT_Y, 6);
  carriage.castShadow = true;
  const frameDet = box(track, [48, 48, 4], look.anthracite, 0, ERECT_Y, 3.2);
  const detector = new THREE.Mesh(track(new THREE.BoxGeometry(43, 43, 0.8)), look.detectorFace);
  detector.position.set(0, ERECT_Y, 1.1);
  const ledMat = own(
    new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 1.15,
      roughness: 0.35,
    }),
  );
  const ledBar = new THREE.Mesh(track(new THREE.BoxGeometry(0.8, 28, 0.8)), ledMat);
  ledBar.position.set(-22.4, ERECT_Y, 2.2);
  const handleGeo = track(new THREE.TorusGeometry(5.5, 0.7, 6, 10, Math.PI));
  const handleL = new THREE.Mesh(handleGeo, look.anthracite);
  const handleR = new THREE.Mesh(handleGeo, look.anthracite);
  handleL.position.set(-24, ERECT_Y - 6, -2);
  handleR.position.set(24, ERECT_Y - 6, -2);
  handleL.rotation.z = Math.PI / 2;
  handleR.rotation.z = -Math.PI / 2;
  const chin = box(track, [18, 1.4, 5], look.brushed, 0, ERECT_Y + 36, -7);
  stand.add(column, guide, carriage, frameDet, detector, ledBar, handleL, handleR, chin);

  const chamberGeo = track(new THREE.PlaneGeometry(6.2, 10.4));
  const chamberMat = () =>
    own(
      new THREE.MeshBasicMaterial({
        color: 0x6ba3de,
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
  const chamberRight = new THREE.Mesh(chamberGeo, chamberMat());
  const chamberCenter = new THREE.Mesh(chamberGeo, chamberMat());
  const chamberLeft = new THREE.Mesh(chamberGeo, chamberMat());
  chamberRight.position.set(-9, -3, 0.4);
  chamberCenter.position.set(0, -7.5, 0.4);
  chamberLeft.position.set(9, -3, 0.4);
  const aecGroup = new THREE.Group();
  aecGroup.add(chamberRight, chamberCenter, chamberLeft);
  scene.add(aecGroup);

  const table = new THREE.Group();
  scene.add(table);
  const pedestal = box(track, [36, 70, 36], look.anthracite, 0, 40, 16);
  pedestal.castShadow = true;
  const pedalL = box(track, [10, 1.2, 6], look.anthracite, -16, 2, 28);
  const pedalR = box(track, [10, 1.2, 6], look.anthracite, 16, 2, 28);
  const top = box(track, [78, 2.2, 272], look.carbon, 0, 82, 16);
  const railL = box(track, [2.2, 2, 258], look.brushed, 37, 84, 16);
  const railR = box(track, [2.2, 2, 258], look.brushed, -37, 84, 16);
  const mattress = box(track, [64, 1.5, 250], look.slate, 0, 84.1, 16);
  const pillow = box(track, [36, 3.2, 22], look.slate, 0, 86.2, -92);
  const bolster = box(track, [32, 2.2, 16], look.slate, 0, 85.6, 78);
  table.add(pedestal, pedalL, pedalR, top, railL, railR, mattress, pillow, bolster);
  table.visible = false;

  const ceilingRail = box(track, [16, 6, 300], look.brushed, 0, 236, -40);
  const crossRail = box(track, [160, 5, 12], look.brushed, 0, 228, -40);
  scene.add(ceilingRail, crossRail);

  const suspension = new THREE.Group();
  scene.add(suspension);
  const sleeve = new THREE.Mesh(track(new THREE.CylinderGeometry(3.2, 3.4, 1, 12)), look.medicalWhite);
  sleeve.position.y = 0.28;
  const mid = new THREE.Mesh(track(new THREE.CylinderGeometry(2.3, 2.5, 1, 12)), look.brushed);
  const inner = new THREE.Mesh(track(new THREE.CylinderGeometry(1.5, 1.6, 1, 10)), look.anthracite);
  inner.position.y = -0.28;
  suspension.add(sleeve, mid, inner);

  const tube = new THREE.Group();
  scene.add(tube);
  const housing = new THREE.Mesh(track(new THREE.CylinderGeometry(8.6, 9.4, 22, 20)), look.medicalWhite);
  housing.rotation.x = Math.PI / 2;
  housing.position.z = 16;
  housing.castShadow = true;
  const cuff = new THREE.Mesh(track(new THREE.CylinderGeometry(8, 9, 10, 16)), look.anthracite);
  cuff.rotation.x = Math.PI / 2;
  cuff.position.z = 4;
  const cable = new THREE.Mesh(
    track(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3([
          new THREE.Vector3(8, 6, 22),
          new THREE.Vector3(16, 28, 30),
          new THREE.Vector3(4, 52, 18),
        ]),
        10,
        0.7,
        5,
        false,
      ),
    ),
    look.anthracite,
  );
  const gripGeo = track(new THREE.CylinderGeometry(1.1, 1.1, 10, 8));
  const gripL = new THREE.Mesh(gripGeo, look.anthracite);
  const gripR = new THREE.Mesh(gripGeo, look.anthracite);
  gripL.rotation.z = Math.PI / 2;
  gripR.rotation.z = Math.PI / 2;
  gripL.position.set(-14, 0, 14);
  gripR.position.set(14, 0, 14);
  const display = createHeadDisplay();
  extraTextures.push(display.texture);
  const displayMat = own(new THREE.MeshBasicMaterial({ map: display.texture }));
  const displayMesh = new THREE.Mesh(track(new THREE.PlaneGeometry(9, 3.6)), displayMat);
  displayMesh.position.set(9.4, 1.5, 16);
  displayMesh.rotation.y = Math.PI / 2;
  tube.add(housing, cuff, cable, gripL, gripR, displayMesh);

  const collimator = new THREE.Group();
  collimator.position.z = -12;
  tube.add(collimator);
  const collBody = box(track, [16, 13, 8], look.anthracite, 0, 0, 0);
  const window = new THREE.Mesh(
    track(new THREE.PlaneGeometry(7, 5.5)),
    own(
      new THREE.MeshBasicMaterial({
        color: 0x6ba3de,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
      }),
    ),
  );
  window.position.z = -4.1;
  const knobGeo = track(new THREE.CylinderGeometry(1.3, 1.3, 1.4, 10));
  const knobL = new THREE.Mesh(knobGeo, look.brushed);
  const knobR = new THREE.Mesh(knobGeo, look.brushed);
  knobL.rotation.z = Math.PI / 2;
  knobR.rotation.x = Math.PI / 2;
  knobL.position.set(-8.4, 2, 1);
  knobR.position.set(4, -7.2, 1);
  const bladeH = track(new THREE.BoxGeometry(7.2, 0.45, 0.25));
  const bladeV = track(new THREE.BoxGeometry(0.45, 6.4, 0.25));
  const bladeTop = new THREE.Mesh(bladeH, look.medicalWhite);
  const bladeBottom = new THREE.Mesh(bladeH, look.medicalWhite);
  const bladeLeft = new THREE.Mesh(bladeV, look.medicalWhite);
  const bladeRight = new THREE.Mesh(bladeV, look.medicalWhite);
  collimator.add(collBody, window, knobL, knobR, bladeTop, bladeBottom, bladeLeft, bladeRight);

  tube.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (mesh.isMesh && mesh !== displayMesh) mesh.layers.set(1);
  });
  displayMesh.layers.set(1);

  const focus = new THREE.Mesh(track(new THREE.SphereGeometry(1.05, 12, 10)), look.mark);
  tube.add(focus);

  const beamGeo = track(new THREE.BufferGeometry());
  beamGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(15), 3));
  beamGeo.setAttribute("aAlong", new THREE.BufferAttribute(new Float32Array([0, 1, 1, 1, 1]), 1));
  beamGeo.setIndex([0, 1, 2, 0, 2, 3, 0, 3, 4, 0, 4, 1]);
  const beam = new THREE.Mesh(beamGeo, look.beam);
  beam.frustumCulled = false;
  beam.renderOrder = 4;
  scene.add(beam);

  const fieldGeo = track(new THREE.BufferGeometry());
  fieldGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(12), 3));
  const field = new THREE.LineLoop(fieldGeo, look.field);
  field.frustumCulled = false;
  scene.add(field);

  const laserGeo = track(new THREE.BufferGeometry());
  laserGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(12), 3));
  const laser = new THREE.LineSegments(laserGeo, look.laser);
  laser.frustumCulled = false;
  scene.add(laser);
  const laserGlow = new THREE.Mesh(
    track(new THREE.CircleGeometry(3.6, 28)),
    own(
      new THREE.MeshBasicMaterial({
        color: 0xff3b30,
        transparent: true,
        opacity: 0.42,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      }),
    ),
  );
  laserGlow.frustumCulled = false;
  laserGlow.renderOrder = 5;
  scene.add(laserGlow);

  const rayGeo = track(new THREE.BufferGeometry());
  rayGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(6), 3));
  const centralRay = new THREE.Line(rayGeo, look.ray);
  centralRay.frustumCulled = false;
  scene.add(centralRay);

  return {
    stand,
    table,
    tube,
    column: suspension,
    aecGroup,
    chamberRight,
    chamberCenter,
    chamberLeft,
    beam,
    field,
    laser,
    laserGlow,
    centralRay,
    focus,
    bladeLeft,
    bladeRight,
    bladeTop,
    bladeBottom,
    led: ledMat,
    paintDisplay: display.paint,
    grid,
    dispose: () => {
      extras.forEach((material) => material.dispose());
      extraTextures.forEach((texture) => texture.dispose());
      grid.geometry.dispose();
      const gridMaterial = grid.material;
      if (Array.isArray(gridMaterial)) gridMaterial.forEach((material) => material.dispose());
      else gridMaterial.dispose();
    },
  };
}
