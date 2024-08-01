import { TicTacToe } from './Game';
import { CartesiMultiplayer } from '@think-and-dev/cartesi-boardgame/multiplayer';
import { ethers, BrowserProvider } from 'ethers';
import {
  Client,
  LobbyClient,
  LobbyConnection,
} from '@think-and-dev/cartesi-boardgame/client';

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

// Declarar las variables comunes fuera de las funciones
const DAPP_ADDRESS = '0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e';
const SERVER = 'http://localhost:8000'; // o es 5004 de rollup?
const NODE_URL = 'http://localhost:8080'; // URL del nodo

class TicTacToeClient {
  private client: any;
  private rootElement: HTMLElement;
  private matchID: string;

  constructor(
    rootElement: HTMLElement,
    signer: ethers.Signer,
    playerID: string = '0',
    matchID: string,
    backToLobbyCallback: () => void
  ) {
    this.rootElement = rootElement;
    this.matchID = matchID;
    this.client = Client({
      game: TicTacToe,
      playerID,
      matchID,
      setupData: { matchID },
      multiplayer: CartesiMultiplayer({
        server: SERVER,
        dappAddress: DAPP_ADDRESS,
        nodeUrl: NODE_URL,
        signer: signer,
      }),
    });
    this.client.subscribe((state: State) => this.update(state));
    this.client.start();
    this.createBoard();
    this.attachListeners();

    //* "Back to Lobby"

    const backButton = document.createElement('button');
    backButton.textContent = 'Back to Lobby';
    backButton.addEventListener('click', () => {
      this.client.stop();
      backToLobbyCallback();
    });
    this.rootElement.appendChild(backButton);
  }

  private createBoard() {
    const rows: string[] = [];
    for (let i = 0; i < 3; i++) {
      const cells: string[] = [];
      for (let j = 0; j < 3; j++) {
        const id = 3 * i + j;
        cells.push(`<td class="cell" data-id="${id}"></td>`);
      }
      rows.push(`<tr>${cells.join('')}</tr>`);
    }

    this.rootElement.innerHTML = `
      <table>${rows.join('')}</table>
      <p class="winner"></p>
      <p class="current-player"></p>
      <p class="match-id"></p>
    `;
  }

  private attachListeners() {
    const handleCellClick = (event: Event) => {
      const target = event.target as HTMLElement;
      const id = parseInt(target.dataset.id!);
      this.client.moves.clickCell(id);
    };

    const cells = this.rootElement.querySelectorAll('.cell');
    cells.forEach((cell) => {
      (cell as HTMLElement).addEventListener('click', handleCellClick);
    });
  }

  private update(state: State) {
    if (state === null) {
      return;
    }
    console.log('Updating state:', state);
    console.log('MatchID:', this.matchID);

    const cells = this.rootElement.querySelectorAll('.cell');
    cells.forEach((cell) => {
      const cellId = parseInt((cell as HTMLElement).dataset.id!);
      const cellValue = state.G.cells[cellId];
      (cell as HTMLElement).textContent = cellValue !== null ? cellValue : '';
    });

    const messageEl = this.rootElement.querySelector('.winner') as HTMLElement;
    if (messageEl) {
      if (state.ctx.gameover) {
        messageEl.textContent =
          state.ctx.gameover.winner !== undefined
            ? 'Winner: ' + state.ctx.gameover.winner
            : 'Draw!';
      } else {
        messageEl.textContent = '';
      }
    }

    const currentPlayerEl = this.rootElement.querySelector(
      '.current-player'
    ) as HTMLElement;
    if (currentPlayerEl) {
      currentPlayerEl.textContent = `Current Player: ${state.ctx.currentPlayer}`;
    }

    const matchIDEl = this.rootElement.querySelector(
      '.match-id'
    ) as HTMLElement;
    if (matchIDEl) {
      matchIDEl.textContent = `Match ID: ${this.matchID}`;
    }
  }
}

