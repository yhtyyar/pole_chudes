import type { Plugin } from 'vite';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Vite dev-server plugin — handles POST /__write_game_log
 * Writes the received log text to <projectRoot>/game.log
 */
export function gameLogPlugin(): Plugin {
  return {
    name: 'game-log-writer',
    configureServer(server) {
      server.middlewares.use('/__write_game_log', (req, res) => {
        if (req.method !== 'POST') {
          res.statusCode = 405;
          res.end('Method Not Allowed');
          return;
        }

        const chunks: Buffer[] = [];
        req.on('data', (chunk: Buffer) => chunks.push(chunk));
        req.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf-8');
          const logPath = path.resolve(process.cwd(), 'game.log');
          try {
            fs.writeFileSync(logPath, text, 'utf-8');
            res.statusCode = 200;
            res.end('OK');
          } catch (err) {
            console.error('[game-log-plugin] Failed to write game.log:', err);
            res.statusCode = 500;
            res.end('Error');
          }
        });
      });
    },
  };
}
