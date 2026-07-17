import * as THREE from '../vendor/three.module.js';
import { RoomEnvironment } from '../vendor/RoomEnvironment.js';
import { SNOISE } from './noise.glsl.js';

const cv = document.getElementById('gl');
const renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));   // clampé, comme Active Theory
renderer.setSize(innerWidth, innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const scene = new THREE.Scene();

/* Le fond est DANS le monde, pas en CSS : un dôme qui entoure la scène.
   C'est capital — le verre en transmission réfracte ce qu'il y a DERRIÈRE lui.
   Un fond CSS reste hors du monde : le verre n'a rien à réfracter et vire au blanc laiteux. */
const dome = new THREE.Mesh(
  new THREE.SphereGeometry(40, 32, 32),
  new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false,
    uniforms: {
      cHaut: { value: new THREE.Color('#2e2470') },
      cCoeur: { value: new THREE.Color('#4a2f8f') },
      cBas: { value: new THREE.Color('#05050d') },
    },
    vertexShader: `varying vec3 vP; void main(){ vP = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 cHaut, cCoeur, cBas; varying vec3 vP;
      void main(){
        vec3 d = normalize(vP);
        float h = d.y * 0.5 + 0.5;
        // une lueur derrière l'objet : c'est elle que le verre va réfracter
        float halo = pow(max(0.0, 1.0 - length(d.xy - vec2(0.0, 0.06)) * 1.35), 3.0);
        vec3 c = mix(cBas, cHaut, smoothstep(0.0, 0.85, h));
        c = mix(c, cCoeur, halo * 0.85);
        gl_FragColor = vec4(c, 1.0);
      }`,
  })
);
scene.add(dome);

const camera = new THREE.PerspectiveCamera(38, innerWidth / innerHeight, 0.1, 100);
camera.position.set(0, 0, 5.2);

/* L'environnement : un studio procédural. C'est lui qui donne la matière —
   sans reflets à réfracter, du verre iridescent n'est qu'une bulle grise. */
const pmrem = new THREE.PMREMGenerator(renderer);
scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

/* LA MATIÈRE. Le cœur du truc : du verre qui interfère.
   L'iridescence n'est pas une couleur d'accent posée dessus — c'est un film mince
   dont l'épaisseur varie, donc la teinte naît de l'angle de vue. Elle est physique. */
const mat = new THREE.MeshPhysicalMaterial({
  color: 0xffffff,
  metalness: 0.0,
  roughness: 0.06,
  transmission: 1.0,
  thickness: 1.6,
  ior: 1.47,
  iridescence: 1.0,
  iridescenceIOR: 1.9,
  iridescenceThicknessRange: [130, 640],
  clearcoat: 1.0,
  clearcoatRoughness: 0.04,
  envMapIntensity: 1.5,
  side: THREE.FrontSide,
});

const uniforms = { uTime: { value: 0 }, uAmp: { value: 0.30 }, uFreq: { value: 1.15 } };

mat.onBeforeCompile = (s) => {
  s.uniforms.uTime = uniforms.uTime;
  s.uniforms.uAmp = uniforms.uAmp;
  s.uniforms.uFreq = uniforms.uFreq;
  s.vertexShader = `uniform float uTime; uniform float uAmp; uniform float uFreq;\n${SNOISE}\n
    vec3 deform(vec3 p){
      float n1 = snoise(p * uFreq + vec3(0.0, uTime * 0.16, 0.0));
      float n2 = snoise(p * (uFreq * 2.7) - vec3(uTime * 0.11));
      return p + normalize(p) * (n1 * uAmp + n2 * uAmp * 0.32);
    }\n` + s.vertexShader;

  // On déforme, PUIS on recalcule la normale par différences finies.
  // Sans ça, l'éclairage reste celui de la sphère d'origine et la matière meurt.
  s.vertexShader = s.vertexShader.replace('#include <beginnormal_vertex>', `
    vec3 objectNormal = vec3(normal);
    {
      float e = 0.0012;
      vec3 p  = deform(position);
      vec3 t1 = normalize(abs(normal.y) < 0.99 ? cross(normal, vec3(0.0,1.0,0.0)) : vec3(1.0,0.0,0.0));
      vec3 t2 = normalize(cross(normal, t1));
      vec3 pa = deform(position + t1 * e);
      vec3 pb = deform(position + t2 * e);
      objectNormal = normalize(cross(pa - p, pb - p));
      if (dot(objectNormal, normal) < 0.0) objectNormal = -objectNormal;
    }
  `);
  s.vertexShader = s.vertexShader.replace('#include <begin_vertex>', `
    vec3 transformed = deform(position);
  `);
};

const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1.25, 128), mat);
scene.add(mesh);

/* Une seule source colorée, jamais deux qui se croisent (= signature « démo three.js »). */
const key = new THREE.DirectionalLight(0xfff2e2, 2.4);
key.position.set(3.5, 2.4, 3.0);
scene.add(key);

/* ── entrée ── */
let mx = 0, my = 0, tx = 0, ty = 0;
addEventListener('pointermove', (e) => {
  tx = (e.clientX / innerWidth - 0.5) * 2;
  ty = (e.clientY / innerHeight - 0.5) * 2;
}, { passive: true });

const wrap = document.getElementById('wrap');
let prog = 0;
function scrollProg() {
  const span = wrap.offsetHeight - innerHeight;
  return Math.min(1, Math.max(0, scrollY / span));
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
}, { passive: true });

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clock = new THREE.Clock();
const lerp = (a, b, t) => a + (b - a) * t;

function frame() {
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;

  prog = lerp(prog, scrollProg(), 0.06);
  uniforms.uTime.value = reduced ? 0 : t;
  // le scroll ne fait pas défiler : il MUTE la matière.
  uniforms.uAmp.value = lerp(0.30, 0.62, prog);
  uniforms.uFreq.value = lerp(1.15, 2.6, prog);
  mat.iridescenceThicknessRange[1] = lerp(640, 300, prog);
  mat.thickness = lerp(1.6, 0.7, prog);
  mat.needsUpdate = false;

  mx = lerp(mx, tx, 0.045); my = lerp(my, ty, 0.045);
  mesh.rotation.y = mx * 0.5 + t * (reduced ? 0 : 0.035);
  mesh.rotation.x = my * 0.36;
  camera.position.z = lerp(5.2, 3.6, prog);

  renderer.render(scene, camera);
  requestAnimationFrame(frame);
}

document.body.classList.add('pret');
frame();
