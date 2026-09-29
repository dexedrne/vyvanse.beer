// The rainy night behind the page, drawn in WebGL2 on one fixed canvas under everything.
//
// - Above the hero's waterline: the night, a low skyline and the neon's spill.
// - Below it: a puddle that mirrors the sign (vyvanse.beer) and #4764, then wet ground with a
//   stream running down the page. It runs through a pool at each section head's drop and where
//   it crosses the open water between sections, swings out behind the glass panes, and carries
//   the neon of the headings and of the game and site art on its surface. The crew stand at a
//   second waterline, mirrored in their own strip of water.
// - A ripple simulation (a small height field, one cell per 3 css px, stepped at a fixed 60 Hz)
//   takes the rain (now and then a heavy drop with a splash), drips into the pools, the pointer
//   or a finger (as a wake along its path), and a drop at each section head as it surfaces. It
//   scrolls with the page, and scrolling speeds the stream up.
// - Under text the water is held dark enough for every text pair to meet WCAG AA, and a little
//   less so under the glass panes.
// - Rain streaks fall over all of it, brighter near the sign.
//
// The neon sign reaches the shader as a texture drawn from the real <h1> (same font, same
// place), and its reflection flickers on with it. #4764's reflection copies his live 3D canvas
// every frame while the hero is on screen, or his render before the 3D viewer is up.
//
// It starts right after the first paint (src/main.js), draws at most 60 frames a second (30
// after a few idle seconds), stops while the tab is hidden, draws fewer pixels when frames run
// long for the display, and gives up for the CSS night if even the fewest pixels stay under
// ~24 fps in its first seconds on screen. With reduced motion it draws still frames only (no
// rain, no ripples, no flow). Without WebGL2 createWater() returns false and the page keeps its
// CSS night (see .water-off in src/style.css).

import { media, docBox } from './dom.js';

const SIM_PX = 3; // css px per ripple cell
const STEP = 1 / 60; // one ripple step, whatever the display's refresh rate
const MAX_DROPS = 32;
const MAX_SEGS = 6;
const MAX_PATH = 32;
const MAX_POOLS = 10;
const MAX_LIGHTS = 12;
const MAX_INK = 20;
const IDLE_MS = 6000; // no scroll, pointer or keys for this long: 30 fps
const MIN_SCALE = 0.45;

// Linear-light luminance the water may reach under text on it, under the glass panes, and under
// the darker boxes (the boot log). See the colour notes at the top of src/style.css.
const CAP_TEXT = 0.026;
const CAP_GLASS = 0.16;
const CAP_BOX = 0.12;

const VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2. - 1., 0., 1.);
}`;

// Height field: r = now, g = the step before. Rows shift with the page as it scrolls.
const SIM = `#version 300 es
precision highp float;
uniform sampler2D uPrev;
uniform ivec2 uSize;
uniform int uShift;
uniform float uDamp;
uniform vec4 uDrops[${MAX_DROPS}];
uniform int uDropN;
uniform vec4 uSegs[${MAX_SEGS}];
uniform vec2 uSegK[${MAX_SEGS}];
uniform int uSegN;
out vec4 o;
float at(ivec2 p) {
  if (p.x < 0 || p.y < 0 || p.x >= uSize.x || p.y >= uSize.y) return 0.;
  return texelFetch(uPrev, p, 0).r;
}
void main() {
  ivec2 p = ivec2(gl_FragCoord.xy);
  ivec2 q = p - ivec2(0, uShift);
  vec2 c = (q.y < 0 || q.y >= uSize.y) ? vec2(0.) : texelFetch(uPrev, q, 0).rg;
  float h = (at(q + ivec2(1, 0)) + at(q - ivec2(1, 0)) + at(q + ivec2(0, 1)) + at(q - ivec2(0, 1))) * 0.5 - c.g;
  h *= uDamp;
  vec2 fp = vec2(p) + 0.5;
  for (int i = 0; i < ${MAX_DROPS}; i++) {
    if (i >= uDropN) break;
    vec4 d = uDrops[i];
    vec2 v = fp - d.xy;
    h += d.w * exp(-dot(v, v) / (d.z * d.z));
  }
  // the pointer's path: a line of push, so a wake follows it instead of a chain of beads
  for (int i = 0; i < ${MAX_SEGS}; i++) {
    if (i >= uSegN) break;
    vec4 s = uSegs[i];
    vec2 ab = s.zw - s.xy;
    float t = clamp(dot(fp - s.xy, ab) / max(dot(ab, ab), 1e-4), 0., 1.);
    vec2 v = fp - s.xy - ab * t;
    h += uSegK[i].y * exp(-dot(v, v) / (uSegK[i].x * uSegK[i].x));
  }
  o = vec4(clamp(h, -3., 3.), c.r, 0., 1.);
}`;

const FRAG = `#version 300 es
precision highp float;
uniform vec2 uView;
uniform vec2 uRes;
uniform float uTime;
uniform float uScroll;
uniform float uFlow;
uniform float uWind;
uniform float uRain;
uniform float uWater;
uniform float uDepth;
uniform sampler2D uSign;
uniform vec4 uSignRect;
uniform vec2 uSignI;
uniform sampler2D uBro;
uniform vec4 uBroRect;
uniform vec2 uBroUV;
uniform float uBroOn;
uniform sampler2D uSim;
uniform float uSimOn;
uniform vec2 uSimTexel;
uniform vec4 uPath[${MAX_PATH}];
uniform int uPathN;
uniform vec4 uPools[${MAX_POOLS}];
uniform int uPoolN;
uniform vec4 uLights[${MAX_LIGHTS}];
uniform vec3 uLightC[${MAX_LIGHTS}];
uniform int uLightN;
uniform vec4 uInk[${MAX_INK}];
uniform float uInkCap[${MAX_INK}];
uniform int uInkN;
uniform sampler2D uCrew;
uniform vec4 uCrewRect;
uniform vec4 uCrewRows[2];
uniform int uCrewN;
uniform float uCrewDepth;
uniform float uCrewA;
out vec4 outColor;

const vec3 NIGHT = vec3(0.035, 0.024, 0.07);
const vec3 GROUND = vec3(0.058, 0.039, 0.104);
const vec3 HAZE = vec3(0.15, 0.1, 0.27);
const vec3 LILAC = vec3(0.776, 0.702, 0.969);
const vec3 AMETHYST = vec3(0.557, 0.427, 0.878);
const vec3 AMBER = vec3(0.914, 0.769, 0.494);

float hash(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3. - 2. * f);
  return mix(mix(hash(i), hash(i + vec2(1., 0.)), u.x), mix(hash(i + vec2(0., 1.)), hash(i + vec2(1., 1.)), u.x), u.y);
}
float fbm(vec2 p) {
  float s = 0.;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    s += a * noise(p);
    p = p * 2.02 + 7.3;
    a *= 0.5;
  }
  return s;
}
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0., 1.);
  return mix(b, a, h) - k * h * (1. - h);
}
// 1 inside the rect (x, y, w, h), fading to 0 over f px outside it
float inBox(vec2 p, vec4 r, float f) {
  vec2 d = max(r.xy - p, p - r.xy - r.zw);
  return 1. - smoothstep(0., f, length(max(d, 0.)) + min(max(d.x, d.y), 0.));
}

