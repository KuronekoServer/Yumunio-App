import { normalizeServerUrl } from './server-url';

export interface ServerProfile {
  origin: string;
  name: string;
  lastOpened: string;
}

export type Theme = 'system' | 'light' | 'dark';

interface Preferences {
  servers: ServerProfile[];
  theme: Theme;
}

const storageKey = 'yumunio.launcher.v1';
const defaults = (): Preferences => ({ servers: [], theme: 'system' });

/** This origin-local storage contains connection preferences, never login credentials. */
export function readPreferences(): Preferences {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(storageKey) ?? 'null');
    if (!saved || typeof saved !== 'object') return defaults();
    const data = saved as Partial<Preferences>;
    const servers: ServerProfile[] = [];
    for (const candidate of Array.isArray(data.servers) ? data.servers.slice(0, 20) : []) {
      try {
        const origin = normalizeServerUrl(candidate.origin);
        if (servers.some((server) => server.origin === origin)) continue;
        servers.push({
          origin,
          name:
            typeof candidate.name === 'string'
              ? candidate.name.slice(0, 80)
              : new URL(origin).hostname,
          lastOpened: typeof candidate.lastOpened === 'string' ? candidate.lastOpened : '',
        });
      } catch {
        /* Ignore a damaged profile while retaining the other saved servers. */
      }
    }
    return {
      servers,
      theme: ['system', 'light', 'dark'].includes(data.theme ?? '')
        ? (data.theme as Theme)
        : 'system',
    };
  } catch {
    return defaults();
  }
}

export function writePreferences(preferences: Preferences): boolean {
  try {
    localStorage.setItem(storageKey, JSON.stringify(preferences));
    return true;
  } catch {
    return false;
  }
}
