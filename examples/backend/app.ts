import { Server, Sqlite } from '@think-and-dev/cartesi-boardgame/server';
import { TicTacToe } from './Game';

const database = new Sqlite();

async function main() {
  // Configuración del servidor con lobby separado
  const server = Server({
    games: [TicTacToe],
    db: database,
    origins: ['http://localhost:1234'],
  });

  const GAME_PORT = 8000; // Puerto para el backend del juego
  const LOBBY_PORT = 9000; // Puerto para el lobby separado

  // Ejecutar el servidor con la configuración del Lobby
  server.run(
    {
      port: GAME_PORT, // Puerto para el backend del juego
      lobbyConfig: {
        apiPort: LOBBY_PORT, // Puerto para el lobby
        apiCallback: () =>
          console.log(`Lobby corriendo en http://localhost:${LOBBY_PORT}`),
      },
    },
    () => {
      console.log(
        `Backend del juego corriendo en http://localhost:${GAME_PORT}`
      );
    }
  );
}

main().catch(console.error);
