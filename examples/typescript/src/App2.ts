// import { TicTacToe } from './Game';
// import { Board } from './Board2';
// import { Lobby } from '../../../src/lobby/vanillaLobby'; // Importar LobbyManager
// import { ethers, BrowserProvider } from 'ethers';

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

// async function main() {
//   console.log('sale App2.ts');

//   const appElement = document.getElementById('app');
//   if (!appElement) return;

//   // Inicializar la conexión con Ethereum (MetaMask, etc.)
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

//   const provider = new ethers.BrowserProvider(window.ethereum);
//   const signer = await provider.getSigner();

//   // Configuración del lobby
//   const lobbyConfig = {
//     gameComponents: importedGames,
//     lobbyServer: SERVER,
//     nodeUrl: NODE_URL,
//     dappAddress: DAPP_ADDRESS,
//     signer: signer,
//     onUpdate: () => renderLobby(appElement, lobby), //
//   };

//   console.log('onUpdate en App.ts:', lobbyConfig.onUpdate);

//   // Crear una instancia del lobby
//   const lobby = new Lobby(lobbyConfig);

//   // Inicializa y renderiza el lobby
//   await lobby.initialize();

//   // Llamar al método que renderiza el lobby
//   renderLobby(appElement, lobby);
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
//     if (this.onUpdate) {
//       console.log('Llamando a onUpdate después de crear y refrescar.');
//       this.onUpdate();
//     }
//   });

//   table.appendChild(tbody);
//   lobbyElement.appendChild(table);

//   // Agregar el lobby al DOM
//   appElement.appendChild(lobbyElement);
// }

// main();
