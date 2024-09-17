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

const DAPP_ADDRESS = '0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e';
const SERVER = 'http://localhost:8000';
const NODE_URL = 'http://localhost:8080';

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

    return lobbyClient;
  } catch (error) {
    console.error('Error initializing LobbyClient in Lobby.ts:', error);
    return null;
  }
}

export async function listAvailableGames(
  lobbyClient: LobbyClient
): Promise<void> {
  try {
    const games: string[] = await lobbyClient.listGames();
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

    matchesListElement.innerHTML = '';

    matches.matches.forEach((match) => {
      const listItem = document.createElement('li');

      const isGameOver = match.gameover ? 'Finished' : 'In Progress';

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

export async function getMatchDetails(
  lobbyClient: LobbyClient,
  gameName: string,
  matchID: string
): Promise<void> {
  try {
    const match = await lobbyClient.getMatch(gameName, matchID);
  } catch (error) {
    console.error(`Error getting details for match ${matchID}:`, error);
  }
}

export async function createNewMatch(
  lobbyClient: LobbyClient,
  gameName: string,
  numPlayers: number
): Promise<string | null> {
  try {
    const match = await lobbyClient.createMatch(gameName, { numPlayers });

    return match.matchID;
  } catch (error) {
    return null;
  }
}

export async function joinMatch(
  lobbyClient: LobbyClient,
  gameName: string,
  matchID: string,
  playerName: string
): Promise<{ playerID: string; playerCredentials: string } | null> {
  try {
    const match = await lobbyClient.joinMatch(gameName, matchID, {
      playerName,
    });

    return {
      playerID: match.playerID,
      playerCredentials: match.playerCredentials,
    };
  } catch (error) {
    console.error(`Error joining match in Lobby.ts ${matchID}:`, error);
    return null;
  }
}

export async function updatePlayerInfo(
  lobbyClient: LobbyClient,
  gameName: string,
  matchID: string,
  playerID: string,
  credentials: string,
  newName?: string
): Promise<void> {
  try {
    await lobbyClient.updatePlayer(gameName, matchID, {
      playerID,
      credentials,
      newName,
    });
  } catch (error) {
    console.error(
      `Error updating player ${playerID} in match ${matchID}: in Lobby.ts`,
      error
    );
  }
}

export async function leaveMatch(
  lobbyClient: LobbyClient,
  gameName: string,
  matchID: string,
  playerID: string,
  credentials: string
): Promise<void> {
  try {
    await lobbyClient.leaveMatch(gameName, matchID, { playerID, credentials });
  } catch (error) {
    console.error(`Error leaving match ${matchID}: in Lobby.ts`, error);
  }
}

export async function playAgain(
  lobbyClient: LobbyClient,
  gameName: string,
  matchID: string,
  playerID: string,
  credentials: string
): Promise<string | null> {
  try {
    const match = await lobbyClient.playAgain(gameName, matchID, {
      playerID,
      credentials,
    });

    return match.nextMatchID;
  } catch (error) {
    console.error(
      `Error starting new match from match ${matchID}: in Lobby.ts`,
      error
    );
    return null;
  }
}
