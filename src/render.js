'use strict';
/* Chunk meshing with smooth lighting + AO, voxel shader, sky, clouds, aurora, particles. */
const canvasEl = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas: canvasEl, antialias: false, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
renderer.outputEncoding = THREE.LinearEncoding;
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(72, 1, 0.05, 400);
camera.rotation.order = 'YXZ';
scene.add(camera);

const atlasTex = new THREE.CanvasTexture(Atlas.canvas);
atlasTex.magFilter = THREE.NearestFilter; atlasTex.minFilter = THREE.NearestFilter; atlasTex.generateMipmaps = false; atlasTex.flipY = false;

const U = {
  uAtlas: { value: atlasTex }, uDay: { value: 1 }, uTime: { value: 0 },
  uFogColor: { value: new THREE.Color(0xbfd8ee) }, uFogNear: { value: 60 }, uFogFar: { value: 150 },
  uTorch: { value: new THREE.Color(1.0, 0.7, 0.4) }, uUnder: { value: 0 },
  uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uSunCol: { value: new THREE.Color(1, 0.96, 0.88) }, uAmbCol: { value: new THREE.Color(0.45, 0.52, 0.66) },
  uViewSun: { value: new THREE.Vector3(0, 1, 0) }, uHazeCol: { value: new THREE.Color(1, 0.75, 0.45) },
  uPLight: { value: new THREE.Vector4(0, 0, 0, 0) },
  uReflTex: { value: null }, uReflMat: { value: new THREE.Matrix4() }, uReflOn: { value: 0 }, uReflH: { value: 22.88 }, uClipY: { value: -1000 },
  uSkyTop: { value: new THREE.Color(0x4a8ad8) }, uSkyHor: { value: new THREE.Color(0xbfd8ee) },
  uShadowMap: { value: null }, uShadowMatrix: { value: new THREE.Matrix4() }, uShadowOn: { value: 0 }, uShadowSize: { value: 2048 },
};
const VERT = `
attribute vec3 aTile; attribute vec2 aLocal; attribute vec4 aLight;
varying vec3 vTile; varying vec2 vLocal; varying vec4 vLight; varying float vFog; varying vec3 vWorld;
uniform float uTime;
void main(){
  vTile=aTile; vLocal=aLocal; vLight=aLight;
  vec3 p=position;
  float anim=mod(aTile.z,10.0);
  if(anim>1.5&&anim<2.5){ float sh=clamp(aLight.z*8.0,0.0,1.0); p.y+=(sin(p.x*0.9+uTime*1.7)*0.03+cos(p.z*0.8+uTime*1.3)*0.03+sin((p.x+p.z)*0.37+uTime*0.9)*0.025)*sh; }
  if(anim>2.5&&anim<3.5){ float w=sin(uTime*1.4+p.x*0.5+p.z*0.3); p.x+=w*0.04*aLocal.y; p.z+=cos(uTime*1.1+p.x*0.4)*0.03*aLocal.y; }
  vec4 wp=modelMatrix*vec4(p,1.0);
  vWorld=wp.xyz;
  vec4 mv=viewMatrix*wp;
  vFog=length(mv.xyz);
  gl_Position=projectionMatrix*mv;
}`;
const FRAG = `
uniform sampler2D uAtlas; uniform float uDay; uniform float uTime; uniform vec3 uFogColor; uniform float uFogNear; uniform float uFogFar;
uniform vec3 uTorch; uniform float uCut; uniform float uOpacity; uniform float uUnder; uniform float uPlant;
uniform vec3 uSunDir; uniform vec3 uSunCol; uniform vec3 uAmbCol; uniform vec3 uHazeCol;
uniform vec4 uPLight;
uniform sampler2D uReflTex; uniform mat4 uReflMat; uniform float uReflOn; uniform float uReflH; uniform float uClipY; uniform vec3 uSkyTop; uniform vec3 uSkyHor;
uniform sampler2D uShadowMap; uniform mat4 uShadowMatrix; uniform float uShadowOn; uniform float uShadowSize;
varying vec3 vTile; varying vec2 vLocal; varying vec4 vLight; varying float vFog; varying vec3 vWorld;
vec3 toLin(vec3 c){ return pow(c, vec3(2.2)); }
vec3 toSrgb(vec3 c){ return pow(max(c, 0.0), vec3(1.0/2.2)); }
float shadowAt(vec3 wp, vec3 n){
  if(uShadowOn<0.5) return 1.0;
  vec4 sc=uShadowMatrix*vec4(wp+n*0.07,1.0);
  vec3 c=sc.xyz/sc.w*0.5+0.5;
  if(c.x<0.0||c.x>1.0||c.y<0.0||c.y>1.0||c.z>1.0) return 1.0;
  float t=1.0/uShadowSize, s=0.0;
  for(int i=-1;i<=1;i++) for(int j=-1;j<=1;j++){ float d=texture2D(uShadowMap,c.xy+vec2(float(i),float(j))*t*1.25).r; s+= (c.z-0.0012>d)?0.0:1.0; }
  s/=9.0;
  vec2 e=min(c.xy,1.0-c.xy); float edge=smoothstep(0.0,0.08,min(e.x,e.y));
  return mix(1.0,s,edge);
}
vec3 V0(){ return normalize(cameraPosition-vWorld); }
// ---- water: summed directional waves (analytic slopes) + small ripples
vec2 waveSlope(vec2 p, float t){
  vec2 g=vec2(0.0);
  vec4 D[6]; D[0]=vec4(0.86,0.5,0.55,1.1); D[1]=vec4(-0.32,0.95,0.9,1.5); D[2]=vec4(0.6,-0.8,1.6,2.1); D[3]=vec4(-0.9,-0.43,2.7,2.6); D[4]=vec4(0.2,0.98,4.3,3.4); D[5]=vec4(-0.7,0.71,6.9,4.1);
  float A[6]; A[0]=0.11; A[1]=0.08; A[2]=0.05; A[3]=0.035; A[4]=0.022; A[5]=0.014;
  for(int i=0;i<6;i++){ float k=D[i].z; float ph=dot(D[i].xy,p)*k+t*D[i].w; g+=D[i].xy*k*A[i]*cos(ph); }
  return g;
}
float hash2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float vnoise2(vec2 p){ vec2 i=floor(p),f=fract(p); f=f*f*(3.0-2.0*f); return mix(mix(hash2(i),hash2(i+vec2(1,0)),f.x),mix(hash2(i+vec2(0,1)),hash2(i+vec2(1,1)),f.x),f.y); }
float caustic(vec2 p, float t){ // two drifting layers of bright, wobbly cells
  vec2 q=p*1.6; float c=0.0;
  for(int i=0;i<2;i++){ vec2 o=vec2(t*0.35,-t*0.27)*(i==0?1.0:-0.8); float n=vnoise2(q+o+vec2(sin(q.y*1.7+t),cos(q.x*1.3-t))*0.35); c+=pow(1.0-abs(n*2.0-1.0),7.0); q*=1.73; }
  return c;
}
void main(){
  float anim=mod(vTile.z,10.0);
  vec2 l=vLocal;
  if(anim>0.5&&anim<2.5) l.y=fract(l.y+uTime*(anim<1.5?0.03:0.06));
  l=clamp(l,0.001,0.999);
  vec2 uv=(vTile.xy+vec2(l.x,1.0-l.y))/16.0;
  vec4 t=texture2D(uAtlas,uv);
  if(t.a<uCut) discard;
  vec3 alb=toLin(t.rgb);
  vec3 n0=normalize(cross(dFdx(vWorld),dFdy(vWorld)));
  // tiny per-block colour variation breaks up repetition on big flat areas
  if(vTile.z<10.0 && !(anim>1.5&&anim<2.5)){ vec3 bp=floor(vWorld-n0*0.01); float hv=fract(sin(dot(bp,vec3(12.9898,78.233,37.719)))*43758.5453); alb*=0.95+hv*0.1; }
  vec3 n=normalize(cross(dFdx(vWorld),dFdy(vWorld)));
  bool water=anim>1.5&&anim<2.5;
  if(uClipY>-999.0 && vWorld.y<uClipY) discard; // mirror pass: nothing below the water plane
  float wdepth=2.0; // side faces of water count as open water
  if(water&&n.y>0.5){ wdepth=vLight.z*8.0; vec2 sl=waveSlope(vWorld.xz,uTime)*(0.35+0.65*clamp(wdepth,0.0,1.0)); n=normalize(vec3(-sl.x,1.0,-sl.y)); }
  float sky=vLight.x, blk=vLight.y, ao=water?1.0:vLight.z;
  float ndl=uPlant>0.5 ? 0.65 : max(dot(n,uSunDir),0.0);
  float outdoor=smoothstep(0.45,0.93,sky);
  float sh=outdoor>0.0 ? shadowAt(vWorld,n) : 0.0;
  vec3 direct=uSunCol*ndl*sh*outdoor*1.1;
  vec3 hemi=mix(vec3(0.72,0.66,0.58),vec3(1.06,1.06,1.12),n.y*0.5+0.5); // sky above, warm bounce below
  vec3 amb=uAmbCol*hemi*(0.08+0.92*pow(sky,1.6));
  float flick=0.93+0.07*sin(uTime*10.0+vWorld.x*2.7+vWorld.z*1.9)*sin(uTime*6.3+vWorld.y);
  float tl=pow(blk,2.2)*2.7*flick;
  if(uPLight.w>0.0){ float pd=distance(vWorld,uPLight.xyz); tl=max(tl,pow(max(0.0,1.0-pd/9.0),2.0)*1.6*uPLight.w*flick); }
  vec3 light=(amb+direct)*ao*mix(1.0,vLight.w,0.55)+uTorch*tl*mix(1.0,ao,0.6)+vec3(0.004,0.005,0.008);
  vec3 col=alb*light;
  if(!water && vTile.z<10.0 && vWorld.y<uReflH-0.12 && sky>0.3 && uUnder<0.5){ float cdep=uReflH-vWorld.y; col+=alb*uSunCol*caustic(vWorld.xz+n0.xz*0.0+vec2(vWorld.y*0.3),uTime)*0.55*smoothstep(0.0,0.6,cdep)*exp(-cdep*0.18)*(0.3+0.7*ndl); }
  if(uPlant>0.5){ float tr=pow(max(dot(-V0(),uSunDir),0.0),3.0); col+=alb*uSunCol*tr*0.55*outdoor*sh; } // sunlight through leaves
  if(vTile.z>=10.0){ float lm=dot(alb,vec3(0.33)); col=mix(alb,alb*vec3(1.0,0.78,0.5)*1.25,smoothstep(0.35,0.8,lm)*step(alb.b,alb.r))*(2.0+0.3*sin(uTime*2.0+vLocal.x*3.0)); }
  vec3 V=normalize(cameraPosition-vWorld);
  float alpha=water? uOpacity : t.a;
  if(water){
    float cosT=max(dot(V,n),0.0);
    float fres=0.02+0.98*pow(1.0-cosT,5.0);                    // Schlick Fresnel for water (F0 = 0.02)
    vec3 R=reflect(-V,n);
    // reflection: the mirrored world where available, otherwise the sky
    vec3 skyR=mix(toLin(uSkyHor),toLin(uSkyTop),pow(clamp(R.y,0.0,1.0),0.55));
    skyR+=toLin(uHazeCol)*pow(max(dot(R,uSunDir),0.0),8.0)*0.4;
    vec3 refl=skyR;
    if(uReflOn>0.5 && n.y>0.5 && abs(vWorld.y-uReflH)<0.45){
      vec4 rc=uReflMat*vec4(vWorld.x,uReflH,vWorld.z,1.0); vec2 ruv=rc.xy/rc.w+n.xz*0.035;
      vec3 rw=toLin(texture2D(uReflTex,clamp(ruv,0.002,0.998)).rgb);
      float edge=smoothstep(0.0,0.04,min(min(ruv.x,1.0-ruv.x),min(ruv.y,1.0-ruv.y)));
      refl=mix(skyR,rw,edge);
    }
    // body colour: light is absorbed with depth, red first, so shallows read turquoise and depths deep blue
    float dep=max(wdepth,0.05);
    vec3 absorb=exp(-vec3(0.45,0.11,0.07)*dep*1.6);
    vec3 deep=vec3(0.006,0.03,0.06), shallow=vec3(0.06,0.32,0.32);
    vec3 body=mix(deep,shallow,absorb.g)*(amb*0.9+direct*0.5+0.02);
    // light scattering through the wave crests toward the viewer
    float sss=pow(max(dot(-V,uSunDir)*0.5+0.5,0.0),4.0)*max(n.y-0.92,0.0)*12.0;
    body+=vec3(0.05,0.3,0.25)*uSunCol*sss*outdoor;
    // sun glints: a tight highlight plus a broad sheen
    vec3 Hh=normalize(V+uSunDir);
    float glint=pow(max(dot(n,Hh),0.0),900.0)*28.0+pow(max(dot(n,Hh),0.0),90.0)*0.6;
    col=mix(body,refl*(0.25+0.75*sky),fres)+uSunCol*glint*sh*outdoor;
    // foam where the water meets the shore, drifting with the waves
    float shore=1.0-smoothstep(0.08,0.75,wdepth);
    float fn=vnoise2(vWorld.xz*3.2+vec2(uTime*0.35,uTime*0.21))*0.6+vnoise2(vWorld.xz*7.0-uTime*0.5)*0.4;
    float foam=smoothstep(0.55,0.72,fn+shore*0.55)*shore;
    col=mix(col,vec3(0.85,0.9,0.92)*(amb+direct*0.8+0.05),foam*0.85);
    // shallow water is clear, deep water and grazing angles are opaque
    alpha=clamp(mix(0.22,0.93,1.0-absorb.g)+fres*0.5+foam,0.0,1.0);
    if(uUnder>0.5){ col=mix(body*2.0,refl,0.15); alpha=0.75; }
  }
  vec3 outc=toSrgb(col);
  float f=smoothstep(uFogNear,uFogFar,vFog);
  float aer=smoothstep(uFogNear*0.35,uFogFar,vFog)*0.35; outc=mix(outc,mix(vec3(dot(outc,vec3(0.3,0.59,0.11))),outc,0.7)*0.97+uFogColor*0.03,aer);
  vec3 fogc=uFogColor+uHazeCol*pow(max(dot(-V,uSunDir),0.0),6.0)*0.35;
  if(uUnder>0.5){ f=smoothstep(2.0,24.0,vFog); fogc=uFogColor; }
  gl_FragColor=vec4(mix(outc,fogc,f),alpha);
}`;
function voxelMat(cut, opacity, transparent) {
  const m = new THREE.ShaderMaterial({
    uniforms: Object.assign({}, U, { uCut: { value: cut }, uOpacity: { value: opacity }, uPlant: { value: 0 } }),
    vertexShader: VERT, fragmentShader: FRAG, transparent: !!transparent, depthWrite: !transparent,
    side: transparent ? THREE.DoubleSide : THREE.FrontSide,
  });
  m.extensions.derivatives = true;
  return m;
}
const matSolid = voxelMat(0.5, 1, false);
const matCross = voxelMat(0.5, 1, false); matCross.side = THREE.DoubleSide; matCross.uniforms.uPlant.value = 1;
const matWater = voxelMat(0.0, 0.62, true);
const matGlass = voxelMat(0.05, 1, true);
for (const m of [matSolid, matCross, matWater, matGlass]) for (const k of Object.keys(U)) m.uniforms[k] = U[k];

