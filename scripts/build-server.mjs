import fs from 'fs';
import path from 'path';

const outFile = path.resolve(process.cwd(), 'server.cjs');

async function main() {
  try {
    const esbuild = await import('esbuild');
    await esbuild.build({
      entryPoints: [path.resolve(process.cwd(), 'server.ts')],
      bundle: true,
      platform: 'node',
      format: 'cjs',
      target: ['node18'],
      outfile: outFile,
      packages: 'external',
      logLevel: 'info',
    });
  } catch (err) {
    if (fs.existsSync(outFile)) {
      console.log('esbuild not available; keeping existing server.cjs');
      return;
    }
    throw err;
  }
}

main().catch((err) => {
  console.error('Failed to bundle server.cjs:', err);
  process.exit(1);
});
