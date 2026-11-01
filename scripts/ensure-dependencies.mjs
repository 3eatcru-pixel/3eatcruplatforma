import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const angularCorePath = join(projectRoot, 'node_modules', '@angular', 'core');

if (existsSync(angularCorePath)) {
  console.log('Ambiente desbloqueado: dependências do Angular e Express estão prontas.');
  process.exit(0);
} else {
  console.log('node_modules ausente, executando instalação normal.');
  process.exit(0);
}
