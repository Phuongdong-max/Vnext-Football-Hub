import React, { useEffect, useRef, useState } from 'react';

/**
 * Nền 3D cho hero — sân cỏ phối cảnh chạy về đường chân trời dưới ánh đèn cam
 * VNEXT. Dựng bằng WebGL thuần (một quad toàn màn + fragment shader ray-plane),
 * không thêm dependency và không đụng cấu hình build.
 *
 * Ngân sách hiệu ứng: đây là MỘT vùng nền chuyển động — màn nào dùng component
 * này thì không đặt thêm `blob`/`aurora-bg` nữa (vnext-ui/references/effects.md).
 *
 * Tự tắt và trả về nền gradient tĩnh khi: `prefers-reduced-motion`, thiết bị yếu,
 * hoặc khởi tạo WebGL thất bại.
 */

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision mediump float;

uniform vec2 uRes;
uniform float uTime;
uniform vec3 uSky;      // màu nền phía trên đường chân trời
uniform vec3 uGround;   // màu sân
uniform vec3 uBrand;    // cam VNEXT
uniform float uDark;     // 1.0 = theme tối

// Lưới sân: trả về độ đậm của vạch kẻ tại toạ độ world p
float pitchLines(vec2 p, float fade) {
 vec2 g = abs(fract(p) - 0.5);
 float line = min(g.x, g.y);
 float w = 0.02 + 0.06 * fade;          // vạch xa dày hơn để chống răng cưa
 return smoothstep(w, 0.0, line);
}

void main() {
 vec2 uv = (gl_FragCoord.xy / uRes) * 2.0 - 1.0;
 uv.x *= uRes.x / uRes.y;

  // Camera nhìn hơi chúi xuống mặt sân (y = 0), mắt ở độ cao 1.0
 vec3 ro = vec3(0.0, 1.0, uTime * 0.9);
 vec3 rd = normalize(vec3(uv.x, uv.y - 0.28, 1.4));

 vec3 col;

 if (rd.y < -0.001) {
    // Giao điểm tia với mặt sân
 float t = -ro.y / rd.y;
 vec3 hit = ro + rd * t;

 float dist  = clamp(t / 26.0, 0.0, 1.0);   // 0 = gần, 1 = tận chân trời
 float fade  = dist * dist;

 float lines = pitchLines(hit.xz * 0.5, fade);

 col = uGround;
 col = mix(col, mix(uGround, uBrand, 0.55), lines * (0.28 + 0.35 * uDark));

    // Hai quầng đèn pha quét chậm dọc sân
 float lampA = exp(-length(hit.xz - vec2(-6.0, ro.z + 14.0)) * 0.13);
 float lampB = exp(-length(hit.xz - vec2( 7.0, ro.z + 20.0)) * 0.11);
 col += uBrand * (lampA * 0.16 + lampB * 0.12) * (0.6 + 0.6 * uDark);

    // Sân mờ dần về chân trời
 col = mix(col, uSky, fade);
  } else {
    // Bầu trời: chuyển dần lên trên, sáng cam sát đường chân trời
 float h = clamp(rd.y * 2.4, 0.0, 1.0);
 col = mix(uSky, mix(uSky, uBrand, 0.10 + 0.10 * uDark), 1.0 - h);
  }

  // Vệt sáng cam ngay trên đường chân trời — điểm nhấn duy nhất của cảnh
 float horizon = exp(-abs(uv.y + 0.28) * 9.0);
 col += uBrand * horizon * (0.10 + 0.14 * uDark);

  // Tối bốn góc để chữ đè lên vẫn đọc được
 float vig = 1.0 - 0.35 * dot(uv * 0.55, uv * 0.55);
 col *= clamp(vig, 0.0, 1.0);

 gl_FragColor = vec4(col, 1.0);
}
`;

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

/** Thiết bị yếu thì không bật WebGL — theo heuristic của spec redesign. */
function isLowPoweredDevice(): boolean {
  const nav = navigator as Navigator & { deviceMemory?: number };
  if (typeof nav.deviceMemory === 'number' && nav.deviceMemory < 4) return true;
  if (typeof nav.hardwareConcurrency === 'number' && nav.hardwareConcurrency <= 2) return true;
  return false;
}

export const StadiumField3D: React.FC<{ className?: string }> = ({ className = '' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || isLowPoweredDevice()) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = (canvas.getContext('webgl', { antialias: false, alpha: false, powerPreference: 'low-power' }) ||
      canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    if (!gl) return;

    const vs = compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAG);
    if (!vs || !fs) return;

    const program = gl.createProgram();
    if (!program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, 'uRes');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uSky = gl.getUniformLocation(program, 'uSky');
    const uGround = gl.getUniformLocation(program, 'uGround');
    const uBrand = gl.getUniformLocation(program, 'uBrand');
    const uDark = gl.getUniformLocation(program, 'uDark');

    // Đọc màu từ token CSS để cảnh 3D luôn khớp theme đang bật
    const readPalette = () => {
      const isDark = document.documentElement.classList.contains('dark');
      const probe = document.createElement('span');
      probe.style.display = 'none';
      document.body.appendChild(probe);

      const toRgb = (cssColor: string): [number, number, number] => {
        probe.style.color = cssColor;
        const parsed = getComputedStyle(probe).color.match(/[\d.]+/g);
        if (!parsed) return [0, 0, 0];
        return [Number(parsed[0]) / 255, Number(parsed[1]) / 255, Number(parsed[2]) / 255];
      };

      const sky = toRgb('hsl(var(--background))');
      const ground = toRgb(isDark ? 'hsl(20 16% 9%)' : 'hsl(28 22% 92%)');
      const brand = toRgb('hsl(var(--primary))');
      probe.remove();

      gl.uniform3fv(uSky, sky);
      gl.uniform3fv(uGround, ground);
      gl.uniform3fv(uBrand, brand);
      gl.uniform1f(uDark, isDark ? 1 : 0);
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      const width = Math.max(1, Math.floor(canvas.clientWidth * dpr));
      const height = Math.max(1, Math.floor(canvas.clientHeight * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }
      gl.uniform2f(uRes, canvas.width, canvas.height);
    };

    readPalette();
    resize();
    setIsActive(true);

    // Theme đổi thì đọc lại bảng màu
    const themeObserver = new MutationObserver(readPalette);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    window.addEventListener('resize', resize);

    let frame = 0;
    let isVisible = true;
    const start = performance.now();

    const render = () => {
      frame = requestAnimationFrame(render);
      if (!isVisible) return;
      resize();
      gl.uniform1f(uTime, (performance.now() - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    frame = requestAnimationFrame(render);

    // Rời tab hoặc cuộn khỏi hero thì ngừng vẽ
    const onVisibility = () => {
      isVisible = !document.hidden;
    };
    document.addEventListener('visibilitychange', onVisibility);

    const intersectionObserver = new IntersectionObserver(
      ([entry]) => {
        isVisible = entry.isIntersecting && !document.hidden;
      },
      { threshold: 0 },
    );
    intersectionObserver.observe(canvas);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', onVisibility);
      themeObserver.disconnect();
      intersectionObserver.disconnect();
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      setIsActive(false);
    };
  }, []);

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`} aria-hidden="true">
      {/* Fallback tĩnh — cũng là lớp nền khi WebGL bị tắt */}
      <div className="absolute inset-0 mesh-bg bg-background" />
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full transition-opacity duration-350 ease-spring ${
          isActive ? 'opacity-100' : 'opacity-0'
        }`}
      />
    </div>
  );
};
