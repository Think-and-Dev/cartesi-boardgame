import { Server, Sqlite } from '@think-and-dev/cartesi-boardgame/server';
import { TicTacToe } from './Game';

const database = new Sqlite();
async function main() {
  const server = Server({
    games: [TicTacToe],
    db: database,
    origins: ['http://localhost:1234'],
  });

  server.run(8000);
}
main().catch(console.error);