// ---------------------------------------------------------------- mesher
const TILEPOS = {};
for (const k in Atlas.tiles) { const i = Atlas.tiles[k]; TILEPOS[k] = [i % ATLAS_N, Math.floor(i / ATLAS_N)]; }
// faces: normal axis, dir, vertex corners (bl, br, tr, tl as seen from outside)
const FACES = [
  { n: [1, 0, 0], v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], sh: 0.8, k: 'side', dir: 1 },
  { n: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], sh: 0.8, k: 'side', dir: 3 },
  { n: [0, 1, 0], v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], sh: 1.0, k: 'top' },
  { n: [0, -1, 0], v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], sh: 0.55, k: 'bottom' },
  { n: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], sh: 0.68, k: 'side', dir: 2 },
  { n: [0, 0, -1], v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], sh: 0.68, k: 'side', dir: 0 },
];
const LOCALUV = [[0, 0], [1, 0], [1, 1], [0, 1]];
function newBuf() { return { p: [], t: [], l: [], li: [], i: [], n: 0 }; }
function quad(g, verts, tile, anim, uvs, light) {
  const tp = TILEPOS[tile] || [0, 0];
  for (let k = 0; k < 4; k++) {
    g.p.push(verts[k][0], verts[k][1], verts[k][2]);
    g.t.push(tp[0], tp[1], anim);
    g.l.push(uvs[k][0], uvs[k][1]);
    g.li.push(light[k][0], light[k][1], light[k][2], light[k][3]);
  }
  const s = g.n;
  // flip the diagonal for nicer AO interpolation
  if (light[0][2] + light[2][2] < light[1][2] + light[3][2]) g.i.push(s + 1, s + 2, s + 3, s + 1, s + 3, s);
  else g.i.push(s, s + 1, s + 2, s, s + 2, s + 3);
  g.n += 4;
}
function opaqueAt(x, y, z) { if (y >= H) return 0; if (y < 0 || !resident(x, z)) return 1; return OPAQUE[wb[(x & 255) + (z & 255) * W + y * W * D]]; }
function lightSample(x, y, z) {
  if (y >= H) return [15, 0];
  if (y < 0 || !resident(x, z)) return [0, 0];
  const i = (x & 255) + (z & 255) * W + y * W * D; return [wsky[i], wbl[i]];
}
const AOV = [0.45, 0.63, 0.82, 1.0];
function waterColDepth(x, y, z) { if (getB(x, y, z) !== B.WATER) return 0; let d = 0; while (d < 8 && getB(x, y - d, z) === B.WATER) d++; return d; }
function waterDepthAt(vx, y, vz) { // average depth of the four columns touching this corner; land counts as 0
  let s = 0; for (const [dx, dz] of [[-1, -1], [0, -1], [-1, 0], [0, 0]]) s += waterColDepth(vx + dx, y, vz + dz); return Math.min(8, s / 4);
}
function faceLight(x, y, z, f, smooth) {
  const n = f.n, cx = x + n[0], cy = y + n[1], cz = z + n[2];
  const c = lightSample(cx, cy, cz);
  const out = [];
  const ax = n[0] !== 0 ? 0 : n[1] !== 0 ? 1 : 2;
  const t1 = ax === 0 ? 1 : 0, t2 = ax === 2 ? 1 : 2;
  for (let k = 0; k < 4; k++) {
    const v = f.v[k];
    if (!smooth) { out.push([c[0] / 15, c[1] / 15, 1, f.sh]); continue; }
    const s1 = v[t1] ? 1 : -1, s2 = v[t2] ? 1 : -1;
    const o1 = [0, 0, 0], o2 = [0, 0, 0]; o1[t1] = s1; o2[t2] = s2;
    const a = opaqueAt(cx + o1[0], cy + o1[1], cz + o1[2]), b = opaqueAt(cx + o2[0], cy + o2[1], cz + o2[2]);
    const cc = opaqueAt(cx + o1[0] + o2[0], cy + o1[1] + o2[1], cz + o1[2] + o2[2]);
    const ao = a && b ? 0 : 3 - (a + b + cc);
    let sk = c[0], bl = c[1], cnt = 1;
    if (!a) { const L = lightSample(cx + o1[0], cy + o1[1], cz + o1[2]); sk += L[0]; bl += L[1]; cnt++; }
    if (!b) { const L = lightSample(cx + o2[0], cy + o2[1], cz + o2[2]); sk += L[0]; bl += L[1]; cnt++; }
    if (!cc && !(a && b)) { const L = lightSample(cx + o1[0] + o2[0], cy + o1[1] + o2[1], cz + o1[2] + o2[2]); sk += L[0]; bl += L[1]; cnt++; }
    out.push([sk / cnt / 15, bl / cnt / 15, AOV[ao], f.sh]);
  }
  return out;
}
const FACING_FACE = [5, 0, 4, 1]; // facing meta -> FACES index of the front
function texFor(d, f, fi, meta) {
  if (f.k === 'top') return d.tex.top;
  if (f.k === 'bottom') return d.tex.bottom;
  if (d.tex.front !== d.tex.side && FACING_FACE[meta] === fi) return d.tex.front;
  return d.tex.side;
}
function buildChunkGeo(cx, cz) {
  const S = newBuf(), X = newBuf(), Wt = newBuf(), G = newBuf();
  const x0 = cx * CS, z0 = cz * CS;
  for (let y = 0; y < H; y++) for (let z = z0; z < z0 + CS; z++) for (let x = x0; x < x0 + CS; x++) {
    const i = (x & 255) + (z & 255) * W + y * W * D, id = wb[i];
    if (!id) continue;
    const d = BLK[id], meta = wm[i], emis = d.emissive ? 10 : 0;
    const r = d.render;
    if (r === 'cube' || r === 'cutout' || r === 'liquid') {
      const g = r === 'liquid' ? (id === B.WATER ? Wt : S) : (r === 'cutout' ? (d.cutLike ? S : G) : S);
      const isWater = id === B.WATER, isLava = id === B.LAVA;
      const topOpen = r === 'liquid' && getB(x, y + 1, z) !== id;
      for (let fi = 0; fi < 6; fi++) {
        const f = FACES[fi], nid = getB(x + f.n[0], y + f.n[1], z + f.n[2]);
        if (y + f.n[1] < 0) continue;
        if (!resident(x + f.n[0], z + f.n[2])) continue;
        if (r === 'liquid') { if (nid === id || (OPAQUE[nid] && fi !== 2)) continue; if (fi === 2 && OPAQUE[nid]) continue; }
        else if (r === 'cutout') { if (OPAQUE[nid] || (nid === id && !d.cutLike)) continue; if (nid === id && d.cutLike && hash3(x, y, z) < 0.5 && fi !== 2) continue; }
        else if (OPAQUE[nid]) continue;
        const verts = f.v.map(v => {
          let vy = v[1];
          if (topOpen && v[1] === 1) vy = isWater ? 0.88 : 0.9;
          return [x + v[0], y + vy, z + v[2]];
        });
        const uvs = f.k === 'side' ? LOCALUV.map((uv, k) => [uv[0], (topOpen && uv[1] === 1) ? 0.88 : uv[1]]) : f.v.map(v => [v[0], v[2]]);
        const light = faceLight(x, y, z, f, r === 'cube' || d.cutLike);
        if (isWater && topOpen && fi === 2) for (let k = 0; k < 4; k++) { const v = f.v[k]; light[k] = light[k].slice(); light[k][2] = waterDepthAt(x + v[0], y, z + v[2]) / 8; }
        quad(g, verts, texFor(d, f, fi, meta), (d.anim || 0) + emis, uvs, light);
      }
    } else if (r === 'cross') {
      const L = lightSample(x, y, z), lt = [L[0] / 15, L[1] / 15, 1, 0.92];
      const ang = hash3(x, y, z) * 0.6;
      const s = 0.45, cxm = x + 0.5, czm = z + 0.5;
      for (let k = 0; k < 2; k++) {
        const a = ang + k * Math.PI / 2 + Math.PI / 4, dx = Math.cos(a) * s * 1.414 / 1.414, dz = Math.sin(a) * s;
        const ddx = Math.cos(a) * s;
        const v = [[cxm - ddx, y, czm - dz], [cxm + ddx, y, czm + dz], [cxm + ddx, y + 1, czm + dz], [cxm - ddx, y + 1, czm - dz]];
        quad(X, v, d.tex.side, (d.anim || 0) + emis, LOCALUV, [lt, lt, lt, lt]);
      }
    } else if (r === 'flat') {
      const L = lightSample(x, y, z), lt = [L[0] / 15, L[1] / 15, 1, 1];
      const h = y + 0.02;
      quad(X, [[x, h, z + 1], [x + 1, h, z + 1], [x + 1, h, z], [x, h, z]], d.tex.top, 0, [[0, 0], [1, 0], [1, 1], [0, 1]], [lt, lt, lt, lt]);
    } else if (r === 'ladder') {
      const L = lightSample(x, y, z), lt = [L[0] / 15, L[1] / 15, 1, 0.85];
      const e = 0.06;
      let v;
      if (meta === 0) v = [[x + 1, y, z + 1 - e], [x, y, z + 1 - e], [x, y + 1, z + 1 - e], [x + 1, y + 1, z + 1 - e]];        // on wall at +z, facing -z
      else if (meta === 1) v = [[x + e, y, z + 1], [x + e, y, z], [x + e, y + 1, z], [x + e, y + 1, z + 1]];                // wall at -x
      else if (meta === 2) v = [[x, y, z + e], [x + 1, y, z + e], [x + 1, y + 1, z + e], [x, y + 1, z + e]];                // wall at -z
      else v = [[x + 1 - e, y, z], [x + 1 - e, y, z + 1], [x + 1 - e, y + 1, z + 1], [x + 1 - e, y + 1, z]];                // wall at +x
      quad(X, v, d.tex.side, 0, LOCALUV, [lt, lt, lt, lt]);
    } else if (r === 'box') {
      const bx = d.box, L = lightSample(x, y, z);
      for (let fi = 0; fi < 6; fi++) {
        const f = FACES[fi];
        const verts = f.v.map(v => [x + (v[0] ? bx[3] : bx[0]), y + (v[1] ? bx[4] : bx[1]), z + (v[2] ? bx[5] : bx[2])]);
        const uvs = f.k === 'side' ? f.v.map(v => [(f.n[0] !== 0 ? (v[2] ? bx[5] : bx[2]) : (v[0] ? bx[3] : bx[0])), v[1] ? bx[4] : bx[1]]) : f.v.map(v => [v[0] ? bx[3] : bx[0], v[2] ? bx[5] : bx[2]]);
        let NL = L;
        const nx = x + f.n[0], ny = y + f.n[1], nz = z + f.n[2];
        if (!OPAQUE[getB(nx, ny, nz)]) { const L2 = lightSample(nx, ny, nz); NL = [Math.max(L[0], L2[0]), Math.max(L[1], L2[1])]; }
        const lt = [NL[0] / 15, NL[1] / 15, 1, f.sh];
        quad(G === S ? S : S, verts, texFor(d, f, fi, meta), emis, uvs, [lt, lt, lt, lt]);
      }
    }
  }
  return [S, X, Wt, G];
}
const chunkMeshes = new Array(NCX * NCZ).fill(null);
const MATS = [matSolid, matCross, matWater, matGlass];
function toMesh(g, mat, order) {
  if (!g.n) return null;
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(g.p, 3));
  geo.setAttribute('aTile', new THREE.Float32BufferAttribute(g.t, 3));
  geo.setAttribute('aLocal', new THREE.Float32BufferAttribute(g.l, 2));
  geo.setAttribute('aLight', new THREE.Float32BufferAttribute(g.li, 4));
  geo.setIndex(g.i);
  geo.computeBoundingSphere();
  const m = new THREE.Mesh(geo, mat);
  m.renderOrder = order; m.matrixAutoUpdate = false;
  return m;
}
function disposeSlot(k) {
  if (chunkMeshes[k]) for (const m of chunkMeshes[k]) if (m) { scene.remove(m); m.geometry.dispose(); }
  chunkMeshes[k] = null;
}
function rebuildChunk(cx, cz) { // absolute chunk coordinates
  if (!chunkResident(cx, cz)) return;
  const k = slotOf(cx, cz);
  disposeSlot(k);
  const gs = buildChunkGeo(cx, cz);
  chunkMeshes[k] = gs.map((g, i) => { const m = toMesh(g, MATS[i], i === 2 ? 2 : i === 3 ? 3 : 0); if (m) { if (i === 0) m.layers.enable(1); scene.add(m); } return m; });
}
const dirtyChunks = new Map(); // "cx,cz" -> [cx, cz]
function markDirty(cx, cz) { if (chunkResident(cx, cz)) dirtyChunks.set(cx + ',' + cz, [cx, cz]); }
function markDirtyAround(x0, x1, z0, z1) {
  for (let cz = Math.floor(z0 / CS); cz <= Math.floor(z1 / CS); cz++) for (let cx = Math.floor(x0 / CS); cx <= Math.floor(x1 / CS); cx++) markDirty(cx, cz);
}
function flushDirty(budget) {
  let n = 0;
  for (const [k, c] of dirtyChunks) { dirtyChunks.delete(k); rebuildChunk(c[0], c[1]); if (++n >= budget) break; }
}

