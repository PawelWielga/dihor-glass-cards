import { html, css, unsafeCSS, type PropertyValues } from 'lit';
import { state } from 'lit/decorators.js';
import { BaseCardConfig, BaseDihorCard } from '../../shared/base-card';
import { registerCustomCard } from '../../shared/custom-card-registry';
import cardCssStr from './dihor-clock-card.css';

type LiquidFontWeight = 400 | 700 | 900;

export interface ClockCardConfig extends BaseCardConfig {
  size?: number;
  font_weight?: LiquidFontWeight;
  refraction?: number;
  bevel_depth?: number;
  frost?: number;
  specular?: number;
}

const DEFAULT_CLOCK_CONFIG = {
  size: 2,
  font_weight: 700 as LiquidFontWeight,
  refraction: 0.05,
  bevel_depth: 1.5,
  frost: 0.2,
  specular: 1.2,
};

const VERTEX_SHADER = `#version 300 es
  in vec2 position;

  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = `#version 300 es
  precision highp float;

  out vec4 fragColor;

  uniform vec2 u_resolution;
  uniform sampler2D u_heightmap;
  uniform float u_refraction;
  uniform float u_bevelDepth;
  uniform float u_frost;
  uniform float u_specularStrength;

  void main() {
    vec2 uv = gl_FragCoord.xy / u_resolution;
    float mask = texture(u_heightmap, uv).r;
    vec4 result = vec4(0.0);

    if (mask > 0.01) {
      vec2 texel = 1.0 / u_resolution;
      float mR = texture(u_heightmap, uv + vec2(texel.x * 2.0, 0.0)).r;
      float mL = texture(u_heightmap, uv - vec2(texel.x * 2.0, 0.0)).r;
      float mU = texture(u_heightmap, uv + vec2(0.0, texel.y * 2.0)).r;
      float mD = texture(u_heightmap, uv - vec2(0.0, texel.y * 2.0)).r;
      vec3 normal = normalize(vec3((mL - mR) * u_bevelDepth, (mD - mU) * u_bevelDepth, 1.0));

      vec3 lightDir = normalize(vec3(-0.5, 0.8, 1.0));
      float spec = pow(max(dot(normal, lightDir), 0.0), 12.0) * u_specularStrength;
      float edgeLine = smoothstep(0.4, 0.5, mask) - smoothstep(0.5, 0.6, mask);
      float inner = smoothstep(0.25, 0.9, mask);
      float refractionGlow = length(normal.xy) * u_refraction * 7.0;
      vec3 glassColor = vec3(0.88, 0.96, 1.0);
      vec3 edgeColor = vec3(1.0);
      float alpha = (0.10 + u_frost * 0.28) * inner + edgeLine * 0.42 + spec * 0.24 + refractionGlow;

      result = vec4(mix(glassColor, edgeColor, edgeLine + spec), alpha * smoothstep(0.03, 0.36, mask));
    }

    fragColor = result;
  }
