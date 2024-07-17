import { Client } from '@think-and-dev/cartesi-boardgame/client'; // Still workaround on this
import { TicTacToe } from './Game';
import { CartesiMultiplayer } from '@think-and-dev/cartesi-boardgame/multiplayer';
import { ethers, BrowserProvider } from 'ethers';

// We let the TypesScript compiler that the ethereum object might be available in the window object, as it added by the MetaMask extension
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
  matchID: string; // Agregar matchID al estado
}

class TicTacToeClient {
  private client: any;
  private rootElement: HTMLElement;
  private matchID: string; // Mantener una referencia al matchID

  constructor(
    rootElement: HTMLElement,
    signer: ethers.Signer,
    playerID: string = '0',
    matchID: string
  ) {
    this.rootElement = rootElement;
    this.matchID = matchID; // Asignar el matchID
    this.client = Client({
      game: TicTacToe,
      playerID,
      setupData: { matchID }, // Pasar el matchID aquí
      multiplayer: CartesiMultiplayer({
        server: 'http://localhost:8000',
        dappAddress: '0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e',
        nodeUrl: 'http://localhost:8080',
        signer: signer,
      }),
    });
    this.client.subscribe((state: State) => this.update(state));
    this.client.start();
    this.createBoard();
    this.attachListeners();
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

    console.log('Updating state:', state); // Verificar el estado recibido
    console.log('MatchID:', this.matchID); // Verificar el estado recibido

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

    // Actualizar el jugador actual en la interfaz de usuario
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

async function main() {
  const appElement = document.getElementById('app');
  if (!window.ethereum) {
    alert('Please install MetaMask to play this game');
    return;
  }
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  let matchID = prompt('Enter match ID:');
  if (!matchID) {
    return;
  }
  let playerID = prompt('Enter player id (0 or 1):');
  if (!playerID || (playerID !== '0' && playerID !== '1')) {
    return;
  }

  function initializeClient() {
    if (appElement) {
      appElement.innerHTML = ''; // Limpiar el contenido previo
      const app = new TicTacToeClient(
        appElement as HTMLElement,
        signer,
        playerID,
        matchID
      );
    }
  }

  initializeClient();

  // Listener para detectar cambios en el matchID
  const changeMatchIDButton = document.createElement('button');
  changeMatchIDButton.textContent = 'Change Match ID';
  changeMatchIDButton.addEventListener('click', () => {
    matchID = prompt('Enter new match ID:');
    if (matchID) {
      initializeClient(); // Reinicializar el cliente con el nuevo matchID
    }
  });
  appElement?.appendChild(changeMatchIDButton);
}

main();