// Two rows of buildings on the waterline, far and near. h: px above the waterline.
vec3 skyline(vec2 p, float h, vec3 c) {
  for (int k = 1; k >= 0; k--) {
    float fk = float(k);
    float bw = mix(58., 36., fk);
    float x = p.x / bw + fk * 17.3;
    float id = floor(x);
    float fx = fract(x);
    float r = hash(vec2(id, 1.7 + fk));
    float bh = mix(18., 34., fk) + r * r * mix(120., 96., fk) + step(0.9, hash(vec2(id, 5.1 + fk))) * mix(90., 54., fk);
    float inB = step(0.07, fx) * step(fx, 0.96) * step(0., h) * step(h, bh);
    if (inB < 0.5) continue;
    vec3 body = mix(vec3(0.03, 0.02, 0.06), HAZE * 0.5, fk * 0.7);
    body = mix(body, c, 0.35 * smoothstep(0., bh, h) + 0.5 * (1. - smoothstep(0., 34., h)));
    vec2 wp = vec2(fx * bw, h);
    vec2 cs = mix(vec2(7., 9.), vec2(5., 7.), fk);
    vec2 cell = floor(wp / cs);
    vec2 f = fract(wp / cs);
    float win = step(0.86, hash(cell + id * 31.7 + fk * 3.))
      * step(0.28, f.x) * step(f.x, 0.72) * step(0.3, f.y) * step(f.y, 0.72)
      * step(bw * 0.12, wp.x) * step(wp.x, bw * 0.9) * step(8., h) * step(h, bh - 6.);
    vec3 wc = mix(AMBER * 0.5, LILAC * 0.42, step(0.55, hash(cell * 1.3 + id)));
    c = body + wc * win * mix(1., 0.45, fk);
  }
  return c;
}

vec3 sky(vec2 p) {
  float h = uWater - p.y;
  vec3 c = mix(HAZE, NIGHT, smoothstep(0., 560., h));
  c = skyline(p, h, c);
  vec2 sc = uSignRect.xy + uSignRect.zw * vec2(0.5, 0.6);
  vec2 sd = (p - sc) / (uSignRect.zw * vec2(0.6, 1.5));
  c += AMETHYST * 0.2 * exp(-dot(sd, sd) * 1.7) * (uSignI.x * 0.7 + uSignI.y * 0.3);
  vec2 bc = uBroRect.xy + uBroRect.zw * vec2(0.5, 0.55);
  vec2 bd = (p - bc) / (uBroRect.zw * vec2(1.1, 0.7));
  c += AMETHYST * 0.14 * exp(-dot(bd, bd) * 1.7);
  return c;
}

vec3 signAt(vec2 rp, float lod) {
  if (uSignI.x + uSignI.y <= 0.) return vec3(0.);
  vec2 uv = (rp - uSignRect.xy) / uSignRect.zw;
  if (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) return vec3(0.);
  vec2 t = textureLod(uSign, uv, lod).rg * uSignI;
  vec3 host = mix(AMETHYST * 0.95, vec3(0.97, 0.94, 1.), smoothstep(0.55, 1., t.r)) * t.r;
  vec3 tld = mix(vec3(0.93, 0.6, 0.24), vec3(1., 0.94, 0.82), smoothstep(0.55, 1., t.g)) * t.g;
  return host + tld;
}

vec3 broAt(vec3 c, vec2 rp, float lod) {
  if (uBroOn < 0.5) return c;
  vec2 uv = (rp - uBroRect.xy) / uBroRect.zw;
  if (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) return c;
  vec4 t = textureLod(uBro, uv * uBroUV, lod);
  return c * (1. - t.a) + t.rgb * vec3(0.78, 0.74, 0.92);
}

// The neon on the page (the section titles, the game and site art) as the water sees it:
// reflections run a long way down from a light and only a little way across or up.
vec3 neon(vec2 p) {
  vec3 c = vec3(0.);
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    if (i >= uLightN) break;
    vec4 r = uLights[i];
    float dx = max(max(r.x - p.x, p.x - r.x - r.z), 0.);
    float up = max(r.y - p.y, 0.);
    float down = max(p.y - r.y - r.w, 0.);
    c += uLightC[i] * exp(-dx * dx / 3200. - up * up / 900. - down * down / (r.w * r.w * 2. + 22000.));
  }
  return c;
}

// The course of the stream at p: how far across it from the middle (px), the distance
// downstream (px), and its half width there. A smooth S between path points (x, y, half width,
// distance along), with a gentle meander between them.
vec3 course(vec2 p) {
  if (uPathN < 2) return vec3(9., 0., 1.);
  vec4 a = uPath[0];
  vec4 b = uPath[1];
  for (int i = 1; i < ${MAX_PATH - 1}; i++) {
    if (i + 1 >= uPathN) break;
    if (p.y >= uPath[i].y) {
      a = uPath[i];
      b = uPath[i + 1];
    }
  }
  float span = max(b.y - a.y, 1.);
  float t = clamp((p.y - a.y) / span, 0., 1.);
  float s = t * t * (3. - 2. * t);
  float dx = b.x - a.x;
  float swing = clamp(abs(dx) / 240., 0., 1.);
  float bend = sin(3.14159 * t);
  float hw = mix(a.z, b.z, s);
  // a meander, widest halfway between two points (the stream still passes through each)
  float x = a.x + dx * s + sin(p.y * 0.0062 + 1.3) * (6. + 0.4 * hw + 12. * swing) * bend;
  float slope = dx * 6. * t * (1. - t) / span;
  float k = inversesqrt(1. + slope * slope);
  hw *= 1. + 0.2 * bend * swing;
  return vec3((p.x - x) * k, mix(a.w, b.w, t) + (p.x - x) * slope * k, hw);
}

// How far p is into the nearest pool: 0 at its middle, 1 at its edge.
float pools(vec2 p) {
  float d = 9.;
  for (int i = 0; i < ${MAX_POOLS}; i++) {
    if (i >= uPoolN) break;
    vec4 o = uPools[i];
    d = min(d, length((p - o.xy) / o.zw));
  }
  // a puddle's outline, not an ellipse
  return d + (noise(p * 0.011) * 0.65 + noise(p * 0.04) * 0.35 - 0.5) * 0.5;
}

// Wavelets riding the current: the slope of a few travelling waves, mostly heading downstream,
// with the grid warped so the pattern never repeats. w: (across, along) in px; t: seconds of flow.
const vec4 WAVES[6] = vec4[6](
  vec4(0.08, 31., 62., 0.055),
  vec4(-0.45, 19., 48., 0.05),
  vec4(0.6, 14., 54., 0.045),
  vec4(-0.2, 9.5, 40., 0.04),
  vec4(1., 7.5, 26., 0.03),
  vec4(-1.15, 11., 20., 0.03)
);
vec2 wavelets(vec2 w, float t, float calm) {
  w += (vec2(noise(w * 0.022), noise(w * 0.022 + 5.2)) - 0.5) * 30.;
  vec2 g = vec2(0.);
  for (int i = 0; i < 6; i++) {
    vec4 k = WAVES[i];
    float a = k.x * (1. + calm * 1.8);
    vec2 dir = vec2(sin(a), cos(a));
    float f = 6.2831 / k.y;
    g += dir * cos((dot(dir, w) - t * k.z * (1. - 0.75 * calm)) * f) * k.w;
  }
  return g;
}

