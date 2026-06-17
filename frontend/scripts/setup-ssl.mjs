/**
 * One-time setup: install mkcert local CA + generate dev TLS certs.
 *
 * PC:  winget install FiloSottile.mkcert   (or choco install mkcert)
 * Then: pnpm ssl:setup
 *
 * Phone: open https://<your-ip>:5173/dev-root-ca.pem → install as trusted CA
 */
import { execSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const frontendRoot = path.resolve(__dirname, '..');
const certsDir = path.join(frontendRoot, 'certs');
const publicDir = path.join(frontendRoot, 'public');
const envPath = path.join(frontendRoot, '.env');

function log(msg) {
  console.log(`\n[say-it ssl] ${msg}`);
}

function run(cmd, args) {
  const result = spawnSync(cmd, args, { stdio: 'inherit' });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runShell(cmd) {
  const result = spawnSync(cmd, { stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function hasMkcert() {
  try {
    execSync('mkcert -version', { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

function readLanHostFromEnv() {
  if (!fs.existsSync(envPath)) return '';
  const line = fs.readFileSync(envPath, 'utf8')
    .split('\n')
    .find((l) => l.startsWith('VITE_DEV_LAN_HOST='));
  if (!line) return '';
  return line.split('=')[1]?.trim() ?? '';
}

function collectHosts() {
  const hosts = new Set(['localhost', '127.0.0.1', '::1']);
  const fromEnv = readLanHostFromEnv();
  if (fromEnv) hosts.add(fromEnv);

  for (const iface of Object.values(os.networkInterfaces())) {
    for (const cfg of iface ?? []) {
      if (cfg.family === 'IPv4' && !cfg.internal) {
        hosts.add(cfg.address);
      }
    }
  }

  return [...hosts];
}

if (!hasMkcert()) {
  log('mkcert is not installed.');
  log('Windows: winget install FiloSottile.mkcert');
  log('Then close/reopen terminal and run: pnpm ssl:setup');
  process.exit(1);
}

const hosts = collectHosts();
log(`Installing local CA (may ask for admin approval once)...`);
run('mkcert', ['-install']);

fs.mkdirSync(certsDir, { recursive: true });
const keyFile = path.join(certsDir, 'dev-key.pem');
const certFile = path.join(certsDir, 'dev.pem');

log(`Generating certificate for: ${hosts.join(', ')}`);
run('mkcert', ['-key-file', keyFile, '-cert-file', certFile, ...hosts]);

const caDir = execSync('mkcert -CAROOT', { encoding: 'utf8' }).trim();
const rootCa = path.join(caDir, 'rootCA.pem');
fs.mkdirSync(publicDir, { recursive: true });
const phoneCa = path.join(publicDir, 'dev-root-ca.pem');
fs.copyFileSync(rootCa, phoneCa);

log('Done!');
log('PC: restart pnpm dev → https://localhost:5173 (trusted, no warning)');
log(`Phone: open https://${hosts.find((h) => h.startsWith('192.168')) ?? '<your-ip>'}:5173/dev-root-ca.pem`);
log('       Install the certificate as a trusted CA, then open the app over https.');
