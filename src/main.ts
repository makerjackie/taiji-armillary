import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { createArtifact } from "./artifact";
import { createStarfield, easeInOutCubic, twinkleStars } from "./fx";
import { createStudio, type Studio } from "./studio";
import type { LayerId } from "./data";

async function waitForFonts() {
  try {
    await document.fonts.load(`700 64px "Noto Serif SC"`);
    await document.fonts.ready;
  } catch {
    /* system fonts still work */
  }
}

async function boot() {
  await waitForFonts();

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.getElementById("app")!.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.003);

  const camera = new THREE.PerspectiveCamera(
    34,
    window.innerWidth / window.innerHeight,
    0.1,
    220,
  );
  const camFrom = new THREE.Vector3(0.8, 36, 2.2);
  const camOrbit = new THREE.Vector3(13.6, 8.8, 15.4);
  const camZenith = new THREE.Vector3(0.18, 22.4, 0.22);
  camera.position.copy(camFrom);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.minDistance = 4;
  controls.maxDistance = 36;
  controls.target.set(0, 0.15, 0);
  controls.autoRotate = false;
  controls.autoRotateSpeed = 0.4;
  controls.enabled = false;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new RoomEnvironment();
  scene.environment = pmrem.fromScene(env, 0.04).texture;
  env.dispose();

  scene.add(new THREE.AmbientLight(0x2c2118, 0.42));
  const key = new THREE.DirectionalLight(0xffe6c4, 2.35);
  key.position.set(9, 15, 11);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x7f9eb8, 0.7);
  rim.position.set(-12, 4, -8);
  scene.add(rim);
  const fill = new THREE.DirectionalLight(0xc48a55, 0.35);
  fill.position.set(2, -6, 7);
  scene.add(fill);

  const stars = createStarfield();
  scene.add(stars);

  const artifact = createArtifact();
  scene.add(artifact.root);

  let studio: Studio = {
    mode: "A",
    spin: 1,
    fold: 0,
    counter: true,
    rings: true,
    zenith: false,
  };
  let paused = false;
  let introDone = false;
  let pinned: LayerId | null = null;
  const camGoal = camOrbit.clone();

  const skipIntro = () => {
    if (introDone) return;
    introDone = true;
    camera.position.copy(studio.zenith ? camZenith : camOrbit);
    camera.lookAt(0, 0.2, 0);
    controls.enabled = true;
    controls.autoRotate = !paused && !studio.zenith;
  };

  const frameCamera = (id: LayerId | null) => {
    if (id === null) {
      camGoal.copy(studio.zenith ? camZenith : camOrbit);
      return;
    }
    if (id === "rings") {
      camGoal.set(12.6, 11.2, 13.4);
      return;
    }
    const r = artifact.layerRadius(id);
    const dist = THREE.MathUtils.clamp(r * 5.6, 13, 24);
    camGoal.set(dist * 0.22, dist * 0.86, dist * 0.48);
  };

  const studioUi = createStudio(
    (next, reason) => {
      const zenithChanged = next.zenith !== studio.zenith;
      studio = next;
      if (reason === "mode") skipIntro();
      if (introDone && (reason === "mode" || zenithChanged) && pinned === null) {
        camera.position.copy(studio.zenith ? camZenith : camOrbit);
        controls.target.set(0, 0.15, 0);
        controls.update();
      }
      if (pinned === null) frameCamera(null);
    },
    (id, pin) => {
      artifact.setFocus(id);
      if (pin) {
        pinned = id;
        studioUi.setPinned(id);
        frameCamera(id);
        skipIntro();
        controls.autoRotate = false;
      }
    },
  );

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(
    new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      0.18,
      0.32,
      0.86,
    ),
  );
  composer.addPass(new OutputPass());

  const pointer = new THREE.Vector2(0, 0);
  const ndc = new THREE.Vector2();
  const raycaster = new THREE.Raycaster();

  const setNdc = (e: PointerEvent) => {
    const r = renderer.domElement.getBoundingClientRect();
    ndc.x = ((e.clientX - r.left) / r.width) * 2 - 1;
    ndc.y = -((e.clientY - r.top) / r.height) * 2 + 1;
  };

  window.addEventListener("pointermove", (e) => {
    if (e.target !== renderer.domElement) return;
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
    if (pinned !== null) return;
    setNdc(e);
    raycaster.setFromCamera(ndc, camera);
    const id = artifact.pick(raycaster);
    artifact.setFocus(id);
    studioUi.setHover(id);
    renderer.domElement.style.cursor = id !== null ? "pointer" : "";
  });

  renderer.domElement.addEventListener("pointerdown", (e) => {
    if (e.button !== 0) return;
    setNdc(e);
    raycaster.setFromCamera(ndc, camera);
    const id = artifact.pick(raycaster);
    if (id !== null) {
      pinned = id;
      artifact.setFocus(id);
      studioUi.setPinned(id);
      frameCamera(id);
      skipIntro();
      controls.autoRotate = false;
    } else if (pinned !== null) {
      pinned = null;
      artifact.setFocus(null);
      studioUi.setPinned(null);
      frameCamera(null);
    }
  });

  renderer.domElement.addEventListener("pointerleave", () => {
    if (pinned !== null) return;
    artifact.setFocus(null);
    studioUi.setHover(null);
    renderer.domElement.style.cursor = "";
  });

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      paused = !paused;
      if (introDone) controls.autoRotate = !paused && !studio.zenith;
    }
  });

  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    composer.setSize(window.innerWidth, window.innerHeight);
  });

  const loading = document.getElementById("loading")!;
  loading.classList.add("is-done");
  setTimeout(() => loading.remove(), 900);
  document.getElementById("hud")?.classList.add("is-ready");

  const clock = new THREE.Clock();
  const introDur = 5.6;

  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;

    let intro = 1;
    if (!introDone) {
      intro = Math.min(1, t / introDur);
      camera.position.lerpVectors(camFrom, camOrbit, easeInOutCubic(intro));
      camera.lookAt(0, 0.2, 0);
      if (intro >= 1) {
        introDone = true;
        controls.enabled = true;
        controls.autoRotate = !paused && !studio.zenith;
        camera.position.copy(camOrbit);
      }
    } else {
      const tracking = pinned !== null && camera.position.distanceTo(camGoal) > 0.18;
      if (tracking) {
        controls.enabled = false;
        controls.autoRotate = false;
        camera.position.lerp(camGoal, 1 - Math.exp(-dt * 3.1));
        camera.lookAt(0, 0.12, 0);
        controls.target.set(0, 0.12, 0);
        artifact.root.rotation.x = THREE.MathUtils.damp(artifact.root.rotation.x, 0, 4, dt);
        artifact.root.rotation.z = THREE.MathUtils.damp(artifact.root.rotation.z, 0, 4, dt);
      } else if (studio.zenith) {
        controls.enabled = true;
        controls.autoRotate = false;
        controls.minPolarAngle = 0;
        controls.maxPolarAngle = 0.42;
        artifact.root.rotation.x = THREE.MathUtils.damp(artifact.root.rotation.x, 0, 4, dt);
        artifact.root.rotation.z = THREE.MathUtils.damp(artifact.root.rotation.z, 0, 4, dt);
      } else {
        controls.enabled = true;
        controls.minPolarAngle = 0;
        controls.maxPolarAngle = Math.PI;
        if (!paused && pinned === null) controls.autoRotate = true;
        artifact.root.rotation.x = THREE.MathUtils.damp(
          artifact.root.rotation.x,
          pointer.y * 0.08,
          3.2,
          dt,
        );
        artifact.root.rotation.z = THREE.MathUtils.damp(
          artifact.root.rotation.z,
          -pointer.x * 0.07,
          3.2,
          dt,
        );
      }
    }

    artifact.update(t, dt, intro, paused, studio);
    twinkleStars(stars, t);
    const tracking = introDone && pinned !== null && camera.position.distanceTo(camGoal) > 0.25;
    if (!tracking) controls.update();
    composer.render();
  }

  frame();
}

boot().catch((err) => {
  console.error(err);
  const loading = document.getElementById("loading");
  if (loading) loading.textContent = "加载失败，请刷新重试";
});
