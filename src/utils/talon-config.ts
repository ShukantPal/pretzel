const TALON_GATEWAY_STORAGE_KEY = 'talonGatewayUrl';
const TALON_NAMESPACE_STORAGE_KEY = 'talonNamespace';
const TALON_AGENT_STORAGE_KEY = 'talonAgent';
const TALON_AUTH_STORAGE_KEY = 'talonAuthToken';
const DEFAULT_TALON_SESSION_ID = '019e57e5-2901-7643-b82b-79c8750eccde';

type TalonConfig = {
  gatewayUrl: string;
  namespace: string;
  agent: string;
  authToken: string | null;
  sessionId: string | null;
};

function readFromStorage(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return window.localStorage.getItem(key);
}

function readFromQuery(key: string): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  return new URLSearchParams(window.location.search).get(key);
}

function firstNonEmpty(...values: Array<string | null | undefined>): string | null {
  for (const value of values) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return null;
}

export function getInitialTalonConfig(): TalonConfig {
  const gatewayUrl = firstNonEmpty(
    readFromQuery('talonGatewayUrl'),
    readFromStorage(TALON_GATEWAY_STORAGE_KEY),
    import.meta.env.VITE_TALON_GATEWAY_URL,
    'https://talon.shukant.com',
  ) || 'https://talon.shukant.com';

  const namespace = firstNonEmpty(
    readFromQuery('talonNamespace'),
    readFromStorage(TALON_NAMESPACE_STORAGE_KEY),
    import.meta.env.VITE_TALON_NAMESPACE,
    'pretzel',
  ) || 'pretzel';

  const agent = firstNonEmpty(
    readFromQuery('talonAgent'),
    readFromStorage(TALON_AGENT_STORAGE_KEY),
    import.meta.env.VITE_TALON_AGENT,
    'dj',
  ) || 'dj';

  const authToken = firstNonEmpty(
    readFromQuery('talonAuthToken'),
    readFromStorage(TALON_AUTH_STORAGE_KEY),
    import.meta.env.VITE_TALON_AUTH_TOKEN,
  );

  return {
    gatewayUrl,
    namespace,
    agent,
    authToken,
    sessionId: DEFAULT_TALON_SESSION_ID,
  };
}

export function persistTalonConfig(config: Partial<TalonConfig>): void {
  if (typeof window === 'undefined') {
    return;
  }

  const entries: Array<[string, string | null | undefined]> = [
    [TALON_GATEWAY_STORAGE_KEY, config.gatewayUrl],
    [TALON_NAMESPACE_STORAGE_KEY, config.namespace],
    [TALON_AGENT_STORAGE_KEY, config.agent],
    [TALON_AUTH_STORAGE_KEY, config.authToken],
  ];

  for (const [key, value] of entries) {
    if (typeof value === 'string' && value.trim().length > 0) {
      window.localStorage.setItem(key, value);
    } else if (value === null) {
      window.localStorage.removeItem(key);
    }
  }
}
