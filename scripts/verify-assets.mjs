import { readFile, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, sep } from 'node:path';

const strict = process.argv.includes('--strict');
const root = resolve('public/assets');
const manifestPath = resolve(root, 'asset-manifest.json');
let manifest;
try { manifest = JSON.parse(await readFile(manifestPath, 'utf8')); }
catch {
  if (strict) { console.error('Asset manifest missing. Install optional art archive under public/assets.'); process.exit(1); }
  console.info('Optional 3D asset archive not installed (2D and procedural 3D remain available).');
  process.exit(0);
}
if (!Array.isArray(manifest.files) || manifest.schemaVersion !== 1) {
  console.error('Unsupported asset manifest format.'); process.exit(1);
}
let bytes = 0, checked = 0, bad = 0;
const paths = new Set();
for (const entry of manifest.files) {
  if (typeof entry.output !== 'string' || typeof entry.sha256 !== 'string') {
    console.error('Invalid asset entry'); bad++; continue;
  }
  const candidate = resolve(root, entry.output);
  if (!candidate.startsWith(root + sep) || paths.has(entry.output)) {
    console.error('Unsafe/duplicate asset path:', entry.output); bad++; continue;
  }
  paths.add(entry.output);
  try {
    await access(candidate);
    const data = await readFile(candidate);
    const digest = createHash('sha256').update(data).digest('hex');
    if (digest !== entry.sha256 || data.length !== entry.bytes_prepared) {
      console.error('Asset mismatch:', entry.output); bad++; continue;
    }
    bytes += data.length; checked++;
  } catch {
    console.error('Missing asset:', entry.output); bad++;
  }
}
if (bad) {
  console.error('FAILED:', bad, 'invalid/missing assets of', manifest.files.length);
  process.exit(1);
}
console.log('Verified', checked, '3D/FBX/texture assets;', (bytes / 1048576).toFixed(2), 'MiB; SHA256 matched.');
