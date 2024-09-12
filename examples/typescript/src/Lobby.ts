import { ethers } from 'ethers';
import { LobbyClient } from '@think-and-dev/cartesi-boardgame/client';

/**
 * Extends the global `Window` interface to optionally include the `ethereum` property.
 *
 * @remarks
 * This is useful in the context of dApp (decentralized application) development,
 * where `window.ethereum` is commonly injected by Ethereum-compatible browsers or extensions like MetaMask.
 * By declaring it in the global scope, TypeScript will recognize `window.ethereum` as a possible property,
 * preventing errors when checking for its existence.
 *
 * @interface Window
 * @property {any} [ethereum] - Optional Ethereum provider object injected by browser extensions like MetaMask.
 */
declare global {
  interface Window {
    ethereum?: any;
  }
}

/**
 * Represents the state of the game.
 *
 * @interface State
 *
 * @property {Object} G - The game-specific data.
 * @property {Array<string | null>} G.cells - An array representing the game board, where each cell can be a string (indicating the player's move) or `null` (empty).
 *
 * @property {Object} ctx - The game context provided by the game framework.
 * @property {string} ctx.currentPlayer - The ID of the current player whose turn it is.
 * @property {Object} [ctx.gameover] - Optional object that represents the game over state.
 * @property {string} [ctx.gameover.winner] - The ID of the player who won, if the game is over and there is a winner.
 *
 * @property {string} matchID - The unique identifier for the current game match.
 */
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

/**
 * Initializes a new instance of the LobbyClient for connecting to the blockchain game lobby.
 *
 * @param {string} SERVER - The server URL for the lobby connection.
 * @param {string} NODE_URL - The URL of the blockchain node to connect to.
 * @param {string} DAPP_ADDRESS - The address of the deployed dApp (Decentralized Application) smart contract.
 *
 * @returns {Promise<LobbyClient | null>} A promise that resolves to an instance of LobbyClient if successful, or `null` if an error occurs or MetaMask is not installed.
 *
 * @throws Will log an error if there is an issue initializing the LobbyClient.
 */
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

/**
 * Lists the available games from the lobby server.
 *
 * @param {LobbyClient} lobbyClient - An instance of LobbyClient used to interact with the lobby server.
 *
 * @returns {Promise<void>} A promise that resolves when the available games are retrieved.
 *
 * @throws Will log an error if there is an issue retrieving the list of games.
 */
export async function listAvailableGames(
  lobbyClient: LobbyClient
): Promise<void> {
  try {
    const games: string[] = await lobbyClient.listGames();
  } catch (error) {
    console.error('Error listing games in Lobby.ts:', error);
  }
}

/**
 * Lists the matches for a specific game and updates the provided HTML list element with match details.
 *
 * @param {LobbyClient} lobbyClient - An instance of LobbyClient used to interact with the lobby server.
 * @param {string}gameName - The name of the game for which to list matches.
 * @param {HTMLUListElement} matchesListElement - The HTML element (unordered list) where match details will be rendered.
 *
 * @returns {Promise<void>} A promise that resolves when the matches are successfully retrieved and displayed.
 *
 * @throws Will log an error if there is an issue retrieving the matches for the specified game.
 */
export async function listMatchesForGame(
  lobbyClient: LobbyClient,
  gameName: string,
  matchesListElement: HTMLUListElement
): Promise<void> {
  try {
    const matches = await lobbyClient.listMatches(gameName);

    // Limpiar el contenido existente
    matchesListElement.innerHTML = '';

    // Crear el título del juego
    const gameTitle = document.createElement('h4');
    gameTitle.textContent = `${gameName.toUpperCase()}`;
    matchesListElement.appendChild(gameTitle);

    // Agregar partidas a la lista
    matches.matches.forEach((match) => {
      const listItem = document.createElement('li');
      listItem.textContent = `Match ID: ${match.matchID}, Status: ${
        match.gameover ? 'Finished' : 'In Progress'
      }, Winner: ${match.gameover?.winner ?? 'N/A'}`;

      // Agregar la clase CSS para las partidas
      listItem.classList.add('match-item');
      matchesListElement.appendChild(listItem);
    });
  } catch (error) {
    console.error(`Error listing matches for ${gameName}:`, error);
  }
}

