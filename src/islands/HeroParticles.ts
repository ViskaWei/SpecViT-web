// HeroParticles — Soft glowing Monet-palette particles with Three.js
import * as THREE from 'three';

const container = document.getElementById('hero-particles');
if (container) {
  const isMobile = window.innerWidth < 768;
  const COUNT = isMobile ? 80 : 200;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.z = 5;

  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // Monet palette colors
  const palette = [
    new THREE.Color('#c4b5e0'), // lavender
    new THREE.Color('#a0c8e8'), // sky
    new THREE.Color('#a8dbc5'), // mint
    new THREE.Color('#f0e6a0'), // yellow
    new THREE.Color('#e8b4c8'), // rose
  ];

  // Create particles
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(COUNT * 3);
  const colors = new Float32Array(COUNT * 3);
  const sizes = new Float32Array(COUNT);
  const velocities = new Float32Array(COUNT * 3);

  for (let i = 0; i < COUNT; i++) {
    const i3 = i * 3;
    positions[i3] = (Math.random() - 0.5) * 12;
    positions[i3 + 1] = (Math.random() - 0.5) * 8;
    positions[i3 + 2] = (Math.random() - 0.5) * 6;

    const col = palette[Math.floor(Math.random() * palette.length)];
    colors[i3] = col.r;
    colors[i3 + 1] = col.g;
    colors[i3 + 2] = col.b;

    sizes[i] = Math.random() * 0.15 + 0.05;

    velocities[i3] = (Math.random() - 0.5) * 0.003;
    velocities[i3 + 1] = (Math.random() - 0.5) * 0.002;
    velocities[i3 + 2] = (Math.random() - 0.5) * 0.001;
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

  const material = new THREE.PointsMaterial({
    size: 0.1,
    vertexColors: true,
    transparent: true,
    opacity: 0.6,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    sizeAttenuation: true,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);

  // Mouse parallax
  let mouseX = 0;
  let mouseY = 0;
  container.addEventListener('mousemove', (e) => {
    const rect = container.getBoundingClientRect();
    mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
    mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
  });

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);

    const posArr = geometry.attributes.position.array as Float32Array;
    for (let i = 0; i < COUNT; i++) {
      const i3 = i * 3;
      posArr[i3] += velocities[i3];
      posArr[i3 + 1] += velocities[i3 + 1];
      posArr[i3 + 2] += velocities[i3 + 2];

      // Wrap around
      if (posArr[i3] > 6) posArr[i3] = -6;
      if (posArr[i3] < -6) posArr[i3] = 6;
      if (posArr[i3 + 1] > 4) posArr[i3 + 1] = -4;
      if (posArr[i3 + 1] < -4) posArr[i3 + 1] = 4;
    }
    geometry.attributes.position.needsUpdate = true;

    // Gentle parallax
    camera.position.x += (mouseX * 0.3 - camera.position.x) * 0.02;
    camera.position.y += (-mouseY * 0.2 - camera.position.y) * 0.02;
    camera.lookAt(0, 0, 0);

    renderer.render(scene, camera);
  }

  animate();

  // Resize handler
  window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  });
}
