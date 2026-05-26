import { html, nothing, css, unsafeCSS } from 'lit';
import { BaseCardConfig, BaseDihorCard } from '../../shared/base-card';
import { registerCustomCard } from '../../shared/custom-card-registry';
import cardCssStr from './dihor-tv-remote-card.css';

type TvRemoteButton = {
  icon: string;
  label: string;
  disabled?: boolean;
  pressed?: boolean;
  action: () => void;
};

type EntityState = {
  state: string;
  attributes: Record<string, any>;
};

type AppIcon =
  | {
      type: 'mdi';
      value: string;
    }
  | {
      type: 'image';
      value: string;
      fallbackIcon: string;
    };

type PlayStoreIconMetadata = {
  iconUrl: string;
  appName?: string;
};

export interface TvRemoteCardConfig extends BaseCardConfig {
  entity: string;
  name?: string;
  app_icon_source?: 'local' | 'google_favicon' | 'play_store';
  app_icons?: Record<string, string>;
  app_image_urls?: Record<string, string>;
  app_domains?: Record<string, string>;
  app_package_ids?: Record<string, string>;
  icon_resolver_url?: string;
  default_app_icon?: string;
  show_name?: boolean;
  show_mute?: boolean;
}

export class TvRemoteCard extends BaseDihorCard<TvRemoteCardConfig> {
  private resolvedPlayStoreIcons = new Map<string, PlayStoreIconMetadata>();
  private pendingPlayStoreIcons = new Set<string>();
  private failedPlayStoreIcons = new Set<string>();

  static get styles() {
    return [
      super.styles,
      css`
        ${unsafeCSS(cardCssStr)}
      `,
    ];
  }

  setConfig(config: TvRemoteCardConfig) {
    TvRemoteCard.validateConfig(config);
    super.setConfig(config);
  }

  static getStubConfig() {
    return {
      entity: 'media_player.living_room_tv',
      app_icon_source: 'local',
      app_icons: {
        Netflix: 'mdi:netflix',
        YouTube: 'mdi:youtube',
        'Nova Video Player':
          'https://play-lh.googleusercontent.com/e8Bx0rLVoLdeCxnKlicIfAGaCKCOhhFxKSM2H8RlQzGeX9A4VvVa0A6vexKhVBNk3MM=w240-h480',
      },
      app_domains: {
        Netflix: 'netflix.com',
        YouTube: 'youtube.com',
      },
    };
  }

  static getConfigForm() {
    return {
      schema: [
        {
          name: 'entity',
          required: true,
          selector: {
            entity: {
              domain: 'media_player',
            },
          },
        },
        {
          name: 'name',
          selector: {
            text: {},
          },
        },
        {
          name: 'app_icon_source',
          selector: {
            select: {
              mode: 'dropdown',
              options: [
                {
                  value: 'local',
                  label: 'Local icons',
                },
                {
                  value: 'google_favicon',
                  label: 'Google favicon',
                },
                {
                  value: 'play_store',
                  label: 'Google Play package ID',
                },
              ],
            },
          },
        },
        {
          name: 'default_app_icon',
          selector: {
            icon: {},
          },
        },
        {
          name: 'show_name',
          selector: {
            boolean: {},
          },
        },
        {
          name: 'show_mute',
          selector: {
            boolean: {},
          },
        },
      ],
      computeLabel: (schema: any) => {
        switch (schema.name) {
          case 'entity':
            return 'TV Entity';
          case 'name':
            return 'Custom Name';
          case 'app_icon_source':
            return 'App Icon Source';
          case 'default_app_icon':
            return 'Default App Icon';
          case 'show_name':
            return 'Show TV Name';
          case 'show_mute':
            return 'Show Mute Button';
        }
        return undefined;
      },
      computeHelper: (schema: any) => {
        switch (schema.name) {
          case 'entity':
            return 'Media player entity to control';
          case 'name':
            return 'Optional custom TV label';
          case 'app_icon_source':
            return 'Local uses app_icons; Google favicon uses app_domains; Google Play uses app_package_ids';
          case 'default_app_icon':
            return 'Icon used when the current app is not mapped';
          case 'show_name':
            return 'Defaults to true';
          case 'show_mute':
            return 'Defaults to true';
        }
        return undefined;
      },
      assertConfig: (config: TvRemoteCardConfig) => {
        TvRemoteCard.validateConfig(config);
      },
    };
  }

