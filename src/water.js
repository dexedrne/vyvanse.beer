// The rainy rooftop under the game-select screen, in WebGL2 on one canvas over the art.
//
// A ripple sim (a height field stepped at a fixed 60 Hz, fed by rain, heavy drops that
// splash, the pointer's wake and clicks), rain streaks, a puddle mirror and glints, and the
// water is held dark under text so every pair stays readable.
//
// - Above the waterline the canvas is clear except for the rain (and, on Games, a soft blur
//   of the art behind the duo, so the live pair doesn't fight the cast painted in the art):
//   the page's own <img> of the key art shows through, full resolution.
// - Below it the whole floor is a puddle that mirrors that art (crossfading with it), the neon
//   of the cartridges and buttons standing in it, and whoever stands on the water (the live
//   3D duo, or a crew render) about their own feet.
//
// Pixels: at most ~0.9 MP, a 1.25 DPR ceiling, fewer when frames run long (down to 0.45x).
// 60 fps while you're doing something, 30 after a few idle seconds; nothing while the tab is
// hidden (the caller's requestAnimationFrame stops). Reduced motion: no rain, no ripples.

const SIM_PX = 4; // css px per ripple cell (the site uses 3; this screen is all water)
const STEP = 1 / 60;
const MAX_DROPS = 32;
const MAX_SEGS = 6;
const MAX_LIGHTS = 12;
const MAX_INK = 8;
const MIN_SCALE = 0.45;
export const CAP_TEXT = 0.07;

const VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2. - 1., 0., 1.);
}`;

// Height field: r = now, g = the step before. (Verbatim from the site, scroll shift kept.)
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
uniform float uRain;
uniform float uWater;
uniform sampler2D uArtA;
uniform vec4 uFitA;
uniform vec2 uLookA;
uniform sampler2D uArtB;
uniform vec4 uFitB;
uniform vec2 uLookB;
uniform float uMix;
uniform sampler2D uFig;
uniform vec4 uFigRect;
uniform float uFeet;
uniform float uFigOn;
uniform sampler2D uSim;
uniform float uSimOn;
uniform vec2 uSimTexel;
uniform vec4 uLights[${MAX_LIGHTS}];
uniform vec3 uLightC[${MAX_LIGHTS}];
uniform int uLightN;
uniform vec4 uInk[${MAX_INK}];
uniform float uInkCap[${MAX_INK}];
uniform int uInkN;
uniform vec4 uHalo;
uniform float uHaloK;
out vec4 outColor;

const vec3 GROUND = vec3(0.058, 0.039, 0.104);
const vec3 HAZE = vec3(0.15, 0.1, 0.27);
const vec3 LILAC = vec3(0.776, 0.702, 0.969);
const vec3 AMETHYST = vec3(0.557, 0.427, 0.878);

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
float inBox(vec2 p, vec4 r, float f) {
  vec2 d = max(r.xy - p, p - r.xy - r.zw);
  return 1. - smoothstep(0., f, length(max(d, 0.)) + min(max(d.x, d.y), 0.));
}

// The neon standing on the water (cartridges, buttons) as the water sees it: reflections run a
// long way down from a light and only a little way across or up. (From the site.)
vec3 neon(vec2 p) {
  vec3 c = vec3(0.);
  for (int i = 0; i < ${MAX_LIGHTS}; i++) {
    if (i >= uLightN) break;
    vec4 r = uLights[i];
    float dx = max(max(r.x - p.x, p.x - r.x - r.z), 0.);
    float up = max(r.y - p.y, 0.);
    float down = max(p.y - r.y - r.w, 0.);
    c += uLightC[i] * exp(-dx * dx / 2400. - up * up / 700. - down * down / (r.w * r.w * 1.6 + 9000.));
  }
  return c;
}

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

vec2 ripples(vec2 frag, vec2 p) {
  if (uSimOn < 0.5) return uRain > 0.5 ? rings(p) : vec2(0.);
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
  q.x += q.y * 0.1;
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

// the key art where the page shows it (object-fit: cover), blurred and dimmed for the soft ones
vec3 artAt(sampler2D t, vec4 fit, vec2 look, vec2 p, float lod) {
  vec2 uv = clamp((p - fit.xy) / fit.zw, vec2(0.002), vec2(0.998));
  return textureLod(t, uv, lod + look.x).rgb * look.y;
}
vec3 art(vec2 p, float lod) {
  vec3 a = artAt(uArtA, uFitA, uLookA, p, lod);
  if (uMix >= 0.999) return a;
  return mix(artAt(uArtB, uFitB, uLookB, p, lod), a, uMix);
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 p = vec2(frag.x, uRes.y - frag.y) * (uView / uRes);
  float r = (rain(p, 13., 2.3, 290., 0.26, 1.) * 0.5 + rain(p, 31., 3.1, 430., 0.2, 7.)) * uRain;

  // above the waterline: only the rain, over the page's own picture (and the hush behind the duo)
  if (p.y < uWater) {
    vec4 o = vec4(0.);
    if (uHaloK > 0.) {
      vec2 q = (p - uHalo.xy - uHalo.zw * 0.5) / (uHalo.zw * 0.5);
      float m = (1. - smoothstep(0.3, 1., length(q))) * uHaloK;
      if (m > 0.002) o = vec4(art(p, 2.4) * 0.6 * m, m);
    }
    float a = r * 0.14;
    outColor = vec4(mix(LILAC, vec3(1.), 0.4) * a, a) + o * (1. - a);
    return;
  }

  float dy = p.y - uWater;
  float deep = max(uView.y - uWater, 1.);
  vec2 n = ripples(frag, p);

  // wet rooftop under the puddle
  float g = noise(p * 0.45) * 0.6 + noise(p * 0.11) * 0.4;
  vec3 col = GROUND * (0.8 + 0.34 * g);

  // the puddle: nearly all of the floor, its near edge ragged
  float edge = deep * (0.94 + 0.3 * (noise(vec2(p.x * 0.0045, 1.7)) - 0.5));
  float pud = 1. - smoothstep(edge * 0.8, edge, dy);

  // the art upside down, broken up by the ripples, blurring with depth
  vec2 rp = vec2(p.x, uWater - dy) + n * (10. + dy * 0.09);
  rp.x += sin(dy * 0.13 - uTime * 1.7) * min(dy * 0.02, 1.6);
  float lod = clamp(log2(1. + dy / 30.), 0., 5.);
  vec3 refl = art(rp, lod);
  refl = mix(refl, HAZE * 0.45, 0.3 * smoothstep(0., deep, dy));
  refl *= mix(0.72, 0.34, smoothstep(0., deep * 0.9, dy)) * vec3(0.88, 0.86, 1.);

  // whoever stands on the water, mirrored about their feet
  if (uFigOn > 0.5) {
    float fy = p.y - uFeet;
    if (fy > -1.) {
      vec2 fp = vec2(p.x, uFeet - fy) + n * (8. + fy * 0.08);
      fp.x += sin(fy * 0.15 - uTime * 1.8) * min(fy * 0.02, 1.4);
      vec2 uv = (fp - uFigRect.xy) / uFigRect.zw;
      if (uv.x > 0. && uv.y > 0. && uv.x < 1. && uv.y < 1.) {
        vec4 t = textureLod(uFig, uv, clamp(log2(1. + fy / 26.), 0., 4.));
        float k = 1. - smoothstep(uFigRect.w * 0.1, uFigRect.w * 0.75, fy);
        refl = refl * (1. - t.a * k) + t.rgb * vec3(0.84, 0.8, 0.98) * k * mix(0.9, 0.5, smoothstep(0., deep, fy));
      }
    }
  }
  refl += neon(p + n * vec2(60., 90.)) * 0.6;
  col = mix(col, refl, pud);

  // the waterline catches the light
  col += LILAC * 0.18 * (1. - smoothstep(0., 2.5, dy));

  vec3 N = normalize(vec3(n * 2.2, 1.));
  float spec = pow(max(dot(N, normalize(vec3(-0.25, 0.55, 1.))), 0.), 26.);
  col += mix(LILAC, vec3(1.), 0.3) * spec * (0.07 + 0.62 * pud);
  col *= clamp(1. + (n.x - n.y) * 0.45 * pud, 0.62, 1.5);
  col += mix(LILAC, vec3(1.), 0.4) * r * 0.05;
  vec2 v = p / uView - 0.5;
  col *= 1. - 0.45 * dot(v, v);
  col = max(col, 0.);

  // under text, hold the water dark (linear light, as on the site)
  float cap = 9.;
  for (int i = 0; i < ${MAX_INK}; i++) {
    if (i >= uInkN) break;
    cap = mix(cap, min(cap, uInkCap[i]), inBox(p, uInk[i], 110.));
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
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) console.warn(gl.getShaderInfoLog(sh));
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

// canvas: sits in `host` (the .screen), covering it. Returns null without WebGL2.
export function createWater(canvas, host, { calm }) {
  const gl = canvas.getContext('webgl2', {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    powerPreference: 'low-power',
  });
  if (!gl) return null;
  const draw = compile(gl, FRAG);
  const step = compile(gl, SIM);
  if (!draw || !step) return null;

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
  // throws a SecurityError for pictures it may not read: the caller turns the water off
  function upload(t, src) {
    gl.bindTexture(gl.TEXTURE_2D, t);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src);
    gl.generateMipmap(gl.TEXTURE_2D);
  }
  const figTex = texture();
  const noSim = texture(false);
  const arts = new Map(); // img -> { tex, ready }
  function artTex(img) {
    let a = arts.get(img);
    if (a) return a;
    a = { tex: texture(), ready: false };
    arts.set(img, a);
    const go = () => {
      upload(a.tex, img);
      a.ready = true;
    };
    if (img.complete && img.naturalWidth) {
      try { go(); } catch { fail(); }
    } else img.addEventListener('load', () => { try { go(); } catch { fail(); } }, { once: true });
    return a;
  }

  // ---- ripple sim (needs a float render target; without one, looping rain rings) ----
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

  // ---- layout (css px, relative to the host) ----
  const view = { w: 1, h: 1, px: 1 };
  let scale = 1;
  const L = { water: 0, lights: [], ink: [] };
  const art = { a: null, b: null, t0: -1e9 }; // { img, fit, look }
  const fig = { src: null, live: false, rect: [0, 0, 1, 1], feet: 0, on: false, dirty: false };
  const halo = { rect: [0, 0, 0, 0], k: 0, want: 0 };

  function rel(el) {
    const h = host.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return [r.left - h.left, r.top - h.top, r.width, r.height];
  }
  // where object-fit: cover puts the picture, from the img's own box and object-position
  function fitOf(img) {
    const bw = img.offsetWidth || 1;
    const bh = img.offsetHeight || 1;
    const iw = img.naturalWidth || 16;
    const ih = img.naturalHeight || 9;
    const s = Math.max(bw / iw, bh / ih);
    const [px, py] = (getComputedStyle(img).objectPosition || '50% 50%').split(' ').map((v) => parseFloat(v) / 100);
    const dw = iw * s;
    const dh = ih * s;
    return [(bw - dw) * (isFinite(px) ? px : 0.5), (bh - dh) * (isFinite(py) ? py : 0.5), dw, dh];
  }

  function measure() {
    const r = host.getBoundingClientRect();
    view.w = Math.max(1, r.width);
    view.h = Math.max(1, r.height);
    const dpr = Math.min(devicePixelRatio || 1, 1.25);
    const budget = view.w < 600 ? 0.6e6 : 0.9e6;
    view.px = Math.min(dpr, Math.sqrt(budget / (view.w * view.h))) * scale;
    const cw = Math.max(1, Math.round(view.w * view.px));
    const ch = Math.max(1, Math.round(view.h * view.px));
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }
    simSize(view.w, view.h);
    if (art.a) art.a.fit = fitOf(art.a.img);
    if (art.b) art.b.fit = fitOf(art.b.img);
  }

  // the scene, from the page: { water, art: <img>, soft, lights: [[el, rgb]], ink: [el], figure, halo }
  function setScene(s, now = performance.now()) {
    L.water = s.water;
    halo.want = s.halo ? 1 : 0;
    if (s.halo) halo.rect = s.halo;
    if (s.art && (!art.a || art.a.img !== s.art)) {
      art.b = art.a;
      art.a = { img: s.art, fit: fitOf(s.art), look: s.soft ? [4.2, 0.5] : [0, 1], tex: artTex(s.art) };
      art.t0 = art.b ? now : -1e9;
    } else if (art.a) {
      art.a.fit = fitOf(art.a.img);
    }
    L.lights = s.lights.slice(0, MAX_LIGHTS).map(([el, c]) => ({ rect: rel(el), c }));
    L.ink = s.ink.slice(0, MAX_INK).map((el) => rel(el)).filter((b) => b[2] && b[3]);
    setFigure(s.figure);
  }
  // figure: { el (canvas or img), live, feet } or null
  function setFigure(f) {
    fig.on = !!f;
    if (!f) return;
    fig.rect = rel(f.el);
    fig.feet = f.feet;
    fig.live = !!f.live;
    if (fig.src !== f.el || !f.live) fig.dirty = true;
    fig.src = f.el;
  }

  // ---- impulses: rain, the pointer, clicks ----
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
  const local = (e) => {
    const h = host.getBoundingClientRect();
    return [e.clientX - h.left, e.clientY - h.top];
  };
  addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    if (trail.length > 48) trail.shift();
    trail.push(local(e));
  }, { passive: true });
  addEventListener('pointerdown', (e) => {
    if (calm()) return;
    const [x, y] = local(e);
    if (y > L.water) drop(x, y, 3, 1.8);
  }, { passive: true });

  function feed(dt) {
    segN = 0;
    if (trail.length > 1) {
      const n = trail.length - 1;
      const every = Math.ceil(n / MAX_SEGS);
      for (let i = 0; i < n && segN < MAX_SEGS; i += every) {
        const [x0, y0] = trail[i];
        const [x1, y1] = trail[Math.min(n, i + every)];
        const len = Math.hypot(x1 - x0, y1 - y0);
        if (len < 0.5 || (y0 < L.water && y1 < L.water)) continue;
        segs.set([x0 / SIM_PX, (view.h - y0) / SIM_PX, x1 / SIM_PX, (view.h - y1) / SIM_PX], segN * 4);
        segK.set([1.9, Math.min(0.5, 0.08 + len * 0.01)], segN * 2);
        segN++;
      }
      trail.splice(0, trail.length - 1);
    }
    // drips at the figure's feet, so their reflection keeps moving
    if (fig.on && Math.random() < dt * 0.9) drop(fig.rect[0] + fig.rect[2] * (0.25 + Math.random() * 0.5), fig.feet + 4 + Math.random() * 16, 2.4, 1.2);
    // rain, landing only below the waterline; now and then a heavy drop that splashes
    const top = Math.max(0, L.water);
    if (top >= view.h) return;
    const area = (view.w * (view.h - top)) / (1440 * 700);
    let n = dt * 34 * area;
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

  function stepSim(fresh) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, sim.fb[1 - sim.i]);
    gl.viewport(0, 0, sim.w, sim.h);
    gl.useProgram(step.prog);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, sim.tex[sim.i]);
    gl.uniform1i(step.u.uPrev, 0);
    gl.uniform2i(step.u.uSize, sim.w, sim.h);
    gl.uniform1i(step.u.uShift, 0);
    gl.uniform1f(step.u.uDamp, 0.986);
    gl.uniform4fv(step.u.uDrops, drops);
    gl.uniform1i(step.u.uDropN, fresh ? dropN : 0);
    gl.uniform4fv(step.u.uSegs, segs);
    gl.uniform2fv(step.u.uSegK, segK);
    gl.uniform1i(step.u.uSegN, fresh ? segN : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    sim.i = 1 - sim.i;
  }

  const inkBuf = new Float32Array(MAX_INK * 4);
  const capBuf = new Float32Array(MAX_INK);
  const lightBuf = new Float32Array(MAX_LIGHTS * 4);
  const lightCol = new Float32Array(MAX_LIGHTS * 3);
  const ease = (t) => t * t * (3 - 2 * t);

  function bindArt(a, unit, uTex, uFit, uLook) {
    const u = draw.u;
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, a?.tex.ready ? a.tex.tex : noSim);
    gl.uniform1i(u[uTex], unit);
    gl.uniform4fv(u[uFit], a ? a.fit : [0, 0, 1, 1]);
    gl.uniform2fv(u[uLook], a?.tex.ready ? a.look : [0, 0]);
  }

  function render(now) {
    const u = draw.u;
    L.ink.forEach((b, i) => {
      inkBuf.set(b, i * 4);
      capBuf[i] = CAP_TEXT;
    });
    L.lights.forEach((l, i) => {
      lightBuf.set(l.rect, i * 4);
      lightCol.set(l.c, i * 3);
    });
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(draw.prog);
    gl.uniform2f(u.uView, view.w, view.h);
    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uRain, calm() ? 0 : 1);
    gl.uniform1f(u.uWater, L.water);
    bindArt(art.a, 0, 'uArtA', 'uFitA', 'uLookA');
    bindArt(art.b, 1, 'uArtB', 'uFitB', 'uLookB');
    gl.uniform1f(u.uMix, art.b?.tex.ready ? ease(Math.min(1, (now - art.t0) / 550)) : 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, fig.on ? figTex : noSim);
    gl.uniform1i(u.uFig, 2);
    gl.uniform4fv(u.uFigRect, fig.rect);
    gl.uniform1f(u.uFeet, fig.feet);
    gl.uniform1f(u.uFigOn, fig.on ? 1 : 0);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, sim.on ? sim.tex[sim.i] : noSim);
    gl.uniform1i(u.uSim, 3);
    gl.uniform1f(u.uSimOn, sim.on && !calm() ? 1 : 0);
    gl.uniform2f(u.uSimTexel, 1 / Math.max(1, sim.w), 1 / Math.max(1, sim.h));
    gl.uniform4fv(u.uLights, lightBuf);
    gl.uniform3fv(u.uLightC, lightCol);
    gl.uniform1i(u.uLightN, L.lights.length);
    gl.uniform4fv(u.uInk, inkBuf);
    gl.uniform1fv(u.uInkCap, capBuf);
    gl.uniform1i(u.uInkN, L.ink.length);
    gl.uniform4fv(u.uHalo, halo.rect);
    gl.uniform1f(u.uHaloK, art.a?.tex.ready ? halo.k : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // ---- frame-rate watch: one-second windows; slow ones draw fewer pixels (as on the site) ----
  let win = { t: 0, frames: 0 };
  let warm = performance.now() + 1500;
  let smooth = 0;
  function watch(now, target) {
    if (now < warm) return;
    if (!win.t) win = { t: now, frames: 0 };
    win.frames++;
    if (now - win.t < 1000) return;
    const fps = (win.frames * 1000) / (now - win.t);
    win = { t: 0, frames: 0 };
    if (fps < target * 0.75 && scale > MIN_SCALE) {
      scale = Math.max(MIN_SCALE, scale * 0.75);
      smooth = 0;
      measure();
    } else if (fps >= target * 0.95 && scale < 1 && ++smooth >= 5) {
      smooth = 0;
      scale = Math.min(1, scale / 0.75);
      measure();
    }
  }

  let time = 7.3;
  let acc = 0;
  let dead = false;
  function frame(dt, now, target) {
    if (dead) return;
    watch(now, target);
    halo.k += (halo.want - halo.k) * Math.min(1, dt * 5);
    try {
      if (fig.on && fig.src && (fig.live || fig.dirty)) {
        // a live canvas is copied every frame, right after it drew (same task, so it's intact)
        if (fig.src.width && (fig.src.naturalWidth !== 0)) upload(figTex, fig.src);
        fig.dirty = false;
      }
    } catch {
      fig.on = false;
    }
    if (!calm()) {
      time += dt;
      if (sim.on) {
        acc += dt;
        let steps = Math.min(4, Math.floor((acc + 0.004) / STEP));
        acc = Math.max(-STEP, Math.min(STEP, acc - steps * STEP));
        if (steps) {
          feed(steps * STEP);
          stepSim(true);
          dropN = 0;
          while (--steps > 0) stepSim(false);
        }
      }
    }
    render(now);
  }

  function fail() {
    if (dead) return;
    dead = true;
    host.classList.remove('water-on');
    canvas.remove();
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    dispatchEvent(new Event('vyv:water-off'));
  }
  canvas.addEventListener('webglcontextlost', (e) => {
    e.preventDefault();
    fail();
  });

  // after a pause (a game was open, or the tab was hidden), don't count the gap as slow frames
  function wake() {
    win = { t: 0, frames: 0 };
    warm = performance.now() + 1000;
  }

  measure();
  return { measure, setScene, setFigure, frame, fail, wake, get dead() { return dead; } };
}
