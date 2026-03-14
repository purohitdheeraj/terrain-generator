import { makeNoise1D } from "./noise.js";
import { findNSE } from "./nse.js";
import { findPSE } from "./pse.js";

const canvas = document.getElementById("terrain");
const generateBtn = document.getElementById("generate");
const simulateBtn = document.getElementById("simulate");
const generationModeSelect = document.getElementById("generation-mode");
const terrainToggle = document.getElementById("toggle-terrain");
const valleysToggle = document.getElementById("toggle-valleys");
const peaksToggle = document.getElementById("toggle-peaks");
const nseToggle = document.getElementById("toggle-nse");
const pseToggle = document.getElementById("toggle-pse");
const ridgeToggle = document.getElementById("toggle-ridge");
const ctx = canvas.getContext("2d");

const WIDTH = canvas.width;
const HEIGHT = canvas.height;

const MIN_HEIGHT = 80;
const MAX_HEIGHT = 340;

let currentTerrain = [];

/** Ms per column during simulate (lower = faster sweep). */
const SIM_MS_PER_COLUMN = 42;
let simulateRafId = 0;
let simulating = false;

function stopSimulation() {
  if (simulateRafId) {
    cancelAnimationFrame(simulateRafId);
    simulateRafId = 0;
  }
  simulating = false;
  if (simulateBtn) simulateBtn.disabled = false;
}

/**
 * Draw only the first `count` bars of `fullHeights` (same layout as full terrain).
 * Optional scan line at the next column for a “generating” feel.
 */
function renderSimFrame(fullHeights, count, mode) {
  const total = fullHeights.length;
  if (!total) return;

  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  const barWidth = Math.floor(WIDTH / total);

  if (terrainToggle.checked) {
    for (let i = 0; i < count; i++) {
      const h = fullHeights[i];
      ctx.fillStyle = `hsl(${110 + h / 8} 50% 45%)`;
      ctx.fillRect(i * barWidth, HEIGHT - h, barWidth - 2, h);
    }
  }

  if (ridgeToggle.checked && count >= 2) {
    drawTerrainRidge(fullHeights.slice(0, count), mode, total);
  }

  // Scan line + soft “unrevealed” tint to the right
  const x = count * barWidth;
  if (count < total) {
    ctx.fillStyle = "rgba(0,0,0,0.06)";
    ctx.fillRect(x, 0, WIDTH - x, HEIGHT);
    ctx.strokeStyle = "hsla(200 90% 45% / 0.85)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x + 1, 0);
    ctx.lineTo(x + 1, HEIGHT);
    ctx.stroke();
  }
}

function startSimulation() {
  const mode = generationModeSelect?.value || "linear";
  const n = 40;
  stopSimulation();
  simulating = true;
  if (simulateBtn) simulateBtn.disabled = true;

  const fullHeights = generateTerrain(n, mode);
  currentTerrain = fullHeights;

  let visible = 0;
  let lastT = performance.now();

  function tick(now) {
    if (!simulating) return;

    while (visible < n && now - lastT >= SIM_MS_PER_COLUMN) {
      lastT += SIM_MS_PER_COLUMN;
      visible++;
    }

    renderSimFrame(fullHeights, visible, mode);

    if (visible >= n) {
      stopSimulation();
      renderTerrainLayers(fullHeights);
      return;
    }

    simulateRafId = requestAnimationFrame(tick);
  }

  renderSimFrame(fullHeights, 0, mode);
  simulateRafId = requestAnimationFrame(tick);
}

