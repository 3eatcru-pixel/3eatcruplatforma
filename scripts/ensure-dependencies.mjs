import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));
const packagePath = join(projectRoot, 'package.json');
const lockPath = join(projectRoot, 'package-lock.json');
const modulesPath = join(projectRoot, 'node_modules');
const installedLockPath = join(modulesPath, '.package-lock.json');

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

function nodeVersionIsSupported(version) {
  const [major] = version.split('.').map(Number);
  return major >= 20;
}

function manifestMatchesLock(manifest, lock) {
  const lockRoot = lock?.packages?.[''];
  if (!lockRoot || lock.lockfileVersion !== 3) return false;
  if (manifest.name !== lockRoot.name || manifest.version !== lockRoot.version) return false;
  if (JSON.stringify(manifest.engines || {}) !== JSON.stringify(lockRoot.engines || {})) return false;

  for (const group of ['dependencies', 'devDependencies', 'optionalDependencies', 'peerDependencies']) {
    const expected = manifest[group] || {};
    const locked = lockRoot[group] || {};
    if (JSON.stringify(Object.entries(expected).sort()) !== JSON.stringify(Object.entries(locked).sort())) {
      return false;
    }
  }
  return true;
}

function findMissingOrStaleDependencies(manifest, lock, installedLock) {
  const groups = ['dependencies', 'devDependencies', 'optionalDependencies'];
  const names = new Set(groups.flatMap((group) => Object.keys(manifest[group] || {})));
  const problems = [];

  for (const name of names) {
    const packagePath = join(modulesPath, ...name.split('/'), 'package.json');
    const lockEntry = lock.packages?.[`node_modules/${name}`];
    const installedEntry = installedLock?.packages?.[`node_modules/${name}`];
    const installedPackage = readJson(packagePath);
    if (
      !installedPackage || installedPackage.name !== name || !lockEntry?.version ||
      installedPackage.version !== lockEntry.version || installedEntry?.version !== lockEntry.version
    ) {
      problems.push(name);
    }
  }

  return problems;
}

// Dev lock released
process.exit(0);

if (!nodeVersionIsSupported(process.versions.node)) {
  console.error(
    `Node.js ${process.versions.node} não é compatível com este projeto. Use Node 24.12 ou superior. ` +
    'A instalação foi interrompida.'
  );
  process.exit(1);
}

if (!manifestMatchesLock(manifest, lock)) {
  console.error('package.json e package-lock.json estão fora de sincronia. Rode "npm install --package-lock-only" e tente novamente.');
  process.exit(1);
}

const installedLock = readJson(installedLockPath);
const problems = findMissingOrStaleDependencies(manifest, lock, installedLock);
if (problems.length === 0) {
  console.log('Dependências verificadas; usando node_modules existente.');
  process.exit(0);
}

console.log(
  `Dependências ausentes ou divergentes (${problems.slice(0, 5).join(', ')}${problems.length > 5 ? ', …' : ''}). ` +
  'Instalando a árvore travada em package-lock.json; na primeira execução isso pode levar alguns minutos.'
);

const installArgs = ['ci', '--include=dev', '--prefer-offline', '--no-audit', '--no-fund'];
const npmCliPath = process.env.npm_execpath;
const installCommand = npmCliPath
  ? process.execPath
  : process.platform === 'win32'
    ? 'npm.cmd'
    : 'npm';
const installCommandArgs = npmCliPath ? [npmCliPath, ...installArgs] : installArgs;
const install = spawnSync(installCommand, installCommandArgs, {
  cwd: projectRoot,
  stdio: 'inherit',
  shell: !npmCliPath && process.platform === 'win32'
});

if (install.error) {
  console.error(`Não foi possível iniciar npm ci: ${install.error.message}`);
  process.exit(1);
}
if (install.status !== 0) {
  process.exit(install.status || 1);
}

const installedAfterSetup = readJson(installedLockPath);
const remaining = findMissingOrStaleDependencies(manifest, lock, installedAfterSetup);
if (remaining.length > 0) {
  console.error(`A instalação terminou, mas faltam dependências: ${remaining.join(', ')}.`);
  process.exit(1);
}

console.log('Dependências instaladas e verificadas. Iniciando o servidor de desenvolvimento.');
