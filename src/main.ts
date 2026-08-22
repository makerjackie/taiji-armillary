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
  const camTo = new THREE.Vector3(13.6, 8.8, 15.4);
  camera.position.copy(camFrom);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.055;
  controls.minDistance = 8;
  controls.maxDistance = 30;
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
    close: 0,
    flip: 0,
    rings: true,
  };
  let paused = false;
  let introDone = false;

  const skipIntro = () => {
    if (introDone) return;
    introDone = true;
    camera.position.copy(camTo);
    camera.lookAt(0, 0.2, 0);
    controls.enabled = true;
    controls.autoRotate = !paused;
  };

  createStudio((next, reason) => {
    studio = next;
    if (reason === "mode") {
      skipIntro();
      artifact.resetShow();
    }
  });

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
  window.addEventListener("pointermove", (e) => {
    if (e.target !== renderer.domElement) return;
    pointer.x = (e.clientX / window.innerWidth) * 2 - 1;
    pointer.y = (e.clientY / window.innerHeight) * 2 - 1;
  });

  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      paused = !paused;
      if (introDone) controls.autoRotate = !paused;
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
      camera.position.lerpVectors(camFrom, camTo, easeInOutCubic(intro));
      camera.lookAt(0, 0.2, 0);
      if (intro >= 1) {
        introDone = true;
        controls.enabled = true;
        controls.autoRotate = !paused;
        camera.position.copy(camTo);
      }
    } else {
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

    artifact.update(t, dt, intro, paused, studio);
    twinkleStars(stars, t);
    controls.update();
    composer.render();
  }

  frame();
}

boot().catch((err) => {
  console.error(err);
  const loading = document.getElementById("loading");
  if (loading) loading.textContent = "加载失败，请刷新重试";
});
