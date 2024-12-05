import { Server, Sqlite } from '@think-and-dev/cartesi-boardgame/server';
import { TicTacToe } from './Game';
import cors from '@koa/cors';

const database = new Sqlite();
async function main() {
  const server = Server({
    games: [TicTacToe],
    db: database,
    origins: ['http://localhost:1234', 'http://localhost:3000'],
  });

  server.app.use(
    cors({
      origin: '*',
      allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    })
  );

  server.run(8000);
}
main().catch(console.error);
