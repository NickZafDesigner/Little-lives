import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { ensureToonMaterial } from "../mesh/materials";
import { toonGradientMap } from "./toonGradient";
import type {
  ClothingStyle,
  HairStyle,
} from "../data/character";

// Bump when re-exporting GLBs so browsers don't keep a stale hair/body kit.
const ASSET_VER = "20260803a";
/** Respect Vite `base` (e.g. `/Little-lives/` on GitHub Pages). */
const assetUrl = (path: string) =>
  `${import.meta.env.BASE_URL}assets/${path}?v=${ASSET_VER}`;

const CHARACTER_PATHS = {
  body: assetUrl("characters/body.glb"),
  hair: {
    short: assetUrl("characters/hair_short.glb"),
    bun: assetUrl("characters/hair_bun.glb"),
    long: assetUrl("characters/hair_long.glb"),
    wavy: assetUrl("characters/hair_wavy.glb"),
    cap: assetUrl("characters/hair_cap.glb"),
  } satisfies Record<HairStyle, string>,
  torso: {
    casual: assetUrl("characters/torso_casual.glb"),
    cozy: assetUrl("characters/torso_cozy.glb"),
    sporty: assetUrl("characters/torso_sporty.glb"),
    fancy: assetUrl("characters/torso_fancy.glb"),
  } satisfies Record<ClothingStyle, string>,
};

const PET_PATHS = {
  cat: assetUrl("pets/cat.glb"),
  dog: assetUrl("pets/dog.glb"),
  bunny: assetUrl("pets/bunny.glb"),
  fox: assetUrl("pets/fox.glb"),
  bird: assetUrl("pets/bird.glb"),
} as const;

const FURNITURE_IDS = [
  "bed",
  "fridge",
  "toilet",
  "shower",
  "sofa",
  "tv",
  "table",
  "plant",
  "bookshelf",
  "pet_bed",
  "pet_bowl",
  "toy_ball",
  "counter",
  "kitchen_counter",
  "park_bench",
  "swing_set",
  "slide",
  "shelter_desk",
  "library_desk",
  "clinic_desk",
  "fern",
  "storybook",
  "yarn_ball",
  "coffee_machine",
  "microwave",
  "kettle",
  "toaster",
  "lounge_chair",
  "bean_bag",
  "reading_lamp",
  "radio",
  "dresser",
  "nightstand",
  "kitchen_cart",
  "wall_art",
  "jukebox",
  "aquarium",
  "cat_tree",
  "nest_basket",
  "picnic_set",
  "footstool",
  "floor_cushion",
  "side_table",
  "spice_rack",
  "welcome_mat",
  "smoothie_blender",
  "mini_fridge",
  "plush_sofa",
  "love_seat",
  "writing_desk",
  "grand_bookshelf",
  "market_crate",
  "jam_shelf",
  "medicine_cabinet",
  "healing_plant",
  "canopy_bed",
  "vanity",
  "dog_house",
  "scratching_post",
  "telescope",
  "party_lights",
  "arcade_cabinet",
  "hammock",
  "workbench",
  "tool_rack",
  "fishing_spot",
  "craft_table",
  "pottery_wheel",
  "wood_shelf",
  "lantern",
  "sandcastle_kit",
  "wind_chimes",
  "sewing_machine",
  "trampoline",
  "bird_bath",
  "campfire_pit",
  "piano",
  "puzzle_table",
] as const;

const WORLD_PATHS = {
  props: assetUrl("world/props.glb"),
};

type GltfRoot = THREE.Group;

function prepareLoaded(root: THREE.Object3D, flat = false): void {
  root.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    obj.castShadow = true;
    obj.receiveShadow = true;
    if (Array.isArray(obj.material)) {
      obj.material = obj.material.map((m) => {
        const t = ensureToonMaterial(m, { flat });
        t.gradientMap = toonGradientMap();
        return t;
      });
    } else if (obj.material) {
      obj.material = ensureToonMaterial(obj.material, { flat });
      (obj.material as THREE.MeshToonMaterial).gradientMap = toonGradientMap();
    }
  });
}

function deepClone(src: THREE.Object3D): THREE.Group {
  const clone = src.clone(true);
  clone.traverse((obj) => {
    if (!(obj instanceof THREE.Mesh)) return;
    if (Array.isArray(obj.material)) {
      obj.material = obj.material.map((m) => m.clone());
    } else if (obj.material) {
      obj.material = obj.material.clone();
    }
  });
  return clone as THREE.Group;
}