// Night water, seen from above: dark, mirroring a hazy sky wherever the wavelets tilt towards
// it, with the page's neon broken up in it and glints where they catch the light. m: 0 in the
// middle to 1 at the edge. across/along: stream coordinates (px). calm: 0 in the current, 1 in
// a still pool. n: the ripple sim's slope.
vec3 water(vec2 p, vec2 n, float d, float across, float along, float calm) {
  float t = uFlow * 3.3;
  vec2 g = wavelets(vec2(across, along), t, calm) + n * 0.16;
  vec3 N = normalize(vec3(-g, 1.));
  // the sky glow it mirrors, in moving bands
  float sky = smoothstep(-0.16, 0.3, dot(g, vec2(0.35, -1.)));
  vec3 c = mix(vec3(0.045, 0.03, 0.1), vec3(0.18, 0.125, 0.36), sky * 0.8);
  // long-exposure silk: the current's slow bands
  float silk = fbm(vec2(across * 0.035 + 3., along * 0.004 - t * 0.2));
  c += vec3(0.05, 0.035, 0.1) * smoothstep(0.4, 0.8, silk) * (1. - calm);
  // the page's neon, pulled about by the waves
  vec3 ne = neon(p + g * vec2(60., 90.));
  c += ne * (0.18 + 0.5 * sky);
  // glints: a lilac-white spark wherever a wavelet faces the light
  float gl = pow(max(dot(N, normalize(vec3(0.07, -0.15, 1.))), 0.), 700.);
  c += mix(LILAC, vec3(1.), 0.55) * gl * 0.85;
  // now and then the sign's amber, far upstream
  c += AMBER * 0.4 * pow(max(dot(N, normalize(vec3(-0.17, -0.08, 1.))), 0.), 900.) * (1. - calm);
  // flecks of foam drifting down with the current, more of them near the banks
  float fl = noise(vec2(across * 0.16 + 9., (along - t * 52.) * 0.07));
  c += vec3(0.5, 0.45, 0.7) * smoothstep(0.88 - 0.1 * smoothstep(0.5, 1., d), 0.99, fl) * 0.22 * (1. - calm);
  return c;
}

// Without the ripple sim: rain rings from a grid of drops that loop.
vec2 rings(vec2 p) {
  float cell = 84.;
  vec2 id = floor(p / cell);
  vec2 n = vec2(0.);
  for (int j = -1; j <= 1; j++)
    for (int i = -1; i <= 1; i++) {
      vec2 cid = id + vec2(float(i), float(j));
      float h = hash(cid);
      if (h > 0.6) continue;
      vec2 c = (cid + 0.15 + 0.7 * vec2(hash(cid * 1.7), hash(cid * 2.3))) * cell;
      float ph = fract(uTime / (1.2 + hash(cid + 3.3) * 1.5) + h * 13.7);
      vec2 d = p - c;
      float l = length(d);
      float x = l - ph * cell * 0.8;
      n += d / (l + 1e-3) * sin(x * 0.6) * exp(-x * x * 0.03) * (1. - ph) * (1. - ph);
    }
  return n * 0.22;
}

// The ripples' slope, from the sim over a 3x3 patch (smooth, no single-cell speckle).
vec2 ripples(vec2 frag, vec2 p) {
  if (uSimOn < 0.5) return rings(p);
  vec2 uv = frag / uRes;
  vec2 e = uSimTexel * 1.5;
  float l = texture(uSim, uv - vec2(e.x, 0.)).r;
  float r = texture(uSim, uv + vec2(e.x, 0.)).r;
  float dn = texture(uSim, uv - vec2(0., e.y)).r;
  float up = texture(uSim, uv + vec2(0., e.y)).r;
  float a = texture(uSim, uv + e).r;
  float b = texture(uSim, uv - e).r;
  float c = texture(uSim, uv + vec2(e.x, -e.y)).r;
  float d = texture(uSim, uv + vec2(-e.x, e.y)).r;
  return vec2(-(2. * (r - l) + (a - d) + (c - b)), 2. * (up - dn) + (a - c) + (d - b)) / 6.;
}

