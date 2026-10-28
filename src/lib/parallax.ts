// Paralaxe 2.5D da seção 2: a imagem toda em foco (aif.webp) deslocada pela
// disparidade (disp.png), seguindo o ponteiro. WebGL puro, um fragment shader só.

const VERTEX = `
attribute vec2 position;
varying vec2 uv;
void main() {
  uv = vec2(position.x, -position.y) * 0.5 + 0.5;
  gl_Position = vec4(position, 0.0, 1.0);
}`;

const FRAGMENT = `
precision mediump float;
varying vec2 uv;
uniform sampler2D aif;
uniform sampler2D disp;
uniform vec2 offset;  // deslocamento máximo (fração da imagem), com o sinal do ponteiro
uniform float focus;  // disparidade (0..1) que fica parada
uniform float scale;  // zoom leve para as bordas deslocadas não aparecerem
void main() {
  vec2 base = 0.5 + (uv - 0.5) * scale;
  // Ponto fixo: procura o pixel de origem cuja disparidade explica o deslocamento.
  // Com o filtro linear do disp, as bordas de profundidade esticam em vez de rasgar.
  vec2 q = base;
  for (int i = 0; i < 4; i++) {
    q = base - (texture2D(disp, q).r - focus) * offset;
  }
  gl_FragColor = texture2D(aif, clamp(q, 0.0, 1.0));
}`;

// Amplitude do deslocamento (fração da largura/altura) e tempo sem interação até o balanço automático.
const MAX_OFFSET: [number, number] = [0.035, 0.02];
const IDLE_MS = 1500;

export interface Parallax {
  canvas: HTMLCanvasElement;
  /** Troca a foto; `focus` é a disparidade normalizada que fica parada. */
  load(aifUrl: string, dispUrl: string, focus: number): void;
  /** Etapa DepthPro selecionada. */
  setActive(active: boolean): void;
  /** Seção perto da tela; fora dela a animação pausa. */
  setVisible(visible: boolean): void;
  isDragging(): boolean;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`failed to load ${src}`));
    img.src = src;
  });
}

function compile(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  return gl.getShaderParameter(shader, gl.COMPILE_STATUS) ? shader : null;
}