// //* PRUEBA node connection
// async function testNodeConnection() {
//   console.log('Starting testNodeConnection');
//   try {
//     const response = await fetch(`${NODE_URL}`);
//     console.log(`Response status: ${response.status}`);
//     if (response.ok) {
//       const data = await response.text();
//       console.log('Node root response:', data);
//       alert('Node connection successful: ' + data);
//     } else {
//       console.error('Failed to connect to node, status:', response.status);
//       alert('Failed to connect to node, status: ' + response.status);
//     }
//   } catch (error) {
//     console.error('Error testing node connection:', error);
//     alert('Failed to connect to node: ' + error.message);
//   }
// }

//*

//*PRUEBA LLEGO AL SERVER Cartesify-transport.ts
async function testServerConnection() {
  try {
    const response = await fetch(`${SERVER}/test`);
    const data = await response.json();
    console.log('Test route response:', data);
    alert('Server connection successful: ' + JSON.stringify(data));
  } catch (error) {
    console.error('Error testing server connection:', error);
    alert('Failed to connect to server: ' + error.message);
  }
}
//*

//* llamar a /sync
// async function syncMatch(
//   matchID: string,
//   playerID: string,
//   credentials: string
// ): Promise<void> {
//   try {
//     const response = await fetch(`${SERVER}/TicTacToe/sync`, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify({ matchID, playerID, credentials }),
//     });
//     const data = await response.json();
//     console.log('Sync route response:', data);
//     alert('Sync successful: ' + JSON.stringify(data));
//   } catch (error) {
//     console.error('Error syncing match:', error);
//     alert('Failed to sync match: ' + error.message);
//   }
// }
//*

async function createMatch(
  gameName: string,
  numPlayers: number,
  setupData?: any,
  unlisted: boolean = false
): Promise<string | null> {
  const url = `${SERVER}/games/${gameName}/create`;
  console.log('Sending createMatch request:', {
    url,
    numPlayers,
    setupData,
    unlisted,
  });
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        numPlayers,
        setupData,
        unlisted,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    console.log('Create match response:', data);
    return data.matchID;
  } catch (error) {
    console.error('Error creating match:', error);
    return null;
  }
}

// async function listCurrentGames() {

//   const lobbyClient = new LobbyClient({
//        server: SERVER,
// dappAddress: DAPP_ADDRESS,
// nodeUrl: NODE_URL, //
//   });
//   console.log('Comence a instanciar el LobbyClient');
//   console.log('lobbyClient:', lobbyClient);

//   try {
//     console.log('entre al try');
//     const matches = await lobbyClient.listMatches('TicTacToe');
//     console.log('Current matches:', matches);
//   } catch (error) {
//     console.log('Me fui al catch', error);
//     // console.error('Error listing matches App.ts:', error);
//   }
// }

async function main() {
  const appElement = document.getElementById('app');
  const lobbyElement = document.createElement('div');
  lobbyElement.id = 'lobby';
  appElement?.appendChild(lobbyElement);

  if (!window.ethereum) {
    alert('Please install MetaMask to play this game');
    return; // Fin de la función si MetaMask no está instalado
  }
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  let matchID = '';

  const createMatchButton = document.createElement('button');
  createMatchButton.textContent = 'Create Game';
  createMatchButton.addEventListener('click', async () => {
    matchID = await createMatch('default', 2);
    if (!matchID) {
      alert('Failed to create match. Please try again.');
      return;
    }

    const matchCreatedMsg = document.createElement('p');
    matchCreatedMsg.textContent = `Game created with Match ID: ${matchID}`;
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

  // Añadir botón para probar la conexión al servidor
  const testConnectionButton = document.createElement('button');
  testConnectionButton.textContent = 'Test Server Connection';
  testConnectionButton.addEventListener('click', testServerConnection);
  lobbyElement.appendChild(testConnectionButton);

  // // Añadir botón para probar la conexión al nodo
  // const testNodeConnectionButton = document.createElement('button');
  // testNodeConnectionButton.textContent = 'Test Node Connection';
  // testNodeConnectionButton.addEventListener('click', testNodeConnection);
  // lobbyElement.appendChild(testNodeConnectionButton);

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