/**
 * GLTF wraps content in a Scene group. Prefer a named root (Root/Hair/Torso)
 * and zero its local transform so parts attach cleanly under Head/body.
 */
function unwrapClone(src: THREE.Object3D, preferredNames: string[]): THREE.Group {
  const scene = deepClone(src);
  for (const name of preferredNames) {
    const named = scene.getObjectByName(name);
    if (named) {
      if (named.parent) named.parent.remove(named);
      named.position.set(0, 0, 0);
      named.rotation.set(0, 0, 0);
      named.scale.set(1, 1, 1);
      return named as THREE.Group;
    }
  }
  scene.position.set(0, 0, 0);
  return scene;
}

class AssetLibraryImpl {
  private loader = new GLTFLoader();
  private templates = new Map<string, GltfRoot>();
  private ready = false;
  private loadPromise: Promise<void> | null = null;

  isReady(): boolean {
    return this.ready;
  }

  /** @param onProgress 0–1 as each asset finishes */
  preload(onProgress?: (p: number) => void): Promise<void> {
    if (this.ready) {
      onProgress?.(1);
      return Promise.resolve();
    }
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = this.loadAll(onProgress).then(() => {
      this.ready = true;
      onProgress?.(1);
    });
    return this.loadPromise;
  }

  private async loadAll(onProgress?: (p: number) => void): Promise<void> {
    const paths: string[] = [
      CHARACTER_PATHS.body,
      ...Object.values(CHARACTER_PATHS.hair),
      ...Object.values(CHARACTER_PATHS.torso),
      ...Object.values(PET_PATHS),
      ...FURNITURE_IDS.map((id) => assetUrl(`furniture/${id}.glb`)),
      WORLD_PATHS.props,
    ];
    let done = 0;
    const total = Math.max(1, paths.length);
    onProgress?.(0);
    await Promise.all(
      paths.map(async (p) => {
        await this.loadOne(p);
        done += 1;
        onProgress?.(done / total);
      }),
    );
  }

  private async loadOne(url: string): Promise<void> {
    try {
      const gltf = await this.loader.loadAsync(url);
      const root = gltf.scene;
      const flat = url.includes("/furniture/") || url.includes("/world/");
      prepareLoaded(root, flat);
      this.templates.set(url, root);
    } catch (err) {
      // New catalog ids may ship before their GLB exists - fall back at clone time.
      if (url.includes("/furniture/")) {
        console.warn(`Furniture asset missing (table fallback): ${url}`);
        return;
      }
      throw err;
    }
  }

  private getTemplate(url: string): GltfRoot {
    const t = this.templates.get(url);
    if (!t) throw new Error(`Asset not loaded: ${url}`);
    return t;
  }

  cloneBody(): THREE.Group {
    return unwrapClone(this.getTemplate(CHARACTER_PATHS.body), ["Root"]);
  }

  cloneHair(style: HairStyle): THREE.Group {
    return unwrapClone(this.getTemplate(CHARACTER_PATHS.hair[style]), ["Hair"]);
  }

  cloneTorso(style: ClothingStyle): THREE.Group {
    return unwrapClone(this.getTemplate(CHARACTER_PATHS.torso[style]), ["Torso"]);
  }

  clonePet(species: "cat" | "dog" | "bunny" | "fox" | "bird"): THREE.Group {
    return unwrapClone(this.getTemplate(PET_PATHS[species]), ["Root"]);
  }

  cloneFurniture(defId: string): THREE.Group {
    const url = assetUrl(`furniture/${defId}.glb`);
    if (!this.templates.has(url)) {
      return unwrapClone(this.getTemplate(assetUrl("furniture/table.glb")), [
        "table",
        "Root",
      ]);
    }
    return unwrapClone(this.getTemplate(url), [defId, "Root"]);
  }

  /** True when a dedicated furniture GLB was loaded (not table fallback). */
  hasFurniture(defId: string): boolean {
    return this.templates.has(assetUrl(`furniture/${defId}.glb`));
  }

  /** Named children from the world props pack (Bush, Flower, Rock, …). */
  cloneWorldProp(name: string): THREE.Group | null {
    const pack = this.getTemplate(WORLD_PATHS.props);
    const src = pack.getObjectByName(name);
    if (!src) return null;
    return deepClone(src);
  }

  findNamed(root: THREE.Object3D, name: string): THREE.Object3D | null {
    return root.getObjectByName(name) ?? null;
  }
}

export const AssetLibrary = new AssetLibraryImpl();