/**
 * Retrieves the details of a specific match by its match ID and game name.
 *
 * @param {LobbyClient} lobbyClient - An instance of LobbyClient used to interact with the lobby server.
 * @param {string} gameName - The name of the game for which to retrieve the match details.
 * @param {string} matchID - The unique identifier of the match whose details are being requested.
 *
 * @returns {Promise<void>} A promise that resolves when the match details are successfully retrieved.
 *
 * @throws Will log an error if there is an issue retrieving the match details.
 */

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

/**
 * Creates a new match for a specified game with the given number of players.
 *
 * @param {LobbyClient} lobbyClient - An instance of LobbyClient used to interact with the lobby server.
 * @param {string} gameName- The name of the game for which to create a new match.
 * @param {number} numPlayers - The number of players that will participate in the match.
 *
 * @returns {Promise<string | null>} A promise that resolves to the new match's ID if successful, or `null` if an error occurs.
 *
 * @throws Will return `null` if there is an error creating the match.
 */

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

/**
 * Joins an existing match for a specific game, assigning the player to the match with the given player name.
 *
 * @param {LobbyClient} lobbyClient - An instance of LobbyClient used to interact with the lobby server.
 * @param {string} gameName - The name of the game for which to join a match.
 * @param {string} matchID - The unique identifier of the match to join.
 * @param {string} playerName - The name of the player joining the match.
 *
 * @returns {Promise<{ playerID: string; playerCredentials: string } | null>}
 * A promise that resolves to an object containing the player's ID and credentials if the join is successful, or `null` if an error occurs.
 *
 * @throws Will log an error and return `null` if there is an issue joining the match.
 */

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

/**
 * Updates the player information in an existing match.
 *
 * @param {LobbyClient} lobbyClient - An instance of LobbyClient used to interact with the lobby server.
 * @param {string} gameName - The name of the game for which the player is being updated.
 * @param {string} matchID - The unique identifier of the match where the player is participating.
 * @param {string} playerID - The unique identifier of the player whose information is being updated.
 * @param {string} credentials - The player's credentials, used to authenticate the update request.
 * @param {string} [newName] - An optional parameter to update the player's name.
 *
 * @returns {Promise<void>} A promise that resolves when the player information is successfully updated.
 *
 * @throws Will log an error if there is an issue updating the player's information.
 */

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

/**
 * Allows a player to leave an existing match.
 *
 * @param {LobbyClient} lobbyClient - An instance of LobbyClient used to interact with the lobby server.
 * @param {string} gameName- The name of the game from which the player is leaving the match.
 * @param {string} matchID - The unique identifier of the match the player wants to leave.
 * @param {string} playerID - The unique identifier of the player who is leaving the match.
 * @param {string} credentials - The player's credentials, used to authenticate the request to leave the match.
 *
 * @returns {Promise<void>} A promise that resolves when the player successfully leaves the match.
 *
 * @throws Will log an error if there is an issue leaving the match.
 */

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

/**
 * Allows a player to start a new match from an existing one, commonly referred to as "play again."
 *
 * @param {LobbyClient} lobbyClient - An instance of LobbyClient used to interact with the lobby server.
 * @param {string} gameNamee- The name of the game for which a new match is being created.
 * @param {string} matchID - The unique identifier of the current match from which the player wants to start a new match.
 * @param {string} playerID - The unique identifier of the player who is starting the new match.
 * @param {string} credentials - The player's credentials, used to authenticate the request to start a new match.
 *
 * @returns {Promise<string | null>} A promise that resolves to the new match's ID if successful, or `null` if an error occurs.
 *
 * @throws Will log an error if there is an issue starting the new match.
 */

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
