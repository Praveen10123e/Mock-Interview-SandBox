import React, { useEffect, useRef } from 'react';

interface WaterShaderCanvasProps {
  className?: string;
  id?: string;
}

export const WaterShaderCanvas: React.FC<WaterShaderCanvasProps> = ({
  className = 'absolute inset-0 w-full h-full pointer-events-none opacity-90',
  id = 'water-shader-canvas',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let animId: number = 0;
    let isRunning = false;
    let isIntersecting = true;
    let gl: WebGLRenderingContext | null = null;
    let prog: WebGLProgram | null = null;
    let buf: WebGLBuffer | null = null;
    let vertShader: WebGLShader | null = null;
    let fragShader: WebGLShader | null = null;

    // Prevent Chromium from drawing the sad-face canvas crash icon if GPU context is lost
    const handleContextLost = (event: Event) => {
      event.preventDefault();
      stopAnimation();
    };
    canvas.addEventListener('webglcontextlost', handleContextLost);

    try {
      gl =
        canvas.getContext('webgl', {
          alpha: true,
          antialias: true,
          powerPreference: 'high-performance',
          depth: false,
          stencil: false,
        }) ||
        (canvas.getContext('experimental-webgl') as WebGLRenderingContext | null);
    } catch {
      canvas.style.display = 'none';
      return;
    }

    if (!gl) {
      canvas.style.display = 'none';
      return;
    }

    // Cache canvas client bounding rect to prevent forced reflow on mousemove
    let cachedRect = canvas.getBoundingClientRect();
    const updateCachedRect = () => {
      if (canvas) {
        cachedRect = canvas.getBoundingClientRect();
      }
    };

    // Crisp high-fidelity resolution capped at 1280px for smooth 60fps
    const syncSize = () => {
      if (!canvas) return;
      const clientW = canvas.clientWidth || window.innerWidth || 1280;
      const clientH = canvas.clientHeight || window.innerHeight || 720;
      updateCachedRect();

      const maxW = 1280;
      const scale = clientW > maxW ? maxW / clientW : 1.0;
      const targetW = Math.max(480, Math.round(clientW * scale));
      const targetH = Math.max(320, Math.round(clientH * scale));

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }
    };

    let resizeObserver: ResizeObserver | null = null;
    if (typeof ResizeObserver !== 'undefined') {
      resizeObserver = new ResizeObserver(() => {
        syncSize();
      });
      resizeObserver.observe(canvas);
    }
    syncSize();

    const vs = `
attribute vec2 a_position;
varying vec2 v_texCoord;
void main() {
  v_texCoord = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

    const fs = `
precision highp float;
uniform float u_time;
uniform vec2 u_resolution;
uniform vec2 u_mouse;

// Simplex noise for fluid daylight water caustics
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
             i.z + vec4(0.0, i1.z, i2.z, 1.0))
           + i.y + vec4(0.0, i1.y, i2.y, 1.0))
           + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3  ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xyxy + s0.xxyy * sh.xyxy;
  vec4 a1 = b1.xyxy + s1.xxyy * sh.zwzw;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
    vec2 st = gl_FragCoord.xy / u_resolution.xy;
    float aspect = u_resolution.x / u_resolution.y;
    vec2 uv = st;
    uv.x *= aspect;
    
    // Time variable driving steady downward gravity flow (real falling water)
    float t = u_time * 0.48;
    
    // Interactive mouse splash & downward trailing wake in the rushing stream
    vec2 mPos = u_mouse / u_resolution.xy;
    mPos.x *= aspect;
    float dist = distance(uv, mPos);
    float mouseWave = sin(dist * 28.0 - u_time * 6.0) * exp(-dist * 5.0) * 0.12;
    float mouseWake = exp(-abs(uv.x - mPos.x) * 14.0) * step(uv.y, mPos.y + 0.05) * 
                      sin((mPos.y - uv.y) * 18.0 - u_time * 5.0) * 0.08 * exp(-(mPos.y - uv.y) * 2.5);

    // Cascading fluid stream coordinates (vertically elongated streams falling downward)
    // Lateral turbulence creates gentle natural swaying of water streams as they cascade
    float sway = snoise(vec3(uv.x * 2.2, uv.y * 0.8 + t * 0.4, t * 0.15)) * 0.14;
    
    // 1. Deep Primary Water Streams (falling downward with gravity)
    vec2 p1 = vec2((uv.x + sway) * 4.5, uv.y * 1.6 + t * 1.8);
    float w1 = snoise(vec3(p1, t * 0.25));
    
    // 2. Faster Surface Water Rivulets & Cascades
    vec2 p2 = vec2((uv.x - sway * 0.7) * 7.5, uv.y * 2.8 + t * 2.9);
    float w2 = snoise(vec3(p2, t * 0.5));
    
    // 3. High-velocity Froth & Sparkling Water Strands
    vec2 p3 = vec2((uv.x + sway * 0.4) * 12.0, uv.y * 4.5 + t * 4.2);
    float w3 = snoise(vec3(p3, t * 0.8));
    
    // Combined vertical flowing water volume
    float streamVolume = (w1 * 0.50 + w2 * 0.35 + w3 * 0.15) + mouseWave + mouseWake;
    
    // Sunlight caustics shimmering on rushing water streams
    float specularGlint = pow(clamp(streamVolume * 0.5 + 0.52, 0.0, 1.0), 3.2);
    float sparkle = pow(clamp(w3 * 0.5 + 0.52, 0.0, 1.0), 5.5) * 0.55;
    
    // Aerated waterfall foam crests (white spray bubbles in cascading currents)
    float foam = smoothstep(0.46, 0.76, w2 * 0.6 + w3 * 0.4 + mouseWave * 1.5) * 0.48;
    
    // Real flowing water color palette:
    // Deep aquatic crystalline teal-blue -> Clear sky water reflection -> Sunlight glint -> Frothy white spray
    vec3 deepStream = vec3(0.68, 0.84, 0.95); // Rich crystalline water cyan-blue
    vec3 clearWater = vec3(0.89, 0.95, 1.0);  // Translucent sparkling freshwater
    vec3 sunReflect = vec3(1.0, 1.0, 1.0);    // Sunlight shimmer
    vec3 whiteFoam  = vec3(1.0, 1.0, 1.0);    // Aerated water foam / spray
    
    vec3 col = mix(deepStream, clearWater, smoothstep(-0.45, 0.55, streamVolume));
    col = mix(col, sunReflect, specularGlint * 0.55 + sparkle);
    col = mix(col, whiteFoam, foam);
    
    // Subtle oceanic chromatic dispersion on ripple peaks
    col.r += sin(streamVolume * 6.0 + t * 2.0) * 0.012;
    col.b += cos(streamVolume * 6.0 + t * 2.0) * 0.020;
    
    gl_FragColor = vec4(col, 1.0);
}
`;

    function compileShader(type: number, src: string): WebGLShader | null {
      if (!gl) return null;
      const s = gl.createShader(type);
      if (!s) return null;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
        gl.deleteShader(s);
        return null;
      }
      return s;
    }

    vertShader = compileShader(gl.VERTEX_SHADER, vs);
    fragShader = compileShader(gl.FRAGMENT_SHADER, fs);
    if (!vertShader || !fragShader) {
      canvas.style.display = 'none';
      return;
    }

    prog = gl.createProgram();
    if (!prog) {
      canvas.style.display = 'none';
      return;
    }
    gl.attachShader(prog, vertShader);
    gl.attachShader(prog, fragShader);
    gl.linkProgram(prog);

    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      gl.deleteProgram(prog);
      canvas.style.display = 'none';
      return;
    }

    gl.useProgram(prog);
    buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );

    const pos = gl.getAttribLocation(prog, 'a_position');
    gl.enableVertexAttribArray(pos);
    gl.vertexAttribPointer(pos, 2, gl.FLOAT, false, 0, 0);

    const uTime = gl.getUniformLocation(prog, 'u_time');
    const uRes = gl.getUniformLocation(prog, 'u_resolution');
    const uMouse = gl.getUniformLocation(prog, 'u_mouse');

    const mouse = { x: canvas.width / 2, y: canvas.height / 2 };

    // Optimized mouse tracking: uses cached bounding rect so NO synchronous reflow is triggered
    const handleMouseMove = (event: MouseEvent) => {
      if (!canvas || !isIntersecting) return;
      if (cachedRect.width > 0 && cachedRect.height > 0) {
        const nx = Math.max(0, Math.min(1, (event.clientX - cachedRect.left) / cachedRect.width));
        const ny = Math.max(0, Math.min(1, 1.0 - (event.clientY - cachedRect.top) / cachedRect.height));
        mouse.x = nx * canvas.width;
        mouse.y = ny * canvas.height;
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('scroll', updateCachedRect, { passive: true });

    const render = (t: number) => {
      if (!gl || !canvas || !isRunning) return;
      gl.viewport(0, 0, canvas.width, canvas.height);
      if (uTime) gl.uniform1f(uTime, t * 0.001);
      if (uRes) gl.uniform2f(uRes, canvas.width, canvas.height);
      if (uMouse) gl.uniform2f(uMouse, mouse.x, mouse.y);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      if (!prefersReducedMotion && isRunning) {
        animId = requestAnimationFrame(render);
      }
    };

    const startAnimation = () => {
      if (isRunning) return;
      isRunning = true;
      if (prefersReducedMotion) {
        render(0);
      } else {
        animId = requestAnimationFrame(render);
      }
    };

    const stopAnimation = () => {
      isRunning = false;
      if (animId) {
        cancelAnimationFrame(animId);
        animId = 0;
      }
    };

    // Start immediately on mount so falling water is active right away
    isIntersecting = true;
    startAnimation();

    // IntersectionObserver pauses rendering ONLY when scrolled completely off-screen
    let intersectionObserver: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== 'undefined') {
      intersectionObserver = new IntersectionObserver(
        (entries) => {
          const entry = entries[0];
          if (!entry) return;
          if (entry.isIntersecting) {
            isIntersecting = true;
            if (!document.hidden) startAnimation();
          } else {
            isIntersecting = false;
            stopAnimation();
          }
        },
        { threshold: 0, rootMargin: '150px' }
      );
      intersectionObserver.observe(canvas);
    }

    // Page Visibility API: pause animation when browser tab is inactive
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopAnimation();
      } else if (isIntersecting) {
        startAnimation();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopAnimation();
      canvas.removeEventListener('webglcontextlost', handleContextLost);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('scroll', updateCachedRect);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (resizeObserver) resizeObserver.disconnect();
      if (intersectionObserver) intersectionObserver.disconnect();

      if (gl) {
        if (buf) gl.deleteBuffer(buf);
        if (prog) {
          if (vertShader) gl.deleteShader(vertShader);
          if (fragShader) gl.deleteShader(fragShader);
          gl.deleteProgram(prog);
        }
      }
    };
  }, []);

  return (
    <div className={className} style={{ display: 'block' }}>
      <canvas
        ref={canvasRef}
        id={id}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          imageRendering: 'auto',
          transform: 'translateZ(0)',
          willChange: 'transform',
        }}
        aria-hidden="true"
      />
    </div>
  );
};

export default WaterShaderCanvas;
