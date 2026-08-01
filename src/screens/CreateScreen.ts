import type { Screen } from "../app/ScreenRouter";
import type { App } from "../app/App";
import {
  applyClothingStyle,
  BUILD_OPTIONS,
  CLOTHING_OPTIONS,
  defaultPlayerProfile,
  FACE_OPTIONS,
  FOOD_OPTIONS,
  HAIR_COLORS,
  HAIR_OPTIONS,
  HEIGHT_OPTIONS,
  MAX_ANIMALS,
  MAX_TRAITS,
  SEX_OPTIONS,
  SKIN_TONES,
  TRAIT_OPTIONS,
  ANIMAL_OPTIONS,
  hairForSex,
  type PlayerLook,
  type PlayerProfile,
  SEX_LABELS,
  HEIGHT_LABELS,
  BUILD_LABELS,
  FACE_LABELS,
  HAIR_LABELS,
  CLOTHING_PALETTES,
} from "../data/character";
import { createActor } from "../mesh/actors";
import { Audio } from "../audio/AudioManager";
import { muteButtonHtml, wireMute } from "../ui/mute";
import { mountPageZoomBanner } from "../ui/pageZoom";
import * as THREE from "three";

export function createCreateScreen(
  app: App,
  goto: (id: "title" | "world", data?: { profile?: PlayerProfile }) => void,
): Screen {
  let unMute: (() => void) | null = null;
  let unZoomBanner: (() => void) | null = null;
  let look: PlayerLook = defaultPlayerProfile().look;
  let name = "Pippin";
  let traits: string[] = ["Friendly", "Curious"];
  let food = "Pancakes";
  let animals: string[] = ["Cats"];
  let previewActor = createActor(look);
  let previewRenderer: THREE.WebGLRenderer | null = null;
  let previewScene: THREE.Scene | null = null;
  let previewCam: THREE.PerspectiveCamera | null = null;
  let resizeObserver: ResizeObserver | null = null;
  let raf = 0;
  let spin = 0;
  let dragYaw = 0;

  const cycle = <T>(arr: readonly T[], cur: T, dir: 1 | -1): T => {
    const i = arr.indexOf(cur as T);
    const n = (i + dir + arr.length) % arr.length;
    return arr[n];
  };

  return {
    id: "create",
    mount(root) {
      void app;
      Audio.playMusic("create");
      root.innerHTML = `
        <div class="ll-screen ll-create">
          <header class="ll-create-title">
            <h2>Create your little life</h2>
            <p>Shape how they look, feel, and who they adore.</p>
          </header>
          <div class="ll-create-layout">
            <aside class="ll-create-preview">
              <div class="ll-preview-stage">
                <canvas class="ll-preview-canvas"></canvas>
              </div>
              <div class="ll-preview-meta">
                <p class="ll-preview-name" data-plate>${name}</p>
                <p class="ll-preview-caption" data-summary></p>
                <p class="ll-preview-hint">Drag to turn</p>
              </div>
            </aside>
            <div class="ll-create-form">
              <div class="ll-create-scroll">
                <section class="ll-section ll-section-name">
                  <label class="ll-field-label" for="ll-name">Name</label>
                  <div class="ll-name-row">
                    <input id="ll-name" class="ll-input" maxlength="12" value="${name}" data-field="name" aria-label="Name" />
                    <button type="button" class="ll-dice" data-act="random">Surprise me</button>
                  </div>
                </section>
                <section class="ll-section">
                  <h3>Appearance</h3>
                  <div class="ll-cycle-grid" data-cycles></div>
                </section>
                <section class="ll-section">
                  <h3>Traits <em>up to ${MAX_TRAITS}</em></h3>
                  <div class="ll-chip-row" data-traits></div>
                </section>
                <section class="ll-section">
                  <h3>Favourites</h3>
                  <div class="ll-fav-grid">
                    <div class="ll-fav-block">
                      <p class="ll-fav-label">Food</p>
                      <div class="ll-chip-row" data-food></div>
                    </div>
                    <div class="ll-fav-block">
                      <p class="ll-fav-label">Animals <em>up to ${MAX_ANIMALS}</em></p>
                      <div class="ll-chip-row" data-animals></div>
                    </div>
                  </div>
                </section>
              </div>
            </div>
          </div>
          <footer class="ll-create-foot">
            <button type="button" class="ll-btn" data-act="back">Back</button>
            <button type="button" class="ll-btn ll-btn-primary" data-act="start">Start Life</button>
          </footer>
          ${muteButtonHtml()}
        </div>
      `;
      unMute = wireMute(root.querySelector(".ll-mute") as HTMLElement);
      unZoomBanner = mountPageZoomBanner(root.querySelector(".ll-create") as HTMLElement);

      const canvas = root.querySelector(".ll-preview-canvas") as HTMLCanvasElement;
      const stage = canvas.parentElement as HTMLElement;
      previewRenderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      previewRenderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      previewRenderer.shadowMap.enabled = true;
      previewRenderer.shadowMap.type = THREE.PCFSoftShadowMap;
      previewScene = new THREE.Scene();
      // Match TownRenderer day ratios so create preview matches in-world look
      previewScene.add(new THREE.HemisphereLight(0xfff2dd, 0x7a9e6a, 0.85));
      const sun = new THREE.DirectionalLight(0xfff0d0, 1.05);
      sun.position.set(40, 70, 50);
      sun.castShadow = true;
      sun.shadow.mapSize.set(1024, 1024);
      sun.shadow.camera.near = 5;
      sun.shadow.camera.far = 200;
      sun.shadow.camera.left = -40;
      sun.shadow.camera.right = 40;
      sun.shadow.camera.top = 40;
      sun.shadow.camera.bottom = -40;
      sun.shadow.bias = -0.001;
      previewScene.add(sun);
      const fill = new THREE.DirectionalLight(0xffffff, 0.35);
      fill.position.set(-15, 25, 80);
      previewScene.add(fill);
      const rim = new THREE.DirectionalLight(0xd8ecff, 0.22);
      rim.position.set(-50, 35, -40);
      previewScene.add(rim);

      // Soft ground plane for contact shadow (actor doesn't float)
      const ground = new THREE.Mesh(
        new THREE.CircleGeometry(28, 32),
        new THREE.MeshLambertMaterial({ color: 0xe8dfc8 }),
      );
      ground.rotation.x = -Math.PI / 2;
      ground.position.y = -0.05;
      ground.receiveShadow = true;
      previewScene.add(ground);

      previewCam = new THREE.PerspectiveCamera(32, 1, 0.1, 400);
      previewActor = createActor(look);
      previewActor.root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });
      previewScene.add(previewActor.root);

      /** Fit the whole body in frame regardless of height/hair choices. */
      const frameActor = () => {
        if (!previewCam) return;
        const restore = previewActor.root.rotation.y;
        previewActor.root.rotation.y = 0;
        previewActor.root.updateWorldMatrix(true, true);
        const box = new THREE.Box3().setFromObject(previewActor.root);
        previewActor.root.rotation.y = restore;
        if (box.isEmpty()) return;

        const size = box.getSize(new THREE.Vector3());
        const center = box.getCenter(new THREE.Vector3());
        const fov = (previewCam.fov * Math.PI) / 180;
        const margin = 1.55;
        const distV = (size.y * margin) / (2 * Math.tan(fov / 2));
        const distH =
          (size.x * margin) / (2 * Math.tan(fov / 2) * previewCam.aspect);
        const dist = Math.max(distV, distH, 52);
        previewCam.position.set(center.x, center.y + size.y * 0.06, center.z + dist);
        previewCam.lookAt(center.x, center.y, center.z);
        previewCam.updateProjectionMatrix();
      };

      const resizePreview = () => {
        if (!previewRenderer || !previewCam) return;
        const w = Math.max(140, Math.floor(stage.clientWidth));
        const h = Math.max(180, Math.floor(stage.clientHeight));
        previewRenderer.setSize(w, h, false);
        previewCam.aspect = w / h;
        frameActor();
      };
      resizeObserver = new ResizeObserver(resizePreview);
      resizeObserver.observe(stage);
      resizePreview();

      let dragging = false;
      let lastX = 0;
      canvas.addEventListener("pointerdown", (e) => {
        dragging = true;
        lastX = e.clientX;
        canvas.setPointerCapture(e.pointerId);
      });
      canvas.addEventListener("pointermove", (e) => {
        if (!dragging) return;
        dragYaw += (e.clientX - lastX) * 0.012;
        lastX = e.clientX;
      });
      const endDrag = () => {
        dragging = false;
      };
      canvas.addEventListener("pointerup", endDrag);
      canvas.addEventListener("pointercancel", endDrag);

      const tick = () => {
        if (!dragging) spin += 0.012;
        previewActor.root.rotation.y = dragYaw + Math.sin(spin) * 0.35;
        previewActor.update(1 / 60);
        previewRenderer?.render(previewScene!, previewCam!);
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);

      const cyclesEl = root.querySelector("[data-cycles]")!;

      type Field = {
        label: string;
        value: () => string;
        /** Optional colour dot, for skin and hair pickers. */
        swatch?: () => number;
        left: () => void;
        right: () => void;
      };

      const fields: Field[] = [
        {
          label: "Identity",
          value: () => SEX_LABELS[look.sex],
          left: () => {
            const sex = cycle(SEX_OPTIONS, look.sex, -1);
            look = { ...look, sex, hairStyle: hairForSex(sex) };
          },
          right: () => {
            const sex = cycle(SEX_OPTIONS, look.sex, 1);
            look = { ...look, sex, hairStyle: hairForSex(sex) };
          },
        },
        {
          label: "Height",
          value: () => HEIGHT_LABELS[look.height],
          left: () => {
            look = { ...look, height: cycle(HEIGHT_OPTIONS, look.height, -1) };
          },
          right: () => {
            look = { ...look, height: cycle(HEIGHT_OPTIONS, look.height, 1) };
          },
        },
        {
          label: "Build",
          value: () => BUILD_LABELS[look.build],
          left: () => {
            look = { ...look, build: cycle(BUILD_OPTIONS, look.build, -1) };
          },
          right: () => {
            look = { ...look, build: cycle(BUILD_OPTIONS, look.build, 1) };
          },
        },
        {
          label: "Face",
          value: () => FACE_LABELS[look.face],
          left: () => {
            look = { ...look, face: cycle(FACE_OPTIONS, look.face, -1) };
          },
          right: () => {
            look = { ...look, face: cycle(FACE_OPTIONS, look.face, 1) };
          },
        },
        {
          label: "Hair",
          value: () => HAIR_LABELS[look.hairStyle],
          left: () => {
            look = { ...look, hairStyle: cycle(HAIR_OPTIONS, look.hairStyle, -1) };
          },
          right: () => {
            look = { ...look, hairStyle: cycle(HAIR_OPTIONS, look.hairStyle, 1) };
          },
        },
        {
          label: "Skin",
          value: () =>
            SKIN_TONES.find((s) => s.skin === look.skin)?.label ?? "Skin",
          swatch: () => look.skin,
          left: () => {
            const i = Math.max(0, SKIN_TONES.findIndex((s) => s.skin === look.skin));
            const s = SKIN_TONES[(i - 1 + SKIN_TONES.length) % SKIN_TONES.length];
            look = { ...look, skin: s.skin };
          },
          right: () => {
            const i = Math.max(0, SKIN_TONES.findIndex((s) => s.skin === look.skin));
            const s = SKIN_TONES[(i + 1) % SKIN_TONES.length];
            look = { ...look, skin: s.skin };
          },
        },
        {
          label: "Hair color",
          value: () =>
            HAIR_COLORS.find((h) => h.color === look.hair)?.label ?? "Hair",
          swatch: () => look.hair,
          left: () => {
            const i = Math.max(0, HAIR_COLORS.findIndex((h) => h.color === look.hair));
            const h = HAIR_COLORS[(i - 1 + HAIR_COLORS.length) % HAIR_COLORS.length];
            look = { ...look, hair: h.color };
          },
          right: () => {
            const i = Math.max(0, HAIR_COLORS.findIndex((h) => h.color === look.hair));
            const h = HAIR_COLORS[(i + 1) % HAIR_COLORS.length];
            look = { ...look, hair: h.color };
          },
        },
        {
          label: "Style",
          value: () => CLOTHING_PALETTES[look.clothing].label,
          left: () => {
            look = applyClothingStyle(
              look,
              cycle(CLOTHING_OPTIONS, look.clothing, -1),
            );
          },
          right: () => {
            look = applyClothingStyle(
              look,
              cycle(CLOTHING_OPTIONS, look.clothing, 1),
            );
          },
        },
      ];

      const renderCycles = () => {
        cyclesEl.innerHTML = "";
        for (const f of fields) {
          const row = document.createElement("div");
          row.className = "ll-cycle";
          const dot = f.swatch
            ? `<i class="ll-swatch" style="background:#${f
                .swatch()
                .toString(16)
                .padStart(6, "0")}"></i>`
            : "";
          row.innerHTML = `<span class="ll-cycle-label">${f.label}</span><div class="ll-cycle-control"><button type="button" data-dir="-1" aria-label="Previous ${f.label}">‹</button><strong>${dot}${f.value()}</strong><button type="button" data-dir="1" aria-label="Next ${f.label}">›</button></div>`;
          row.querySelectorAll("button").forEach((btn) => {
            btn.addEventListener("click", () => {
              Audio.sfx("ui");
              if (btn.getAttribute("data-dir") === "-1") f.left();
              else f.right();
              refreshLook();
            });
          });
          cyclesEl.appendChild(row);
        }
      };

      const traitsEl = root.querySelector("[data-traits]")!;
      const foodEl = root.querySelector("[data-food]")!;
      const animalsEl = root.querySelector("[data-animals]")!;
      const summaryEl = root.querySelector("[data-summary]") as HTMLElement;
      const plateEl = root.querySelector("[data-plate]") as HTMLElement;

      const updateSummary = () => {
        plateEl.textContent = name.trim() || "Someone";
        const looks = [
          HEIGHT_LABELS[look.height],
          BUILD_LABELS[look.build],
          CLOTHING_PALETTES[look.clothing].label,
        ].join(" · ");
        const likes = [
          traits.length ? traits.join(" · ") : "no traits yet",
          `loves ${food}`,
          animals.length ? animals.join(" & ") : "any animal",
        ].join(" — ");
        summaryEl.textContent = `${looks}\n${likes}`;
      };

      /** Rebuild mesh, refit camera and refresh dependent UI after a look change. */
      const refreshLook = () => {
        previewActor.rebuild(look);
        frameActor();
        renderCycles();
        updateSummary();
      };

      const renderChips = () => {
        traitsEl.innerHTML = "";
        for (const t of TRAIT_OPTIONS) {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "ll-chip" + (traits.includes(t) ? " is-on" : "");
          b.textContent = t;
          b.addEventListener("click", () => {
            Audio.sfx("ui");
            if (traits.includes(t)) traits = traits.filter((x) => x !== t);
            else if (traits.length < MAX_TRAITS) traits = [...traits, t];
            renderChips();
          });
          traitsEl.appendChild(b);
        }
        foodEl.innerHTML = "";
        for (const f of FOOD_OPTIONS) {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "ll-chip" + (food === f ? " is-on" : "");
          b.textContent = f;
          b.addEventListener("click", () => {
            Audio.sfx("ui");
            food = f;
            renderChips();
          });
          foodEl.appendChild(b);
        }
        animalsEl.innerHTML = "";
        for (const a of ANIMAL_OPTIONS) {
          const b = document.createElement("button");
          b.type = "button";
          b.className = "ll-chip" + (animals.includes(a) ? " is-on" : "");
          b.textContent = a;
          b.addEventListener("click", () => {
            Audio.sfx("ui");
            if (animals.includes(a)) animals = animals.filter((x) => x !== a);
            else if (animals.length < MAX_ANIMALS) animals = [...animals, a];
            renderChips();
          });
          animalsEl.appendChild(b);
        }
        updateSummary();
      };
      renderChips();
      renderCycles();

      root.querySelector('[data-act="random"]')!.addEventListener("click", () => {
        Audio.sfx("confirm");
        const pick = <T>(arr: readonly T[]): T =>
          arr[Math.floor(Math.random() * arr.length)];
        const sex = pick(SEX_OPTIONS);
        const skin = pick(SKIN_TONES).skin;
        const luma = (c: number) =>
          0.3 * ((c >> 16) & 0xff) + 0.6 * ((c >> 8) & 0xff) + 0.1 * (c & 0xff);
        // Keep hair readable against the chosen skin tone
        const hairChoices = HAIR_COLORS.filter(
          (h) => Math.abs(luma(h.color) - luma(skin)) > 28,
        );
        look = applyClothingStyle(
          {
            ...look,
            sex,
            height: pick(HEIGHT_OPTIONS),
            build: pick(BUILD_OPTIONS),
            face: pick(FACE_OPTIONS),
            hairStyle: pick(HAIR_OPTIONS),
            skin,
            hair: pick(hairChoices.length ? hairChoices : HAIR_COLORS).color,
          },
          pick(CLOTHING_OPTIONS),
        );
        refreshLook();
      });

      (root.querySelector('[data-field="name"]') as HTMLInputElement).addEventListener(
        "input",
        (e) => {
          name = (e.target as HTMLInputElement).value.slice(0, 12);
          updateSummary();
        },
      );

      root.querySelector('[data-act="back"]')!.addEventListener("click", () => {
        Audio.sfx("ui");
        goto("title");
      });
      root.querySelector('[data-act="start"]')!.addEventListener("click", () => {
        if (!name.trim()) {
          Audio.sfx("deny");
          return;
        }
        if (traits.length === 0) traits = ["Friendly"];
        if (animals.length === 0) animals = ["Cats"];
        Audio.sfx("confirm");
        goto("world", {
          profile: {
            name: name.trim(),
            look: structuredClone(look),
            traits: [...traits],
            favouriteFood: food,
            favouriteAnimals: [...animals],
          },
        });
      });
    },
    unmount() {
      cancelAnimationFrame(raf);
      resizeObserver?.disconnect();
      resizeObserver = null;
      unMute?.();
      unMute = null;
      unZoomBanner?.();
      unZoomBanner = null;
      previewActor.dispose();
      previewRenderer?.dispose();
      previewRenderer = null;
      previewScene = null;
      previewCam = null;
    },
  };
}