`;

export class ClockCard extends BaseDihorCard<ClockCardConfig> {
  @state() private _timeString: string = '';
  @state() private _webglAvailable = true;

  private _interval?: number;
  private _animationFrame?: number;
  private _resizeObserver?: ResizeObserver;
  private _canvas?: HTMLCanvasElement;
  private _heightmapCanvas?: HTMLCanvasElement;
  private _heightmapContext?: CanvasRenderingContext2D;
  private _gl?: WebGL2RenderingContext;
  private _program?: WebGLProgram;
  private _heightmapTexture?: WebGLTexture;
  private _uniforms = new Map<string, WebGLUniformLocation>();

  static get styles() {
    return [
      super.styles,
      css`
        ${unsafeCSS(cardCssStr)}
      `,
    ];
  }

  static getStubConfig() {
    return {
      ...DEFAULT_CLOCK_CONFIG,
    };
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: 'size',
          selector: {
            number: {
              min: 1,
              max: 5,
              mode: 'box',
            },
          },
        },
        {
          name: 'font_weight',
          selector: {
            select: {
              options: [
                { value: '400', label: 'Thin' },
                { value: '700', label: 'Bold' },
                { value: '900', label: 'Heavy' },
              ],
            },
          },
        },
        {
          name: 'refraction',
          selector: {
            number: {
              min: 0,
              max: 0.15,
              step: 0.01,
              mode: 'box',
            },
          },
        },
        {
          name: 'bevel_depth',
          selector: {
            number: {
              min: 0.5,
              max: 3,
              step: 0.1,
              mode: 'box',
            },
          },
        },
        {
          name: 'frost',
          selector: {
            number: {
              min: 0,
              max: 1,
              step: 0.05,
              mode: 'box',
            },
          },
        },
        {
          name: 'specular',
          selector: {
            number: {
              min: 0,
              max: 3,
              step: 0.1,
              mode: 'box',
            },
          },
        },
      ],
      computeLabel: (schema: any) => {
        if (schema.name === 'size') return 'Clock Size';
        if (schema.name === 'font_weight') return 'Font Weight';
        if (schema.name === 'refraction') return 'Refraction';
        if (schema.name === 'bevel_depth') return 'Bevel Depth';
        if (schema.name === 'frost') return 'Frost';
        if (schema.name === 'specular') return 'Specular';
        return undefined;
      },
      computeHelper: (schema: any) => {
        if (schema.name === 'size') return 'Size of the clock display (1-5, default: 2)';
        if (schema.name === 'font_weight') return 'Font weight: 400, 700 or 900';
        if (schema.name === 'refraction')
          return 'Glass edge distortion strength (0-0.15, default: 0.05)';
        if (schema.name === 'bevel_depth') return 'Glass edge depth (0.5-3, default: 1.5)';
        if (schema.name === 'frost') return 'Milky glass amount (0-1, default: 0.2)';
        if (schema.name === 'specular') return 'Edge highlight brightness (0-3, default: 1.2)';
        return undefined;
      },
      assertConfig: (config: ClockCardConfig) => {
        ClockCard.validateConfig(config);
      },
    };
  }

  setConfig(config: ClockCardConfig) {
    ClockCard.validateConfig(config);
    super.setConfig({
      ...config,
      size: ClockCard.normalizeSize(config.size),
      font_weight: ClockCard.normalizeFontWeight(config.font_weight),
      refraction: ClockCard.normalizeNumber(
        config.refraction,
        0,
        0.15,
        DEFAULT_CLOCK_CONFIG.refraction
      ),
      bevel_depth: ClockCard.normalizeNumber(
        config.bevel_depth,
        0.5,
        3,
        DEFAULT_CLOCK_CONFIG.bevel_depth
      ),
      frost: ClockCard.normalizeNumber(config.frost, 0, 1, DEFAULT_CLOCK_CONFIG.frost),
      specular: ClockCard.normalizeNumber(config.specular, 0, 3, DEFAULT_CLOCK_CONFIG.specular),
    });
  }

  connectedCallback() {
    super.connectedCallback();
    this.startClock();
    this.startLiquidClock();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._interval) window.clearInterval(this._interval);
    if (this._animationFrame) window.cancelAnimationFrame(this._animationFrame);
    this._resizeObserver?.disconnect();
  }

  firstUpdated() {
    this._resizeObserver = new ResizeObserver(() => this.resizeLiquidClock());
    this._resizeObserver.observe(this);
    this.startLiquidClock();
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (changedProperties.has('_timeString') || changedProperties.has('_config')) {
      this.drawHeightmap();
    }
  }

  private startClock() {
    this.updateTime();
    if (this._interval) window.clearInterval(this._interval);
    this._interval = window.setInterval(() => this.updateTime(), 1000);
  }

  private updateTime() {
    const now = new Date();
    this._timeString = now.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  private startLiquidClock() {
    if (!this.isConnected || !this.renderRoot) return;
    if (this._animationFrame) return;

    this._canvas =
      this.renderRoot.querySelector<HTMLCanvasElement>('.liquid-clock-canvas') ?? undefined;
    if (!this._canvas) return;

    if (!this._gl && !this.initLiquidClock()) return;
    this.resizeLiquidClock();
    this._animationFrame = window.requestAnimationFrame(() => this.renderLiquidClock());
  }

  private initLiquidClock() {
    const canvas = this._canvas;
    if (!canvas) return false;

    const gl = canvas.getContext('webgl2', { antialias: true, alpha: true });
    if (!gl) {
      this._webglAvailable = false;
      return false;
    }

    const vertexShader = this.compileShader(gl, VERTEX_SHADER, gl.VERTEX_SHADER);
    const fragmentShader = this.compileShader(gl, FRAGMENT_SHADER, gl.FRAGMENT_SHADER);
    if (!vertexShader || !fragmentShader) {
      this._webglAvailable = false;
      return false;
    }

    const program = gl.createProgram();
    if (!program) {
      this._webglAvailable = false;
      return false;
    }

    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      this._webglAvailable = false;
      return false;
    }

    const positionBuffer = gl.createBuffer();
    const positionLoc = gl.getAttribLocation(program, 'position');
    if (!positionBuffer || positionLoc < 0) {
      this._webglAvailable = false;
      return false;
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
      gl.STATIC_DRAW
    );
    gl.enableVertexAttribArray(positionLoc);
    gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

    const heightmapTexture = gl.createTexture();
    if (!heightmapTexture) {
      this._webglAvailable = false;
      return false;
    }

    gl.bindTexture(gl.TEXTURE_2D, heightmapTexture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    this._gl = gl;
    this._program = program;
    this._heightmapTexture = heightmapTexture;
    this._heightmapCanvas = document.createElement('canvas');
    this._heightmapContext = this._heightmapCanvas.getContext('2d') ?? undefined;
    this._webglAvailable = Boolean(this._heightmapContext);

    return this._webglAvailable;
  }

  private compileShader(gl: WebGL2RenderingContext, source: string, type: number) {
    const shader = gl.createShader(type);
    if (!shader) return undefined;

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return undefined;
    }

    return shader;
  }

  private resizeLiquidClock() {
    const canvas = this._canvas;
    const heightmapCanvas = this._heightmapCanvas;
    const gl = this._gl;
    if (!canvas || !heightmapCanvas || !gl) return;

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.floor(rect.width * dpr));
    const height = Math.max(1, Math.floor(rect.height * dpr));

    if (canvas.width === width && canvas.height === height) return;

    canvas.width = width;
    canvas.height = height;
    heightmapCanvas.width = width;
    heightmapCanvas.height = height;
    gl.viewport(0, 0, width, height);
    this.drawHeightmap();
  }

  private renderLiquidClock() {
    const gl = this._gl;
    const program = this._program;
    const heightmapTexture = this._heightmapTexture;
    const canvas = this._canvas;
    if (!gl || !program || !heightmapTexture || !canvas) {
      this._animationFrame = undefined;
      return;
    }

    gl.useProgram(program);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(this.getUniform('u_resolution'), canvas.width, canvas.height);
    gl.uniform1f(this.getUniform('u_refraction'), this.getRefraction());
    gl.uniform1f(this.getUniform('u_bevelDepth'), this.getBevelDepth());
    gl.uniform1f(this.getUniform('u_frost'), this.getFrost());
    gl.uniform1f(this.getUniform('u_specularStrength'), this.getSpecular());

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, heightmapTexture);
    gl.uniform1i(this.getUniform('u_heightmap'), 0);
    gl.drawArrays(gl.TRIANGLES, 0, 6);

    this._animationFrame = window.requestAnimationFrame(() => this.renderLiquidClock());
  }

  private drawHeightmap() {
    const canvas = this._heightmapCanvas;
    const context = this._heightmapContext;
    const gl = this._gl;
    const texture = this._heightmapTexture;
    if (!canvas || !context || !gl || !texture || canvas.width <= 1 || canvas.height <= 1) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;
    const fontSize = Math.min(width * 0.22, height * 0.78, this.getPreferredClockFontSize());

    context.save();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = 'black';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.scale(dpr, dpr);
    context.fillStyle = 'white';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.filter = `blur(${Math.max(2, fontSize * 0.035)}px)`;
    context.font = `${this.getFontWeight()} ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`;
    context.fillText(this._timeString || '00:00', width / 2, height / 2);
    context.restore();

    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  }

  private getUniform(name: string) {
    const gl = this._gl;
    const program = this._program;
    if (!gl || !program) return null;

    const cached = this._uniforms.get(name);
    if (cached) return cached;

    const uniform = gl.getUniformLocation(program, name);
    if (uniform) this._uniforms.set(name, uniform);
    return uniform;
  }

  private getPreferredClockFontSize() {
    const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return (2.6 + this.getClockScale() * 1.15) * rem;
  }

  protected renderCard() {
    return html`
      <ha-card
        class="clock-card liquid-clock-card"
        style="--dihor-clock-scale: ${this.getClockScale()}; --dihor-clock-font-weight: ${this.getFontWeight()};"
      >
        <canvas class="liquid-clock-canvas" aria-hidden="true"></canvas>
        <div class="clock-overlay" aria-label=${this._timeString}>
          <div class="time-display ${this._webglAvailable ? 'webgl-time' : ''}">
            ${this._timeString}
          </div>
        </div>
      </ha-card>
    `;
  }

  getCardSize() {
    return this._config?.size ?? 2;
  }

  getGridOptions() {
    const rows = Math.min(2, Math.max(1, Math.ceil(this.getCardSize())));
    return {
      rows,
      columns: 6,
      min_rows: 1,
      max_rows: 2,
      min_columns: 6,
      max_columns: 12,
    };
  }

  private getClockScale() {
    return ClockCard.normalizeSize(this._config?.size);
  }

  private getFontWeight() {
    return ClockCard.normalizeFontWeight(this._config?.font_weight);
  }

  private getRefraction() {
    return ClockCard.normalizeNumber(
      this._config?.refraction,
      0,
      0.15,
      DEFAULT_CLOCK_CONFIG.refraction
    );
  }

  private getBevelDepth() {
    return ClockCard.normalizeNumber(
      this._config?.bevel_depth,
      0.5,
      3,
      DEFAULT_CLOCK_CONFIG.bevel_depth
    );
  }

  private getFrost() {
    return ClockCard.normalizeNumber(this._config?.frost, 0, 1, DEFAULT_CLOCK_CONFIG.frost);
  }

  private getSpecular() {
    return ClockCard.normalizeNumber(this._config?.specular, 0, 3, DEFAULT_CLOCK_CONFIG.specular);
  }

  private static normalizeSize(size: unknown): number {
    if (size === undefined || size === null || size === '') return 2;
    const numericSize = Number(size);
    if (!Number.isFinite(numericSize)) return 2;
    return Math.min(5, Math.max(1, numericSize));
  }

  private static normalizeFontWeight(fontWeight: unknown): LiquidFontWeight {
    const numericFontWeight = Number(fontWeight);
    if (numericFontWeight === 400 || numericFontWeight === 700 || numericFontWeight === 900) {
      return numericFontWeight;
    }
    return DEFAULT_CLOCK_CONFIG.font_weight;
  }

  private static normalizeNumber(
    value: unknown,
    min: number,
    max: number,
    fallback: number
  ): number {
    if (value === undefined || value === null || value === '') return fallback;
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return fallback;
    return Math.min(max, Math.max(min, numericValue));
  }

  private static validateConfig(config: ClockCardConfig) {
    const size = config.size as unknown;
    ClockCard.validateNumber('size', size, 1, 5);
    ClockCard.validateNumber('refraction', config.refraction, 0, 0.15);
    ClockCard.validateNumber('bevel_depth', config.bevel_depth, 0.5, 3);
    ClockCard.validateNumber('frost', config.frost, 0, 1);
    ClockCard.validateNumber('specular', config.specular, 0, 3);

    if (
      config.font_weight !== undefined &&
      ClockCard.normalizeFontWeight(config.font_weight) !== Number(config.font_weight)
    ) {
      throw new Error('font_weight must be one of: 400, 700, 900');
    }
  }

  private static validateNumber(name: string, value: unknown, min: number, max: number) {
    if (value === undefined || value === null || value === '') return;
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < min || numericValue > max) {
      throw new Error(`${name} must be a number between ${min} and ${max}`);
    }
  }
}

if (!customElements.get('dihor-clock-card')) {
  customElements.define('dihor-clock-card', ClockCard);
}

registerCustomCard({
  type: 'dihor-clock-card',
  name: 'Dihor Clock Card',
  preview: true,
  description: 'Liquid glass digital clock card with configurable size',
});
