# Terrain Generator

## Overview

This is a small **browser demo** that builds a **1D terrain** as a row of bar heights on a canvas. You can switch how heights are generated (random, linear/cosine interpolation, or noise-based “Perlin / Simplex” style), then **visualize structure** on that terrain:

- **Valleys** — local minima  
- **Peaks** — local maxima  
- **NSE / PSE** — next and previous *strictly smaller* neighbor indices (classic stack problems)  
- **Ridge** — polyline along the tops of the bars  
- **Ownership overlay** — each bar’s “range” where it is the minimum between its PSE and NSE boundaries (see below)

Heights are clamped between **`MIN_HEIGHT`** and **`MAX_HEIGHT`** in `index.js` so the terrain never looks too flat or too tall for the canvas.

Algorithms are split into modules:

| File | Role |
|------|------|
| [**noise.js**](./noise.js) | 1D value noise + fbm for smooth terrain |
| [**nse.js**](./nse.js) | Next Smaller Element (right scan) |
| [**pse.js**](./pse.js) | Previous Smaller Element (left scan) |
| [**index.js**](./index.js) | UI, canvas drawing, terrain generation |

**Direct links:** [noise.js](./noise.js) · [nse.js](./nse.js) · [pse.js](./pse.js)

---

## Running locally

The app uses **ES modules** (`import` / `export`). Browsers often block module imports from `file://`, so serve the folder over HTTP, for example:

```bash
npx serve .
```

Then open the URL it prints (e.g. `http://localhost:3000`) and open `index.html`.

---

## NSE (Next Smaller Element) — [nse.js](./nse.js)

**Definition:** For each index `i`, **NSE[i]** is the smallest index `j > i` such that `arr[j] < arr[i]`. If no such `j` exists, use **-1** (or “none”).

**Intuition:** From bar `i`, “the next bar to the **right** that is **strictly shorter**.” Ties (`arr[j] >= arr[i]`) do **not** count as “smaller,” so equal-height bars extend the range until a strictly lower bar appears.

**Algorithm (monotonic stack, right to left):**

1. Walk `i` from **n−1 down to 0**.  
2. Keep a **stack of indices** whose heights are **strictly increasing** from bottom to top (we pop while top `>= arr[i]`).  
3. After pops, if the stack is non-empty, the top index is the first bar to the right of `i` that is **strictly smaller** → that is **NSE[i]**.  
4. Push `i`.

**Time:** O(n) — each index pushed/popped at most once.

**In this project:** Yellow lines connect each bar to its NSE (when it exists). Together with PSE, NSE defines how far a bar “owns” intervals as the minimum in classic *largest rectangle in histogram* reasoning.

---

## PSE (Previous Smaller Element) — [pse.js](./pse.js)

**Definition:** For each index `i`, **PSE[i]** is the **largest** index `j < i` such that `arr[j] < arr[i]`. If none, **-1**.

**Intuition:** From bar `i`, “the last bar to the **left** that is **strictly shorter**.”

**Algorithm (monotonic stack, left to right):**

1. Walk `i` from **0 to n−1**.  
2. Pop from the stack while `arr[stack.top] > arr[i]` (non-strict on the left stack is chosen so PSE is the nearest **strictly smaller** to the left; see code in [pse.js](./pse.js).)  
3. After pops, if the stack is non-empty, top is **PSE[i]**.  
4. Push `i`.

**Time:** O(n).

**In this project:** Purple lines connect each bar to its PSE. **NSE + PSE** bound the maximal interval where `arr[i]` is the minimum among all bars strictly between PSE and NSE — that’s why the semi-transparent “ownership” bands line up with those ranges.

---

## Noise algorithm — [noise.js](./noise.js)

The terrain modes labeled **Perlin** and **Simplex** in the UI both use the **same core routine**: **1D value noise** combined with **fbm** (fractional Brownian motion). The names are *inspired by* Perlin/Simplex (smooth, multi-scale terrain), not a full 2D Perlin/Simplex implementation.

### Steps

1. **Hash / pseudo-random at integers**  
   At each integer grid point `x0`, a value in ~[0,1) is derived deterministically from `x0` and a **seed** (sine-based hash). Same seed → same terrain.

2. **Value noise at real `x`**  
   Let `x0 = floor(x)`, `x1 = x0 + 1`. Interpolate between `hash(x0)` and `hash(x1)` using **smoothstep** on the fractional part so the curve is C¹-ish at grid edges (no hard linear kinks).

3. **fbm (octaves)**  
   Sum several scaled copies of value noise:
   - **octaves** — how many layers  
   - **lacunarity** — frequency multiplier per octave (detail gets finer)  
   - **gain** — amplitude multiplier per octave (higher octaves weigh less)  
   Normalize by the sum of amplitudes so output stays roughly in **[0, 1]**.

4. **Map to bar height**  
   In `index.js`, that scalar is mapped linearly to **[MIN_HEIGHT, MAX_HEIGHT]**.

**Why it looks like terrain:** Low frequency gives overall hills; higher octaves add bumps without blowing up amplitude thanks to `gain < 1`.

---

## Extra context worth knowing

### Why NSE and PSE together?

For histogram problems, each index `i` is the **minimum** of every subarray that lies entirely inside **(PSE[i], NSE[i])** and includes position `i`. The code also implements the classic formula for the **sum of minimums over all subarrays** (using left/right span counts from PSE/NSE). The colored ownership rectangles on the canvas are a direct picture of those spans.

### UI toggles

- Turning **terrain** off still leaves overlays (valleys, peaks, lines, ridge, ownership) on a cleared background — useful to see only NSE/PSE geometry.  
- **Ridge** is drawn sharp for random/linear modes and smoothed with quadratic segments for noise/cosine so the outline matches the “feel” of the data.

### Tech

- **Vanilla JS + Canvas 2D** — no build step.  
- **`type="module"`** in [`index.html`](./index.html) so relative imports ([noise.js](./noise.js), [nse.js](./nse.js), [pse.js](./pse.js)) work when served over HTTP.

---
