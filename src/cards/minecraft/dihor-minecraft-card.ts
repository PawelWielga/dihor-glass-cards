import { html, css, unsafeCSS } from 'lit';
import { BaseCardConfig, BaseDihorCard } from '../../shared/base-card';
import { registerCustomCard } from '../../shared/custom-card-registry';

// Import CSS as string (handled by rollup-plugin-string)
import coreCss from '../../shared/styles/core.css';
import cardCssStr from './dihor-minecraft-card.css';

// We will inline the HTML template logic into render() instead of importing the HTML file
// to take full advantage of Lit's binding capabilities.
// import htmlTemplate from "./dihor-minecraft-card.html";

export interface MinecraftCardConfig extends BaseCardConfig {
  title?: string;
  entity_prefix: string;
}

export class MinecraftCard extends BaseDihorCard<MinecraftCardConfig> {
  static get styles() {
    return [
      super.styles,
      css`
        ${unsafeCSS(cardCssStr)}
      `,
      css`
        ${unsafeCSS(coreCss)}
      `,
    ];
  }

  setConfig(config: MinecraftCardConfig) {
    if (!config.entity_prefix) {
      throw new Error('entity_prefix is required');
    }
    if (
      config.entity_prefix.startsWith('sensor.') ||
      config.entity_prefix.startsWith('binary_sensor.')
    ) {
      console.warn(
        '[dihor-minecraft-card] entity_prefix should not include "sensor." or "binary_sensor."'
      );
    }
    super.setConfig(config);
  }

  static getStubConfig() {
    return {
      entity_prefix: 'minecraft_server',
      title: 'Minecraft Server',
    };
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: 'entity_prefix',
          required: true,
          selector: {
            text: {},
          },
        },
        {
          name: 'title',
          selector: {
            text: {},
          },
        },
      ],
      computeLabel: (schema: any) => {
        if (schema.name === 'entity_prefix') return 'Entity Prefix';
        if (schema.name === 'title') return 'Card Title';
        return undefined;
      },
      computeHelper: (schema: any) => {
        if (schema.name === 'entity_prefix') {
          return "Prefix for Minecraft sensor entities (e.g., 'minecraft_server' for sensor.minecraft_server_status)";
        }
        if (schema.name === 'title') {
          return "Optional title for the card (defaults to 'Minecraft Server')";
        }
        return undefined;
      },
      assertConfig: (config: MinecraftCardConfig) => {
        MinecraftCard.validateConfig(config);
      },
    };
  }

  getGridOptions() {
    return {
      rows: 2,
      columns: 12,
      min_rows: 2,
      min_columns: 12,
      max_columns: 12,
    };
  }

  private static validateConfig(config: MinecraftCardConfig) {
    if (!config.entity_prefix || typeof config.entity_prefix !== 'string') {
      throw new Error('entity_prefix is required');
    }
  }

  protected renderCard() {
    if (!this.hass || !this._config) return html``;

    const p = this._config.entity_prefix;
    const getState = (suffix: string): string => {
      return (
        this.hass.states[`${p}${suffix}`]?.state ??
        this.hass.states[`sensor.${p}${suffix}`]?.state ??
        this.hass.states[`binary_sensor.${p}${suffix}`]?.state ??
        'unavailable'
      );
    };

    // Data gathering
    const status = getState('_status').toLowerCase();
    const isOffline = status === 'unavailable' || status === 'offline' || status === '0';

    // If we want to strictly follow the old HTML structure:
    // It seems the old HTML was quite static and used IDs to update content.
    // We should recreate that structure but with bindings.

    const worldMessage = isOffline ? '' : getState('_world_message');
    const version = isOffline ? '0.0.0' : getState('_version');
    const playersOnline = isOffline ? '0' : getState('_players_online');
    const playersMax = isOffline ? '0' : getState('_players_max');
    const latencyRaw = isOffline ? '0' : getState('_latency');
    const latency = latencyRaw.split('.')[0];
    const statusText = isOffline ? 'Offline' : 'Online';
    const statusClass = isOffline ? 'dihor-badge-offline' : 'dihor-badge-online';
    const title = this._config.title || 'Minecraft Server';
    const playersText = `${playersOnline} / ${playersMax}`;
    const latencyText = `${latency} ms`;

    return html`
      <ha-card class="dihor-card glass-card">
        <div class="glass-shine"></div>
        <div class="dihor-card-header">
          <div class="dihor-card-title">
            <ha-icon class="dihor-icon" icon="mdi:minecraft"></ha-icon> ${title}
          </div>
          <div class="dihor-badge ${statusClass}">${statusText}</div>
        </div>

        <div class="dihor-card-content">
          <div class="server-info-row">
            <span class="info-label">MOTD</span>
            <span class="info-value">${worldMessage}</span>
          </div>

          <div class="server-stats-grid">
            <div class="stat-item">
              <span class="stat-label">Players</span>
              <span class="stat-value">${playersText}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Ping</span>
              <span class="stat-value">${latencyText}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">Version</span>
              <span class="stat-value">${version}</span>
            </div>
          </div>
        </div>
      </ha-card>
    `;
  }

  getCardSize() {
    return 1;
  }
}

if (!customElements.get('dihor-minecraft-card')) {
  customElements.define('dihor-minecraft-card', MinecraftCard);
}

registerCustomCard({
  type: 'dihor-minecraft-card',
  name: 'Dihor Minecraft Card',
  preview: true,
  description: 'Monitor a Minecraft server via sensor entities',
});
