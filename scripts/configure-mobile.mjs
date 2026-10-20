import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const platform = process.argv[2];
if (platform === 'android') {
  const manifest = fileURLToPath(
    new URL('../src-tauri/gen/android/app/src/main/AndroidManifest.xml', import.meta.url),
  );
  let source = await readFile(manifest, 'utf8');
  // Keep the activity alive through rotation, folding and multi-window resizing.
  source = source.replace(/<activity\b[^>]*android:name="\.MainActivity"[^>]*>/u, (activity) => {
    let result = activity.replace(/\s+android:screenOrientation="[^"]*"/u, '');
    if (/android:resizeableActivity=/u.test(result)) {
      result = result.replace(
        /android:resizeableActivity="[^"]*"/u,
        'android:resizeableActivity="true"',
      );
    } else {
      result = result.replace(/>$/u, '\n            android:resizeableActivity="true">');
    }
    return result;
  });
  if (!source.includes('android:resizeableActivity="true"')) {
    throw new Error(
      'The generated Android activity was not found. Check the Tauri template before building.',
    );
  }
  await writeFile(manifest, source, 'utf8');
  process.stdout.write('Android: enabled resizable activities for tablets and foldable devices.\n');
} else if (platform === 'ios') {
  // Tauri merges Info.ios.plist, including iPad orientation and local-network purpose.
  process.stdout.write(
    'iOS: shared iPhone/iPad layout; platform settings are in src-tauri/Info.ios.plist.\n',
  );
} else {
  throw new Error('Usage: node scripts/configure-mobile.mjs android|ios');
}