/** Utility to generate a terrain array of given size in different modes */
function generateTerrain(n = 80, mode = "linear") {
  if (mode === "random") {
    return Array.from(
      { length: n },
      () =>
        Math.floor(Math.random() * (MAX_HEIGHT - MIN_HEIGHT)) + MIN_HEIGHT,
    );
  }

  if (mode === "perlin" || mode === "simplex") {
    const seed = Math.random() * 1000;
    const noise = makeNoise1D(seed);
    const heights = [];
    const baseScale = mode === "perlin" ? 0.08 : 0.05;
    const octaves = mode === "perlin" ? 4 : 5;
    const gain = mode === "perlin" ? 0.5 : 0.6;
    const lacunarity = mode === "perlin" ? 2.0 : 2.2;

    for (let i = 0; i < n; i++) {
      const x = i * baseScale;
      const v = noise(x, octaves, lacunarity, gain);
      heights.push(MIN_HEIGHT + v * (MAX_HEIGHT - MIN_HEIGHT));
    }
    return heights;
  }

  const start =
    Math.floor(Math.random() * (MAX_HEIGHT - MIN_HEIGHT)) + MIN_HEIGHT;
  const end =
    Math.floor(Math.random() * (MAX_HEIGHT - MIN_HEIGHT)) + MIN_HEIGHT;
  const heights = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    let factor =
      mode === "cosine"
        ? (1 - Math.cos(t * Math.PI)) / 2
        : t;
    const jitter = Math.floor(Math.random() * 30) - 15;
    const value = Math.round(start * (1 - factor) + end * factor + jitter);
    heights.push(Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, value)));
  }

  return heights;
}

function drawTerrain(heights) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  const barWidth = Math.floor(WIDTH / heights.length);

  heights.forEach((h, i) => {
    ctx.fillStyle = `hsl(${110 + h / 8} 50% 45%)`;
    ctx.fillRect(i * barWidth, HEIGHT - h, barWidth - 2, h);
  });
}

function findValleys(arr) {
  return arr.reduce(
    (valleys, height, i, array) =>
      i > 0 &&
      i < array.length - 1 &&
      height < array[i - 1] &&
      height < array[i + 1]
        ? [...valleys, i]
        : valleys,
    [],
  );
}

function drawValleys(heights, valleyIndices) {
  const barWidth = Math.floor(WIDTH / heights.length);
  valleyIndices.forEach((i) => {
    ctx.fillStyle = "hsl(220 90% 56%)";
    ctx.fillRect(i * barWidth, HEIGHT - heights[i], barWidth - 2, heights[i]);
  });
}

function findPeaks(arr) {
  return arr.reduce(
    (peaks, height, i, array) =>
      i > 0 &&
      i < array.length - 1 &&
      height > array[i - 1] &&
      height > array[i + 1]
        ? [...peaks, i]
        : peaks,
    [],
  );
}

function drawPeaks(heights, peakIndices) {
  const barWidth = Math.floor(WIDTH / heights.length);
  peakIndices.forEach((i) => {
    ctx.fillStyle = "hsl(0 75% 56%)";
    ctx.fillRect(i * barWidth, HEIGHT - heights[i], barWidth - 2, heights[i]);
  });
}

