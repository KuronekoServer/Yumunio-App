export class ServerUrlError extends Error {}

/** Accept only an origin. Login links, invite tokens and passwords must never be saved. */
export function normalizeServerUrl(input: string): string {
  const value = input.trim();
  if (!value || value.length > 2048 || /[\s\\\u0000-\u001f\u007f]/u.test(value)) {
    throw new ServerUrlError(
      'サーバーのURLを入力してください。空白やバックスラッシュは使えません。',
    );
  }
  let url: URL;
  try {
    url = new URL(value.includes('://') ? value : `https://${value}`);
  } catch {
    throw new ServerUrlError('URLの形式を確認してください。例: https://notes.example.com');
  }
  if (
    url.username ||
    url.password ||
    url.search ||
    url.hash ||
    url.pathname !== '/' ||
    /[?#]/u.test(value)
  ) {
    throw new ServerUrlError('ログインリンクではなく、サーバーのURLだけを入力してください。');
  }
  const loopback =
    url.hostname === 'localhost' ||
    url.hostname === '[::1]' ||
    /^127\.\d+\.\d+\.\d+$/u.test(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && loopback)) {
    throw new ServerUrlError(
      'HTTPSのURLを使用してください。HTTPはこの端末のlocalhostでのみ利用できます。',
    );
  }
  return url.origin;
}
