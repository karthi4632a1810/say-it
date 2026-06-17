import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import mkcert from 'vite-plugin-mkcert';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendTarget = 'http://localhost:3000';

const apiProxy = {
  target: backendTarget,
  changeOrigin: true,
};

const certKey = path.join(__dirname, 'certs', 'dev-key.pem');
const certFile = path.join(__dirname, 'certs', 'dev.pem');
const hasFileCerts = fs.existsSync(certKey) && fs.existsSync(certFile);

function collectSslHosts(extraHost?: string): string[] {
  const hosts = new Set(['localhost', '127.0.0.1', '::1']);
  if (extraHost) hosts.add(extraHost);

  for (const iface of Object.values(os.networkInterfaces())) {
    for (const cfg of iface ?? []) {
      if (cfg.family === 'IPv4' && !cfg.internal) {
        hosts.add(cfg.address);
      }
    }
  }

  return [...hosts];
}

/** Trusted local HTTPS via mkcert (mic/voice on phone over WiFi). */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const sslHosts = collectSslHosts(env.VITE_DEV_LAN_HOST?.trim());

  return {
    plugins: [
      react(),
      ...(hasFileCerts ? [] : [mkcert({ hosts: sslHosts })]),
    ],
    optimizeDeps: {
      exclude: ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
    },
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
      host: true,
      port: 5173,
      https: hasFileCerts
        ? {
            key: fs.readFileSync(certKey),
            cert: fs.readFileSync(certFile),
          }
        : true,
      proxy: {
        '/socket.io': {
          target: backendTarget,
          ws: true,
          changeOrigin: true,
          configure: (proxy) => {
            proxy.on('error', (_err, _req, res) => {
              if (res && 'writeHead' in res && !res.headersSent) {
                res.writeHead(503, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Backend starting…' }));
              }
            });
          },
        },
        '/auth': apiProxy,
        '/users': apiProxy,
        '/departments': apiProxy,
        '/conversations': apiProxy,
        '/messages': apiProxy,
        '/channels': apiProxy,
        '/files': apiProxy,
        '/meetings': apiProxy,
        '/notifications': apiProxy,
        '/announcements': apiProxy,
        '/ai': apiProxy,
        '/calls': apiProxy,
        '/health': apiProxy,
      },
    },
  };
});