function drawNSE(heights, nse) {
  const barWidth = Math.floor(WIDTH / heights.length);
  ctx.strokeStyle = "hsl(52 100% 50%)";
  ctx.lineWidth = 2;
  heights.forEach((_, i) => {
    if (nse[i] !== -1) {
      const x1 = i * barWidth + barWidth / 2;
      const y1 = HEIGHT - heights[i];
      const x2 = nse[i] * barWidth + barWidth / 2;
      const y2 = HEIGHT - heights[nse[i]];
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  });
}

function drawPSE(heights, pse) {
  const barWidth = Math.floor(WIDTH / heights.length);
  ctx.strokeStyle = "hsl(280 70% 60%)";
  ctx.lineWidth = 2;
  heights.forEach((_, i) => {
    if (pse[i] !== -1) {
      const x1 = i * barWidth + barWidth / 2;
      const y1 = HEIGHT - heights[i];
      const x2 = pse[i] * barWidth + barWidth / 2;
      const y2 = HEIGHT - heights[pse[i]];
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }
  });
}

function findSumSubArray(arr) {
  const nse = findNSE(arr);
  const pse = findPSE(arr);
  return arr.reduce((sum, val, i) => {
    const left = i - pse[i];
    const right = nse[i] === -1 ? arr.length - i : nse[i] - i;
    return sum + val * left * right;
  }, 0);
}

function drawOwnership(heights, pse, nse) {
  const barWidth = Math.floor(WIDTH / heights.length);
  const colors = heights.map(
    (_, i) => `hsla(${((i * 360) / heights.length) % 360} 70% 70% / 0.2)`,
  );
  heights.forEach((_, i) => {
    const left = pse[i] + 1;
    const right = nse[i] === -1 ? heights.length - 1 : nse[i] - 1;
    const startX = left * barWidth;
    const width = (right - left + 1) * barWidth;
    const y = HEIGHT - heights[i];
    const height = heights[i];
    ctx.fillStyle = colors[i];
    ctx.fillRect(startX, y, width, height);
  });
}

/**
 * @param {number[]} heights segment to draw
 * @param {string} mode
 * @param {number} [totalBarCount] use full terrain width when simulating a prefix
 */
function drawTerrainRidge(heights, mode = "linear", totalBarCount = null) {
  if (heights.length < 2) return;
  const total = totalBarCount ?? heights.length;
  const barWidth = Math.floor(WIDTH / total);
  const points = heights.map((h, i) => ({
    x: i * barWidth + barWidth / 2,
    y: HEIGHT - h,
  }));
  ctx.strokeStyle = "hsl(0 0% 0%)";
  ctx.lineWidth = 3;
  if (points.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (mode !== "random" && mode !== "linear") {
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cx = (curr.x + next.x) / 2;
      const cy = (curr.y + next.y) / 2;
      ctx.quadraticCurveTo(curr.x, curr.y, cx, cy);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  } else {
    for (let i = 1; i < points.length; i++) {
      ctx.lineTo(points[i].x, points[i].y);
    }
  }

  ctx.stroke();
}

function renderTerrainLayers(terrain) {
  if (!terrain.length) return;

  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  if (terrainToggle.checked) {
    drawTerrain(terrain);
  }

  const valleys = findValleys(terrain);
  const peaks = findPeaks(terrain);
  const nse = findNSE(terrain);
  const pse = findPSE(terrain);

  if (valleysToggle.checked) {
    drawValleys(terrain, valleys);
  }

  if (peaksToggle.checked) {
    drawPeaks(terrain, peaks);
  }

  if (nseToggle.checked) {
    drawNSE(terrain, nse);
  }

  if (pseToggle.checked) {
    drawPSE(terrain, pse);
  }

  if (ridgeToggle.checked) {
    const mode = generationModeSelect?.value || "linear";
    drawTerrainRidge(terrain, mode);
  }

  // drawOwnership(terrain, pse, nse);
}

generateBtn.addEventListener("click", () => {
  stopSimulation();
  const mode = generationModeSelect?.value || "linear";
  currentTerrain = generateTerrain(40, mode);
  renderTerrainLayers(currentTerrain);
});

simulateBtn?.addEventListener("click", () => {
  startSimulation();
});

terrainToggle.addEventListener("change", () => {
  if (!simulating) renderTerrainLayers(currentTerrain);
});
valleysToggle.addEventListener("change", () => {
  if (!simulating) renderTerrainLayers(currentTerrain);
});
peaksToggle.addEventListener("change", () => {
  if (!simulating) renderTerrainLayers(currentTerrain);
});
nseToggle.addEventListener("change", () => {
  if (!simulating) renderTerrainLayers(currentTerrain);
});
pseToggle.addEventListener("change", () => {
  if (!simulating) renderTerrainLayers(currentTerrain);
});
ridgeToggle.addEventListener("change", () => {
  if (!simulating) renderTerrainLayers(currentTerrain);
});
generationModeSelect.addEventListener("change", () => {
  stopSimulation();
  const mode = generationModeSelect.value || "linear";
  currentTerrain = generateTerrain(40, mode);
  renderTerrainLayers(currentTerrain);
});

document.addEventListener("DOMContentLoaded", () => {
  const mode = generationModeSelect.value || "linear";
  currentTerrain = generateTerrain(40, mode);
  renderTerrainLayers(currentTerrain);
});

window.addEventListener("beforeunload", stopSimulation);