// ---------------------------------------------------------------- sky
const skyGeo = new THREE.SphereGeometry(300, 24, 12);
const skyMat = new THREE.ShaderMaterial({
  uniforms: { uTop: { value: new THREE.Color(0x4a8ad8) }, uHorizon: { value: new THREE.Color(0xbfd8ee) }, uSunDir: { value: new THREE.Vector3(0, 1, 0) }, uGlow: { value: new THREE.Color(0xffc080) } },
  vertexShader: 'varying vec3 vP; void main(){ vP=normalize(position); vec4 p=projectionMatrix*modelViewMatrix*vec4(position,1.0); gl_Position=p.xyww; }',
  fragmentShader: 'uniform vec3 uTop; uniform vec3 uHorizon; uniform vec3 uSunDir; uniform vec3 uGlow; varying vec3 vP; void main(){ float h=clamp(vP.y,-0.2,1.0); vec3 c=mix(uHorizon,uTop,pow(max(h,0.0),0.6)); float s=max(dot(vP,uSunDir),0.0); c+=uGlow*pow(s,8.0)*0.5*(1.0-h); gl_FragColor=vec4(c,1.0); }',
  side: THREE.BackSide, depthWrite: false, fog: false,
});
const sky = new THREE.Mesh(skyGeo, skyMat); sky.renderOrder = -10; sky.frustumCulled = false; scene.add(sky);
const celestial = new THREE.Group(); scene.add(celestial);
function discTex(inner, outer, size) {
  const c = document.createElement('canvas'); c.width = c.height = size;
  const g = c.getContext('2d'), gr = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gr.addColorStop(0, inner); gr.addColorStop(0.35, inner); gr.addColorStop(0.42, outer); gr.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = gr; g.fillRect(0, 0, size, size);
  const t = new THREE.CanvasTexture(c); return t;
}
const sunMesh = new THREE.Mesh(new THREE.PlaneGeometry(70, 70), new THREE.MeshBasicMaterial({ map: discTex('#fffbe0', 'rgba(255,220,140,0.35)', 64), transparent: true, depthWrite: false, fog: false, blending: THREE.AdditiveBlending }));
const moonMesh = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshBasicMaterial({ map: discTex('#e8eeff', 'rgba(180,200,255,0.25)', 64), transparent: true, depthWrite: false, fog: false }));
sunMesh.position.set(0, 0, -260); moonMesh.position.set(0, 0, 260); sunMesh.lookAt(0, 0, 0); moonMesh.lookAt(0, 0, 0);
celestial.add(sunMesh, moonMesh);
// stars
const starGeo = new THREE.BufferGeometry(), sp = [];
for (let i = 0; i < 900; i++) { const u = Math.random() * 2 - 1, a = Math.random() * 6.283, r = Math.sqrt(1 - u * u); sp.push(Math.cos(a) * r * 250, Math.abs(u) * 250, Math.sin(a) * r * 250); }
starGeo.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3));
const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
const stars = new THREE.Points(starGeo, starMat); stars.renderOrder = -9; celestial.add(stars);
// blocky clouds
const cloudGroup = new THREE.Group(); scene.add(cloudGroup);
(function buildClouds() {
  const pos = [], idx = [];
  let n = 0;
  const box = (x0, z0, x1, z1, y0, y1) => {
    const v = [[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0], [x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]];
    for (const p of v) pos.push(p[0], p[1], p[2]);
    const f = [[0, 1, 2, 0, 2, 3], [5, 4, 7, 5, 7, 6], [4, 0, 3, 4, 3, 7], [1, 5, 6, 1, 6, 2], [3, 2, 6, 3, 6, 7], [4, 5, 1, 4, 1, 0]];
    for (const q of f) for (const k of q) idx.push(n + k);
    n += 8;
  };
  for (let z = -40; z < 40; z++) for (let x = -40; x < 40; x++) if (vnoise(x / 4, z / 4, 991) > 0.62 && vnoise(x / 11, z / 11, 992) > 0.45) box(x * 12, z * 12, x * 12 + 12, z * 12 + 12, 0, 4);
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0xffffff, fog: false }));
  m.renderOrder = -5; cloudGroup.add(m); cloudGroup.userData.mat = m.material;
})();
// aurora ribbons (highlands at night)
const auroraMat = new THREE.ShaderMaterial({
  uniforms: { uTime: U.uTime, uAlpha: { value: 0 } },
  vertexShader: 'varying vec2 vUv; uniform float uTime; void main(){ vUv=uv; vec3 p=position; p.z+=sin(p.x*0.02+uTime*0.3)*30.0; p.y+=sin(p.x*0.05+uTime*0.5)*6.0; gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.0); }',
  fragmentShader: 'varying vec2 vUv; uniform float uTime; uniform float uAlpha; void main(){ float band=pow(sin(vUv.y*3.1416),2.0)*(0.6+0.4*sin(vUv.x*40.0+uTime*1.5)); vec3 c=mix(vec3(0.2,1.0,0.6),vec3(0.5,0.3,1.0),vUv.y); gl_FragColor=vec4(c,band*uAlpha*(1.0-vUv.y)); }',
  transparent: true, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false,
});
const aurora = new THREE.Group();
for (let k = 0; k < 3; k++) { const m = new THREE.Mesh(new THREE.PlaneGeometry(500, 60, 60, 1), auroraMat); m.position.set(0, 120 + k * 12, -120 - k * 40); aurora.add(m); }
aurora.renderOrder = -6; scene.add(aurora);

