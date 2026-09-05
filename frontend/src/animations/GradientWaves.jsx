import React, { useEffect, useRef } from "react";
import {
  Clock,
  Color,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Scene,
  ShaderMaterial,
  Vector2,
  Vector3,
  WebGLRenderer,
} from "three";

const vertexShader = `
precision highp float;
void main() {
  gl_Position = vec4(position, 1.0);
}
`;

const fragmentShader = `
precision highp float;

uniform vec3 iResolution;
uniform float iTime;
uniform vec2 iMouse;
uniform vec3 horizonColor;
uniform vec3 waveColor;
uniform vec3 crestColor;
uniform float speed;
uniform float amplitude;
uniform float waveScale;
uniform float waveRatio;
uniform float swell;
uniform float turbulence;
uniform float tilt;
uniform float zoom;
uniform float camHeight;
uniform float fogDepth;
uniform float brightness;
uniform float opacity;
uniform bool grain;
uniform float grainIntensity;
uniform bool mouseInteraction;
uniform float parallaxStrength;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(
    mix(hash(i + vec2(0.0, 0.0)), hash(i + vec2(1.0, 0.0)), u.x),
    mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x),
    u.y
  );
}

float map(vec3 p) {
  float t = iTime * speed;
  vec2 uv = p.xz * waveScale * 0.1;
  
  float h = 0.0;
  float amp = amplitude * 0.45;
  float freq = 1.0;
  
  for(int i = 0; i < 4; i++) {
    float wave = sin(uv.x * freq * swell * 0.08 + t + float(i) * 1.3) *
                 cos(uv.y * freq * waveRatio * swell * 0.08 + t * 0.7);
    h += wave * amp;
    uv += vec2(uv.y, -uv.x) * 0.35;
    freq *= 1.75;
    amp *= 0.52;
  }
  
  if (turbulence > 0.0) {
    h += (noise(p.xz * 0.2 + t * 0.25) - 0.5) * (turbulence * 0.06);
  }
  
  return p.y - h;
}

void main() {
  vec2 fragCoord = gl_FragCoord.xy;
  vec2 uv = (fragCoord - 0.5 * iResolution.xy) / min(iResolution.x, iResolution.y);
  
  vec2 m = iMouse * parallaxStrength * 0.3;
  if (!mouseInteraction) m = vec2(0.0);
  
  vec3 ro = vec3(0.0, camHeight + m.y * 1.5, -9.0 / max(zoom, 0.1));
  vec3 ta = vec3(m.x * 2.5, 0.0, 10.0);
  
  vec3 ww = normalize(ta - ro);
  vec3 uu = normalize(cross(ww, vec3(0.0, 1.0, 0.0)));
  vec3 vv = normalize(cross(uu, ww));
  
  float ct = cos(tilt * 0.18);
  float st = sin(tilt * 0.18);
  mat2 rot = mat2(ct, -st, st, ct);
  uv = rot * uv;
  
  vec3 rd = normalize(uv.x * uu + uv.y * vv + 1.4 * ww);
  
  float t = 0.01;
  float d = 0.0;
  float maxDist = max(fogDepth * 2.2, 5.0);
  bool hit = false;
  
  for(int i = 0; i < 64; i++) {
    vec3 p = ro + rd * t;
    d = map(p);
    if(abs(d) < 0.008 || t > maxDist) {
      hit = (t <= maxDist);
      break;
    }
    t += d * 0.62;
  }
  
  vec3 col = horizonColor;
  
  if(hit) {
    vec3 p = ro + rd * t;
    vec2 eps = vec2(0.012, 0.0);
    vec3 n = normalize(vec3(
      map(p + eps.xyy) - map(p - eps.xyy),
      map(p + eps.yxy) - map(p - eps.yxy),
      map(p + eps.yyx) - map(p - eps.yyx)
    ));
    
    float hRatio = clamp((p.y + amplitude * 0.8) / (amplitude * 1.6 + 0.1), 0.0, 1.0);
    float crestFactor = smoothstep(0.35, 0.9, hRatio);
    vec3 surfaceColor = mix(waveColor, crestColor, crestFactor);
    
    float diff = max(dot(n, normalize(vec3(0.3, 1.0, -0.6))), 0.0);
    float fresnel = pow(1.0 - max(dot(-rd, n), 0.0), 3.0);
    
    surfaceColor = surfaceColor * (0.65 + 0.35 * diff) + crestColor * fresnel * 0.45;
    
    float fog = smoothstep(0.0, maxDist * 0.82, t);
    col = mix(surfaceColor, horizonColor, fog);
  } else {
    float sky = smoothstep(-0.2, 0.6, uv.y);
    col = mix(horizonColor, waveColor * 0.25, sky * 0.4);
  }
  
  if(grain && grainIntensity > 0.0) {
    float g = (hash(fragCoord + vec2(iTime * 43.0, iTime * 27.0)) - 0.5) * grainIntensity;
    col += vec3(g);
  }
  
  col *= brightness;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), opacity);
}
`;

