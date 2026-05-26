import { spawn, type ChildProcess } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LAATSTE_TEST_ROOT = path.resolve(__dirname, "../../../laatste-test");
const PHP_HOST = "127.0.0.1";
const PHP_PORT = 8081;
export const LAATSTE_TEST_PHP_URL = `http://${PHP_HOST}:${PHP_PORT}`;

let php: ChildProcess | null = null;

function startPhpServer(): void {
  if (php) return;
  php = spawn("php", ["-S", `${PHP_HOST}:${PHP_PORT}`, "-t", LAATSTE_TEST_ROOT], {
    stdio: "inherit",
  });
  php.on("exit", () => {
    php = null;
  });
  php.on("error", (err) => {
    console.error("\n[laatste-test] Could not start PHP signaling server:", err.message);
    console.error(`Run manually: pnpm dev:laatste-test-signal\n`);
  });
}

function stopPhpServer(): void {
  php?.kill();
  php = null;
}

/** Storybook-only PHP server for laatste-test/signal.php + document.php */
export function laatsteTestPhpDevPlugin(): Plugin {
  return {
    name: "laatste-test-php-dev",
    configureServer(server) {
      startPhpServer();
      server.httpServer?.on("close", stopPhpServer);
    },
    buildEnd() {
      stopPhpServer();
    },
  };
}
