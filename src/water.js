// The rainy night behind the page, drawn in WebGL2 on one fixed canvas under everything.
//
// - Above the hero's waterline: the night, a low skyline and the neon's spill.
// - Below it: a puddle that mirrors the sign (vyvanse.beer) and #4764, then wet ground with a
//   stream running down the page through the drop marker of each section head.
// - A ripple simulation (a small height field, one cell per 3 css px) takes the rain, the
//   pointer or a finger, and a drop at each section head as it scrolls in. It scrolls with the
//   page, and scrolling speeds the stream up.
// - Rain streaks fall over all of it, brighter near the sign.
//
// The neon sign reaches the shader as a texture drawn from the real <h1> (same font, same
// place). #4764's reflection copies his live 3D canvas every frame while the hero is on screen,
// or his render before the 3D viewer is up.
//
// It starts after the page has painted (src/main.js imports it when the browser is idle), stops
// while the tab is hidden, drops its resolution if frames run long, and with reduced motion
// draws still frames only (no rain, no ripples, no flow). Without WebGL2 createWater() returns
// false and the page keeps its CSS night (see .water-off in src/style.css).

import { media } from './dom.js';

const SIM_PX = 3; // css px per ripple cell
const MAX_DROPS = 24;
const MAX_PATH = 24;
const PIXEL_BUDGET = 1.7e6; // drawing-buffer pixels, before the slow-frame fallback kicks in

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
uniform float uSignOn;
uniform sampler2D uBro;
uniform vec4 uBroRect;
uniform vec2 uBroUV;
uniform float uBroOn;
uniform sampler2D uSim;
uniform float uSimOn;
uniform vec2 uSimTexel;
uniform vec2 uPath[${MAX_PATH}];
uniform int uPathN;
uniform vec2 uStreamW;
out vec4 outColor;

const vec3 NIGHT = vec3(0.035, 0.024, 0.07);
const vec3 MID = vec3(0.071, 0.047, 0.125);
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
  c += AMETHYST * 0.2 * exp(-dot(sd, sd) * 1.7) * uSignOn;
  vec2 bc = uBroRect.xy + uBroRect.zw * vec2(0.5, 0.55);
  vec2 bd = (p - bc) / (uBroRect.zw * vec2(1.1, 0.7));
  c += AMETHYST * 0.14 * exp(-dot(bd, bd) * 1.7);
  return c;
}

