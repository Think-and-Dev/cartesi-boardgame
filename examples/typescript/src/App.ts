import { TicTacToe } from './Game';
import { Board } from './Board2';
import { Lobby } from '../../../src/lobby/vanillaLobby'; // Importar Lobby
import { ethers, BrowserProvider } from 'ethers';
import { renderLobby } from '../../../src/lobby/vanillaLobbyRender'; // Importar el renderizado del lobby
import { renderLoginForm } from '../../../src/lobby/vanillaLoginForm'; // Importar el renderizado del formulario de login
import { Client } from '../../../src/client/client'; // Importar el cliente

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
    clientFactory: Client,
    onUpdate: () => renderLobby(appElement, lobby), //
  };

  // Crear una instancia del lobby
  const lobby = new Lobby(lobbyConfig);
  console.log('lobby:', lobby);

  // Inicializa y renderiza el lobby
  await lobby.initialize();
  await lobby._updateConnection();

  if (lobby.state.phase === 'enter') {
    renderLoginForm(appElement, lobby);
  } else {
    renderLobby(appElement, lobby);
  }
}

main();
