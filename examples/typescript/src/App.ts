import { TicTacToe } from './Game';
import { Board } from './Board2';
import { Lobby } from '../../../src/lobby/typescriptLobby'; // Importar Lobby
import { ethers, BrowserProvider } from 'ethers';
import { renderLobby } from '../../../src/lobby/lobbyRender'; // Importar el renderizado del lobby
import { renderLoginForm } from '../../../src/lobby/loginFormRenderer'; // Importar el renderizado del formulario de login

declare global {
  interface Window {
    ethereum?: any;
  }
}

TicTacToe.minPlayers = 1;
TicTacToe.maxPlayers = 2;

const DAPP_ADDRESS = '0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e';
const SERVER = 'http://localhost:8000';
const NODE_URL = 'http://localhost:8080';

interface GameComponent {
  game: typeof TicTacToe;
  board: typeof Board;
}

const importedGames: GameComponent[] = [{ game: TicTacToe, board: Board }];

// Función principal
async function main() {
  const appElement = document.getElementById('app');
  if (!appElement) return;

  // Inicializar la conexión con Ethereum (MetaMask, etc.)
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

  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();

  // Configuración del lobby
  const lobbyConfig = {
    gameComponents: importedGames,
    lobbyServer: SERVER,
    nodeUrl: NODE_URL,
    dappAddress: DAPP_ADDRESS,
    signer: signer,
  };

  // Crear una instancia del lobby
  const lobby = new Lobby(lobbyConfig);

  // Inicializa y renderiza el lobby
  await lobby.initialize();
  await lobby._updateConnection();

  // Verificar el estado del lobby y mostrar el login o la lista de partidas
  if (lobby.state.phase === 'enter') {
    renderLoginForm(appElement, lobby);
  } else {
    renderLobby(appElement, lobby);
  }
}

// // Función para renderizar el formulario de login
// function renderLoginForm(appElement: HTMLElement, lobby: Lobby) {
//   // Limpiar el contenido previo
//   appElement.innerHTML = '';

//   // Crear los elementos del formulario de login
//   const loginContainer = document.createElement('div');

//   const phaseTitle = document.createElement('p');
//   phaseTitle.className = 'phase-title';
//   phaseTitle.textContent = 'Choose a player name:';
//   loginContainer.appendChild(phaseTitle);

//   const playerNameInput = document.createElement('input');
//   playerNameInput.type = 'text';
//   playerNameInput.value = lobby.state.playerName || ''; // Obtener el nombre del estado actual del lobby
//   loginContainer.appendChild(playerNameInput);

//   const errorMsg = document.createElement('span');
//   errorMsg.className = 'error-msg';
//   loginContainer.appendChild(errorMsg);

//   const enterButton = document.createElement('button');
//   enterButton.className = 'buttons';
//   enterButton.textContent = 'Enter';
//   loginContainer.appendChild(enterButton);

//   // Añadir comportamiento al botón y entrada
//   enterButton.addEventListener('click', () => {
//     const playerName = playerNameInput.value.trim();
//     if (playerName === '') {
//       errorMsg.textContent = 'empty player name';
//       return;
//     }
//     errorMsg.textContent = '';
//     console.log('playerName in App.ts:', playerName);

//     lobby.enterLobby(playerName); // Cambiar la fase en el lobby
//     renderLobby(appElement, lobby); // Renderizar el lobby
//   });

//   playerNameInput.addEventListener('keypress', (event) => {
//     if (event.key === 'Enter') {
//       enterButton.click();
//     }
//   });

//   appElement.appendChild(loginContainer);
// }

// // Función para renderizar el lobby
// function renderLobby(appElement: HTMLElement, lobby: Lobby) {
//   // Limpiar el contenido previo
//   appElement.innerHTML = '';

//   // Crear los elementos del lobby
//   const lobbyElement = document.createElement('div');
//   const welcomeText = document.createElement('p');
//   welcomeText.textContent = `Welcome, ${lobby.state.playerName}`;
//   lobbyElement.appendChild(welcomeText);

//   // Tabla para las partidas
//   const table = document.createElement('table');
//   const tbody = document.createElement('tbody');

//   // Renderizar las partidas disponibles
//   lobby.connection?.matches.forEach((match) => {
//     const row = document.createElement('tr');
//     const cell = document.createElement('td');
//     cell.textContent = `Match ID: ${match.matchID}`;
//     row.appendChild(cell);
//     tbody.appendChild(row);
//   });

//   table.appendChild(tbody);
//   lobbyElement.appendChild(table);

//   // Agregar el lobby al DOM
//   appElement.appendChild(lobbyElement);
// }

main();

///!! VERSION ANTERIOR
// import { TicTacToe } from './Game';
// import { Board } from './Board2';
// import { BrowserProvider } from 'ethers';
// import { LobbyManager } from '../../../src/lobby/typescript'; // Importar LobbyManager

// declare global {
//   interface Window {
//     ethereum?: any;
//   }
// }

// TicTacToe.minPlayers = 1;
// TicTacToe.maxPlayers = 2;

// const DAPP_ADDRESS = '0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e';
// const SERVER = 'http://localhost:8000';
// const NODE_URL = 'http://localhost:8080';

// interface GameComponent {
//   game: typeof TicTacToe;
//   board: typeof Board;
// }

// const importedGames: GameComponent[] = [{ game: TicTacToe, board: Board }];

// //* A Revisar si debe seguir aca
// let playerName = '';
// let playerID = '';

// async function main() {
//   console.log('Imported games:', importedGames);

//   const games = importedGames.map((game) => game.game.name);
//   console.log('games:', games);

//   const appElement = document.getElementById('app');
//   const lobbyElement = document.createElement('div');
//   lobbyElement.id = 'lobby';
//   appElement?.appendChild(lobbyElement);

