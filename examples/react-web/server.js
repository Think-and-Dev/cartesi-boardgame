import { Server, Sqlite } from '../../dist/cjs/server.js';
import TicTacToe from './src/tic-tac-toe/game.js';
import cors from '@koa/cors';

const database = new Sqlite();
async function main() {
  const server = Server({
    games: [TicTacToe],
    db: database,
    origins: ['http://localhost:1234', 'http://localhost:3000'],
  });

  server.run(8000);
}
main().catch(console.error);
