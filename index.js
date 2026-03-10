const canvas = document.getElementById("terrain");
const generateBtn = document.getElementById("generate");
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

let currentTerrain = [];

/** Utility to generate a terrain array of given size in different modes */
function generateTerrain(n = 80, mode = "linear") {
  if (mode === "random") {
    // Independent random heights
    return Array.from(
      { length: n },
      () => Math.floor(Math.random() * 300) + 20,
    );
  }

  // Start/end heights for interpolated modes
  const start = Math.floor(Math.random() * 300) + 20;
  const end = Math.floor(Math.random() * 300) + 20;
  const heights = [];
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);

    let factor;
    if (mode === "cosine") {
      // Cosine interpolation factor
      factor = (1 - Math.cos(t * Math.PI)) / 2;
    } else {
      // Linear interpolation factor
      factor = t;
    }

    const jitter = Math.floor(Math.random() * 30) - 15;
    const value = Math.round(start * (1 - factor) + end * factor + jitter);
    heights.push(Math.max(20, value));
  }

  return heights;
}

/** Draw the terrain as green bars on canvas */
function drawTerrain(heights) {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  const barWidth = Math.floor(WIDTH / heights.length);

  heights.forEach((h, i) => {
    ctx.fillStyle = `hsl(${110 + h / 8} 50% 45%)`;
    ctx.fillRect(i * barWidth, HEIGHT - h, barWidth - 2, h);
  });
}

/** Find valleys (local minima) in the terrain */
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

/** Highlight valleys in blue on the terrain */
function drawValleys(heights, valleyIndices) {
  const barWidth = Math.floor(WIDTH / heights.length);
  valleyIndices.forEach((i) => {
    ctx.fillStyle = "hsl(220 90% 56%)";
    ctx.fillRect(i * barWidth, HEIGHT - heights[i], barWidth - 2, heights[i]);
  });
}

/** Find peaks (local maxima) in the terrain */
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

/** Highlight peaks in red on the terrain */
function drawPeaks(heights, peakIndices) {
  const barWidth = Math.floor(WIDTH / heights.length);
  peakIndices.forEach((i) => {
    ctx.fillStyle = "hsl(0 75% 56%)";
    ctx.fillRect(i * barWidth, HEIGHT - heights[i], barWidth - 2, heights[i]);
  });
}

/** Draw lines from each bar to its Next Smaller Element (NSE) */
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

/** Return array of Next Smaller Element indices for each element */
function findNSE(arr) {
  const stack = [],
    ans = Array(arr.length).fill(-1);
  for (let i = arr.length - 1; i >= 0; i--) {
    while (stack.length && arr[stack[stack.length - 1]] >= arr[i]) stack.pop();
    if (stack.length) ans[i] = stack[stack.length - 1];
    stack.push(i);
  }
  return ans;
}

/** Return array of Previous Smaller Element indices for each element */
function findPSE(arr) {
  const stack = [],
    ans = Array(arr.length).fill(-1);
  for (let i = 0; i < arr.length; i++) {
    while (stack.length && arr[stack[stack.length - 1]] > arr[i]) stack.pop();
    if (stack.length) ans[i] = stack[stack.length - 1];
    stack.push(i);
  }
  return ans;
}

/** Draw lines from each bar to its Previous Smaller Element (PSE) */
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

/**
 * Sum of minimum values over all subarrays of given array.
 * @returns {number} The sum for all subarrays.
 */
function findSumSubArray(arr) {
  const nse = findNSE(arr);
  const pse = findPSE(arr);
  return arr.reduce((sum, val, i) => {
    const left = i - pse[i];
    const right = nse[i] === -1 ? arr.length - i : nse[i] - i;
    return sum + val * left * right;
  }, 0);
}

/**
 * Highlight the "ownership" of range where a bar is the minimum.
 * Each bar owns a rectangle between its PSE+1 and NSE-1, at its height.
 */
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

/** Draw the ridge of the terrain; sharp for linear/random, smooth for cosine */
function drawTerrainRidge(heights, mode = "linear") {
  const barWidth = Math.floor(WIDTH / heights.length);
  const points = heights.map((h, i) => ({
    x: i * barWidth + barWidth / 2,
    y: HEIGHT - h,
  }));
  ctx.strokeStyle = "hsl(0 0% 0%)";
  ctx.lineWidth = 3;
  if (points.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);

  if (mode === "cosine") {
    // Smooth (quadratic) curve between points
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cx = (curr.x + next.x) / 2;
      const cy = (curr.y + next.y) / 2;
      ctx.quadraticCurveTo(curr.x, curr.y, cx, cy);
    }
    ctx.lineTo(points[points.length - 1].x, points[points.length - 1].y);
  } else {
    // Sharp, piecewise-linear ridge (for random/linear modes)
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

  drawOwnership(terrain, pse, nse);
}

/** Main event: redraw all features on new random terrain */
generateBtn.addEventListener("click", () => {
  const mode = generationModeSelect?.value || "linear";
  currentTerrain = generateTerrain(40, mode);
  renderTerrainLayers(currentTerrain);
});

terrainToggle.addEventListener("change", () =>
  renderTerrainLayers(currentTerrain),
);
valleysToggle.addEventListener("change", () =>
  renderTerrainLayers(currentTerrain),
);
peaksToggle.addEventListener("change", () =>
  renderTerrainLayers(currentTerrain),
);
nseToggle.addEventListener("change", () => renderTerrainLayers(currentTerrain));
pseToggle.addEventListener("change", () => renderTerrainLayers(currentTerrain));
ridgeToggle.addEventListener("change", () =>
  renderTerrainLayers(currentTerrain),
);
generationModeSelect.addEventListener("change", () => {
  const mode = generationModeSelect.value || "linear";
  currentTerrain = generateTerrain(40, mode);
  renderTerrainLayers(currentTerrain);
});

// Automatically generate terrain and render on first page load
document.addEventListener("DOMContentLoaded", () => {
  const mode = generationModeSelect.value || "linear";
  currentTerrain = generateTerrain(40, mode);
  renderTerrainLayers(currentTerrain);
});
