import { TicTacToe } from './Game';
import { TicTacToeClient } from './TicTacToeClient';
import { BrowserProvider } from 'ethers';
import { LobbyManager } from '../../../src/lobby/typescript'; // Importar LobbyManager

declare global {
  interface Window {
    ethereum?: any;
  }
}

const DAPP_ADDRESS = '0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e';
const SERVER = 'http://localhost:8000';
const NODE_URL = 'http://localhost:8080';

let playerName = '';
let playerID = '';

const gameComponents = [
  {
    game: TicTacToe,
  },
];

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

  // Formulario para ingresar el nombre del jugador
  const playerForm = document.createElement('form');
  const playerInput = document.createElement('input');
  playerInput.type = 'text';
  playerInput.placeholder = 'Enter your player name';
  const playerSubmit = document.createElement('button');
  playerSubmit.type = 'submit';
  playerSubmit.textContent = 'Enter Lobby';

  playerForm.appendChild(playerInput);
  playerForm.appendChild(playerSubmit);
  lobbyElement.appendChild(playerForm);

  playerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    playerName = playerInput.value;

    console.log('playerName', playerName);
    if (!playerName) {
      alert('Please enter a player name');
      return;
    }

    lobbyElement.innerHTML = '';

    // Instancia de LobbyManager
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();

    const lobbyManager = new LobbyManager({
      server: SERVER,
      nodeUrl: NODE_URL,
      dappAddress: DAPP_ADDRESS,
      signer: signer,
      gameComponents: gameComponents, // Pasar gameComponents correctamente
      playerName: playerName,
    });

    // Juegos disponibles
    const gameListElement = document.createElement('select');
    gameListElement.id = 'game-list';
    games.forEach((game) => {
      const gameOption = document.createElement('option');
      gameOption.value = game;
      gameOption.textContent = game;
      gameListElement.appendChild(gameOption);
    });
    lobbyElement.appendChild(gameListElement);

    // Partidas disponibles de tic tac toe
    const matchesListElement = document.createElement('ul');
    matchesListElement.id = 'match-list';
    lobbyElement.appendChild(matchesListElement);

    const refreshMatches = async () => {
      const gameName = gameListElement.value;
      const matches = await lobbyManager.listMatches(gameName);

      matchesListElement.innerHTML = '';

      matches.forEach((match) => {
        const listItem = document.createElement('li');

        listItem.textContent = `Match ID: ${match.matchID}`;
        matchesListElement.appendChild(listItem);

        // Botón para unirse a la partida
        const joinButton = document.createElement('button');
        joinButton.textContent = 'Join Match';
        joinButton.addEventListener('click', async () => {
          const playerSelectionMsg = document.createElement('p');
          playerSelectionMsg.textContent = 'Select your player ID:';

          const player0Button = document.createElement('button');
          player0Button.textContent = 'Player 0';
          player0Button.addEventListener('click', async () => {
            playerID = '0';
            console.log('playerID in App.ts', playerID);
            console.log('match.matchID in App.ts', match.matchID);
            console.log('gameName in App.ts', gameName);
            console.log('playerName in App.ts', playerName);

            // Unirse a la partida usando playerID y playerName
            await lobbyManager.joinMatch(
              gameName,
              match.matchID,
              playerName,
              playerID
            );
            initializeClient(playerID, match.matchID);
          });

          const player1Button = document.createElement('button');
          player1Button.textContent = 'Player 1';
          player1Button.addEventListener('click', async () => {
            playerID = '1';
            console.log('playerID in App.ts', playerID);
            console.log('match.matchID in App.ts', match.matchID);
            console.log('gameName in App.ts', gameName);
            console.log('playerName in App.ts', playerName);

            // Unirse a la partida usando playerID y playerName
            await lobbyManager.joinMatch(
              gameName,
              match.matchID,
              playerName,
              playerID
            );
            initializeClient(playerID, match.matchID);
          });

          lobbyElement!.appendChild(playerSelectionMsg);
          lobbyElement!.appendChild(player0Button);
          lobbyElement!.appendChild(player1Button);
        });
        listItem.appendChild(joinButton);
      });
    };

    await refreshMatches();

    // Botón para crear una nueva partida
    const createMatchButton = document.createElement('button');
    createMatchButton.textContent = 'Create New Game';
    createMatchButton.addEventListener('click', async () => {
      const gameName = gameListElement.value;
      const matchID = await lobbyManager.createMatch(gameName, 2);
      showPlayerSelection(matchID);
      await refreshMatches();
    });
    lobbyElement.appendChild(createMatchButton);
  });

  /**
   * Muestra la selección de playerID para unirse a una partida.
   * @param {string} matchID - El ID de la partida a la que se quiere unir o crear.
   */
  function showPlayerSelection(matchID: string) {
    // Crear los botones para elegir el playerID
    const playerSelectionMsg = document.createElement('p');
    playerSelectionMsg.textContent = 'Select your player ID:';

    const player0Button = document.createElement('button');
    player0Button.textContent = 'Player 0';
    player0Button.addEventListener('click', () => {
      playerID = '0';
      initializeClient(playerID, matchID);
    });

    const player1Button = document.createElement('button');
    player1Button.textContent = 'Player 1';
    player1Button.addEventListener('click', () => {
      playerID = '1';
      initializeClient(playerID, matchID);
    });

    const lobbyElement = document.getElementById('lobby');
    lobbyElement!.appendChild(playerSelectionMsg);
    lobbyElement!.appendChild(player0Button);
    lobbyElement!.appendChild(player1Button);
  }

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
  async function initializeClient(playerID: string, matchID: string) {
    // Crear una instancia de LobbyManager
    const provider = new BrowserProvider(window.ethereum);
    const signer = await provider.getSigner();
    if (appElement) {
      console.log('playerID in initializeClient:', playerID);
      console.log('matchID in initializeClient:', matchID);
      console.log('signer in initializeClient:', signer);
      console.log('playerName in initializeClient:', playerName);

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
