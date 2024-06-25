import Server from '../../src/server';

async function main() {
  const server = Server.Server({
    games: [{}],
  });

  server.run(8000);
}
main();
