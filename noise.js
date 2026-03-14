/**
 * 1D value-noise + fbm — used for Perlin/Simplex-like terrain.
 * @param {number} [seed=1]
 * @returns {(x: number, octaves?: number, lacunarity?: number, gain?: number) => number} ~[0,1]
 */
export function makeNoise1D(seed = 1) {
  function hash(x) {
    const s = Math.sin(x * 127.1 + seed * 311.7) * 43758.5453;
    return s - Math.floor(s);
  }

  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  function smoothstep(t) {
    return t * t * (3 - 2 * t);
  }

  function valueNoise(x) {
    const x0 = Math.floor(x);
    const x1 = x0 + 1;
    const t = x - x0;
    const u = smoothstep(t);
    const v0 = hash(x0);
    const v1 = hash(x1);
    return lerp(v0, v1, u);
  }

  return function fbm(x, octaves = 4, lacunarity = 2, gain = 0.5) {
    let amplitude = 1;
    let frequency = 1;
    let sum = 0;
    let norm = 0;
    for (let i = 0; i < octaves; i++) {
      sum += amplitude * valueNoise(x * frequency);
      norm += amplitude;
      amplitude *= gain;
      frequency *= lacunarity;
    }
    return sum / norm;
  };
}