vec3 signAt(vec2 rp, float lod) {
  if (uSignOn < 0.5) return vec3(0.);
  vec2 uv = (rp - uSignRect.xy) / uSignRect.zw;
  if (uv.x < 0. || uv.y < 0. || uv.x > 1. || uv.y > 1.) return vec3(0.);
  vec2 t = textureLod(uSign, uv, lod).rg;
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

// The stream: a smooth S between each pair of path points, narrow in the margin by the section
// heads and wider where it swings out behind the glass. Long-exposure water: silky bands that
// run with the current, a brighter meniscus at the banks, and neon (lilac, now and then amber)
// smeared along the flow. Returns its colour and how much of it covers p.
vec4 stream(vec2 p) {
  if (uPathN < 2) return vec4(0.);
  vec2 a = uPath[0];
  vec2 b = uPath[1];
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
  float swing = clamp(abs(b.x - a.x) / 240., 0., 1.);
  float mid = sin(3.14159 * t) * swing;
  float x = mix(a.x, b.x, s) + sin(p.y * mix(0.012, 0.0061, swing) + 1.3) * mix(8., 26., swing) * sin(3.14159 * t);
  float slope = (b.x - a.x) * 6. * t * (1. - t) / span;
  float hw = mix(uStreamW.x, uStreamW.y, mid);
  float across = (p.x - x) / sqrt(1. + slope * slope) / hw;
  float ax = abs(across);
  float m = 1. - smoothstep(0.55, 1., ax);
  m *= smoothstep(uPath[0].y - 40., uPath[0].y + 200., p.y);
  if (m <= 0.002) return vec4(0.);
  float sl = p.y * 0.0026 - uFlow * 0.55;
  float silk = fbm(vec2(across * 2.6 + 3., sl));
  float band = smoothstep(0.36, 0.74, silk);
  float drift = noise(vec2(across * 8. + 5., p.y * 0.0065 - uFlow * 1.4));
  vec3 c = mix(vec3(0.07, 0.048, 0.15), vec3(0.2, 0.14, 0.4), band);
  c += LILAC * 0.13 * band * smoothstep(0.55, 0.95, drift);
  c += LILAC * 0.05 * smoothstep(0.5, 0.85, ax) * (1. - smoothstep(0.85, 1., ax));
  c += AMBER * 0.42 * pow(noise(vec2(across * 5. + 31., p.y * 0.011 - uFlow * 2.)), 14.);
  // light caught on the ripples, carried downstream
  c += mix(LILAC, vec3(1.), 0.3) * 0.3 * pow(noise(vec2(across * 4.5 + 17., p.y * 0.034 - uFlow * 7.)), 9.) * (1. - ax);
  c *= (0.82 + 0.3 * (1. - ax)) * mix(0.72, 1., mid);
  return vec4(c, m * mix(0.8, 1., mid));
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
    vec2 n;
    if (uSimOn > 0.5) {
      vec2 uv = frag / uRes;
      float hl = texture(uSim, uv - vec2(uSimTexel.x, 0.)).r;
      float hr = texture(uSim, uv + vec2(uSimTexel.x, 0.)).r;
      float hd = texture(uSim, uv - vec2(0., uSimTexel.y)).r;
      float hu = texture(uSim, uv + vec2(0., uSimTexel.y)).r;
      n = vec2(hl - hr, hu - hd);
    } else {
      n = rings(p);
    }
    float g = noise(p * 0.45) * 0.6 + noise(p * 0.11) * 0.4;
    col = MID * (0.78 + 0.34 * g);
    col += AMETHYST * 0.05 * smoothstep(0.4, 0.95, fbm(p * 0.0017 + vec2(0., uTime * 0.012)));
    vec4 st = stream(p + n * 9.);
    col = mix(col, st.rgb, st.a);
    float edge = uDepth * (0.84 + 0.34 * (noise(vec2(p.x * 0.0055, 1.7)) - 0.5));
    float pud = 1. - smoothstep(edge * 0.7, edge, dy);
    if (pud > 0.002) {
      vec2 rp = vec2(p.x, uWater - dy) + n * (10. + dy * 0.09);
      rp.x += sin(dy * 0.13 - uTime * 1.7) * min(dy * 0.02, 1.6);
      float lod = clamp(log2(1. + dy / 30.), 0., 5.);
      vec3 refl = broAt(sky(rp) + signAt(rp, lod), rp, lod);
      refl *= mix(0.66, 0.3, smoothstep(0., uDepth * 0.8, dy)) * vec3(0.88, 0.86, 1.);
      col = mix(col, refl, pud);
    }
    float wet = max(pud, st.a);
    vec3 N = normalize(vec3(n * 2.4, 1.));
    float spec = pow(max(dot(N, normalize(vec3(-0.25, 0.55, 1.))), 0.), 44.);
    col += mix(LILAC, vec3(1.), 0.35) * spec * (0.14 + 0.75 * wet);
    col *= 1. + (n.x - n.y) * 0.55 * wet;
  }
  float r = rain(sp, 13., 2.3, 290., 0.26, 1.) * 0.5 + rain(sp, 31., 3.1, 430., 0.2, 7.);
  vec2 sc = uSignRect.xy + uSignRect.zw * 0.5;
  vec2 sd = (p - sc) / (uSignRect.zw * vec2(0.8, 2.4));
  float lit = 1. + 2.4 * exp(-dot(sd, sd)) * uSignOn;
  col += mix(LILAC, vec3(1.), 0.4) * r * uRain * 0.07 * lit;
  vec2 v = sp / uView - 0.5;
  col *= 1. - 0.5 * dot(v, v);
  col += (hash(frag + fract(uTime) * 91.) - 0.5) / 255.;
  outColor = vec4(max(col, 0.), 1.);
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
  const poster = figure.querySelector('img');

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
    path: new Float32Array(MAX_PATH * 2),
    pathN: 0,
    streamW: [30, 110],
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

    // The stream: out of the puddle, then down the margin through each section head's drop.
    // Where a section's body is glass it swings out behind the panes and comes back before the
    // next head, so it never runs under plain text. A swing is never flatter than its drop allows
    // (a river bend, not a pipe), and past the last section it runs on down the margin.
    const content = document.querySelector('.content')?.getBoundingClientRect() || hr;
    const left = content.left;
    const cw = content.width;
    const narrow = cw < 640;
    const pts = [[left + cw * (narrow ? 0.66 : 0.34), L.water + L.depth * 0.5]];
    const secs = [...document.querySelectorAll('.sec')];
    const heads = [];
    secs.forEach((sec, i) => {
      const drop = sec.querySelector('.sec__drop')?.getBoundingClientRect();
      const head = sec.querySelector('.sec__head')?.getBoundingClientRect();
      if (!drop || !head) return;
      const x = drop.left + drop.width / 2;
      heads.push(x);
      pts.push([x, drop.top + drop.height / 2 + sy], [x, head.bottom + sy + 12]);
      if (!sec.querySelector('.glass')) return;
      const top = head.bottom + sy + 12;
      const bottom = sec.getBoundingClientRect().bottom + sy;
      const next = secs[i + 1]?.querySelector('.sec__drop')?.getBoundingClientRect();
      const nextY = next ? next.top + sy : bottom + 400;
      const y = (top + bottom) / 2;
      const reach = Math.min(y - top, nextY - y) * 0.75;
      if (reach > 120) pts.push([Math.min(left + cw * (i % 2 ? 0.7 : 0.78), x + reach), y]);
    });
    const docH = document.documentElement.scrollHeight;
    pts.push([heads.length ? heads[heads.length - 1] : left, docH + 260]);
    L.pathN = Math.min(MAX_PATH, pts.length);
    for (let i = 0; i < L.pathN; i++) {
      L.path[i * 2] = pts[i][0];
      L.path[i * 2 + 1] = pts[i][1];
    }
    L.streamW = narrow ? [8, 70] : [30, 124];

    const dpr = devicePixelRatio || 1;
    view.px = Math.min(dpr, 2, Math.sqrt(PIXEL_BUDGET / (view.w * view.h))) * scale;
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

  // ---- drops: rain, the pointer, section heads ----

  const drops = new Float32Array(MAX_DROPS * 4);
  let dropN = 0;
  function drop(x, y, r, s) {
    if (dropN >= MAX_DROPS) return;
    drops.set([x / SIM_PX, (view.h - y) / SIM_PX, r, s], dropN * 4);
    dropN++;
  }
  const trail = [];
  function point(x, y) {
    if (trail.length > 40) trail.shift();
    trail.push([x, y]);
  }
  addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType !== 'touch') point(e.clientX, e.clientY);
    },
    { passive: true },
  );
  addEventListener(
    'pointerdown',
    (e) => {
      if (calm() || e.pointerType === 'touch') return;
      drop(e.clientX, e.clientY, 2.6, 1.4);
    },
    { passive: true },
  );
  let lastTouch = null;
  addEventListener(
    'touchstart',
    (e) => {
      if (calm()) return;
      for (const t of e.changedTouches) drop(t.clientX, t.clientY, 2.4, 1.2);
      lastTouch = null;
    },
    { passive: true },
  );
  addEventListener(
    'touchmove',
    (e) => {
      const t = e.touches[0];
      if (!t) return;
      if (!lastTouch) trail.length = 0;
      lastTouch = t;
      point(t.clientX, t.clientY);
    },
    { passive: true },
  );
  addEventListener('water:drop', (e) => {
    const d = e.detail || {};
    if (!calm()) drop(d.x, d.y, 3.2, 2.4 * (d.size || 1));
  });

  function feed(dt, waterY) {
    // the pointer: drops along its path, spaced out, stronger the faster it moves
    if (trail.length > 1) {
      let [px, py] = trail[0];
      for (let i = 1; i < trail.length && dropN < MAX_DROPS - 6; i++) {
        const [x, y] = trail[i];
        const d = Math.hypot(x - px, y - py);
        if (d < 7) continue;
        drop(x, y, 1.7, Math.min(0.75, 0.16 + d * 0.012));
        px = x;
        py = y;
      }
      trail.splice(0, trail.length - 1);
    }
    // rain, landing only below the waterline
    const top = Math.max(0, waterY);
    if (top >= view.h) return;
    const area = (view.w * (view.h - top)) / (1440 * 700);
    let n = dt * 38 * area;
    while (n > 0 && dropN < MAX_DROPS) {
      if (n < 1 && Math.random() > n) break;
      n -= 1;
      drop(Math.random() * view.w, top + Math.random() * (view.h - top), 1.05 + Math.random() * 0.6, 0.3 + Math.random() * 0.5);
    }
  }

  // ---- the loop ----

  const calm = () => media.reduced.matches;
  let raf = 0;
  let last = 0;
  let time = 7.3;
  let flow = 0;
  let wind = 0;
  let vel = 0;
  let lastScroll = scrollY;
  let shiftAcc = 0;
  let heroOn = true;
  let slowFrames = 0;
  let stillTimer = 0;

  new IntersectionObserver((es) => {
    heroOn = es.some((e) => e.isIntersecting);
    want();
  }).observe(hero);

  function stepSim(shift) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, sim.fb[1 - sim.i]);
    gl.viewport(0, 0, sim.w, sim.h);
    gl.useProgram(step.prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sim.tex[sim.i]);
    gl.uniform1i(step.u.uPrev, 0);
    gl.uniform2i(step.u.uSize, sim.w, sim.h);
    gl.uniform1i(step.u.uShift, shift);
    gl.uniform1f(step.u.uDamp, 0.984);
    gl.uniform4fv(step.u.uDrops, drops);
    gl.uniform1i(step.u.uDropN, dropN);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    sim.i = 1 - sim.i;
    dropN = 0;
  }

  function render() {
    const u = draw.u;
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
    gl.uniform1f(u.uSignOn, L.signOn);
    gl.uniform4fv(u.uBroRect, broLive ? L.bro : L.poster);
    gl.uniform2fv(u.uBroUV, broUV);
    gl.uniform1f(u.uBroOn, broLive || broStill ? 1 : 0);
    gl.uniform1f(u.uSimOn, sim.on && !calm() ? 1 : 0);
    gl.uniform2f(u.uSimTexel, 1 / Math.max(1, sim.w), 1 / Math.max(1, sim.h));
    gl.uniform2fv(u.uPath, L.path);
    gl.uniform1i(u.uPathN, L.pathN);
    gl.uniform2fv(u.uStreamW, L.streamW);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, signTex);
    gl.uniform1i(u.uSign, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, broTex);
    gl.uniform1i(u.uBro, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, sim.on ? sim.tex[sim.i] : noSim);
    gl.uniform1i(u.uSim, 2);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function frame(now) {
    raf = 0;
    if (!running()) return;
    const dt = last ? Math.min(0.05, (now - last) / 1000) : 1 / 60;
    last = now;
    const sy = scrollY;
    const ds = sy - lastScroll;
    lastScroll = sy;

    if (heroOn) updateBro();

    if (calm()) {
      // still frames: drawn on scroll or resize, and a few times a second while #4764 is in view
      render();
      clearTimeout(stillTimer);
      if (heroOn && broLive) stillTimer = setTimeout(want, 250);
      return;
    }

    vel += (ds / Math.max(dt, 1 / 240) - vel) * 0.12;
    time += dt;
    flow += dt * (0.3 + Math.min(Math.abs(vel), 3000) / 1900);
    wind += (Math.max(-0.16, Math.min(0.16, vel / 9000)) - wind) * 0.06;

    if (sim.on) {
      shiftAcc += ds / SIM_PX;
      const shift = Math.round(shiftAcc);
      shiftAcc -= shift;
      feed(dt, L.water - sy);
      stepSim(shift);
    }
    render();

    // Long frames: draw fewer pixels (down to half).
    slowFrames = dt > 1 / 40 ? slowFrames + 1 : Math.max(0, slowFrames - 1);
    if (slowFrames > 40 && scale > 0.55) {
      slowFrames = 0;
      scale *= 0.8;
      measure();
    }
    raf = requestAnimationFrame(frame);
  }

  const running = () => !document.hidden && !(root.classList.contains('wm-visible') && media.phone.matches);
  function want() {
    if (!raf && running()) {
      last = 0;
      raf = requestAnimationFrame(frame);
    }
  }

  document.addEventListener('visibilitychange', want);
  addEventListener('scroll', () => calm() && want(), { passive: true });
  media.reduced.addEventListener('change', want);
  media.phone.addEventListener('change', want);
  new MutationObserver(want).observe(root, { attributes: true, attributeFilter: ['class'] });

  let queued = 0;
  const remeasure = () => {
    if (queued) return;
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
    cancelAnimationFrame(raf);
    raf = -1;
    canvas.remove();
    root.classList.remove('water-on');
    root.classList.add('water-off');
  });

  document.body.prepend(canvas);
  measure();
  root.classList.add('water-on');
  requestAnimationFrame(() => canvas.classList.add('is-on'));
  return true;
}
