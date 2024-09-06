import { TicTacToe } from './Game';
import { TicTacToeClient } from './TicTacToeClient';
import { BrowserProvider } from 'ethers';

import {
  initLobbyClient,
  listAvailableGames,
  listMatchesForGame,
  createNewMatch,
  joinMatch,
} from './Lobby';

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

async function main() {
  const importedGames = [TicTacToe];
  const games = importedGames.map((game) => game.name);

  const appElement = document.getElementById('app');
  const lobbyElement = document.createElement('div');
  lobbyElement.id = 'lobby';
  appElement?.appendChild(lobbyElement);

  if (!window.ethereum) {
    alert('Please install MetaMask to play this game');
    return;
  }

  try {
    await window.ethereum.request({ method: 'eth_requestAccounts' });
  } catch (error) {
    alert(
      'Failed to connect to MetaMask. Please ensure MetaMask is unlocked and try again.'
    );
    return;
  }

  const lobbyClient = await initLobbyClient(SERVER, NODE_URL, DAPP_ADDRESS);

  if (!lobbyClient) {
    return;
  }

  await listAvailableGames(lobbyClient);

  let matchesListElement = document.getElementById(
    'match-list'
  ) as HTMLUListElement;
  if (!matchesListElement) {
    matchesListElement = document.createElement('ul');
    matchesListElement.id = 'match-list';
    lobbyElement.appendChild(matchesListElement);
  }

  /**
   * Initializes an Ethereum provider using the browser's injected Ethereum object (e.g., MetaMask).
   *
   * @remarks
   * This code creates a new `BrowserProvider` instance using `window.ethereum`, which is typically injected by browser wallets such as MetaMask.
   * It then retrieves the current user's signer, which is a representation of the user's account and can be used to sign transactions or messages.
   *
   * @throws Will throw an error if `window.ethereum` is not available (e.g., MetaMask is not installed).
   */
  const provider = new BrowserProvider(window.ethereum);
  // Retrieves the signer, which is used to sign transactions on behalf of the user's account
  const signer = await provider.getSigner();
  let matchID = '';

  // Crear un menú desplegable para seleccionar el juego
  const gameListElement = document.createElement('select');
  gameListElement.id = 'game-list';
  games.forEach((game) => {
    const gameOption = document.createElement('option');
    gameOption.value = game;
    gameOption.textContent = game;
    gameListElement.appendChild(gameOption);
  });
  lobbyElement.appendChild(gameListElement);
  const gameName = gameListElement.value;

  await listMatchesForGame(lobbyClient, gameName, matchesListElement);

  const createMatchButton = document.createElement('button');
  createMatchButton.textContent = 'Create Game';
  createMatchButton.addEventListener('click', async () => {
    const gameName = gameListElement.value;
    matchID = await createNewMatch(lobbyClient, gameName, 2);
    if (!matchID) {
      alert('Failed to create match. Please try again.');
      return;
    }

    const matchCreatedMsg = document.createElement('p');
    matchCreatedMsg.textContent = `Game created with Match ID: ${matchID};`;
    lobbyElement.appendChild(matchCreatedMsg);

    const playerSelectionMsg = document.createElement('p');
    playerSelectionMsg.textContent = 'Select your player ID:';

    const player0Button = document.createElement('button');
    player0Button.textContent = 'Player 0';
    player0Button.addEventListener('click', () => {
      initializeClient('0', matchID);
    });

    const player1Button = document.createElement('button');
    player1Button.textContent = 'Player 1';
    player1Button.addEventListener('click', () => {
      initializeClient('1', matchID);
    });

    lobbyElement.appendChild(playerSelectionMsg);
    lobbyElement.appendChild(player0Button);
    lobbyElement.appendChild(player1Button);
  });
  lobbyElement.appendChild(createMatchButton);

  const joinMatchButton = document.createElement('button');
  joinMatchButton.textContent = 'Join Game';
  joinMatchButton.addEventListener('click', () => {
    matchID = prompt('Enter match ID:') || '';
    const playerSelectionMsg = document.createElement('p');
    playerSelectionMsg.textContent = 'Select your player ID:';

    const player0Button = document.createElement('button');
    player0Button.textContent = 'Player 0';
    player0Button.addEventListener('click', () => {
      initializeClient('0', matchID);
    });

    const player1Button = document.createElement('button');
    player1Button.textContent = 'Player 1';
    player1Button.addEventListener('click', () => {
      initializeClient('1', matchID);
    });

    lobbyElement.appendChild(playerSelectionMsg);
    lobbyElement.appendChild(player0Button);
    lobbyElement.appendChild(player1Button);
  });
  lobbyElement.appendChild(joinMatchButton);

  /**
   * Initializes the Tic-Tac-Toe client and renders the game in the specified application element.
   *
   * @param {string} playerID - The unique identifier of the player who is initializing the game client.
   * @param {string} matchID - The unique identifier of the match that the player is joining.
   *
   * @remarks
   * This function clears the current content of the application element (`appElement`) and then
   * creates a new instance of the `TicTacToeClient`, which starts the game for the given player and match.
   *
   * @throws Will silently fail if `appElement` is not defined.
   */
  function initializeClient(playerID: string, matchID: string) {
    if (appElement) {
      appElement.innerHTML = '';
      new TicTacToeClient(
        appElement as HTMLElement,
        signer,
        playerID,
        matchID,
        backToLobby
      );
    }
  }

  function backToLobby() {
    appElement!.innerHTML = '';
    main();
  }
}

main();