float rain(vec2 q, float cellW, float speed, float len, float dens, float seed) {
  q.x += q.y * (0.1 + uWind);
  float col = floor(q.x / cellW);
  float hc = hash(vec2(col, seed));
  float y = q.y / len - uTime * speed * (0.75 + 0.5 * hc) + hc * 7.;
  float row = floor(y);
  float fy = fract(y);
  float on = step(1. - dens, hash(vec2(col + seed, row)));
  float cx = (0.2 + 0.6 * hash(vec2(row, col + seed))) * cellW;
  float dx = abs(fract(q.x / cellW) * cellW - cx);
  float line = 1. - smoothstep(0.3, 1.1, dx);
  float tail = smoothstep(0., 0.3, fy) * (1. - smoothstep(0.3, 0.335, fy));
  return on * line * tail;
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 sp = vec2(frag.x, uRes.y - frag.y) * (uView / uRes);
  vec2 p = sp + vec2(0., uScroll);
  vec3 col;
  if (p.y < uWater) {
    col = sky(p);
  } else {
    float dy = p.y - uWater;
    vec2 n = ripples(frag, p);

    // wet ground: dark, with a slow drift of city glow
    float g = noise(p * 0.45) * 0.6 + noise(p * 0.11) * 0.4;
    col = GROUND * (0.8 + 0.34 * g);
    col += AMETHYST * 0.06 * smoothstep(0.4, 0.95, fbm(p * 0.0016 + vec2(0., uTime * 0.012)));

    // the stream and its pools
    vec3 cr = course(p + n * 6.);
    float pd = pools(p + n * 6.);
    float bank = abs(cr.x) / cr.z + (noise(p * 0.03) * 0.6 + noise(p * 0.09) * 0.4 - 0.5) * 0.3;
    float d = smin(bank, pd, 0.35);
    float fade = uPathN > 1 ? smoothstep(uPath[0].y - 80., uPath[0].y + 300., p.y) : 0.;
    float m = (1. - smoothstep(0.78, 1., d)) * fade;
    // just outside the banks the ground is wet: darker
    col *= 1. - 0.16 * (1. - smoothstep(1., 1.5, d)) * (1. - m) * fade;
    if (m > 0.002) {
      float calm = 1. - smoothstep(0.35, 1.1, pd);
      col = mix(col, water(p, n, d, cr.x, cr.y, calm), m);
    }
    float wet = m;

    // the puddle at the hero's waterline: the sign and #4764 upside down
    float edge = uDepth * (0.84 + 0.34 * (noise(vec2(p.x * 0.0055, 1.7)) - 0.5));
    float pud = 1. - smoothstep(edge * 0.7, edge, dy);
    if (pud > 0.002) {
      vec2 rp = vec2(p.x, uWater - dy) + n * (10. + dy * 0.09);
      rp.x += sin(dy * 0.13 - uTime * 1.7) * min(dy * 0.02, 1.6);
      float lod = clamp(log2(1. + dy / 30.), 0., 5.);
      vec3 refl = broAt(sky(rp) + signAt(rp, lod), rp, lod);
      refl *= mix(0.66, 0.3, smoothstep(0., uDepth * 0.8, dy)) * vec3(0.88, 0.86, 1.);
      col = mix(col, refl, pud);
      wet = max(wet, pud);
    }

    // the crew's waterline: a strip of water at their feet, mirroring them
    for (int i = 0; i < 2; i++) {
      if (i >= uCrewN) break;
      vec4 r = uCrewRows[i];
      float cy = p.y - r.w;
      if (cy < -2. || cy > uCrewDepth) continue;
      float ex = smoothstep(r.x - 50., r.x + 24., p.x) * (1. - smoothstep(r.y - 24., r.y + 50., p.x));
      float far = uCrewDepth * (0.82 + 0.3 * (noise(vec2(p.x * 0.012, 3.1 + float(i) * 5.)) - 0.5));
      float cp = ex * (1. - smoothstep(far * 0.55, far, cy)) * smoothstep(-2., 1.5, cy) * uCrewA;
      if (cp < 0.002) continue;
      vec2 rp = vec2(p.x, r.w - cy) + n * (8. + cy * 0.08);
      rp.x += sin(cy * 0.15 - uTime * 1.8) * min(cy * 0.02, 1.4);
      vec3 refl = mix(HAZE * 0.62, NIGHT, smoothstep(0., uCrewDepth * 0.9, cy));
      refl += neon(rp) * 0.25;
      vec2 uv = (rp - uCrewRect.xy) / uCrewRect.zw;
      if (rp.y >= r.z && uv.x >= 0. && uv.y >= 0. && uv.x <= 1. && uv.y <= 1.) {
        vec4 t = textureLod(uCrew, uv, clamp(log2(1. + cy / 26.), 0., 4.));
        refl = refl * (1. - t.a) + t.rgb * vec3(0.84, 0.8, 0.96);
      }
      refl *= mix(0.92, 0.4, smoothstep(0., uCrewDepth * 0.85, cy));
      refl += LILAC * 0.22 * (1. - smoothstep(0., 3., cy)) * ex;
      col = mix(col, refl, cp);
      wet = max(wet, cp);
    }

    // the ripples catch the light
    vec3 N = normalize(vec3(n * 2.2, 1.));
    float spec = pow(max(dot(N, normalize(vec3(-0.25, 0.55, 1.))), 0.), 26.);
    col += mix(LILAC, vec3(1.), 0.3) * spec * (0.07 + 0.72 * wet);
    col *= clamp(1. + (n.x - n.y) * 0.45 * wet, 0.62, 1.5);
  }
  float r = rain(sp, 13., 2.3, 290., 0.26, 1.) * 0.5 + rain(sp, 31., 3.1, 430., 0.2, 7.);
  vec2 sc = uSignRect.xy + uSignRect.zw * 0.5;
  vec2 sd = (p - sc) / (uSignRect.zw * vec2(0.8, 2.4));
  // rain catches the neon above the waterline only: below it, text sits on the water
  float lit = 1. + 2.4 * exp(-dot(sd, sd)) * sign(uSignI.x + uSignI.y) * step(p.y, uWater);
  col += mix(LILAC, vec3(1.), 0.4) * r * uRain * 0.07 * lit;
  vec2 v = sp / uView - 0.5;
  col *= 1. - 0.5 * dot(v, v);
  col = max(col, 0.);

  // under text, hold the water dark: scale it down to the cap in linear light
  float cap = 9.;
  for (int i = 0; i < ${MAX_INK}; i++) {
    if (i >= uInkN) break;
    cap = mix(cap, min(cap, uInkCap[i]), inBox(p, uInk[i], 22.));
  }
  float lum = dot(pow(col, vec3(2.2)), vec3(0.2126, 0.7152, 0.0722));
  if (lum > cap) col *= pow(cap / lum, 1. / 2.2);

  col += (hash(frag + fract(uTime) * 91.) - 0.5) / 255.;
  outColor = vec4(col, 1.);
}`;

function compile(gl, fs) {
  const prog = gl.createProgram();
  for (const [type, src] of [
    [gl.VERTEX_SHADER, VERT],
    [gl.FRAGMENT_SHADER, fs],
  ]) {
    const sh = gl.createShader(type);
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    gl.attachShader(prog, sh);
  }
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
  const u = {};
  const count = gl.getProgramParameter(prog, gl.ACTIVE_UNIFORMS);
  for (let i = 0; i < count; i++) {
    const { name } = gl.getActiveUniform(prog, i);
    u[name.replace(/\[0\]$/, '')] = gl.getUniformLocation(prog, name);
  }
  return { prog, u };
}

export function createWater() {
  const root = document.documentElement;
  const hero = document.querySelector('.hero');
  const stage = hero?.querySelector('.hero__stage');
  const title = hero?.querySelector('.hero__title');
  const figure = hero?.querySelector('.hero__bro');
  if (!stage || !title || !figure) return false;
  const mv = figure.querySelector('model-viewer');
  const poster = figure.querySelector('model-viewer img, img');
  const crewList = document.querySelector('.crew');

  const canvas = document.createElement('canvas');
  canvas.className = 'water';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', {
    alpha: false,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  });
  if (!gl) return false;
  const draw = compile(gl, FRAG);
  const step = compile(gl, SIM);
  if (!draw || !step) return false;

  // ---- textures ----

  const blank = new Uint8Array(4);
  function texture(mip = true) {
    const t = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, mip ? gl.LINEAR_MIPMAP_LINEAR : gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, blank);
    return t;
  }
  function upload(t, src) {
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.generateMipmap(gl.TEXTURE_2D);
  }
  const signTex = texture();
  const broTex = texture();
  const crewTex = texture();
  const noSim = texture(false);

  // The ripple sim needs a float render target. Without one the shader loops rain rings instead.
  const simOK = !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
  const sim = { w: 0, h: 0, i: 0, tex: [], fb: [], on: false };
  function simSize(w, h) {
    if (!simOK) return;
    const sw = Math.max(2, Math.ceil(w / SIM_PX));
    const sh = Math.max(2, Math.ceil(h / SIM_PX));
    if (sw === sim.w && sh === sim.h) return;
    for (const t of sim.tex) gl.deleteTexture(t);
    for (const f of sim.fb) gl.deleteFramebuffer(f);
    sim.tex = [];
    sim.fb = [];
    sim.w = sw;
    sim.h = sh;
    for (let i = 0; i < 2; i++) {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA16F, sw, sh, 0, gl.RGBA, gl.HALF_FLOAT, null);
      const f = gl.createFramebuffer();
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t, 0);
      sim.tex.push(t);
      sim.fb.push(f);
    }
    sim.on = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    for (const f of sim.fb) {
      gl.bindFramebuffer(gl.FRAMEBUFFER, f);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    }
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  }

  // ---- layout, in document px ----

  const L = {
    water: 0,
    depth: 400,
    sign: [0, 0, 1, 1],
    signOn: 0,
    bro: [0, 0, 1, 1],
    poster: [0, 0, 1, 1],
    path: new Float32Array(MAX_PATH * 4),
    pathN: 0,
    pools: [], // [cx, cy, rx, ry, drips per second]
    lights: [], // { el, rect, color }
    ink: [], // [x, y, w, h, cap]
    crew: [0, 0, 1, 1],
    crewRows: new Float32Array(8),
    crewN: 0,
    crewDepth: 60,
  };
  const view = { w: 1, h: 1, px: 1 };
  let scale = 1; // lowered when frames run long

  function drawSign() {
    const spans = [...title.children];
    if (!spans.length) return;
    const cs = getComputedStyle(title);
    const size = parseFloat(cs.fontSize);
    const rects = spans.map((s) => s.getBoundingClientRect());
    const x0 = Math.min(...rects.map((r) => r.left));
    const x1 = Math.max(...rects.map((r) => r.right));
    const y0 = Math.min(...rects.map((r) => r.top));
    const y1 = Math.max(...rects.map((r) => r.bottom));
    const pad = size * 0.5;
    const w = x1 - x0 + pad * 2;
    const h = y1 - y0 + pad * 2;
    const k = Math.min(1, 1600 / w);
    const c = document.createElement('canvas');
    c.width = Math.ceil(w * k);
    c.height = Math.ceil(h * k);
    const ctx = c.getContext('2d');
    ctx.scale(k, k);
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, w, h);
    ctx.font = `${cs.fontWeight} ${size}px ${cs.fontFamily}`;
    if ('letterSpacing' in ctx && cs.letterSpacing !== 'normal') ctx.letterSpacing = cs.letterSpacing;
    ctx.textBaseline = 'alphabetic';
    ctx.globalCompositeOperation = 'lighter';
    const ascent = ctx.measureText(title.textContent).fontBoundingBoxAscent || size * 0.99;
    spans.forEach((s, i) => {
      // the host glows into red, .beer into green; the shader colours them lilac and amber
      const ch = i === 0 ? '255,0,0' : '0,255,0';
      const x = rects[i].left - x0 + pad;
      const y = rects[i].top - y0 + pad + ascent;
      for (const [blur, a] of [
        [size * 0.42, 0.6],
        [size * 0.12, 0.7],
        [0, 1],
      ]) {
        ctx.shadowColor = `rgba(${ch},${a})`;
        ctx.shadowBlur = blur * k;
        ctx.fillStyle = `rgba(${ch},${a})`;
        ctx.fillText(s.textContent, x, y);
      }
    });
    upload(signTex, c);
    L.sign = [x0 - pad, y0 + scrollY - pad, w, h];
    L.signOn = 1;
  }

  // The crew's figures, drawn where they stand into one texture for their reflection.
  const crewImgs = crewList ? [...crewList.querySelectorAll('.bro__stage img')] : [];
  let crewOn = false;
  function drawCrew() {
    if (!crewList || !crewImgs.length || crewImgs.some((i) => !i.complete || !i.naturalWidth)) return;
    const box = docBox(crewList);
    const bh = crewImgs[0].offsetHeight;
    if (!box.w || !bh) return;
    const k = Math.min(1, 1400 / box.w, 900 / box.h);
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.ceil(box.w * k));
    c.height = Math.max(1, Math.ceil(box.h * k));
    const ctx = c.getContext('2d');
    const rows = new Map();
    for (const img of crewImgs) {
      const b = docBox(img);
      ctx.drawImage(img, (b.x - box.x) * k, (b.y - box.y) * k, b.w * k, b.h * k);
      const key = Math.round(b.y);
      const row = rows.get(key) || { x0: Infinity, x1: -Infinity, top: b.y, water: b.y + b.h * 0.972 };
      row.x0 = Math.min(row.x0, b.x + b.w * 0.2);
      row.x1 = Math.max(row.x1, b.x + b.w * 0.8);
      rows.set(key, row);
    }
    upload(crewTex, c);
    L.crew = [box.x, box.y, box.w, box.h];
    L.crewN = Math.min(2, rows.size);
    [...rows.values()].slice(0, 2).forEach((r, i) => L.crewRows.set([r.x0, r.x1, r.top, r.water], i * 4));
    L.crewDepth = bh * 0.34;
    crewOn = true;
  }
  for (const img of crewImgs) img.addEventListener('load', () => remeasure(), { once: true });

  // The average colour of a picture, lifted to neon: what the water reflects of it.
  function tint(img) {
    try {
      const c = document.createElement('canvas');
      c.width = 8;
      c.height = 8;
      const ctx = c.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(img, 0, 0, 8, 8);
      const d = ctx.getImageData(0, 0, 8, 8).data;
      const s = [0, 0, 0];
      for (let i = 0; i < d.length; i += 4) for (let j = 0; j < 3; j++) s[j] += d[i + j];
      const m = Math.max(...s) || 1;
      return s.map((v) => (v / m) * 0.62);
    } catch {
      return [0.55, 0.45, 0.8];
    }
  }
  const lightEls = [
    ...[...document.querySelectorAll('.sec__title')].map((el) => ({ el, color: [0.62, 0.52, 0.86] })),
    ...[...document.querySelectorAll('.game__shot img')].map((el) => ({ el, color: null })),
  ];
  for (const l of lightEls) {
    if (l.color) continue;
    const set = () => (l.color = tint(l.el));
    if (l.el.complete && l.el.naturalWidth) set();
    else l.el.addEventListener('load', set, { once: true });
  }

  // What the water is held dark under: text on it, the glass panes, the darker boxes.
  const inkEls = [
    ...[...document.querySelectorAll('.hero__tag, .hero__hint, .sec__head, .bro__status, .crew__cta, .crew__free, .foot')].map((el) => [el, CAP_TEXT]),
    ...[...document.querySelectorAll('.bro__link')].map((el) => [el.querySelector('.bro__name'), CAP_TEXT, el.closest('.bro')]),
    ...[...document.querySelectorAll('.glass')].map((el) => [el, CAP_GLASS]),
    ...[...document.querySelectorAll('.hero__boot')].map((el) => [el, CAP_BOX]),
  ];

  function measure() {
    const sy = scrollY;
    const r = canvas.getBoundingClientRect();
    view.w = Math.max(1, r.width);
    view.h = Math.max(1, r.height);
    const st = stage.getBoundingClientRect();
    const hr = hero.getBoundingClientRect();
    L.water = st.bottom + sy;
    L.depth = Math.max(180, hr.bottom - st.bottom + 24);
    const b = (mv || poster).getBoundingClientRect();
    L.bro = [b.left, b.top + sy, b.width, b.height];
    const pb = (poster || mv).getBoundingClientRect();
    L.poster = [pb.left, pb.top + sy, pb.width, pb.height];
    path();

    L.ink = [];
    for (const [el, cap, whole] of inkEls) {
      if (!el) continue;
      if (whole) {
        // a crew member's words: from his name down to his download link
        const top = docBox(el);
        const all = docBox(whole);
        L.ink.push([all.x, top.y, all.w, all.y + all.h - top.y, cap]);
      } else {
        const bx = docBox(el);
        if (bx.w && bx.h) L.ink.push([bx.x, bx.y, bx.w, bx.h, cap]);
      }
    }
    for (const l of lightEls) {
      const bx = docBox(l.el);
      l.rect = [bx.x, bx.y, bx.w, bx.h];
    }
    drawCrew();

    const dpr = devicePixelRatio || 1;
    // phones: a lower ceiling, it's a soft background anyway
    const small = Math.min(view.w, view.h) < 600;
    const budget = small ? 0.8e6 : 1.7e6;
    view.px = Math.min(dpr, small ? 1.5 : 2, Math.sqrt(budget / (view.w * view.h))) * scale;
    const cw2 = Math.max(1, Math.round(view.w * view.px));
    const ch2 = Math.max(1, Math.round(view.h * view.px));
    if (canvas.width !== cw2 || canvas.height !== ch2) {
      canvas.width = cw2;
      canvas.height = ch2;
    }
    simSize(view.w, view.h);
    if (document.fonts?.status !== 'loading') drawSign();
    want();
  }

  // The stream: out of the puddle, then through each section head's drop. On wide screens the
  // drop is in the margin beside the head (a small pool there) and the stream runs down the
  // margin past the head's words, widening into a pool where it crosses the open water above.
  // On narrower screens the drop sits in that open water, in a pool, and the stream dips under
  // the head. Where a section's body is glass it swings out behind the panes and comes back
  // before the next head. Past the last section it runs on down. Positions ignore the
  // not-yet-surfaced offset of the sections (docBox).
  function path() {
    const content = document.querySelector('.content');
    const deck = hero.querySelector('.hero__deck');
    if (!content) return;
    const cb = docBox(content);
    const left = cb.x;
    const cw = cb.w;
    const narrow = cw < 640;
    const thin = Math.max(14, Math.min(28, (left - 10) * 0.24));
    const wide = narrow ? 50 : 96;
    const pts = [[left + cw * (narrow ? 0.3 : 0.12), L.water + L.depth * 0.5, wide * 0.7]];
    const gaps = [];
    const pools = [];
    const secs = [...document.querySelectorAll('.sec')];
    let lastX = left;
    const above = deck ? docBox(deck) : null;
    let prevBottom = above ? above.y + above.h : L.water + L.depth;
    secs.forEach((sec, i) => {
      const dropEl = sec.querySelector('.sec__drop');
      const headEl = sec.querySelector('.sec__head');
      if (!dropEl || !headEl) return;
      const drop = docBox(dropEl);
      const head = docBox(headEl);
      const sb = docBox(sec);
      const x = drop.x + drop.w / 2;
      const y = drop.y + drop.h / 2;
      lastX = x;
      if (y < head.y) {
        // narrower screens: the drop sits in the open water above the head, in a pool, and
        // the stream dips under the head (held dark there) on its way down
        const gap = head.y - prevBottom;
        pts.push([x, y, wide * 0.75]);
        pools.push([x, y, narrow ? 84 : 118, Math.min(narrow ? 30 : 38, gap * 0.36), 0.8]);
      } else {
        // wide screens: the drop sits in the margin beside the head, with a small pool if the
        // margin has room, and the stream runs down the margin past the head's words
        if (head.y - prevBottom > 64) gaps.push([prevBottom, head.y]);
        pts.push([x, y, thin], [x, head.y + head.h + 12, thin]);
        if (x - thin > 34) pools.push([x, y, Math.min(44, x - 12), Math.min(24, (x - 12) * 0.5), 0.4]);
      }
      prevBottom = sb.y + sb.h;
      if (!sec.querySelector('.glass')) return;
      const top = head.y + head.h + 12;
      const bottom = sb.y + sb.h;
      const next = secs[i + 1]?.querySelector('.sec__head');
      const nextY = next ? docBox(next).y : bottom + 400;
      const my = (top + bottom) / 2;
      const reach = Math.min(my - top, nextY - my) * 0.75;
      if (reach > 120) pts.push([Math.min(left + cw * (i % 2 ? 0.66 : 0.74), x + reach), my, wide]);
    });
    const docH = document.documentElement.scrollHeight;
    pts.push([lastX, docH + 260, thin]);
    pts.sort((a, b) => a[1] - b[1]);
    L.pathN = Math.min(MAX_PATH, pts.length);
    let along = 0;
    for (let i = 0; i < L.pathN; i++) {
      if (i) along += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
      L.path.set([pts[i][0], pts[i][1], pts[i][2], along], i * 4);
    }
    // a pool where the stream crosses each stretch of open water, on its course there
    for (const [g0, g1] of gaps) {
      const gy = (g0 + g1) / 2;
      const [gx, hw] = courseAt(pts, gy);
      pools.push([gx, gy, Math.max(hw * 1.6, 110), Math.min((g1 - g0) * 0.3, 40), 0.8]);
    }
    L.pools = pools.slice(0, MAX_POOLS);
  }

  // The stream's middle and half width at a height, as course() in the shader works it out.
  function courseAt(pts, y) {
    let i = 0;
    while (i < pts.length - 2 && y >= pts[i + 1][1]) i++;
    const [ax, ay, aw] = pts[i];
    const [bx, by, bw] = pts[Math.min(i + 1, pts.length - 1)];
    const t = Math.min(1, Math.max(0, (y - ay) / Math.max(by - ay, 1)));
    const s = t * t * (3 - 2 * t);
    const swing = Math.min(1, Math.abs(bx - ax) / 240);
    const bend = Math.sin(Math.PI * t);
    const hw = aw + (bw - aw) * s;
    const x = ax + (bx - ax) * s + Math.sin(y * 0.0062 + 1.3) * (6 + 0.4 * hw + 12 * swing) * bend;
    return [x, hw * (1 + 0.2 * bend * swing)];
  }

  // ---- #4764's reflection source: his live canvas, or the render before that ----

  let renderScale = 1;
  let broUV = [1, 1];
  let broStill = false; // the poster has been uploaded
  let broLive = false;
  mv?.addEventListener('render-scale', (e) => {
    const d = e.detail;
    if (d?.reportedDpr) renderScale = d.renderedDpr / d.reportedDpr;
  });
  function updateBro() {
    const live = figure.classList.contains('is-live') && mv?.shadowRoot;
    if (live) {
      const c = mv.shadowRoot.querySelector('canvas#webgl-canvas') || mv.shadowRoot.querySelector('canvas.show');
      if (c?.width) {
        const r = mv.getBoundingClientRect();
        const d = devicePixelRatio || 1;
        broUV = [Math.min(1, Math.ceil(r.width * d * renderScale) / c.width), Math.min(1, Math.ceil(r.height * d * renderScale) / c.height)];
        upload(broTex, c);
        broLive = true;
        return;
      }
    }
    if (!broStill && !broLive && poster?.complete && poster.naturalWidth) {
      broUV = [1, 1];
      upload(broTex, poster);
      broStill = true;
    }
  }

  // ---- the sign's flicker, so its reflection powers up with it ----

  const signSpans = [...title.children];
  let signI = [1, 1];
  let flickering = signSpans.some((s) => s.getAnimations?.().some((a) => a.playState !== 'finished'));
  function readFlicker() {
    if (!flickering) return;
    const still = signSpans.some((s) => s.getAnimations().some((a) => a.playState !== 'finished'));
    signI = signSpans.map((s) => +getComputedStyle(s).opacity);
    if (signI.length < 2) signI.push(0);
    if (!still) {
      flickering = false;
      signI = [1, 1];
    }
  }

  // ---- impulses: rain, drips, the pointer, section heads ----

  const drops = new Float32Array(MAX_DROPS * 4);
  let dropN = 0;
  function drop(x, y, r, s) {
    if (dropN >= MAX_DROPS) return;
    drops.set([x / SIM_PX, (view.h - y) / SIM_PX, r, s], dropN * 4);
    dropN++;
  }
  const segs = new Float32Array(MAX_SEGS * 4);
  const segK = new Float32Array(MAX_SEGS * 2);
  let segN = 0;
  const trail = [];
  function point(x, y) {
    if (trail.length > 48) trail.shift();
    trail.push([x, y]);
  }
  let idleSince = performance.now();
  const wake = () => {
    idleSince = performance.now();
  };
  addEventListener(
    'pointermove',
    (e) => {
      wake();
      if (e.pointerType !== 'touch') point(e.clientX, e.clientY);
    },
    { passive: true },
  );
  addEventListener(
    'pointerdown',
    (e) => {
      wake();
      if (calm() || e.pointerType === 'touch') return;
      drop(e.clientX, e.clientY, 3, 1.8);
    },
    { passive: true },
  );
  let lastTouch = null;
  addEventListener(
    'touchstart',
    (e) => {
      wake();
      if (calm()) return;
      for (const t of e.changedTouches) drop(t.clientX, t.clientY, 2.8, 1.6);
      lastTouch = null;
    },
    { passive: true },
  );
  addEventListener(
    'touchmove',
    (e) => {
      wake();
      const t = e.touches[0];
      if (!t) return;
      if (!lastTouch) trail.length = 0;
      lastTouch = t;
      point(t.clientX, t.clientY);
    },
    { passive: true },
  );
  addEventListener('keydown', wake, { passive: true });
  addEventListener('wheel', wake, { passive: true });
  // a section head surfacing: a drop at its marker (document px, see src/reveal.js)
  addEventListener('water:drop', (e) => {
    const d = e.detail || {};
    if (calm() || d.x == null) return;
    wake();
    drop(d.x, d.y - scrollY, 3.6, 3.2 * (d.size || 1));
  });

  function feed(dt, waterY) {
    // the pointer: a wake along its path since the last frame
    segN = 0;
    if (trail.length > 1) {
      const n = trail.length - 1;
      const every = Math.ceil(n / MAX_SEGS);
      for (let i = 0; i < n && segN < MAX_SEGS; i += every) {
        const [x0, y0] = trail[i];
        const [x1, y1] = trail[Math.min(n, i + every)];
        const len = Math.hypot(x1 - x0, y1 - y0);
        if (len < 0.5) continue;
        segs.set([x0 / SIM_PX, (view.h - y0) / SIM_PX, x1 / SIM_PX, (view.h - y1) / SIM_PX], segN * 4);
        segK.set([1.9, Math.min(0.5, 0.08 + len * 0.01)], segN * 2);
        segN++;
      }
      trail.splice(0, trail.length - 1);
    }
    const top = Math.max(0, waterY);
    if (top >= view.h) return;
    // drips into the pools on screen, so their rings keep going
    for (const o of L.pools) {
      const y = o[1] - scrollY;
      if (y < -o[3] || y > view.h + o[3] || Math.random() > dt * o[4]) continue;
      const a = Math.random() * 6.283;
      const k = Math.sqrt(Math.random()) * 0.55;
      drop(o[0] + Math.cos(a) * k * o[2], y + Math.sin(a) * k * o[3], 2.6 + Math.random(), 1.5 + Math.random());
    }
    // and along the crew's waterline
    for (let i = 0; i < L.crewN && crewA > 0.5; i++) {
      const y = L.crewRows[i * 4 + 3] - scrollY;
      if (y < 0 || y > view.h || Math.random() > dt * 0.5) continue;
      const x0 = L.crewRows[i * 4];
      drop(x0 + Math.random() * (L.crewRows[i * 4 + 1] - x0), y + 4 + Math.random() * L.crewDepth * 0.5, 2.4, 1.3);
    }
    // rain, landing only below the waterline; now and then a heavy drop that splashes
    const area = (view.w * (view.h - top)) / (1440 * 700);
    let n = dt * 30 * area;
    while (n > 0 && dropN < MAX_DROPS) {
      if (n < 1 && Math.random() > n) break;
      n -= 1;
      const x = Math.random() * view.w;
      const y = top + Math.random() * (view.h - top);
      if (Math.random() < 0.07 && dropN < MAX_DROPS - 6) {
        drop(x, y, 3.1, 2.1);
        for (let j = 0; j < 5; j++) {
          const a = (j / 5) * 6.283 + Math.random();
          const k = 9 + Math.random() * 7;
          drop(x + Math.cos(a) * k, y + Math.sin(a) * k * 0.7, 1.1, 0.5);
        }
      } else {
        drop(x, y, 1.6 + Math.random() * 0.9, 0.55 + Math.random() * 0.7);
      }
    }
  }

  // ---- the loop ----

  const calm = () => media.reduced.matches;
  let raf = 0;
  let dead = false;
  let lastT = 0; // the last animation frame
  let lastDraw = 0; // the last frame drawn
  let nextDraw = 0;
  let acc = 0;
  let time = 7.3;
  let flow = 0;
  let wind = 0;
  let vel = 0;
  let lastScroll = scrollY;
  let shiftAcc = 0;
  let heroOn = true;
  let stillTimer = 0;
  let crewA = 0;
  let crewIn = false;
  let lit = false;

  new IntersectionObserver((es) => {
    heroOn = es.some((e) => e.isIntersecting);
    want();
  }).observe(hero);

  function stepSim(shift, fresh) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, sim.fb[1 - sim.i]);
    gl.viewport(0, 0, sim.w, sim.h);
    gl.useProgram(step.prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sim.tex[sim.i]);
    gl.uniform1i(step.u.uPrev, 0);
    gl.uniform2i(step.u.uSize, sim.w, sim.h);
    gl.uniform1i(step.u.uShift, shift);
    gl.uniform1f(step.u.uDamp, 0.986);
    gl.uniform4fv(step.u.uDrops, drops);
    gl.uniform1i(step.u.uDropN, fresh ? dropN : 0);
    gl.uniform4fv(step.u.uSegs, segs);
    gl.uniform2fv(step.u.uSegK, segK);
    gl.uniform1i(step.u.uSegN, fresh ? segN : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    sim.i = 1 - sim.i;
  }

  // Only what's near the screen goes to the shader.
  const inkBuf = new Float32Array(MAX_INK * 4);
  const capBuf = new Float32Array(MAX_INK);
  const lightBuf = new Float32Array(MAX_LIGHTS * 4);
  const lightCol = new Float32Array(MAX_LIGHTS * 3);
  const poolBuf = new Float32Array(MAX_POOLS * 4);
  function near(y, h, pad) {
    return y + h > scrollY - pad && y < scrollY + view.h + pad;
  }

  function render() {
    const u = draw.u;
    let inkN = 0;
    for (const k of L.ink) {
      if (inkN >= MAX_INK || !near(k[1], k[3], 30)) continue;
      inkBuf.set(k.slice(0, 4), inkN * 4);
      capBuf[inkN++] = k[4];
    }
    let lightN = 0;
    for (const l of lightEls) {
      if (lightN >= MAX_LIGHTS || !l.color || !l.rect || !near(l.rect[1], l.rect[3], 420)) continue;
      lightBuf.set(l.rect, lightN * 4);
      lightCol.set(l.color, lightN * 3);
      lightN++;
    }
    L.pools.forEach((o, i) => poolBuf.set(o.slice(0, 4), i * 4));

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(draw.prog);
    gl.uniform2f(u.uView, view.w, view.h);
    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uScroll, scrollY);
    gl.uniform1f(u.uFlow, flow);
    gl.uniform1f(u.uWind, wind);
    gl.uniform1f(u.uRain, calm() ? 0 : 1);
    gl.uniform1f(u.uWater, L.water);
    gl.uniform1f(u.uDepth, L.depth);
    gl.uniform4fv(u.uSignRect, L.sign);
    gl.uniform2f(u.uSignI, signI[0] * L.signOn, signI[1] * L.signOn);
    gl.uniform4fv(u.uBroRect, broLive ? L.bro : L.poster);
    gl.uniform2fv(u.uBroUV, broUV);
    gl.uniform1f(u.uBroOn, broLive || broStill ? 1 : 0);
    gl.uniform1f(u.uSimOn, sim.on && !calm() ? 1 : 0);
    gl.uniform2f(u.uSimTexel, 1 / Math.max(1, sim.w), 1 / Math.max(1, sim.h));
    gl.uniform4fv(u.uPath, L.path);
    gl.uniform1i(u.uPathN, L.pathN);
    gl.uniform4fv(u.uPools, poolBuf);
    gl.uniform1i(u.uPoolN, L.pools.length);
    gl.uniform4fv(u.uLights, lightBuf);
    gl.uniform3fv(u.uLightC, lightCol);
    gl.uniform1i(u.uLightN, lightN);
    gl.uniform4fv(u.uInk, inkBuf);
    gl.uniform1fv(u.uInkCap, capBuf);
    gl.uniform1i(u.uInkN, inkN);
    gl.uniform4fv(u.uCrewRect, L.crew);
    gl.uniform4fv(u.uCrewRows, L.crewRows);
    gl.uniform1i(u.uCrewN, crewOn ? L.crewN : 0);
    gl.uniform1f(u.uCrewDepth, L.crewDepth);
    gl.uniform1f(u.uCrewA, crewA);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, signTex);
    gl.uniform1i(u.uSign, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, broTex);
    gl.uniform1i(u.uBro, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, sim.on ? sim.tex[sim.i] : noSim);
    gl.uniform1i(u.uSim, 2);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, crewTex);
    gl.uniform1i(u.uCrew, 3);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // The first frame with the sign in it: fade in, and let the CSS reflections fade out.
    if (!lit && L.signOn) {
      lit = true;
      requestAnimationFrame(() => {
        canvas.classList.add('is-on');
        root.classList.add('water-lit');
      });
    }
  }

  // ---- watching the frame rate ----
  // The display's frame interval is learned from the quickest of the recent frames (a browser
  // capped at 30 fps is not slow, it is 30 Hz). A second where frames keep missing it draws fewer
  // pixels next, and a few smooth seconds in a row win some back (twice at most, so it settles).
  // At the fewest pixels, two seconds under ~24 fps give up for the CSS night, but only in the
  // first seconds on screen: a device that can't keep up shows it at once, and a slow patch later
  // (a game booting in a window, a busy tab) only costs pixels. Nothing is judged while windows
  // are open.
  const deltas = [];
  let refresh = 0;
  let win = { t: 0, frames: 0, slow: 0 };
  let under = 0;
  let smooth = 0;
  let raises = 2;
  let warm = 0;
  let judged = 0; // seconds judged so far
  function watch(raw, now) {
    deltas.push(raw);
    if (deltas.length > 40) deltas.shift();
    if (deltas.length >= 12) refresh = Math.min(34, [...deltas].sort((a, b) => a - b)[Math.floor(deltas.length * 0.2)]);
    if (now < warm || root.classList.contains('wm-visible')) {
      win = { t: 0, frames: 0, slow: 0 };
      return;
    }
    if (!win.t) win = { t: now, frames: 0, slow: 0 };
    win.frames++;
    if (refresh && raw > refresh * 1.5 + 3) win.slow++;
    if (now - win.t < 1000) return;
    const fps = (win.frames * 1000) / (now - win.t);
    const share = win.slow / win.frames;
    win = { t: 0, frames: 0, slow: 0 };
    judged++;
    if (share <= 0.4 && fps >= 24) {
      under = 0;
      if (share < 0.05 && scale < 1 && raises > 0 && ++smooth >= 4) {
        smooth = 0;
        raises--;
        scale = Math.min(1, scale / 0.67);
        measure();
      }
      return;
    }
    smooth = 0;
    if (scale > MIN_SCALE) {
      scale = Math.max(MIN_SCALE, scale * 0.67);
      measure();
    } else if (fps < 24 && ++under >= 2 && judged <= 12) {
      off();
    }
  }

  function frame(now) {
    raf = 0;
    if (!running()) return;
    raf = requestAnimationFrame(frame);
    const raw = lastT ? now - lastT : 0;
    lastT = now;
    if (raw) watch(raw, now);
    if (dead) return;

    // at most 60 frames a second (30 once nothing has moved for a while)
    const every = now - idleSince > IDLE_MS ? 1000 / 30 : 1000 / 60;
    if (lastDraw && now < nextDraw - 2) return;
    nextDraw = lastDraw && now - nextDraw < 60 ? nextDraw + every : now + every;
    const dt = lastDraw ? Math.min(0.1, (now - lastDraw) / 1000) : STEP;
    lastDraw = now;

    const sy = scrollY;
    const ds = sy - lastScroll;
    lastScroll = sy;
    if (ds) wake();

    if (heroOn) updateBro();
    readFlicker();
    // the crew's reflection surfaces with them
    if (!crewIn && (crewList?.classList.contains('is-in') || !root.classList.contains('reveals'))) crewIn = true;
    if (crewIn && crewOn && !root.classList.contains('crew-wet')) root.classList.add('crew-wet');

    if (calm()) {
      // still frames: drawn on scroll or resize, and a few times a second while #4764 is in view
      crewA = crewIn ? 1 : 0;
      render();
      cancelAnimationFrame(raf);
      raf = 0;
      clearTimeout(stillTimer);
      if (heroOn && broLive) stillTimer = setTimeout(want, 250);
      return;
    }

    vel += (ds / Math.max(dt, 1 / 240) - vel) * 0.12;
    time += dt;
    flow += dt * (0.3 + Math.min(Math.abs(vel), 3000) / 1900);
    wind += (Math.max(-0.16, Math.min(0.16, vel / 9000)) - wind) * 0.06;
    if (crewIn) crewA = Math.min(1, crewA + dt / 0.9);

    if (sim.on) {
      // the ripples step at a fixed 60 Hz, however often the screen refreshes
      shiftAcc += ds / SIM_PX;
      acc += dt;
      let steps = Math.min(4, Math.floor((acc + 0.004) / STEP));
      acc = Math.max(-STEP, Math.min(STEP, acc - steps * STEP));
      if (steps) {
        feed(steps * STEP, L.water - sy);
        const shift = Math.round(shiftAcc);
        shiftAcc -= shift;
        stepSim(shift, true);
        dropN = 0;
        while (--steps > 0) stepSim(0, false);
      }
    }
    render();
  }

  const running = () => !dead && !document.hidden && !(root.classList.contains('wm-visible') && media.phone.matches);
  function want() {
    if (!raf && running()) {
      lastT = 0;
      lastDraw = 0;
      acc = 0;
      win = { t: 0, frames: 0, slow: 0 };
      warm = performance.now() + 1500;
      raf = requestAnimationFrame(frame);
    }
  }

  // Give up: the CSS night takes over (a lost context, or too slow even at the fewest pixels).
  function off() {
    if (dead) return;
    dead = true;
    cancelAnimationFrame(raf);
    raf = -1;
    root.classList.remove('water-on', 'water-lit', 'crew-wet');
    root.classList.add('water-off');
    canvas.classList.remove('is-on');
    setTimeout(() => {
      canvas.remove();
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    }, 1200);
  }

  document.addEventListener('visibilitychange', want);
  addEventListener('scroll', () => calm() && want(), { passive: true });
  media.reduced.addEventListener('change', want);
  media.phone.addEventListener('change', want);
  new MutationObserver(want).observe(root, { attributes: true, attributeFilter: ['class'] });

  let queued = 0;
  const remeasure = () => {
    if (queued || dead) return;
    queued = requestAnimationFrame(() => {
      queued = 0;
      measure();
    });
  };
  addEventListener('resize', remeasure);
  new ResizeObserver(remeasure).observe(document.querySelector('.page') || document.body);
  document.fonts?.ready.then(remeasure);
  mv?.addEventListener('load', remeasure);

  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    off();
  });

  document.body.prepend(canvas);
  root.classList.add('water-on');
  measure();
  // never wait on the sign's font for long
  setTimeout(() => {
    if (!L.signOn) {
      L.signOn = 1;
      drawSign();
    }
  }, 1500);
  return true;
}
