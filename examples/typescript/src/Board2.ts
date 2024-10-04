import './board.css';

const DAPP_ADDRESS = '0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e';
const SERVER = 'http://localhost:8000';
const NODE_URL = 'http://localhost:8080';
import { ethers } from 'ethers'; // Asegúrate de que ethers esté importado

interface BoardProps {
  G: {
    cells: (string | null)[];
  };
  ctx: {
    gameover?: {
      winner?: string;
    };
    currentPlayer: string;
  };
  moves: {
    clickCell: (id: number) => void;
  };
  playerID?: string;
  isActive: boolean;
  isMultiplayer: boolean;
  isConnected: boolean;
  isPreview: boolean;
}

export class Board {
  private rootElement: HTMLElement;
  private signer: ethers.Signer;
  private playerID: string;
  private matchID: string;
  private backToLobby: () => void;

  constructor(
    rootElement: HTMLElement,
    signer: ethers.Signer,
    playerID: string,
    matchID: string,
    backToLobby: () => void
  ) {
    this.rootElement = rootElement;
    this.signer = signer;
    this.playerID = playerID;
    this.matchID = matchID;
    this.backToLobby = backToLobby;

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
      <p class="match-id"></p>
    `;

    const backButton = document.createElement('button');
    backButton.textContent = 'Back to Lobby';
    backButton.addEventListener('click', this.backToLobby);
    this.rootElement.appendChild(backButton);
  }

  private attachListeners() {
    const handleCellClick = (event: Event) => {
      const target = event.target as HTMLElement;
      const id = parseInt(target.dataset.id!, 10);
      // Aquí llamas a la función moves.clickCell
      console.log(`Cell clicked with ID: ${id}`);
      // Lógica para ejecutar el movimiento (clickCell)
    };

    const cells = this.rootElement.querySelectorAll('.cell');
    cells.forEach((cell) => {
      (cell as HTMLElement).addEventListener('click', handleCellClick);
    });
  }

  // Método para actualizar el estado del tablero
  public update(state: BoardProps) {
    const cells = this.rootElement.querySelectorAll('.cell');
    cells.forEach((cell) => {
      const cellId = parseInt((cell as HTMLElement).dataset.id!, 10);
      const cellValue = state.G.cells[cellId];
      (cell as HTMLElement).textContent = cellValue !== null ? cellValue : '';
    });

    const winnerElement = this.rootElement.querySelector(
      '.winner'
    ) as HTMLElement;
    if (winnerElement && state.ctx.gameover) {
      winnerElement.textContent =
        state.ctx.gameover.winner !== undefined
          ? `Winner: ${state.ctx.gameover.winner}`
          : 'Draw!';
    }

    const currentPlayerElement = this.rootElement.querySelector(
      '.current-player'
    ) as HTMLElement;
    if (currentPlayerElement) {
      currentPlayerElement.textContent = `Current Player: ${state.ctx.currentPlayer}`;
    }

    const matchIDElement = this.rootElement.querySelector(
      '.match-id'
    ) as HTMLElement;
    if (matchIDElement) {
      matchIDElement.textContent = `Match ID: ${this.matchID}`;
    }
  }
}
