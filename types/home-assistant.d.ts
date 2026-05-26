export interface HomeAssistant {
  states: Record<string, {
    state: string;
    last_changed?: string;
    last_updated?: string;
    attributes: Record<string, any>;
  }>;
  themes?: {
    darkMode?: boolean;
  };
  callService(
    domain: string,
    service: string,
    serviceData?: Record<string, any>
  ): Promise<void>;
  callApi?<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    parameters?: Record<string, any>
  ): Promise<T>;
}

export interface LovelaceGridOptions {
  rows?: number;
  min_rows?: number;
  max_rows?: number;
  columns?: number | 'full';
  min_columns?: number;
  max_columns?: number;
}

export interface LovelaceCard {
  readonly card: HTMLElement;
  readonly hass: HomeAssistant;
  setConfig(config: any): void;
  getCardSize(): number;
  getGridOptions?(): LovelaceGridOptions;
}
