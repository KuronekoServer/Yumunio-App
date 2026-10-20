import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const platform = process.argv[2];
const forwardedArguments = process.argv.slice(3);
if (!['android', 'ios'].includes(platform)) throw new Error('Expected android or ios.');
if (platform === 'ios' && process.platform !== 'darwin') {
  throw new Error('iPhone/iPad development requires macOS and Xcode.');
}

const cli = fileURLToPath(new URL('../node_modules/@tauri-apps/cli/tauri.js', import.meta.url));
const result = spawnSync(process.execPath, [cli, platform, 'init', ...forwardedArguments], {
  stdio: 'inherit',
  windowsHide: true,
});
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status ?? 1);
if (forwardedArguments.some((argument) => ['--help', '-h', '--version', '-V'].includes(argument)))
  process.exit(0);

// Run only after the platform project was generated successfully.
await import('./configure-mobile.mjs');
