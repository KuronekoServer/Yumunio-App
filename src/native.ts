import { invoke, isTauri } from '@tauri-apps/api/core';

export interface ServerConnection {
  origin: string;
  applicationName: string;
  organizationName: string | null;
  runtime: 'node' | 'worker';
  setupRequired: boolean;
}

export const nativeAvailable = isTauri();

export async function probeServer(origin: string): Promise<ServerConnection> {
  if (!nativeAvailable) {
    throw new Error('ここは画面プレビューです。サーバーへの接続は Yumunio アプリから行えます。');
  }
  return invoke<ServerConnection>('probe_server', { origin });
}

export async function connectServer(origin: string): Promise<void> {
  return invoke('connect_server', { origin });
}
