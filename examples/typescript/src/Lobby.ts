import { ethers } from 'ethers';
import { LobbyClient } from '@think-and-dev/cartesi-boardgame/client';

declare global {
  interface Window {
    ethereum?: any;
  }
}

interface State {
  G: {
    cells: Array<string | null>;
  };
  ctx: {
    gameover?: {
      winner?: string;
    };
    currentPlayer: string;
  };
  matchID: string;
}

// Constantes para la dirección del servidor y del contrato dApp
const DAPP_ADDRESS = '0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e';
const SERVER = 'http://localhost:8000';
const NODE_URL = 'http://localhost:8080';

// Función para inicializar la instancia de LobbyClient
export async function initLobbyClient(
  SERVER,
  NODE_URL,
  DAPP_ADDRESS
): Promise<LobbyClient | null> {
  if (!window.ethereum) {
    console.error('MetaMask is not installed.');
    return null;
  }

  try {
    const provider = new ethers.BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const lobbyClient = new LobbyClient({
      server: SERVER,
      nodeUrl: NODE_URL,
      dappAddress: DAPP_ADDRESS,
      signer: signer,
    });

    console.log('LobbyClient successfully initialized in Lobby.ts.');
    return lobbyClient;
  } catch (error) {
    console.error('Error initializing LobbyClient in Lobby.ts:', error);
    return null;
  }
}

// Función para listar los juegos disponibles
export async function listAvailableGames(
  lobbyClient: LobbyClient
): Promise<void> {
  console.log('Listing available games... in Lobby.ts'); //* ACA rompe 'Eror: Wrong inspect response format.'
  try {
    const games: string[] = await lobbyClient.listGames();
    console.log('Available games in Lobby.ts:', games);
  } catch (error) {
    console.error('Error listing games in Lobby.ts:', error);
  }
}

export async function listMatchesForGame(
  lobbyClient: LobbyClient,
  gameName: string,
  matchesListElement: HTMLUListElement
): Promise<void> {
  try {
    const matches = await lobbyClient.listMatches(gameName);
    console.log(`Available matches for in Lobby.ts ${gameName}:`, matches);

    // Limpiar la lista existente
    matchesListElement.innerHTML = '';

    // Iterar sobre las partidas y crear elementos de lista
    matches.matches.forEach((match) => {
      const listItem = document.createElement('li');

      // Determina si el partido está en progreso o finalizado
      const isGameOver = match.gameover ? 'Finished' : 'In Progress';

      // Determina quién ganó si la partida ha terminado
      const winner = match.gameover?.winner ?? 'N/A';

      listItem.textContent = `Match ID: ${
        match.matchID
      }, Created At: ${new Date(
        match.createdAt
      ).toLocaleString()}, Status: ${isGameOver}, Winner: ${winner}`;

      matchesListElement.appendChild(listItem);
    });
  } catch (error) {
    console.error(`Error listing matches for ${gameName}:`, error);
  }
}

// Función para obtener los detalles de una partida específica
export async function getMatchDetails(
  lobbyClient: LobbyClient,
  gameName: string,
  matchID: string
): Promise<void> {
  console.log(`Getting details for match ID in Lobby.ts: ${matchID}`);
  try {
    const match = await lobbyClient.getMatch(gameName, matchID);
    console.log(`Details for match in Lobby.ts ${matchID}:`, match);
  } catch (error) {
    console.error(`Error getting details for match ${matchID}:`, error);
  }
}

// Función para crear una nueva partida
export async function createNewMatch(
  lobbyClient: LobbyClient,
  gameName: string,
  numPlayers: number
): Promise<string | null> {
  console.log(
    `Creating a new match for game: ${gameName} with ${numPlayers} players  in Lobby.ts`
  );
  try {
    const match = await lobbyClient.createMatch(gameName, { numPlayers });
    console.log(`New match created with ID in Lobby.ts: ${match.matchID}`);
    return match.matchID;
  } catch (error) {
    console.error('Error creating new match in Lobby.ts:', error);
    return null;
  }
}

// Función para unirse a una partida
export async function joinMatch(
  lobbyClient: LobbyClient,
  gameName: string,
  matchID: string,
  playerName: string
): Promise<{ playerID: string; playerCredentials: string } | null> {
  console.log(
    `Joining match ${matchID} for game: ${gameName} as player: ${playerName} in Lobby.ts`
  );
  try {
    const match = await lobbyClient.joinMatch(gameName, matchID, {
      playerName,
    });
    console.log(
      `Player ${playerName} joined match ${matchID} as player ${match.playerID}. Credentials: ${match.playerCredentials} in Lobby.ts`
    );
    return {
      playerID: match.playerID,
      playerCredentials: match.playerCredentials,
    };
  } catch (error) {
    console.error(`Error joining match in Lobby.ts ${matchID}:`, error);
    return null;
  }
}

// Función para actualizar la información del jugador
export async function updatePlayerInfo(
  lobbyClient: LobbyClient,
  gameName: string,
  matchID: string,
  playerID: string,
  credentials: string,
  newName?: string
): Promise<void> {
  console.log(
    `Updating player ${playerID} info in match ${matchID} in Lobby.ts`
  );
  try {
    await lobbyClient.updatePlayer(gameName, matchID, {
      playerID,
      credentials,
      newName,
    });
    console.log(
      `Player ${playerID} in match ${matchID} updated their name to ${newName}. in Lobby.ts`
    );
  } catch (error) {
    console.error(
      `Error updating player ${playerID} in match ${matchID}: in Lobby.ts`,
      error
    );
  }
}

// Función para abandonar una partida
export async function leaveMatch(
  lobbyClient: LobbyClient,
  gameName: string,
  matchID: string,
  playerID: string,
  credentials: string
): Promise<void> {
  console.log(`Player ${playerID} leaving match ${matchID} in Lobby.ts`);
  try {
    await lobbyClient.leaveMatch(gameName, matchID, { playerID, credentials });
    console.log(`Player ${playerID} left match ${matchID}. in Lobby.ts`);
  } catch (error) {
    console.error(`Error leaving match ${matchID}: in Lobby.ts`, error);
  }
}

// Función para jugar de nuevo
export async function playAgain(
  lobbyClient: LobbyClient,
  gameName: string,
  matchID: string,
  playerID: string,
  credentials: string
): Promise<string | null> {
  console.log(
    `Player ${playerID} playing again from match ${matchID} in Lobby.ts`
  );
  try {
    const match = await lobbyClient.playAgain(gameName, matchID, {
      playerID,
      credentials,
    });
    console.log(
      `Player ${playerID} can play again in new match ${match.nextMatchID}. in Lobby.ts`
    );
    return match.nextMatchID;
  } catch (error) {
    console.error(
      `Error starting new match from match ${matchID}: in Lobby.ts`,
      error
    );
    return null;
  }
}