export function GradientWaves({
  horizonColor = "#010114",
  waveColor = "#6f6e9d",
  crestColor = "#292596",
  speed = 0.4,
  amplitude = 2.5,
  waveScale = 0.6,
  waveRatio = 0.9,
  swell = 35,
  turbulence = 20,
  tilt = 1.11,
  zoom = 1,
  height = 5.5,
  fogDepth = 15,
  detail = "medium",
  brightness = 1,
  opacity = 1,
  grain = true,
  grainIntensity = 0.05,
  mouseInteraction = true,
  parallaxStrength = 0.5,
  className = "",
  style = {},
}) {
  const containerRef = useRef(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 800;
    const heightPx = container.clientHeight || 600;

    const scene = new Scene();
    const camera = new OrthographicCamera(-1, 1, 1, -1, 0, 1);
    const clock = new Clock();

    const renderer = new WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, heightPx);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.domElement.style.position = "absolute";
    renderer.domElement.style.top = "0";
    renderer.domElement.style.left = "0";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.pointerEvents = "none";
    container.appendChild(renderer.domElement);

    const parseColor = (hex) => {
      const c = new Color(hex);
      return new Vector3(c.r, c.g, c.b);
    };

    const uniforms = {
      iResolution: { value: new Vector3(width, heightPx, 1) },
      iTime: { value: 0 },
      iMouse: { value: new Vector2(0, 0) },
      horizonColor: { value: parseColor(horizonColor) },
      waveColor: { value: parseColor(waveColor) },
      crestColor: { value: parseColor(crestColor) },
      speed: { value: speed },
      amplitude: { value: amplitude },
      waveScale: { value: waveScale },
      waveRatio: { value: waveRatio },
      swell: { value: swell },
      turbulence: { value: turbulence },
      tilt: { value: tilt },
      zoom: { value: zoom },
      camHeight: { value: height },
      fogDepth: { value: fogDepth },
      brightness: { value: brightness },
      opacity: { value: opacity },
      grain: { value: grain },
      grainIntensity: { value: grainIntensity },
      mouseInteraction: { value: mouseInteraction },
      parallaxStrength: { value: parallaxStrength },
    };

    const material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
    });

    const geometry = new PlaneGeometry(2, 2);
    const quad = new Mesh(geometry, material);
    scene.add(quad);

    const handleMouseMove = (e) => {
      if (!mouseInteraction) return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      uniforms.iMouse.value.set(x, y);
    };

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 800;
      const h = container.clientHeight || 600;
      renderer.setSize(w, h);
      uniforms.iResolution.value.set(w, h, 1);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);

    let animationFrameId;
    const animate = () => {
      uniforms.iTime.value = clock.getElapsedTime();
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      material.dispose();
      geometry.dispose();
    };
  }, [
    horizonColor,
    waveColor,
    crestColor,
    speed,
    amplitude,
    waveScale,
    waveRatio,
    swell,
    turbulence,
    tilt,
    zoom,
    height,
    fogDepth,
    brightness,
    opacity,
    grain,
    grainIntensity,
    mouseInteraction,
    parallaxStrength,
  ]);

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
      style={{ width: "100%", height: "100%", ...style }}
    />
  );
}

export default GradientWaves;