  protected renderCard() {
    if (!this.hass || !this._config) {
      return nothing;
    }

    const state = this.hass.states[this._config.entity];
    if (!state) {
      return html`
        <ha-card class="glass-card">
          <div class="glass-shine"></div>
          <div class="card-content tv-remote-error">
            <ha-icon icon="mdi:television-off"></ha-icon>
            <div>
              <div class="tv-remote-error-title">TV not found</div>
              <div class="tv-remote-error-message">Entity ${this._config.entity} not found.</div>
            </div>
          </div>
        </ha-card>
      `;
    }

    const unavailable = this.isUnavailable(state);
    const off = state.state === 'off';
    const powerOff = off || unavailable;
    const name = this._config.name || state.attributes.friendly_name || this._config.entity;
    const showName = this._config.show_name ?? true;
    const appName = this.getAppName(state);
    const appIcon = this.getAppIcon(appName);
    const displayAppName = this.getDisplayAppName(appName);
    const muted = Boolean(state.attributes.is_volume_muted);
    const buttons = this.getButtons(unavailable, powerOff, muted);

    return html`
      <ha-card class="glass-card tv-remote-card ${unavailable ? 'is-unavailable' : ''}">
        <div class="glass-shine"></div>
        <div class="card-content tv-remote-content">
          <div class="tv-remote-app">
            <div class="tv-remote-app-icon">${this.renderAppIcon(appIcon, appName)}</div>
            <div class="tv-remote-app-info">
              <div class="tv-remote-app-name">${displayAppName || 'TV'}</div>
              ${showName ? html`<div class="tv-remote-tv-name">${name}</div>` : nothing}
            </div>
          </div>

          <div class="tv-remote-controls">
            ${buttons.map(
              (button) => html`
                <button
                  type="button"
                  class="tv-remote-button ${button.pressed ? 'is-pressed' : ''}"
                  aria-label=${button.label}
                  ?disabled=${button.disabled}
                  @click=${button.action}
                >
                  <ha-icon icon="${button.icon}"></ha-icon>
                </button>
              `
            )}
          </div>
        </div>
      </ha-card>
    `;
  }

  getCardSize() {
    return 2;
  }

  getGridOptions() {
    return {
      rows: 2,
      columns: 4,
      min_rows: 2,
      min_columns: 3,
      max_columns: 6,
    };
  }

  private getButtons(unavailable: boolean, off: boolean, muted: boolean): TvRemoteButton[] {
    const controlsDisabled = unavailable || off;
    const buttons: TvRemoteButton[] = [
      {
        icon: off ? 'mdi:power' : 'mdi:power-standby',
        label: off ? 'Turn TV on' : 'Turn TV off',
        pressed: !off && !unavailable,
        action: () => this.togglePower(off),
      },
      {
        icon: 'mdi:volume-minus',
        label: 'Volume down',
        disabled: controlsDisabled,
        action: () => this.callMediaPlayerService('volume_down'),
      },
      {
        icon: 'mdi:volume-plus',
        label: 'Volume up',
        disabled: controlsDisabled,
        action: () => this.callMediaPlayerService('volume_up'),
      },
      {
        icon: 'mdi:skip-previous',
        label: 'Previous program',
        disabled: controlsDisabled,
        action: () => this.callMediaPlayerService('media_previous_track'),
      },
      {
        icon: 'mdi:skip-next',
        label: 'Next program',
        disabled: controlsDisabled,
        action: () => this.callMediaPlayerService('media_next_track'),
      },
    ];

    if (this._config.show_mute ?? true) {
      buttons.push({
        icon: muted ? 'mdi:volume-off' : 'mdi:volume-mute',
        label: muted ? 'Unmute' : 'Mute',
        disabled: controlsDisabled,
        pressed: muted,
        action: () => this.toggleMute(muted),
      });
    }

    return buttons;
  }

