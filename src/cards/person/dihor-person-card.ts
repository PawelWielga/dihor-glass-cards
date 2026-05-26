import { html, nothing, css, unsafeCSS } from 'lit';
import { BaseCardConfig, BaseDihorCard } from '../../shared/base-card';
import { registerCustomCard } from '../../shared/custom-card-registry';
import cardCssStr from './dihor-person-card.css';

export interface PersonCardConfig extends BaseCardConfig {
  entity: string;
  name?: string;
  icon?: string;
  phone_entity?: string;
  phone_name?: string;
  phone_icon?: string;
  phone_platform?: string;
  battery_entity?: string;
  battery_charging_entity?: string;
  show_entity_picture?: boolean;
  show_name?: boolean;
  show_state?: boolean;
  show_phone?: boolean;
  show_battery?: boolean;
  show_last_changed?: boolean;
  tap_action?: DihorActionConfig;
  hold_action?: DihorActionConfig;
  double_tap_action?: DihorActionConfig;
}

type DihorActionConfig = {
  action?: string;
  [key: string]: unknown;
};

export class PersonCard extends BaseDihorCard<PersonCardConfig> {
  private holdTimer?: number;
  private tapTimer?: number;
  private holdTriggered = false;
  private suppressNextClick = false;

  static get styles() {
    return [
      super.styles,
      css`
        ${unsafeCSS(cardCssStr)}
      `,
    ];
  }

  setConfig(config: PersonCardConfig) {
    PersonCard.validateConfig(config);
    super.setConfig(config);
  }