// ---------------------------------------------------------------- particles
const MAXP = 2500;
const pGeo = new THREE.BufferGeometry();
const pPos = new Float32Array(MAXP * 3), pCol = new Float32Array(MAXP * 4), pSize = new Float32Array(MAXP);
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 4));
pGeo.setAttribute('size', new THREE.BufferAttribute(pSize, 1));
const pMat = new THREE.ShaderMaterial({
  uniforms: { uScale: { value: 400 } },
  vertexShader: 'attribute vec4 color; attribute float size; varying vec4 vC; uniform float uScale; void main(){ vC=color; vec4 mv=modelViewMatrix*vec4(position,1.0); gl_PointSize=size*uScale/max(-mv.z,0.1); gl_Position=projectionMatrix*mv; }',
  fragmentShader: 'varying vec4 vC; void main(){ vec2 d=gl_PointCoord-0.5; if(max(abs(d.x),abs(d.y))>0.5) discard; gl_FragColor=vC; }',
  transparent: true, depthWrite: false,
});
const pPoints = new THREE.Points(pGeo, pMat); pPoints.frustumCulled = false; pPoints.renderOrder = 5; scene.add(pPoints);
const parts = [];
let PARTICLE_DENSITY = 1;
function emit(x, y, z, o) {
  if (PARTICLE_DENSITY < 1 && Math.random() > PARTICLE_DENSITY) return;
  if (parts.length >= MAXP) parts.shift();
  parts.push(Object.assign({ x, y, z, vx: 0, vy: 0, vz: 0, life: 1, max: 1, size: 0.12, r: 1, g: 1, b: 1, a: 1, grav: 0, drag: 0, glow: false, fade: true }, o, { max: o.life || 1 }));
}
function burst(x, y, z, n, o) {
  for (let i = 0; i < n; i++) emit(x, y, z, Object.assign({}, o, { vx: (Math.random() - 0.5) * (o.spread || 3), vy: Math.random() * (o.up || 3), vz: (Math.random() - 0.5) * (o.spread || 3), life: (o.life || 0.6) * (0.6 + Math.random() * 0.6) }));
}
function updateParticles(dt, daylight) {
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i];
    p.life -= dt; if (p.life <= 0) { parts.splice(i, 1); continue; }
    p.vy -= p.grav * dt; const k = 1 - p.drag * dt; p.vx *= k; p.vy *= k; p.vz *= k;
    p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
    if (p.grav > 0 && solidAt(Math.floor(p.x), Math.floor(p.y), Math.floor(p.z))) { p.vy = 0; p.vx *= 0.5; p.vz *= 0.5; p.y = Math.floor(p.y) + 1.01; }
  }
  const n = parts.length;
  for (let i = 0; i < n; i++) {
    const p = parts[i], t = p.life / p.max;
    pPos[i * 3] = p.x; pPos[i * 3 + 1] = p.y; pPos[i * 3 + 2] = p.z;
    const lit = p.glow ? 1.9 : (0.35 + 0.65 * daylight);
    pCol[i * 4] = p.r * lit; pCol[i * 4 + 1] = p.g * lit; pCol[i * 4 + 2] = p.b * lit; pCol[i * 4 + 3] = p.a * (p.fade ? Math.min(1, t * 2) : 1);
    pSize[i] = p.size * (p.grow ? (1 + (1 - t) * p.grow) : 1);
  }
  pGeo.setDrawRange(0, n);
  pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true; pGeo.attributes.size.needsUpdate = true;
}
function tileAvgColor(name) {
  if (!tileAvgColor.c) tileAvgColor.c = {};
  if (tileAvgColor.c[name]) return tileAvgColor.c[name];
  const [tx, ty] = TILEPOS[name] || [0, 0];
  const d = Atlas.canvas.getContext('2d').getImageData(tx * 16, ty * 16, 16, 16).data;
  let r = 0, g = 0, b = 0, n = 0;
  for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 100) { r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
  return (tileAvgColor.c[name] = n ? [r / n / 255, g / n / 255, b / n / 255] : [0.5, 0.5, 0.5]);
}
function blockBurst(x, y, z, id, n) {
  const c = tileAvgColor(BLK[id].tex.side);
  for (let i = 0; i < (n || 14); i++) emit(x + Math.random(), y + Math.random(), z + Math.random(), { vx: (Math.random() - 0.5) * 3, vy: Math.random() * 3, vz: (Math.random() - 0.5) * 3, grav: 14, life: 0.5 + Math.random() * 0.4, size: 0.07 + Math.random() * 0.05, r: c[0] * (0.8 + Math.random() * 0.3), g: c[1] * (0.8 + Math.random() * 0.3), b: c[2] * (0.8 + Math.random() * 0.3) });
}