  private togglePower(off: boolean) {
    this.callMediaPlayerService(off ? 'turn_on' : 'turn_off');
  }

  private toggleMute(muted: boolean) {
    this.callMediaPlayerService('volume_mute', {
      is_volume_muted: !muted,
    });
  }

  private callMediaPlayerService(service: string, serviceData: Record<string, any> = {}) {
    if (!this._config?.entity || !this.hass) return;

    this.hass.callService('media_player', service, {
      entity_id: this._config.entity,
      ...serviceData,
    });
  }

  private getAppName(state: EntityState) {
    const appName =
      state.attributes.app_name || state.attributes.source || state.attributes.media_title;

    return typeof appName === 'string' && appName.trim() ? appName.trim() : undefined;
  }

  private getAppIcon(appName: string | undefined): AppIcon {
    const defaultIcon = this._config.default_app_icon || 'mdi:television';
    const appImageUrl = this.getMappedValue(appName, this._config.app_image_urls);
    const localIcon = this.getMappedValue(appName, this._config.app_icons);
    const appDomain = this.getMappedValue(appName, this._config.app_domains);
    const packageId = this.getPackageId(appName);

    if (appImageUrl) {
      return {
        type: 'image',
        value: appImageUrl,
        fallbackIcon: this.getMdiIcon(localIcon) || defaultIcon,
      };
    }

    if (localIcon && this.isImageUrl(localIcon)) {
      return {
        type: 'image',
        value: localIcon,
        fallbackIcon: defaultIcon,
      };
    }

    if (this._config.app_icon_source === 'google_favicon' && appDomain) {
      return {
        type: 'image',
        value: `https://www.google.com/s2/favicons?domain=${encodeURIComponent(appDomain)}&sz=128`,
        fallbackIcon: this.getMdiIcon(localIcon) || defaultIcon,
      };
    }

    if (this._config.app_icon_source === 'play_store' && packageId) {
      const resolvedIcon = this.resolvedPlayStoreIcons.get(packageId)?.iconUrl;

      if (resolvedIcon) {
        return {
          type: 'image',
          value: resolvedIcon,
          fallbackIcon: this.getMdiIcon(localIcon) || defaultIcon,
        };
      }

      this.resolvePlayStoreIcon(packageId);
    }

    return {
      type: 'mdi',
      value: this.getMdiIcon(localIcon) || defaultIcon,
    };
  }

  private renderAppIcon(appIcon: AppIcon, appName: string | undefined) {
    if (appIcon.type === 'image') {
      return html`
        <img
          src="${appIcon.value}"
          alt=${appName ? `${appName} icon` : 'TV app icon'}
          class="tv-remote-app-image"
          @error=${this.handleAppImageError}
        />
        <ha-icon class="tv-remote-app-fallback-icon" icon="${appIcon.fallbackIcon}"></ha-icon>
      `;
    }

    return html`<ha-icon icon="${appIcon.value}"></ha-icon>`;
  }

  private handleAppImageError(event: Event) {
    const image = event.currentTarget as HTMLImageElement;
    const icon = image.nextElementSibling as HTMLElement | null;

    image.style.display = 'none';
    icon?.classList.add('is-visible');
  }

  private getMappedValue(appName: string | undefined, map: Record<string, string> | undefined) {
    if (!appName || !map) return undefined;

    const normalizedAppName = appName.toLowerCase();
    const match = Object.entries(map).find(([name]) => name.toLowerCase() === normalizedAppName);

    return match?.[1];
  }

  private getMdiIcon(value: string | undefined) {
    return value && !this.isImageUrl(value) ? value : undefined;
  }

  private isImageUrl(value: string) {
    return /^https?:\/\//i.test(value) || value.startsWith('data:image/');
  }