//   if (!window.ethereum) {
//     alert('Please install MetaMask to play this game');
//     return;
//   }

//   try {
//     await window.ethereum.request({ method: 'eth_requestAccounts' });
//   } catch (error) {
//     alert(
//       'Failed to connect to MetaMask. Please ensure MetaMask is unlocked and try again.'
//     );
//     return;
//   }

//   // Formulario para ingresar el nombre del jugador
//   const playerForm = document.createElement('form');
//   const playerInput = document.createElement('input');
//   playerInput.type = 'text';
//   playerInput.placeholder = 'Enter your player name';
//   const playerSubmit = document.createElement('button');
//   playerSubmit.type = 'submit';
//   playerSubmit.textContent = 'Enter Lobby';

//   playerForm.appendChild(playerInput);
//   playerForm.appendChild(playerSubmit);
//   lobbyElement.appendChild(playerForm);

//   playerForm.addEventListener('submit', async (event) => {
//     event.preventDefault();
//     playerName = playerInput.value;

//     console.log('playerName', playerName);
//     if (!playerName) {
//       alert('Please enter a player name');
//       return;
//     }

//     lobbyElement.innerHTML = '';

//     // Instancia de LobbyManager
//     const provider = new BrowserProvider(window.ethereum);
//     const signer = await provider.getSigner();

//     const lobbyManager = new LobbyManager({
//       server: SERVER,
//       nodeUrl: NODE_URL,
//       dappAddress: DAPP_ADDRESS,
//       signer: signer,
//       gameComponents: importedGames, // Pasar gameComponents correctamente
//       playerName: playerName,
//     });

//     // Juegos disponibles
//     const gameListElement = document.createElement('select');
//     gameListElement.id = 'game-list';
//     games.forEach((game) => {
//       const gameOption = document.createElement('option');
//       gameOption.value = game;
//       gameOption.textContent = game;
//       gameListElement.appendChild(gameOption);
//     });
//     lobbyElement.appendChild(gameListElement);

//     // Partidas disponibles de tic tac toe
//     const matchesListElement = document.createElement('ul');
//     matchesListElement.id = 'match-list';
//     lobbyElement.appendChild(matchesListElement);

//     const refreshMatches = async () => {
//       console.log('gameListElement.value in App.ts', gameListElement.value);

//       const gameName = gameListElement.value;
//       console.log('gameName in App.ts', gameName);

//       const games = await lobbyManager.listGames();
//       console.log('games in App.ts', games);

//       const matches = await lobbyManager.listMatches(gameName);
//       console.log('matches in App.ts', matches);

//       matchesListElement.innerHTML = '';

//       matches.forEach((match) => {
//         const listItem = document.createElement('li');

//         listItem.textContent = `Match ID: ${match.matchID}`;
//         matchesListElement.appendChild(listItem);

//         // Botón para unirse a la partida
//         const joinButton = document.createElement('button');
//         joinButton.textContent = 'Join Match';
//         joinButton.addEventListener('click', async () => {
//           const playerSelectionMsg = document.createElement('p');
//           playerSelectionMsg.textContent = 'Select your player ID:';

//           const player0Button = document.createElement('button');
//           player0Button.textContent = 'Player 0';
//           player0Button.addEventListener('click', async () => {
//             playerID = '0';
//             console.log('playerID in App.ts', playerID);
//             console.log('match.matchID in App.ts', match.matchID);
//             console.log('gameName in App.ts', gameName);
//             console.log('playerName in App.ts', playerName);

//             // Unirse a la partida usando playerID y playerName
//             await lobbyManager.joinMatch(
//               gameName,
//               match.matchID,
//               playerName,
//               playerID
//             );
//             initializeClient(playerID, match.matchID);
//           });

//           const player1Button = document.createElement('button');
//           player1Button.textContent = 'Player 1';
//           player1Button.addEventListener('click', async () => {
//             playerID = '1';
//             console.log('playerID in App.ts', playerID);
//             console.log('match.matchID in App.ts', match.matchID);
//             console.log('gameName in App.ts', gameName);
//             console.log('playerName in App.ts', playerName);

//             // Unirse a la partida usando playerID y playerName
//             await lobbyManager.joinMatch(
//               gameName,
//               match.matchID,
//               playerName,
//               playerID
//             );
//             initializeClient(playerID, match.matchID);
//           });

//           lobbyElement!.appendChild(playerSelectionMsg);
//           lobbyElement!.appendChild(player0Button);
//           lobbyElement!.appendChild(player1Button);
//         });
//         listItem.appendChild(joinButton);
//       });
//     };

//     await refreshMatches();

//     // Botón para crear una nueva partida
//     const createMatchButton = document.createElement('button');
//     createMatchButton.textContent = 'Create New Game';
//     createMatchButton.addEventListener('click', async () => {
//       const gameName = gameListElement.value;
//       const matchID = await lobbyManager.createMatch(gameName, 2);
//       await refreshMatches();
//     });
//     lobbyElement.appendChild(createMatchButton);
//   });

//   async function initializeClient(playerID: string, matchID: string) {
//     // Crear una instancia de LobbyManager
//     const provider = new BrowserProvider(window.ethereum);
//     const signer = await provider.getSigner();
//     if (appElement) {
//       console.log('playerID in initializeClient:', playerID);
//       console.log('matchID in initializeClient:', matchID);
//       console.log('signer in initializeClient:', signer);
//       console.log('playerName in initializeClient:', playerName);

//       appElement.innerHTML = '';
//       new Board(
//         appElement as HTMLElement,
//         signer,
//         playerID,
//         matchID,
//         backToLobby
//       );
//     }
//   }

//   function backToLobby() {
//     appElement!.innerHTML = '';
//     main();
//   }
// }

// main();