// ---------------------------------------------------------------- floating damage numbers
const dmgSprites = [];
function damageNumber(x, y, z, val, crit) {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const g = c.getContext('2d'); g.font = 'bold 40px monospace'; g.textAlign = 'center'; g.textBaseline = 'middle';
  g.lineWidth = 6; g.strokeStyle = '#1a1010'; const txt = (Math.round(val * 10) / 10).toString();
  g.strokeText(txt, 64, 32); g.fillStyle = crit ? '#ffd23a' : '#ffffff'; g.fillText(txt, 64, 32);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false, fog: false }));
  sp.scale.set(crit ? 1.1 : 0.8, crit ? 0.55 : 0.4, 1); sp.position.set(x + (Math.random() - 0.5) * 0.4, y, z + (Math.random() - 0.5) * 0.4); sp.renderOrder = 20;
  scene.add(sp); dmgSprites.push({ sp, life: 0.9 });
}
function updateDamageNumbers(dt) {
  for (let i = dmgSprites.length - 1; i >= 0; i--) {
    const d = dmgSprites[i]; d.life -= dt; d.sp.position.y += dt * 1.2; d.sp.material.opacity = Math.min(1, d.life * 2);
    if (d.life <= 0) { scene.remove(d.sp); d.sp.material.map.dispose(); d.sp.material.dispose(); dmgSprites.splice(i, 1); }
  }
}

