/**
 * Production Cloud Run Entrypoint Proxy
 * Boots the Express app exported by dist/app/server/server.mjs on 0.0.0.0:${PORT || 3000}.
 * If the dist bundle is not yet built, it automatically compiles it before startup.
 */
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');
const distServerPath = join(projectRoot, 'dist/app/server/server.mjs');

if (!existsSync(distServerPath)) {
  console.log('Production build not found. Compiling Angular SSR bundle before start...');
  execSync('npm run build', { stdio: 'inherit', cwd: projectRoot });
}

const { app } = await import('../dist/app/server/server.mjs');

const port = Number(process.env.PORT || 3000);
app.listen(port, '0.0.0.0', () => {
  console.log(`Node Express server listening on http://0.0.0.0:${port}`);
});
