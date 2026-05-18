import { html, css, unsafeCSS, type PropertyValues } from 'lit';
import { state } from 'lit/decorators.js';
import { BaseCardConfig, BaseDihorCard } from '../../shared/base-card';
import { registerCustomCard } from '../../shared/custom-card-registry';
import cardCssStr from './dihor-clock-card.css';

export interface ClockCardConfig extends BaseCardConfig {
  size?: number;
}

export class ClockCard extends BaseDihorCard<ClockCardConfig> {
  @state() private _timeString: string = '';
  private _interval?: number;
  private resizeObserver?: ResizeObserver;
  private fitFrame?: number;
  private measureCanvas?: HTMLCanvasElement;

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
      size: 2,
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
      ],
      computeLabel: (schema: any) => {
        if (schema.name === 'size') return 'Clock Size';
        return undefined;
      },
      computeHelper: (schema: any) => {
        if (schema.name === 'size') return 'Size of the clock display (1-5, default: 2)';
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
    });
  }

  connectedCallback() {
    super.connectedCallback();
    this.startClock();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._interval) window.clearInterval(this._interval);
    this.resizeObserver?.disconnect();
    if (this.fitFrame) window.cancelAnimationFrame(this.fitFrame);
  }

  firstUpdated() {
    this.resizeObserver = new ResizeObserver(() => this.scheduleClockFit());
    this.resizeObserver.observe(this);
    this.scheduleClockFit();
  }

  protected updated(changedProperties: PropertyValues) {
    super.updated(changedProperties);
    if (changedProperties.has('_timeString') || changedProperties.has('_config')) {
      this.scheduleClockFit();
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
      second: '2-digit',
    });
  }

  private scheduleClockFit() {
    if (this.fitFrame) {
      window.cancelAnimationFrame(this.fitFrame);
    }

    this.fitFrame = window.requestAnimationFrame(() => {
      this.fitFrame = undefined;
      this.fitClockText();
    });
  }

  private fitClockText() {
    const face = this.renderRoot.querySelector<HTMLElement>('.clock-face');
    const text = this.renderRoot.querySelector<HTMLElement>('.time-display');
    if (!face || !text) return;

    const availableWidth = face.clientWidth;
    const availableHeight = face.clientHeight;
    if (availableWidth <= 0 || availableHeight <= 0) return;

    const maxFontSize = this.getPreferredClockFontSize();
    const fontByHeight = availableHeight / 1.1;
    const textWidthAtMax = this.measureClockTextWidth(text, maxFontSize);
    const fontByWidth =
      textWidthAtMax > 0 ? maxFontSize * (availableWidth / textWidthAtMax) : maxFontSize;
    const nextFontSize = Math.max(12, Math.min(maxFontSize, fontByHeight, fontByWidth));

    this.style.setProperty('--dihor-clock-font-size', `${Math.floor(nextFontSize)}px`);
  }

  private measureClockTextWidth(text: HTMLElement, fontSize: number) {
    this.measureCanvas ??= document.createElement('canvas');
    const context = this.measureCanvas.getContext('2d');
    if (!context) return text.scrollWidth;

    const styles = getComputedStyle(text);
    context.font = `${styles.fontWeight} ${fontSize}px ${styles.fontFamily}`;
    return context.measureText(this._timeString || '00:00:00').width;
  }

  private getPreferredClockFontSize() {
    const rem = Number.parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return (1.25 + this.getClockScale() * 0.46) * rem;
  }

  protected renderCard() {
    return html`
      <ha-card class="clock-card glass-card" style="--dihor-clock-scale: ${this.getClockScale()};">
        <div class="glass-shine"></div>
        <div class="card-content">
          <div class="clock-face">
            <span id="time" class="time-display">${this._timeString}</span>
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

  private static normalizeSize(size: unknown): number {
    if (size === undefined || size === null || size === '') return 2;
    const numericSize = Number(size);
    if (!Number.isFinite(numericSize)) return 2;
    return Math.min(5, Math.max(1, numericSize));
  }

  private static validateConfig(config: ClockCardConfig) {
    const size = config.size as unknown;
    if (size === undefined || size === null || size === '') return;

    const numericSize = Number(size);
    if (!Number.isFinite(numericSize) || numericSize < 1 || numericSize > 5) {
      throw new Error('size must be a number between 1 and 5');
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
  description: 'Minimal digital clock card with configurable size',
});