// Devolve null sem WebGL: quem chama mantém o mapa de profundidade estático.
export function createParallax(): Parallax | null {
  const canvas = document.createElement('canvas');
  canvas.className = 'parallax-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const context = canvas.getContext('webgl', { alpha: false, antialias: false });
  if (!context) return null;
  const gl: WebGLRenderingContext = context;

  const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  const program = gl.createProgram();
  if (!vs || !fs || !program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  gl.useProgram(program);

  // Um triângulo que cobre a tela toda.
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const uniforms = {
    offset: gl.getUniformLocation(program, 'offset'),
    focus: gl.getUniformLocation(program, 'focus'),
    scale: gl.getUniformLocation(program, 'scale'),
  };
  gl.uniform1i(gl.getUniformLocation(program, 'aif'), 0);
  gl.uniform1i(gl.getUniformLocation(program, 'disp'), 1);
  gl.uniform1f(uniforms.scale, 1 - Math.max(...MAX_OFFSET));

  const textures = [gl.createTexture(), gl.createTexture()];
  function upload(unit: number, img: HTMLImageElement): void {
    gl.activeTexture(gl.TEXTURE0 + unit);
    gl.bindTexture(gl.TEXTURE_2D, textures[unit]);
    // O disp é dado, não cor: sem conversão de espaço de cor. O PNG de 16 bits chega em 8 bits, o que basta.
    gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, unit === 1 ? gl.NONE : gl.BROWSER_DEFAULT_WEBGL);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    // Texturas sem potência de 2 no WebGL 1: sem mipmap e com CLAMP_TO_EDGE.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let ready = false;
  let lost = false;
  let active = false;
  let visible = false;
  let dragging = false;
  let loadToken = 0;
  let loadedKey = '';
  let lastInput = -Infinity;
  const target = [0, 0];
  const current = [0, 0];
  let raf = 0;

  function running(): boolean {
    return ready && active && visible && !lost;
  }

  function updateClasses(): void {
    canvas.classList.toggle('is-visible', ready && active && !lost);
    canvas.classList.toggle('is-dragging', dragging);
  }

  function draw(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.round(canvas.clientWidth * dpr);
    const height = Math.round(canvas.clientHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
    gl.uniform2f(uniforms.offset, current[0] * MAX_OFFSET[0], current[1] * MAX_OFFSET[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  function frame(time: number): void {
    raf = 0;
    if (!running()) return;
    // Balanço suave quando ninguém mexe (nunca com movimento reduzido).
    if (!reducedMotion && !dragging && time - lastInput > IDLE_MS) {
      const t = time / 1000;
      target[0] = Math.sin(t * 0.9) * 0.7;
      target[1] = Math.sin(t * 0.6) * 0.3;
    }
    current[0] += (target[0] - current[0]) * 0.12;
    current[1] += (target[1] - current[1]) * 0.12;
    const settled = Math.abs(target[0] - current[0]) + Math.abs(target[1] - current[1]) < 1e-3;
    if (settled) {
      current[0] = target[0];
      current[1] = target[1];
    }
    draw();
    if (!reducedMotion || dragging || !settled) kick();
  }

  function kick(): void {
    if (!raf && running()) raf = requestAnimationFrame(frame);
  }

  function aim(event: PointerEvent): void {
    const rect = canvas.getBoundingClientRect();
    target[0] = Math.max(-1, Math.min(1, ((event.clientX - rect.left) / rect.width) * 2 - 1));
    target[1] = Math.max(-1, Math.min(1, ((event.clientY - rect.top) / rect.height) * 2 - 1));
    lastInput = performance.now();
    kick();
  }

  // Mouse: segue o ponteiro (exceto com movimento reduzido). Toque/caneta: arrastar.
  // touch-action: pan-y no CSS mantém a rolagem vertical da página.
  canvas.addEventListener('pointerdown', (event) => {
    dragging = true;
    canvas.setPointerCapture(event.pointerId);
    updateClasses();
    aim(event);
  });
  canvas.addEventListener('pointermove', (event) => {
    if (dragging || (event.pointerType === 'mouse' && !reducedMotion)) aim(event);
  });
  const release = (): void => {
    if (!dragging) return;
    dragging = false;
    updateClasses();
    // Movimento reduzido: imagem parada fora do arraste.
    if (reducedMotion) {
      target[0] = 0;
      target[1] = 0;
    }
    lastInput = performance.now();
    kick();
  };
  canvas.addEventListener('pointerup', release);
  canvas.addEventListener('pointercancel', release);

  // Contexto perdido (GPU reiniciada etc.): esconde o canvas e fica o mapa estático.
  canvas.addEventListener('webglcontextlost', () => {
    lost = true;
    updateClasses();
  });

  return {
    canvas,
    load(aifUrl, dispUrl, focus) {
      const key = `${aifUrl}|${dispUrl}`;
      if (key === loadedKey) return;
      loadedKey = key;
      const token = ++loadToken;
      ready = false;
      updateClasses();
      Promise.all([loadImage(aifUrl), loadImage(dispUrl)]).then(([aif, disp]) => {
        if (token !== loadToken || lost) return; // outra foto chegou antes
        upload(0, aif);
        upload(1, disp);
        gl.uniform1f(uniforms.focus, focus);
        ready = true;
        updateClasses();
        draw();
        kick();
      }, (err: Error) => {
        if (token === loadToken) loadedKey = '';
        console.warn(err.message);
      });
    },
    setActive(value) {
      active = value;
      updateClasses();
      kick();
    },
    setVisible(value) {
      visible = value;
      kick();
    },
    isDragging: () => dragging,
  };
}
