/**
 * Dev-only mesh inspector: renders every actor look / furniture piece / pet at
 * several yaw angles so geometry mistakes are easy to spot. Not shipped.
 *
 * Each subject gets its own viewport cell with a camera fitted to its bounds,
 * using the same oblique angle and light rig as the game.
 */
import * as THREE from "three";
import { createActor } from "../mesh/actors";
import { createFurnitureMesh, createPet } from "../mesh/furniture";
import { FURNITURE_CATALOG } from "../data/furniture";
import { PET_POOL } from "../data/pets";
import {
  defaultPlayerLook,
  HAIR_OPTIONS,
  CLOTHING_OPTIONS,
  FACE_OPTIONS,
  applyClothingStyle,
} from "../data/character";

const params = new URLSearchParams(location.search);
const mode = params.get("mode") ?? "actors";
const front = params.has("front");
const ANGLES = [0, Math.PI / 2, Math.PI, -Math.PI / 2];

interface Cell {
  obj: THREE.Object3D;
  label: string;
}
const cells: Cell[] = [];

function row(label: string, make: () => THREE.Object3D) {
  ANGLES.forEach((yaw, i) => {
    const obj = make();
    obj.rotation.y = yaw;
    cells.push({ obj, label: i === 0 ? label : "" });
  });
}

if (mode === "actors") {
  row("short/casual", () => createActor(defaultPlayerLook()).root);
  for (const h of HAIR_OPTIONS.slice(1)) {
    row(`hair ${h}`, () => createActor({ ...defaultPlayerLook(), hairStyle: h }).root);
  }
  for (const c of CLOTHING_OPTIONS) {
    row(`wear ${c}`, () => createActor(applyClothingStyle(defaultPlayerLook(), c)).root);
  }
  for (const f of FACE_OPTIONS) {
    row(`face ${f}`, () => createActor({ ...defaultPlayerLook(), face: f }).root);
  }
  row("tall slim girl", () =>
    createActor({
      ...defaultPlayerLook(),
      sex: "girl",
      height: "tall",
      build: "slim",
      hairStyle: "long",
    }).root,
  );
  row("short stocky boy", () =>
    createActor({
      ...defaultPlayerLook(),
      sex: "boy",
      height: "short",
      build: "stocky",
    }).root,
  );
} else if (mode === "walk") {
  for (const phase of [0, 0.2, 0.4, 0.6, 0.8, 1.0]) {
    const a = createActor(defaultPlayerLook());
    a.setWalking(true);
    const steps = 40;
    for (let i = 0; i < steps; i++) a.update((phase * 0.7) / steps);
    cells.push({ obj: a.root, label: `walk ${phase.toFixed(1)}` });
  }
} else if (mode === "pets") {
  for (const def of PET_POOL) {
    row(`${def.species} ${def.name}`, () => createPet(def).root);
  }
} else {
  for (const def of FURNITURE_CATALOG) {
    row(`${def.id} ${def.width}x${def.height}`, () => createFurnitureMesh(def.id));
  }
}

// ?filter= keeps only rows whose label matches, so a subject can be zoomed in on
const filter = params.get("filter");
if (filter) {
  const kept: Cell[] = [];
  let take = false;
  for (const cell of cells) {
    if (cell.label) take = cell.label.includes(filter);
    if (take) kept.push(cell);
  }
  cells.length = 0;
  cells.push(...kept);
}

const COLS = mode === "walk" ? 6 : 4;
const CELL_W = Number(params.get("cell") ?? 300);
const CELL_H = Math.round(CELL_W * (mode === "furniture" ? 0.86 : 1.12));
const rows = Math.ceil(cells.length / COLS);
const canvasW = COLS * CELL_W;
const canvasH = rows * CELL_H;

const canvas = document.createElement("canvas");
document.body.appendChild(canvas);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(2);
renderer.setSize(canvasW, canvasH, false);
canvas.style.width = `${canvasW}px`;
canvas.style.height = `${canvasH}px`;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0xf3ece0, 1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.setScissorTest(true);
renderer.autoClear = false;

const scene = new THREE.Scene();
scene.add(new THREE.HemisphereLight(0xfff2dd, 0xd8c9ae, 0.8));
const sun = new THREE.DirectionalLight(0xfff4e2, 1);
sun.position.set(160, 300, 220);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
sun.shadow.camera.left = -80;
sun.shadow.camera.right = 80;
sun.shadow.camera.top = 80;
sun.shadow.camera.bottom = -80;
scene.add(sun);
const fill = new THREE.DirectionalLight(0xffffff, 0.35);
fill.position.set(-80, 60, 240);
scene.add(fill);

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(400, 400),
  new THREE.MeshLambertMaterial({ color: 0xe6d9c0 }),
);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// One subject in the scene at a time keeps shadows and framing clean
const holder = new THREE.Group();
scene.add(holder);

const camOffset = front
  ? new THREE.Vector3(0, 40, 300)
  : new THREE.Vector3(120, 300, 250);

const overlay = document.createElement("div");
overlay.style.cssText = `position:absolute;left:0;top:0;width:${canvasW}px;height:${canvasH}px;pointer-events:none;font:700 12px system-ui;color:#4a3428`;
document.body.style.margin = "0";
document.body.style.position = "relative";
document.body.appendChild(overlay);

cells.forEach((cell, i) => {
  const col = i % COLS;
  const gridRow = Math.floor(i / COLS);

  holder.clear();
  holder.add(cell.obj);
  cell.obj.updateWorldMatrix(true, true);

  const box = new THREE.Box3().setFromObject(cell.obj);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const span = Math.max(size.y, size.x * 0.85, size.z * 0.85) * 1.2 + 4;
  const aspect = CELL_W / CELL_H;
  const cam = new THREE.OrthographicCamera(
    (-span * aspect) / 2,
    (span * aspect) / 2,
    span / 2,
    -span / 2,
    0.1,
    2000,
  );
  cam.position.copy(center).add(camOffset);
  cam.lookAt(center);
  sun.target.position.copy(center);
  sun.target.updateMatrixWorld();
  scene.add(sun.target);

  const vx = col * CELL_W;
  const vy = canvasH - (gridRow + 1) * CELL_H;
  renderer.setViewport(vx, vy, CELL_W, CELL_H);
  renderer.setScissor(vx, vy, CELL_W, CELL_H);
  renderer.clear();
  renderer.render(scene, cam);

  if (cell.label) {
    const tag = document.createElement("div");
    tag.textContent = cell.label;
    tag.style.cssText = `position:absolute;left:${vx + 6}px;top:${gridRow * CELL_H + 6}px;background:rgba(255,255,255,.8);padding:2px 6px;border-radius:5px`;
    overlay.appendChild(tag);
  }
});

(window as unknown as { __ready: boolean }).__ready = true;
