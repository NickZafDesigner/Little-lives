import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { Palette } from "../game/palette";
import { TILE, GAME_WIDTH, GAME_HEIGHT, CAM_OFFSET_X, CAM_OFFSET_Z } from "../game/constants";
import type { LotId } from "../data/types";
import { MAP_H, MAP_W, type TownMapData } from "../world/townMap";
import { buildTerrain, type FlowerHandle } from "../mesh/terrain";
import {
  buildBuildings,
  playerInsideBuilding,
  type BuildingHandle,
} from "../mesh/buildings";
import { buildTownSigns, type SignHandle } from "../mesh/signs";
import { worldToTile } from "./coords";
import { ghostifyMaterials, tintGhostOk } from "./tint";
import { addOutline } from "./outline";

/** Soft vignette + warm grade for painted valley look. */
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    vignette: { value: 0.35 },
    warmth: { value: 0.06 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float vignette;
    uniform float warmth;
    varying vec2 vUv;
    void main() {
      vec4 c = texture2D(tDiffuse, vUv);
      float d = distance(vUv, vec2(0.5));
      float v = smoothstep(0.45, 0.95, d) * vignette;
      c.rgb *= 1.0 - v;
      c.rgb = mix(c.rgb, c.rgb * vec3(1.06, 1.0, 0.92), warmth);
      gl_FragColor = c;
    }
  `,
};

export class TownRenderer {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene: THREE.Scene;
  readonly camera: THREE.OrthographicCamera;
  readonly pickPlane: THREE.Mesh;

  private hemi: THREE.HemisphereLight;
  private sun: THREE.DirectionalLight;
  private buildings: BuildingHandle[] = [];
  private buildingsUpdate:
    | ((dt: number, playerX: number, playerZ: number) => void)
    | null = null;
  private signs: SignHandle[] = [];
  private flowerHandles: FlowerHandle[] = [];
  private follow = new THREE.Vector3();
  private followTarget = new THREE.Vector3();
  /**
   * Vertical world units in view - smaller = zoomed in.
   * Default is roughly a lot and a half, Sims-ish.
   */
  static readonly FRUSTUM_DEFAULT = 560;
  static readonly FRUSTUM_MIN = 240;
  static readonly FRUSTUM_MAX = 980;
  /** Closer follow while the player is inside a building. */
  static readonly FRUSTUM_INDOOR = 280;
  private frustumSize = TownRenderer.FRUSTUM_DEFAULT;
  private frustumTarget = TownRenderer.FRUSTUM_DEFAULT;
  /** Prior user frustum while a cinematic focus zoom is active. */
  private focusRestore: number | null = null;
  /** Higher = snappier; lowered briefly for thought close-ups. */
  private zoomDamp = 28;
  /** True while the follow target is inside a building footprint. */
  private indoors = false;
  /** Thought / dialogue close-up (below FRUSTUM_MIN). Soft enough to avoid hard cuts. */
  static readonly FRUSTUM_FOCUS = 175;
  /** Extra-tight face close-up (bladder accident / embarrassment). */
  static readonly FRUSTUM_FACE = 115;
  static readonly FACE_FRAME_Y = 0.58;
  /**
   * Focus framing: shift the ortho window so the follow point sits lower-center,
   * leaving headroom above for thought bubbles. Values are fractions of half-frustum.
   * +Y → character lower on screen; +X → character left of center.
   */
  private frameShiftX = 0;
  private frameShiftY = 0;
  private frameShiftXTarget = 0;
  private frameShiftYTarget = 0;
  static readonly FOCUS_FRAME_Y = 0.44;
  static readonly FOCUS_FRAME_X = 0;
  private viewWidth = GAME_WIDTH;
  private viewHeight = GAME_HEIGHT;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private moveMarker: THREE.Mesh;
  private ghost: THREE.Group | null = null;
  private buildSelection: THREE.BoxHelper | null = null;
  private gridHelper: THREE.Group | null = null;
  private hoverOutline: THREE.Group | null = null;
  private gridHome: { tx: number; ty: number; tw: number; th: number } | null = null;
  private hoverTw = 0;
  private hoverTh = 0;
  private clock = 0;
  private worldBuilt = false;
  // Low oblique - high Y made roofs read as flat lids on wide lots.
  private camOffset = new THREE.Vector3(CAM_OFFSET_X, 185, CAM_OFFSET_Z);
  /** Locked orientation - lookAt is NOT called while the camera moves. */
  private camQuat = new THREE.Quaternion();
  private composer: EffectComposer;
  private gradePass: ShaderPass;
  /** Sun offset from follow target - direction changes with time of day. */
  private sunOffset = new THREE.Vector3(180, 380, 140);

  constructor(canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      alpha: false,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(GAME_WIDTH, GAME_HEIGHT, false);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.setClearColor(Palette.sky, 1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;
    // Catalog tip previews used to spawn extra WebGL contexts; if the browser
    // steals this one, cancel the loss so it can restore instead of staying blank.
    canvas.addEventListener(
      "webglcontextlost",
      (e) => {
        e.preventDefault();
      },
      false,
    );

    this.scene = new THREE.Scene();
    // Fog must sit well past the visible frustum or the valley washes to sky.
    this.scene.fog = new THREE.Fog(Palette.sky, 2200, 7000);

    const aspect = GAME_WIDTH / GAME_HEIGHT;
    // Ortho near MUST be negative: the low oblique angle puts ground and
    // building faces behind the camera, and a positive near plane carves a
    // hard diagonal void through the world as you walk.
    this.camera = new THREE.OrthographicCamera(
      (-this.frustumSize * aspect) / 2,
      (this.frustumSize * aspect) / 2,
      this.frustumSize / 2,
      -this.frustumSize / 2,
      -4000,
      8000,
    );
    // Bake a fixed oblique orientation once - never re-derive it per frame.
    this.camera.position.copy(this.camOffset);
    this.camera.lookAt(0, 10, 0);
    this.camera.rotation.order = "YXZ";
    this.camQuat.copy(this.camera.quaternion);

    this.hemi = new THREE.HemisphereLight(0xfff4e0, 0x6b9a55, 0.95);
    this.scene.add(this.hemi);

    this.sun = new THREE.DirectionalLight(0xffe4b8, 1.15);
    // Direction orbits the map centre; the shadow frustum follows the player
    // so 2048² stays sharp (whole-town coverage was ~1 texel/unit = jaggies).
    const mapCx = (MAP_W * TILE) / 2;
    const mapCz = (MAP_H * TILE) / 2;
    this.sun.target.position.set(mapCx, 0, mapCz);
    this.sun.position.set(mapCx + 180, 380, mapCz + 140);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.near = 10;
    this.sun.shadow.camera.far = 900;
    this.sun.shadow.camera.left = -520;
    this.sun.shadow.camera.right = 520;
    this.sun.shadow.camera.top = 520;
    this.sun.shadow.camera.bottom = -520;
    this.sun.shadow.camera.updateProjectionMatrix();
    this.sun.shadow.bias = -0.0002;
    this.sun.shadow.normalBias = 0.08;
    this.sun.shadow.radius = 2;
    this.scene.add(this.sun);
    this.scene.add(this.sun.target);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.gradePass = new ShaderPass(GradeShader);
    this.composer.addPass(this.gradePass);
    this.composer.addPass(new OutputPass());

    // Invisible ground for raycasting
    this.pickPlane = new THREE.Mesh(
      new THREE.PlaneGeometry(MAP_W * TILE, MAP_H * TILE),
      new THREE.MeshBasicMaterial({ visible: false }),
    );
    this.pickPlane.rotation.x = -Math.PI / 2;
    this.pickPlane.position.set((MAP_W * TILE) / 2, 0.05, (MAP_H * TILE) / 2);
    this.scene.add(this.pickPlane);

    this.moveMarker = new THREE.Mesh(
      new THREE.RingGeometry(6, 10, 24),
      new THREE.MeshBasicMaterial({
        color: Palette.sunflower,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.moveMarker.rotation.x = -Math.PI / 2;
    this.moveMarker.position.y = 1.5;
    this.scene.add(this.moveMarker);
  }

  buildWorld(map: TownMapData) {
    if (this.worldBuilt) return;
    const terrain = buildTerrain(map);
    this.scene.add(terrain.group);
    this.flowerHandles = terrain.flowers;
    const built = buildBuildings();
    // No inverted-hull outlines on buildings - they turn every wall/window
    // box into a dark border. Silhouette comes from toon lighting + roof mass.
    this.scene.add(built.group);
    this.buildings = built.buildings;
    this.buildingsUpdate = built.update;
    const signed = buildTownSigns();
    addOutline(signed.group, 1.04);
    this.scene.add(signed.group);
    this.signs = signed.signs;
    this.worldBuilt = true;
  }

  getSigns(): SignHandle[] {
    return this.signs;
  }

  getFlowerHandles(): FlowerHandle[] {
    return this.flowerHandles;
  }

  setFollow(x: number, z: number) {
    this.followTarget.set(x, 0, z);
    this.follow.set(x, 0, z);
  }

  /** 1 = default; higher = closer; lower = farther out. */
  getZoom(): number {
    return TownRenderer.FRUSTUM_DEFAULT / this.frustumTarget;
  }

  /** Set zoom factor (1 = default). Clamped to FRUSTUM_MIN/MAX. */
  setZoom(zoom: number) {
    const z = Math.max(0.05, zoom);
    this.frustumTarget = THREE.MathUtils.clamp(
      TownRenderer.FRUSTUM_DEFAULT / z,
      TownRenderer.FRUSTUM_MIN,
      TownRenderer.FRUSTUM_MAX,
    );
    // User override cancels cinematic restore + focus framing.
    this.focusRestore = null;
    this.frameShiftXTarget = 0;
    this.frameShiftYTarget = 0;
    this.zoomDamp = 28;
    // Indoor baseline re-applies on the next update from player position.
    this.indoors = false;
  }

  /** Baseline frustum for the current location (outdoor town vs indoors). */
  private baseFrustum(): number {
    return this.indoors
      ? TownRenderer.FRUSTUM_INDOOR
      : TownRenderer.FRUSTUM_DEFAULT;
  }

  /** True while the camera baseline is the indoor close follow. */
  isIndoors(): boolean {
    return this.indoors;
  }

  /**
   * Building lot under a world point, or null outdoors (park / streets).
   * Uses the same inset footprint as roof cutaway / indoor zoom.
   */
  buildingLotAt(wx: number, wz: number): LotId | null {
    if (this.buildings.length === 0) return null;
    return playerInsideBuilding(wx, wz, this.buildings);
  }

  /**
   * Soft cinematic close-up on the follow target (dialogue / thoughts).
   * Remembers the current zoom and restores it via endFocusZoom().
   * Idempotent while already focused - safe to call every frame.
   */
  beginFocusZoom(
    frustum = TownRenderer.FRUSTUM_FOCUS,
    frameY = TownRenderer.FOCUS_FRAME_Y,
  ) {
    if (this.focusRestore === null) {
      this.focusRestore = this.baseFrustum();
      this.frustumTarget = frustum;
      this.zoomDamp = 10;
    } else if (this.frustumTarget !== frustum) {
      this.frustumTarget = frustum;
    }
    // Character lower-center → clear sky above the head for thought bubbles.
    // Face close-ups push the character further down so the face fills the frame.
    this.frameShiftYTarget = frameY;
    this.frameShiftXTarget = TownRenderer.FOCUS_FRAME_X;
  }

  /** Ease back out of a beginFocusZoom() close-up. */
  endFocusZoom() {
    if (this.focusRestore === null && this.frameShiftYTarget === 0) return;
    if (this.focusRestore !== null) {
      this.frustumTarget = THREE.MathUtils.clamp(
        this.focusRestore,
        TownRenderer.FRUSTUM_MIN,
        TownRenderer.FRUSTUM_MAX,
      );
      this.focusRestore = null;
      this.zoomDamp = 8;
    }
    this.frameShiftYTarget = 0;
    this.frameShiftXTarget = 0;
  }

  /** True while a cinematic focus close-up is active (or still easing out). */
  isFocusZooming(): boolean {
    return (
      this.focusRestore !== null ||
      Math.abs(this.frameShiftY) > 0.01 ||
      Math.abs(this.frameShiftX) > 0.01
    );
  }

  /** Multiply current zoom (e.g. 1.1 = 10% closer, 0.9 = 10% farther). */
  adjustZoom(factor: number) {
    this.setZoom(this.getZoom() * factor);
  }

  /**
   * Wheel / trackpad pinch → zoom.
   * Only pinch (ctrl/meta + wheel) zooms - plain trackpad scroll is ignored
   * entirely so walking never nudges the frustum.
   */
  zoomByWheel(deltaY: number, pinch = false) {
    if (!pinch) return;
    const steps = THREE.MathUtils.clamp(deltaY, -400, 400) / 120;
    const base = 0.28;
    this.adjustZoom(Math.pow(base, steps));
  }

  /** Pull in on the character while indoors; ease back out on exit. */
  private syncIndoorZoom(playerX: number, playerZ: number) {
    const inside =
      this.buildings.length > 0 &&
      playerInsideBuilding(playerX, playerZ, this.buildings) !== null;
    if (inside === this.indoors) return;
    this.indoors = inside;
    const base = this.baseFrustum();
    if (this.focusRestore !== null) {
      // Dialogue/thought close-up is active - come back to the new baseline.
      this.focusRestore = base;
    } else {
      this.frustumTarget = base;
      // Soft enough that roof cutaway (~1s) rides with the pull-in / pull-out.
      this.zoomDamp = 5.5;
    }
  }

  private applyFrustum() {
    const aspect = this.viewWidth / Math.max(1, this.viewHeight);
    const halfH = this.frustumSize / 2;
    const halfW = halfH * aspect;
    // Asymmetric ortho window: shift origin on screen without moving the camera.
    const ox = this.frameShiftX * halfW;
    const oy = this.frameShiftY * halfH;
    this.camera.left = -halfW + ox;
    this.camera.right = halfW + ox;
    this.camera.top = halfH + oy;
    this.camera.bottom = -halfH + oy;
    this.camera.updateProjectionMatrix();
  }

  showMoveMarker(tx: number, ty: number) {
    this.moveMarker.position.x = tx * TILE + TILE / 2;
    this.moveMarker.position.z = ty * TILE + TILE / 2;
    const mat = this.moveMarker.material as THREE.MeshBasicMaterial;
    mat.opacity = 0.95;
    this.clock = 0;
  }

  setGhost(mesh: THREE.Group | null) {
    if (this.ghost) {
      this.scene.remove(this.ghost);
      this.ghost = null;
    }
    if (mesh) {
      ghostifyMaterials(mesh, 0.55);
      this.ghost = mesh;
      this.scene.add(mesh);
    }
  }

  setGhostTint(ok: boolean) {
    if (!this.ghost) return;
    tintGhostOk(this.ghost, ok);
  }

  /** Bright outline for existing furniture that can be selected/moved. */
  setBuildSelection(object: THREE.Object3D | null) {
    if (this.buildSelection) {
      this.scene.remove(this.buildSelection);
      this.buildSelection.geometry.dispose();
      (this.buildSelection.material as THREE.Material).dispose();
      this.buildSelection = null;
    }
    if (!object) return;
    const helper = new THREE.BoxHelper(object, 0x48e66b);
    const mat = helper.material as THREE.LineBasicMaterial;
    mat.depthTest = false;
    mat.transparent = true;
    mat.opacity = 0.95;
    helper.renderOrder = 30;
    helper.update();
    this.buildSelection = helper;
    this.scene.add(helper);
  }

  setGridVisible(visible: boolean, home?: { tx: number; ty: number; tw: number; th: number }) {
    if (this.gridHelper) {
      this.scene.remove(this.gridHelper);
      this.gridHelper = null;
    }
    this.gridHome = visible && home ? home : null;
    this.setHoverTile(null);
    if (!visible || !home) return;
    const g = new THREE.Group();
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.25,
    });
    for (let y = home.ty + 1; y < home.ty + home.th - 1; y++) {
      for (let x = home.tx + 1; x < home.tx + home.tw - 1; x++) {
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(x * TILE, 1.2, y * TILE),
          new THREE.Vector3((x + 1) * TILE, 1.2, y * TILE),
          new THREE.Vector3((x + 1) * TILE, 1.2, (y + 1) * TILE),
          new THREE.Vector3(x * TILE, 1.2, (y + 1) * TILE),
          new THREE.Vector3(x * TILE, 1.2, y * TILE),
        ]);
        g.add(new THREE.Line(geo, lineMat));
      }
    }
    this.gridHelper = g;
    this.scene.add(g);
  }

  /**
   * Highlight buildable cells under the pointer.
   * `tw`/`th` cover a furniture footprint; `ok` tints valid vs blocked.
   */
  setHoverTile(
    tile: { tx: number; ty: number } | null,
    opts?: { tw?: number; th?: number; ok?: boolean; fill?: number; edge?: number },
  ) {
    if (!tile || !this.gridHome) {
      this.hoverTw = 0;
      this.hoverTh = 0;
      if (this.hoverOutline) this.hoverOutline.visible = false;
      return;
    }
    const home = this.gridHome;
    const tw = Math.max(1, opts?.tw ?? 1);
    const th = Math.max(1, opts?.th ?? 1);
    const inside =
      tile.tx > home.tx &&
      tile.ty > home.ty &&
      tile.tx + tw - 1 < home.tx + home.tw - 1 &&
      tile.ty + th - 1 < home.ty + home.th - 1;
    if (!inside) {
      this.hoverTw = 0;
      this.hoverTh = 0;
      if (this.hoverOutline) this.hoverOutline.visible = false;
      return;
    }

    const ok = opts?.ok !== false;
    const fillCol = opts?.fill ?? (ok ? 0x63e678 : 0xff8a9a);
    const edgeCol = opts?.edge ?? (ok ? 0x19a83c : 0xe04560);
    const sizeChanged = tw !== this.hoverTw || th !== this.hoverTh;
    this.hoverTw = tw;
    this.hoverTh = th;

    if (!this.hoverOutline || sizeChanged) {
      if (this.hoverOutline) {
        this.scene.remove(this.hoverOutline);
        this.hoverOutline.traverse((o) => {
          if (o instanceof THREE.Mesh) {
            o.geometry.dispose();
            if (Array.isArray(o.material)) o.material.forEach((m) => m.dispose());
            else (o.material as THREE.Material).dispose();
          }
        });
        this.hoverOutline = null;
      }

      const g = new THREE.Group();
      const ww = tw * TILE;
      const hh = th * TILE;

      const fill = new THREE.Mesh(
        new THREE.PlaneGeometry(ww - 1, hh - 1),
        new THREE.MeshBasicMaterial({
          color: fillCol,
          transparent: true,
          opacity: 0.55,
          depthWrite: false,
          depthTest: false,
          side: THREE.DoubleSide,
        }),
      );
      fill.rotation.x = -Math.PI / 2;
      fill.position.set(ww / 2, 0, hh / 2);
      fill.renderOrder = 20;
      g.add(fill);

      const borderMat = new THREE.MeshBasicMaterial({
        color: edgeCol,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        depthTest: false,
      });
      const t = 3.2;
      const edges: Array<[number, number, number, number]> = [
        [ww / 2, t / 2, ww, t],
        [ww / 2, hh - t / 2, ww, t],
        [t / 2, hh / 2, t, hh],
        [ww - t / 2, hh / 2, t, hh],
      ];
      for (const [cx, cz, w, d] of edges) {
        const edge = new THREE.Mesh(new THREE.BoxGeometry(w, 0.6, d), borderMat);
        edge.position.set(cx, 0.3, cz);
        edge.renderOrder = 21;
        g.add(edge);
      }
      this.hoverOutline = g;
      this.scene.add(g);
    } else {
      this.hoverOutline.traverse((o) => {
        if (o instanceof THREE.Mesh && o.material instanceof THREE.MeshBasicMaterial) {
          const isFill = o.geometry instanceof THREE.PlaneGeometry;
          o.material.color.setHex(isFill ? fillCol : edgeCol);
        }
      });
    }

    this.hoverOutline.position.set(tile.tx * TILE, 2.4, tile.ty * TILE);
    this.hoverOutline.visible = true;
  }

  pickTile(clientX: number, clientY: number, rect: DOMRect): { tx: number; ty: number } | null {
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.pickPlane);
    if (hits.length === 0) return null;
    const p = hits[0].point;
    return worldToTile(p.x, p.z);
  }

  /**
   * Pick the first of `objects` under the cursor. Ground-plane hit testing
   * misplaces clicks on anything tall - the plane point lands behind the object
   * - so props are hit tested against their real geometry.
   */
  pickFrom(
    clientX: number,
    clientY: number,
    rect: DOMRect,
    objects: THREE.Object3D[],
  ): THREE.Object3D | null {
    if (objects.length === 0) return null;
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(objects, true);
    if (hits.length === 0) return null;
    // Walk up to the object that was registered, which carries the userData
    const roots = new Set(objects);
    let node: THREE.Object3D | null = hits[0].object;
    while (node && !roots.has(node)) node = node.parent;
    return node ?? null;
  }

  worldFromScreen(clientX: number, clientY: number, rect: DOMRect): THREE.Vector3 | null {
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObject(this.pickPlane);
    return hits.length ? hits[0].point : null;
  }

  /** Project world XZ to screen CSS pixels relative to canvas. */
  projectToScreen(x: number, y: number, z: number, rect: DOMRect): { x: number; y: number } {
    const v = new THREE.Vector3(x, y, z);
    v.project(this.camera);
    return {
      x: ((v.x + 1) / 2) * rect.width,
      y: ((-v.y + 1) / 2) * rect.height,
    };
  }

  setDayTime(t: number) {
    // 0 night → morning → day → evening → night
    let sunIntensity = 1.2;
    let hemiIntensity = 0.95;
    let sunColor = new THREE.Color(0xffe4b8);
    let clear = new THREE.Color(Palette.sky);
    let fogCol = new THREE.Color(Palette.sky);
    let warmth = 0.06;
    let vignette = 0.35;

    if (t < 0.2 || t >= 0.88) {
      sunIntensity = 0.18;
      hemiIntensity = 0.28;
      sunColor.set(0x6a7ec8);
      clear.set(0x1b2a5c);
      fogCol.set(0x1b2a5c);
      warmth = 0;
      vignette = 0.5;
    } else if (t < 0.3) {
      const k = (t - 0.2) / 0.1;
      sunIntensity = 0.18 + k * 1.0;
      hemiIntensity = 0.28 + k * 0.65;
      sunColor.set(0x6a7ec8).lerp(new THREE.Color(0xffc090), k);
      clear.set(0x1b2a5c).lerp(new THREE.Color(Palette.sky), k);
      fogCol.copy(clear);
      warmth = k * 0.08;
      vignette = 0.5 - k * 0.15;
    } else if (t < 0.72) {
      sunIntensity = 1.2;
      hemiIntensity = 0.95;
    } else if (t < 0.82) {
      const k = (t - 0.72) / 0.1;
      sunIntensity = 1.2 - k * 0.55;
      sunColor.set(0xffe4b8).lerp(new THREE.Color(0xd06a4a), k);
      clear.set(Palette.sky).lerp(new THREE.Color(0xd06a4a), k * 0.4);
      fogCol.copy(clear);
      warmth = 0.06 + k * 0.1;
    } else {
      const k = (t - 0.82) / 0.06;
      sunIntensity = 0.65 - k * 0.45;
      hemiIntensity = 0.95 - k * 0.65;
      sunColor.set(0xd06a4a).lerp(new THREE.Color(0x6a7ec8), k);
      clear.set(0xd06a4a).lerp(new THREE.Color(0x1b2a5c), k);
      fogCol.copy(clear);
      warmth = 0.08 * (1 - k);
      vignette = 0.35 + k * 0.15;
    }

    this.sun.intensity = sunIntensity;
    this.sun.color.copy(sunColor);
    this.hemi.intensity = hemiIntensity;
    this.renderer.setClearColor(clear, 1);
    if (this.scene.fog instanceof THREE.Fog) {
      this.scene.fog.color.copy(fogCol);
    }
    this.gradePass.uniforms.warmth!.value = warmth;
    this.gradePass.uniforms.vignette!.value = vignette;

    const angle = (t - 0.25) * Math.PI * 2;
    this.sunOffset.set(
      Math.cos(angle) * 280,
      180 + Math.sin(angle) * 260,
      Math.sin(angle) * 180,
    );
  }

  /** Keep the shadow frustum glued to the player for sharp local shadows. */
  private placeSun(playerX: number, playerZ: number) {
    this.sun.target.position.set(playerX, 0, playerZ);
    this.sun.position.set(
      playerX + this.sunOffset.x,
      this.sunOffset.y,
      playerZ + this.sunOffset.z,
    );
    this.sun.target.updateMatrixWorld();
  }

  resize(width: number, height: number) {
    if (width === this.viewWidth && height === this.viewHeight) return;
    this.viewWidth = width;
    this.viewHeight = height;
    this.renderer.setSize(width, height, false);
    this.composer.setSize(width, height);
    this.applyFrustum();
  }

  update(dt: number, playerX: number, playerZ: number) {
    // Hard-lock to the player - no lag, no damp overshoot, no rubber-band on turns.
    this.follow.set(playerX, 0, playerZ);
    this.followTarget.copy(this.follow);

    // Indoor baseline before zoom easing so entry snaps the target this frame.
    this.syncIndoorZoom(playerX, playerZ);

    // Smooth zoom toward target frustum (pinch / focus zoom)
    let frustumDirty = false;
    if (Math.abs(this.frustumSize - this.frustumTarget) > 0.05) {
      this.frustumSize = THREE.MathUtils.damp(
        this.frustumSize,
        this.frustumTarget,
        this.zoomDamp,
        dt,
      );
      frustumDirty = true;
    } else if (this.frustumSize !== this.frustumTarget) {
      this.frustumSize = this.frustumTarget;
      frustumDirty = true;
      this.zoomDamp = 28;
    }

    // Ease focus framing (character lower-center → headroom for thoughts)
    const frameDamp = this.focusRestore !== null ? 10 : 8;
    if (
      Math.abs(this.frameShiftX - this.frameShiftXTarget) > 0.001 ||
      Math.abs(this.frameShiftY - this.frameShiftYTarget) > 0.001
    ) {
      this.frameShiftX = THREE.MathUtils.damp(
        this.frameShiftX,
        this.frameShiftXTarget,
        frameDamp,
        dt,
      );
      this.frameShiftY = THREE.MathUtils.damp(
        this.frameShiftY,
        this.frameShiftYTarget,
        frameDamp,
        dt,
      );
      frustumDirty = true;
    } else if (
      this.frameShiftX !== this.frameShiftXTarget ||
      this.frameShiftY !== this.frameShiftYTarget
    ) {
      this.frameShiftX = this.frameShiftXTarget;
      this.frameShiftY = this.frameShiftYTarget;
      frustumDirty = true;
    }

    if (frustumDirty) this.applyFrustum();

    this.camera.position.copy(this.follow).add(this.camOffset);
    this.camera.quaternion.copy(this.camQuat);
    this.placeSun(playerX, playerZ);

    // Fade / lift the roof only when the player is inside - never hide the
    // whole shell based on camera XZ (that made cafés vanish on approach).
    if (this.buildings.length > 0) {
      const insideLot = playerInsideBuilding(playerX, playerZ, this.buildings);
      for (const b of this.buildings) {
        b.setRoofOpen(insideLot === b.lotId);
        b.group.visible = true;
      }
      this.buildingsUpdate?.(dt, playerX, playerZ);
    }


    // Move marker fade
    this.clock += dt;
    const mat = this.moveMarker.material as THREE.MeshBasicMaterial;
    if (mat.opacity > 0) {
      mat.opacity = Math.max(0, 0.95 - this.clock * 1.2);
    }

    this.composer.render();
  }

  add(obj: THREE.Object3D) {
    this.scene.add(obj);
  }

  remove(obj: THREE.Object3D) {
    this.scene.remove(obj);
  }

  dispose() {
    this.renderer.dispose();
  }
}