// ---------------------------------------------------------------- voxel models from icons (held items, dropped items)
const ITEM_GEO = {};
function itemGeometry(id) {
  if (ITEM_GEO[id]) return ITEM_GEO[id];
  let geo;
  if (id < 256 && ['cube', 'cutout', 'box'].includes(BLK[id].render)) {
    const d = BLK[id], pos = [], col = [], idx = [];
    let n = 0;
    FACES.forEach((f, fi) => {
      const c = tileAvgColor(texFor(d, f, fi, 0)), sh = f.sh;
      for (const v of f.v) { pos.push(v[0] - 0.5, v[1] - 0.5, v[2] - 0.5); col.push(c[0] * sh, c[1] * sh, c[2] * sh); }
      idx.push(n, n + 1, n + 2, n, n + 2, n + 3); n += 4;
    });
    geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx);
    // textured version for blocks
    const uvs = [];
    FACES.forEach((f, fi) => { const tp = TILEPOS[texFor(d, f, fi, 0)]; for (const uv of LOCALUV) uvs.push((tp[0] + uv[0]) / 16, (tp[1] + 1 - uv[1]) / 16); });
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.userData.block = true;
  } else {
    const cv = iconCanvas(id), sz = cv.width, data = cv.getContext('2d').getImageData(0, 0, sz, sz).data;
    const pos = [], col = [], idx = []; let n = 0;
    const s = 1 / sz, th = 1 / 16;
    const op = (x, y) => x >= 0 && y >= 0 && x < sz && y < sz && data[(x + y * sz) * 4 + 3] > 100;
    for (let y = 0; y < sz; y++) for (let x = 0; x < sz; x++) {
      if (!op(x, y)) continue;
      const o = (x + y * sz) * 4, r = data[o] / 255, g = data[o + 1] / 255, b = data[o + 2] / 255;
      if (data[o] === 24 && data[o + 1] === 18 && data[o + 2] === 28) continue; // skip the 2D outline in 3D
      const X0 = x * s - 0.5, X1 = X0 + s, Y1 = 0.5 - y * s, Y0 = Y1 - s, Z0 = -th / 2, Z1 = th / 2;
      const faces = [
        [[X0, Y0, Z1], [X1, Y0, Z1], [X1, Y1, Z1], [X0, Y1, Z1], 1],
        [[X1, Y0, Z0], [X0, Y0, Z0], [X0, Y1, Z0], [X1, Y1, Z0], 0.8],
      ];
      if (!op(x, y - 1)) faces.push([[X0, Y1, Z1], [X1, Y1, Z1], [X1, Y1, Z0], [X0, Y1, Z0], 0.9]);
      if (!op(x, y + 1)) faces.push([[X0, Y0, Z0], [X1, Y0, Z0], [X1, Y0, Z1], [X0, Y0, Z1], 0.6]);
      if (!op(x - 1, y)) faces.push([[X0, Y0, Z0], [X0, Y0, Z1], [X0, Y1, Z1], [X0, Y1, Z0], 0.7]);
      if (!op(x + 1, y)) faces.push([[X1, Y0, Z1], [X1, Y0, Z0], [X1, Y1, Z0], [X1, Y1, Z1], 0.7]);
      for (const f of faces) { for (let k = 0; k < 4; k++) { pos.push(f[k][0], f[k][1], f[k][2]); col.push(r * f[4], g * f[4], b * f[4]); } idx.push(n, n + 1, n + 2, n, n + 2, n + 3); n += 4; }
    }
    geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); geo.setIndex(idx);
  }
  ITEM_GEO[id] = geo;
  return geo;
}
const heldMatBlock = new THREE.MeshBasicMaterial({ map: atlasTex, transparent: true, alphaTest: 0.5 });
const heldMatItem = new THREE.MeshBasicMaterial({ vertexColors: true });
function itemMesh(id) {
  const g = itemGeometry(id);
  const m = new THREE.Mesh(g, g.userData.block ? heldMatBlock.clone() : heldMatItem.clone());
  return m;
}

function resize() {
  renderer.setSize(window.innerWidth, window.innerHeight, false);
  camera.aspect = window.innerWidth / window.innerHeight; camera.updateProjectionMatrix();
  pMat.uniforms.uScale.value = window.innerHeight * 0.9;
}
window.addEventListener('resize', resize);
