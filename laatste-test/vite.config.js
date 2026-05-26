import { copyFileSync, existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { defineConfig } from 'vite';

const PHP_HOST = '127.0.0.1';
const PHP_PORT = 8081;
const PHP_URL = `http://${PHP_HOST}:${PHP_PORT}`;

/** @type {import('node:child_process').ChildProcess | null} */
let php = null;

function startPhpServer() {
  if (php) return;
  php = spawn('php', ['-S', `${PHP_HOST}:${PHP_PORT}`, '-t', process.cwd()], {
    stdio: 'inherit',
  });
  php.on('exit', () => { php = null; });
  php.on('error', (err) => {
    console.error('\nCould not start PHP:', err.message);
  });
}

function stopPhpServer() {
  php?.kill();
  php = null;
}

function copyPhpToDist() {
  for (const file of ['signal.php', 'document.php', 'document.md']) {
    if (existsSync(file)) {
      copyFileSync(file, `dist/${file}`);
    }
  }
}

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  plugins: [
    {
      name: 'php-dev',
      configureServer(server) {
        startPhpServer();
        server.httpServer?.on('close', stopPhpServer);
      },
      buildEnd() {
        stopPhpServer();
      },
      closeBundle() {
        copyPhpToDist();
      },
    },
  ],
  server: {
    proxy: {
      '/signal.php': { target: PHP_URL, changeOrigin: true },
      '/document.php': { target: PHP_URL, changeOrigin: true },
    },
  },
});
