import "./style.css";
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { createArtifact, createStarfield } from "./artifact";

async function waitForFonts() {
  try {
    await document.fonts.load(`700 64px "Noto Serif SC"`);
    await document.fonts.ready;
  } catch {
    /* system fonts still work */
  }
}

function setupLights(scene: THREE.Scene) {
  scene.add(new THREE.AmbientLight(0x3a2a1c, 0.45));

  const key = new THREE.DirectionalLight(0xffe2b8, 2.4);
  key.position.set(8, 14, 10);
  scene.add(key);

  const rim = new THREE.DirectionalLight(0x88aacc, 0.85);
  rim.position.set(-12, 4, -8);
  scene.add(rim);

  const fill = new THREE.DirectionalLight(0xffaa66, 0.55);
  fill.position.set(0, -6, 8);
  scene.add(fill);

  const spark = new THREE.PointLight(0xffcc88, 8, 18, 2);
  spark.position.set(2.5, 3.2, 3.5);
  scene.add(spark);

  return spark;
}

async function boot() {
  await waitForFonts();

  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x000000, 1);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.02;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  document.getElementById("app")!.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x000000, 0.004);

  const camera = new THREE.PerspectiveCamera(
    36,
    window.innerWidth / window.innerHeight,
    0.1,
    200,
  );
  camera.position.set(14.5, 10.2, 16.2);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.minDistance = 9;
  controls.maxDistance = 28;
  controls.target.set(0, 0.1, 0);
  controls.autoRotate = true;
  controls.autoRotateSpeed = 0.4;

  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = new RoomEnvironment();
  scene.environment = pmrem.fromScene(env, 0.04).texture;
  env.dispose();

  const spark = setupLights(scene);
  scene.add(createStarfield());

  const { root, spinning } = createArtifact();
  scene.add(root);

  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(
    new THREE.Vector2(window.innerWidth, window.innerHeight),
    0.16,
    0.4,
    0.88,
  );
  composer.addPass(bloom);
  composer.addPass(new OutputPass());

  let paused = false;
  window.addEventListener("keydown", (e) => {
    if (e.code === "Space") {
      e.preventDefault();
      paused = !paused;
      controls.autoRotate = !paused;
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

  const clock = new THREE.Clock();

  function frame() {
    requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), 0.05);
    const t = clock.elapsedTime;
    controls.update();

    spark.position.set(
      Math.cos(t * 0.35) * 4.5,
      3.2 + Math.sin(t * 0.5) * 0.8,
      Math.sin(t * 0.35) * 4.5,
    );

    if (!paused) {
      for (const part of spinning) {
        part.object.rotateOnAxis(part.axis, part.speed * dt);
      }
    }

    composer.render();
  }

  frame();
}

boot().catch((err) => {
  console.error(err);
  const loading = document.getElementById("loading");
  if (loading) loading.textContent = "加载失败，请刷新重试";
});