  private async resolvePlayStoreIcon(packageId: string) {
    if (this.pendingPlayStoreIcons.has(packageId) || this.failedPlayStoreIcons.has(packageId)) {
      return;
    }

    this.pendingPlayStoreIcons.add(packageId);

    try {
      const resolverUrl = this._config.icon_resolver_url || '/api/dihor-glass-cards/play-icon';
      const url = new URL(resolverUrl, window.location.origin);

      url.searchParams.set('package_id', packageId);

      const data = await this.callIconResolver(url);
      const iconUrl = typeof data.icon_url === 'string' ? data.icon_url : undefined;
      const appName = typeof data.app_name === 'string' ? data.app_name : undefined;

      if (!iconUrl || !this.isImageUrl(iconUrl)) {
        throw new Error('Icon resolver returned an invalid icon_url');
      }

      this.resolvedPlayStoreIcons.set(packageId, {
        iconUrl,
        appName,
      });
      this.failedPlayStoreIcons.delete(packageId);
      this.requestUpdate();
    } catch {
      this.failedPlayStoreIcons.add(packageId);
    } finally {
      this.pendingPlayStoreIcons.delete(packageId);
    }
  }

  private async callIconResolver(url: URL): Promise<{
    app_name?: unknown;
    icon_url?: unknown;
  }> {
    if (this.hass.callApi && url.origin === window.location.origin) {
      const apiPath = `${url.pathname.replace(/^\/api\//, '')}${url.search}`;
      return this.hass.callApi<{ app_name?: unknown; icon_url?: unknown }>('GET', apiPath);
    }

    const response = await fetch(url.toString(), {
      credentials: 'same-origin',
    });

    if (!response.ok) {
      throw new Error(`Icon resolver failed with ${response.status}`);
    }

    return response.json() as Promise<{ app_name?: unknown; icon_url?: unknown }>;
  }

  private getDisplayAppName(appName: string | undefined) {
    const packageId = this.getPackageId(appName);
    if (!packageId) return appName;

    return this.resolvedPlayStoreIcons.get(packageId)?.appName || appName;
  }

  private getPackageId(appName: string | undefined) {
    const configuredPackageId = this.getMappedValue(appName, this._config.app_package_ids);
    if (configuredPackageId) return configuredPackageId;

    return appName && this.isPackageId(appName) ? appName : undefined;
  }

  private isPackageId(value: string) {
    return /^[a-zA-Z][\w]*(?:\.[a-zA-Z][\w]*)+$/.test(value);
  }

  private isUnavailable(state: EntityState) {
    return state.state === 'unavailable' || state.state === 'unknown';
  }

  private static validateConfig(config: TvRemoteCardConfig) {
    if (!config.entity || typeof config.entity !== 'string') {
      throw new Error('entity is required');
    }

    if (!config.entity.startsWith('media_player.')) {
      throw new Error('entity must be a media_player entity');
    }

    if (config.app_icons && typeof config.app_icons !== 'object') {
      throw new Error('app_icons must be an object');
    }

    if (config.app_image_urls && typeof config.app_image_urls !== 'object') {
      throw new Error('app_image_urls must be an object');
    }

    if (config.app_domains && typeof config.app_domains !== 'object') {
      throw new Error('app_domains must be an object');
    }

    if (config.app_package_ids && typeof config.app_package_ids !== 'object') {
      throw new Error('app_package_ids must be an object');
    }

    if (config.icon_resolver_url && typeof config.icon_resolver_url !== 'string') {
      throw new Error('icon_resolver_url must be a string');
    }

    if (
      config.app_icon_source &&
      config.app_icon_source !== 'local' &&
      config.app_icon_source !== 'google_favicon' &&
      config.app_icon_source !== 'play_store'
    ) {
      throw new Error('app_icon_source must be local, google_favicon or play_store');
    }
  }
}

if (!customElements.get('dihor-tv-remote-card')) {
  customElements.define('dihor-tv-remote-card', TvRemoteCard);
}

registerCustomCard({
  type: 'dihor-tv-remote-card',
  name: 'Dihor TV Remote Card',
  preview: true,
  description: 'Controls a TV media player with app status and basic remote buttons.',
});
