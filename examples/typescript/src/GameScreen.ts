import { TicTacToe } from './Game';
import { CartesiMultiplayer } from '@think-and-dev/cartesi-boardgame/multiplayer';
import { ethers } from 'ethers';
import { Client } from '@think-and-dev/cartesi-boardgame/client';

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

export class TicTacToeClient {
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