  static getStubConfig() {
    return {
      entity: 'person.example',
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
              domain: 'person',
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
          name: 'icon',
          selector: {
            icon: {},
          },
        },
        {
          name: 'phone_entity',
          selector: {
            entity: {},
          },
        },
        {
          name: 'phone_name',
          selector: {
            text: {},
          },
        },
        {
          name: 'phone_icon',
          selector: {
            icon: {},
          },
        },
        {
          name: 'phone_platform',
          selector: {
            select: {
              mode: 'dropdown',
              options: [
                {
                  value: 'auto',
                  label: 'Auto',
                },
                {
                  value: 'android',
                  label: 'Android',
                },
                {
                  value: 'iphone',
                  label: 'iPhone',
                },
              ],
            },
          },
        },
        {
          name: 'battery_entity',
          selector: {
            entity: {
              domain: 'sensor',
            },
          },
        },
        {
          name: 'battery_charging_entity',
          selector: {
            entity: {},
          },
        },
        {
          name: 'show_entity_picture',
          selector: {
            boolean: {},
          },
        },
        {
          name: 'show_name',
          selector: {
            boolean: {},
          },
        },
        {
          name: 'show_state',
          selector: {
            boolean: {},
          },
        },
        {
          name: 'show_phone',
          selector: {
            boolean: {},
          },
        },
        {
          name: 'show_battery',
          selector: {
            boolean: {},
          },
        },
        {
          name: 'show_last_changed',
          selector: {
            boolean: {},
          },
        },
        {
          type: 'expandable',
          name: '',
          title: 'Actions',
          schema: [
            {
              name: 'tap_action',
              selector: {
                ui_action: {
                  default_action: 'more-info',
                },
              },
            },
            {
              name: 'hold_action',
              selector: {
                ui_action: {
                  default_action: 'more-info',
                },
              },
            },
            {
              name: 'double_tap_action',
              selector: {
                ui_action: {
                  default_action: 'none',
                },
              },
            },
          ],
        },
      ],
      computeLabel: (schema: any) => {
        switch (schema.name) {
          case 'entity':
            return 'Person Entity';
          case 'name':
            return 'Name';
          case 'icon':
            return 'Fallback Icon';
          case 'phone_entity':
            return 'Phone Entity';
          case 'phone_name':
            return 'Phone Name';
          case 'phone_icon':
            return 'Phone Icon';
          case 'phone_platform':
            return 'Phone Platform';
          case 'battery_entity':
            return 'Battery Entity';
          case 'battery_charging_entity':
            return 'Battery Charging Entity';
          case 'show_entity_picture':
            return 'Show Entity Picture';
          case 'show_name':
            return 'Show Name';
          case 'show_state':
            return 'Show Location';
          case 'show_phone':
            return 'Show Phone';
          case 'show_battery':
            return 'Show Battery';
          case 'show_last_changed':
            return 'Show Last Changed';
          case 'tap_action':
            return 'Tap Action';
          case 'hold_action':
            return 'Hold Action';
          case 'double_tap_action':
            return 'Double Tap Action';
        }
        return undefined;
      },
      computeHelper: (schema: any) => {
        switch (schema.name) {
          case 'entity':
            return 'Select the person entity to display';
          case 'name':
            return 'Optional custom name';
          case 'icon':
            return 'Used when the entity has no picture or pictures are hidden';
          case 'phone_entity':
            return 'Optional phone/device entity linked to this person';
          case 'phone_name':
            return 'Optional custom phone label';
          case 'phone_icon':
            return 'Optional icon override, for example mdi:cellphone or mdi:tablet';
          case 'phone_platform':
            return 'Auto, Android or iPhone';
          case 'battery_entity':
            return 'Optional battery level sensor, for example sensor.phone_battery_level';
          case 'battery_charging_entity':
            return 'Optional entity with charging status, for example binary_sensor.phone_is_charging';
          case 'show_entity_picture':
            return 'Defaults to true';
          case 'show_name':
            return 'Defaults to true';
          case 'show_state':
            return 'Defaults to true';
          case 'show_phone':
            return 'Defaults to true when phone data is available';
          case 'show_battery':
            return 'Defaults to true when battery data is available';
          case 'show_last_changed':
            return 'Defaults to false';
          case 'tap_action':
            return 'Defaults to more-info';
          case 'hold_action':
            return 'Defaults to more-info';
          case 'double_tap_action':
            return 'Defaults to none';
        }
        return undefined;
      },
      assertConfig: (config: PersonCardConfig) => {
        PersonCard.validateConfig(config);
      },
    };
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.clearActionTimers();
  }

  private clearActionTimers() {
    if (this.holdTimer) {
      window.clearTimeout(this.holdTimer);
      this.holdTimer = undefined;
    }

    if (this.tapTimer) {
      window.clearTimeout(this.tapTimer);
      this.tapTimer = undefined;
    }
  }

  private buildActionConfig() {
    return {
      ...this._config,
      entity: this._config.entity,
      tap_action: this._config.tap_action ?? { action: 'more-info' },
      hold_action: this._config.hold_action ?? { action: 'more-info' },
      double_tap_action: this._config.double_tap_action ?? { action: 'none' },
    };
  }

  private fireAction(action: 'tap' | 'hold' | 'double_tap') {
    if (!this._config?.entity) return;

    this.dispatchEvent(
      new CustomEvent('hass-action', {
        bubbles: true,
        composed: true,
        detail: {
          config: this.buildActionConfig(),
          action,
        },
      })
    );
  }

  private handlePointerDown(event: PointerEvent) {
    if (event.button !== 0 || !this._config?.entity) return;
    this.holdTriggered = false;
    window.clearTimeout(this.holdTimer);
    this.holdTimer = window.setTimeout(() => {
      this.holdTriggered = true;
      this.suppressNextClick = true;
      this.fireAction('hold');
    }, 500);
  }

  private handlePointerEnd() {
    window.clearTimeout(this.holdTimer);
    this.holdTimer = undefined;
  }

  private handleClick(event: MouseEvent) {
    if (this.suppressNextClick || this.holdTriggered) {
      event.preventDefault();
      event.stopPropagation();
      this.suppressNextClick = false;
      this.holdTriggered = false;
      return;
    }

    if (this.tapTimer) {
      window.clearTimeout(this.tapTimer);
      this.tapTimer = undefined;
      this.fireAction('double_tap');
      return;
    }

    this.tapTimer = window.setTimeout(() => {
      this.fireAction('tap');
      this.tapTimer = undefined;
    }, 260);
  }

  private handleDoubleClick(event: MouseEvent) {
    event.preventDefault();
  }

  private handleContextMenu(event: MouseEvent) {
    if (this.holdTriggered) {
      event.preventDefault();
    }
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (event.key !== 'Enter' && event.key !== ' ') return;
    event.preventDefault();
    this.fireAction('tap');
  }

  protected renderCard() {
    if (!this.hass || !this._config) {
      return nothing;
    }
    const state = this.hass.states[this._config.entity];
    if (!state) {
      return html`
        <ha-card class="glass-card" header="Person not found">
          <div class="glass-shine"></div>
          <div class="card-content">Entity ${this._config.entity} not found.</div>
        </ha-card>
      `;
    }

    const name = this._config.name || state.attributes.friendly_name || this._config.entity;
    const picture = state.attributes.entity_picture as string | undefined;
    const showPicture = this._config.show_entity_picture ?? true;
    const showName = this._config.show_name ?? true;
    const showState = this._config.show_state ?? true;
    const showPhone = this._config.show_phone ?? true;
    const showBattery = this._config.show_battery ?? true;
    const showLastChanged = this._config.show_last_changed ?? false;
    const icon =
      this._config.icon || (state.attributes.icon as string | undefined) || 'mdi:account';
    const phoneEntityId =
      this._config.phone_entity || (state.attributes.source as string | undefined);
    const phoneState = phoneEntityId ? this.hass.states[phoneEntityId] : undefined;
    const phoneName = this.getPhoneName(phoneEntityId, phoneState);
    const phonePlatform = this.getPhonePlatform(phoneState, phoneEntityId);
    const phoneIcon = this.getPhoneIcon(phonePlatform);
    const batteryText = this.getBatteryText(state, phoneState);
    const phoneBatteryText = showPhone && phoneName && showBattery ? batteryText : undefined;
    const location = this.formatLocation(state.state);
    const statusClass = this.getStatusClass(state.state);
    const changedText =
      showLastChanged && state.last_changed
        ? this.formatLastChanged(state.last_changed)
        : undefined;
    const ariaLabel = showState ? `${name}, ${location}` : name;

    return html`
      <ha-card
        class="glass-card person-card ${statusClass}"
        tabindex="0"
        role="button"
        aria-label=${ariaLabel}
        @pointerdown=${this.handlePointerDown}
        @pointerup=${this.handlePointerEnd}
        @pointerleave=${this.handlePointerEnd}
        @pointercancel=${this.handlePointerEnd}
        @click=${this.handleClick}
        @dblclick=${this.handleDoubleClick}
        @contextmenu=${this.handleContextMenu}
        @keydown=${this.handleKeyDown}
      >
        <div class="glass-shine"></div>
        <div class="card-content person-card-content">
          <div class="person-avatar-column">
            <div class="person-avatar-wrap">
              ${showPicture && picture
                ? html`<img src="${picture}" alt="${name}" class="person-avatar" />`
                : html`<div class="person-avatar person-avatar-fallback">
                    <ha-icon icon="${icon}"></ha-icon>
                  </div>`}
            </div>
          </div>
          <div class="person-info-column">
            <div class="person-main">
              ${showName ? html`<div class="person-name">${name}</div>` : nothing}
              ${showState ? html`<div class="person-location">${location}</div>` : nothing}
              ${showPhone && phoneName
                ? html`<div class="person-phone">
                    ${this.renderPhoneIcon(phoneIcon)}
                    <span>${phoneName}</span>
                    ${phoneBatteryText
                      ? html`<span
                          class="person-phone-battery ${phoneBatteryText.isCharging
                            ? 'is-charging'
                            : ''}"
                        >
                          <ha-icon
                            icon="${this.getBatteryIcon(
                              phoneBatteryText.value,
                              phoneBatteryText.isCharging
                            )}"
                          ></ha-icon>
                          <span>${phoneBatteryText.label}</span>
                        </span>`
                      : nothing}
                  </div>`
                : nothing}
              ${changedText ? html`<div class="person-updated">${changedText}</div>` : nothing}
            </div>
            ${showBattery && batteryText && !phoneBatteryText
              ? html`<div class="person-device-column">
                  <div class="person-device-row">
                    <div class="person-battery ${batteryText.isCharging ? 'is-charging' : ''}">
                      <ha-icon
                        icon="${this.getBatteryIcon(batteryText.value, batteryText.isCharging)}"
                      ></ha-icon>
                      <span>${batteryText.label}</span>
                    </div>
                  </div>
                </div>`
              : nothing}
          </div>
        </div>
      </ha-card>
    `;
  }

  getCardSize() {
    return 1;
  }

  getGridOptions() {
    return {
      rows: 2,
      columns: 3,
      min_rows: 2,
      min_columns: 3,
      max_columns: 6,
    };
  }

  private static validateConfig(config: PersonCardConfig) {
    if (!config.entity || typeof config.entity !== 'string') {
      throw new Error('Entity is required');
    }
  }

  private getPhoneName(
    phoneEntityId: string | undefined,
    phoneState: { state: string; attributes: Record<string, any> } | undefined
  ) {
    if (this._config.phone_name) return this._config.phone_name;
    if (!phoneEntityId) return undefined;
    return phoneState?.attributes?.friendly_name || phoneEntityId.replace(/^.*\./, '');
  }

  private getPhoneIcon(platform: string | undefined) {
    const configuredIcon = this.normalizePhoneIcon(this._config.phone_icon);
    if (configuredIcon) return configuredIcon;

    if (platform === 'android') return 'dihor:android';
    if (platform === 'iphone' || platform === 'ios') return 'dihor:iphone';
    return 'mdi:cellphone';
  }

  private normalizePhoneIcon(icon: string | undefined) {
    const normalized = icon?.trim();
    if (!normalized) return undefined;

    const lower = normalized.toLowerCase();
    if (lower === 'android' || lower === 'dihor:android') return 'dihor:android';
    if (['iphone', 'ios', 'apple', 'dihor:iphone'].includes(lower)) return 'dihor:iphone';

    return normalized;
  }

  private getPhonePlatform(
    phoneState: { state: string; attributes: Record<string, any> } | undefined,
    phoneEntityId?: string
  ) {
    const configured = this._config.phone_platform?.toLowerCase();
    if (configured && configured !== 'auto') return configured;

    const text = [
      phoneEntityId,
      phoneState?.attributes?.platform,
      phoneState?.attributes?.os_name,
      phoneState?.attributes?.os_version,
      phoneState?.attributes?.operating_system,
      phoneState?.attributes?.manufacturer,
      phoneState?.attributes?.model,
      phoneState?.attributes?.friendly_name,
      phoneState?.attributes?.app_name,
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    if (
      [
        'android',
        'pixel',
        'samsung',
        'galaxy',
        'xiaomi',
        'redmi',
        'oneplus',
        'oppo',
        'realme',
        'huawei',
        'honor',
        'motorola',
        'moto ',
        'sony',
        'nothing phone',
      ].some((marker) => text.includes(marker))
    ) {
      return 'android';
    }

    if (
      text.includes('iphone') ||
      text.includes('ios') ||
      text.includes('ipad') ||
      text.includes('apple')
    ) {
      return 'iphone';
    }

    return undefined;
  }

  private renderPhoneIcon(icon: string) {
    if (icon === 'dihor:android') {
      return html`<svg
        class="person-phone-icon person-phone-platform-icon"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M8.2 4.2 6.7 2.7 5.7 3.7 7.4 5.4A6 6 0 0 0 6 9.2V15c0 .8.6 1.4 1.4 1.4h.4V20h1.7v-3.6h5V20h1.7v-3.6h.4c.8 0 1.4-.6 1.4-1.4V9.2a6 6 0 0 0-1.4-3.8l1.7-1.7-1-1-1.5 1.5A6.4 6.4 0 0 0 12 3a6.4 6.4 0 0 0-3.8 1.2ZM8 9.2a4 4 0 0 1 8 0v.2H8v-.2Zm0 2h8v3.4H8v-3.4Zm2.1-4.1a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6Zm3.8 0a.8.8 0 1 0 0 1.6.8.8 0 0 0 0-1.6Z" />
      </svg>`;
    }

    if (icon === 'dihor:iphone') {
      return html`<svg
        class="person-phone-icon person-phone-platform-icon"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path d="M8.7 2.6h6.6c1 0 1.9.8 1.9 1.9v15c0 1-.8 1.9-1.9 1.9H8.7c-1 0-1.9-.8-1.9-1.9v-15c0-1 .8-1.9 1.9-1.9Zm0 1.7c-.1 0-.2.1-.2.2v15c0 .1.1.2.2.2h6.6c.1 0 .2-.1.2-.2v-15c0-.1-.1-.2-.2-.2h-1.1l-.4.8h-3.6l-.4-.8H8.7Zm2.1 13.5h2.4v1.1h-2.4v-1.1Z" />
      </svg>`;
    }

    return html`<ha-icon class="person-phone-icon" icon="${icon}"></ha-icon>`;
  }

  private getBatteryText(
    personState: { state: string; attributes: Record<string, any> },
    phoneState: { state: string; attributes: Record<string, any> } | undefined
  ) {
    const batteryEntity = this._config.battery_entity
      ? this.hass.states[this._config.battery_entity]
      : undefined;
    const batteryValue =
      batteryEntity?.state ??
      personState.attributes.battery_level ??
      personState.attributes.battery ??
      phoneState?.attributes?.battery_level ??
      phoneState?.attributes?.battery;
    const numericValue = Number(batteryValue);
    const isCharging = this.isBatteryCharging(batteryEntity, phoneState);

    if (batteryValue === undefined || batteryValue === null || batteryValue === '') {
      return undefined;
    }

    if (!Number.isNaN(numericValue)) {
      const unit = batteryEntity?.attributes?.unit_of_measurement || '%';
      return {
        value: numericValue,
        label: `${Math.round(numericValue)}${unit}`,
        isCharging,
      };
    }

    return {
      value: undefined,
      label: String(batteryValue),
      isCharging,
    };
  }

  private isBatteryCharging(
    batteryState: { state: string; attributes: Record<string, any> } | undefined,
    phoneState: { state: string; attributes: Record<string, any> } | undefined
  ) {
    const chargingState = this._config.battery_charging_entity
      ? this.hass.states[this._config.battery_charging_entity]
      : undefined;
    const chargingValue =
      chargingState?.state ??
      chargingState?.attributes?.is_charging ??
      chargingState?.attributes?.charging ??
      batteryState?.attributes?.is_charging ??
      batteryState?.attributes?.charging ??
      batteryState?.attributes?.battery_charging ??
      batteryState?.attributes?.battery_status ??
      phoneState?.attributes?.is_charging ??
      phoneState?.attributes?.charging ??
      phoneState?.attributes?.battery_charging ??
      phoneState?.attributes?.battery_status;

    if (typeof chargingValue === 'boolean') return chargingValue;

    const normalized = String(chargingValue ?? '').toLowerCase();
    return ['on', 'true', 'charging', 'charging_ac', 'charging_usb'].includes(normalized);
  }

  private getBatteryIcon(value: number | undefined, isCharging: boolean) {
    if (isCharging) {
      if (value === undefined) return 'mdi:battery-charging';
      if (value <= 10) return 'mdi:battery-charging-10';
      if (value <= 20) return 'mdi:battery-charging-20';
      if (value <= 30) return 'mdi:battery-charging-30';
      if (value <= 40) return 'mdi:battery-charging-40';
      if (value <= 50) return 'mdi:battery-charging-50';
      if (value <= 60) return 'mdi:battery-charging-60';
      if (value <= 70) return 'mdi:battery-charging-70';
      if (value <= 80) return 'mdi:battery-charging-80';
      if (value <= 90) return 'mdi:battery-charging-90';
      return 'mdi:battery-charging-100';
    }

    if (value === undefined) return 'mdi:battery-unknown';
    if (value <= 10) return 'mdi:battery-10';
    if (value <= 20) return 'mdi:battery-20';
    if (value <= 30) return 'mdi:battery-30';
    if (value <= 40) return 'mdi:battery-40';
    if (value <= 50) return 'mdi:battery-50';
    if (value <= 60) return 'mdi:battery-60';
    if (value <= 70) return 'mdi:battery-70';
    if (value <= 80) return 'mdi:battery-80';
    if (value <= 90) return 'mdi:battery-90';
    return 'mdi:battery';
  }

  private formatLocation(state: string) {
    switch (state) {
      case 'home':
        return 'Home';
      case 'not_home':
        return 'Away';
      case 'unknown':
        return 'Unknown';
      case 'unavailable':
        return 'Unavailable';
      default:
        return state;
    }
  }

  private getStatusClass(state: string) {
    switch (state) {
      case 'home':
        return 'is-home';
      case 'not_home':
        return 'is-away';
      case 'unknown':
      case 'unavailable':
        return 'is-unavailable';
      default:
        return 'is-zone';
    }
  }

  private formatLastChanged(value: string) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return undefined;

    return new Intl.DateTimeFormat(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: 'short',
    }).format(date);
  }
}

if (!customElements.get('dihor-person-card')) {
  customElements.define('dihor-person-card', PersonCard);
}

registerCustomCard({
  type: 'dihor-person-card',
  name: 'Dihor Person Card',
  preview: true,
  description: 'Displays Home Assistant person entity',
});
