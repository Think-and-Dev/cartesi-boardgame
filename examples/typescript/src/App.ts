/**
 * !note Frontend implementation of the game with secret state visualization.
 *
 * !warning This implementation handles secret states in the frontend only.
 * Backend security needs to be implemented separately for full security.
 */
import { Client } from '@think-and-dev/cartesi-boardgame/client'; // Still workaround on this
import { TicTacToe } from './Game';
import { CartesiMultiplayer } from '@think-and-dev/cartesi-boardgame/multiplayer';
import { ethers, BrowserProvider } from 'ethers';
// import { SecretState } from '../../backend/secret-state';

// We let the TypesScript compiler that the ethereum object might be available in the window object, as it added by the MetaMask extension
/**
 * !note Global type declaration for MetaMask ethereum object.
 */
declare global {
  interface Window {
    ethereum?: any;
  }
}

/**
 * !note Interface for secret state structure.
 */
interface SecretState {
  values: (number | null)[];
  hash: string;
}

/**
 * !note Interface for the complete game state.
 */
interface State {
  G: {
    cells: Array<string | null>;
    secret?: {
      [key: string]: SecretState;
    };
    revealedSecrets?: {
      [key: string]: SecretState;
    };
    gameOver?: boolean;
  };
  ctx: {
    currentPlayer: string;
    gameover?: {
      winner?: string;
      draw?: boolean;
    };
  };
}

/**
 * !note Main client class handling game state and UI updates.
 * Manages the visualization of secret states and their revelation.
 */
class TicTacToeClient {
  private client: any;
  private rootElement: HTMLElement;
  private playerID: string;

  /**
   * !note Initializes the game client and sets up the UI.
   * @param rootElement - Root DOM element for the game
   * @param signer - Ethereum signer for game actions
   * @param playerID - Player identifier ('0' or '1')
   */
  constructor(
    rootElement: HTMLElement,
    signer: ethers.Signer,
    playerID: string = '0'
  ) {
    this.rootElement = rootElement;
    this.playerID = playerID;
    this.client = Client({
      game: TicTacToe,
      playerID,
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
    this.createSecretCards();
  }

  /**
   * !note Creates the game board UI.
   */
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
    `;
  }

  /**
   * !note Attaches click event listeners to game cells.
   */
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

  /**
   * !note Updates the game UI based on current state.
   * @param state - Current game state
   */
  private update(state: State | null) {
    if (!state || !state.G) {
      console.error('Invalid game state:', state);
      return;
    }

    // Update board
    const cells = this.rootElement.querySelectorAll('.cell');
    cells.forEach((cell, index) => {
      const value = state.G.cells[index];
      (cell as HTMLElement).textContent = value !== null ? value : '';
    });

    // Update game status message
    const messageEl = this.rootElement.querySelector('.winner') as HTMLElement;
    if (messageEl) {
      if (state.G.gameOver) {
        if (state.ctx.gameover?.winner !== undefined) {
          messageEl.textContent = `¡Winner: Player ${state.ctx.gameover.winner}!`;
        } else if (state.ctx.gameover?.draw) {
          messageEl.textContent = 'Draw!';
        }
      } else {
        messageEl.textContent = `Player's Turn ${state.ctx.currentPlayer}`;
      }
    }

    this.updateSecretCards(state);
  }

  /**
   * !note Creates the UI elements for displaying secret numbers.
   */
  private createSecretCards() {
    const secretCardsContainer = document.createElement('div');
    secretCardsContainer.className = 'secret-cards';

    // Player's secret numbers container
    const yourSecretsContainer = document.createElement('div');
    yourSecretsContainer.className = 'player-secrets';
    yourSecretsContainer.innerHTML = `
      <h3>Your Secret Numbers:</h3>
      <div class="secret-numbers"></div>
      <div class="secret-hash"></div>
    `;

    // Opponent's information container
    const opponentSecretsContainer = document.createElement('div');
    opponentSecretsContainer.className = 'opponent-secrets';
    opponentSecretsContainer.innerHTML = `
      <h3>Opponent Information:</h3>
      <div class="opponent-numbers"></div>
      <div class="opponent-hash"></div>
    `;

    secretCardsContainer.appendChild(yourSecretsContainer);
    secretCardsContainer.appendChild(opponentSecretsContainer);
    this.rootElement.appendChild(secretCardsContainer);
  }

  /**
   * !note Updates the secret cards display with current game state.
   * Handles both player's own secrets and opponent's hidden values.
   * @param state - Current game state
   */
  private updateSecretCards(state: State | null) {
    if (!state?.G?.secret) return;

    const secretCardsContainer =
      this.rootElement.querySelector('.secret-cards');
    if (!secretCardsContainer) return;

    const currentPlayerSecret = state.G.secret[this.playerID];
    const opponentID = this.playerID === '0' ? '1' : '0';
    const opponentSecret = state.G.secret[opponentID];

    let html = `
      <div class="player-secrets">
        <h3>Your Secret Numbers:</h3>
        <div class="secret-numbers">
          ${currentPlayerSecret.values
            .map(
              (value) =>
                `<div class="secret-card">${value !== null ? value : '?'}</div>`
            )
            .join('')}
        </div>
        <div class="secret-hash">
          Tu Hash: ${currentPlayerSecret.hash.slice(0, 10)}...
        </div>
      </div>

      <div class="opponent-secrets">
        <h3>Opponent Information:</h3>
    `;

    if (state.G.gameOver && state.G.revealedSecrets?.[opponentID]) {
      html += `
        <div class="secret-numbers">
          ${state.G.revealedSecrets[opponentID].values
            .map(
              (value) =>
                `<div class="secret-card">${value !== null ? value : '?'}</div>`
            )
            .join('')}
        </div>
      `;
    } else {
      html +=
        '<div class="secret-numbers">Numbers hidden until the end of the game</div>';
    }

    html += `
        <div class="opponent-hash">
          Hash del Oponente: ${opponentSecret.hash.slice(0, 10)}...
        </div>
      </div>
    `;

    secretCardsContainer.innerHTML = html;
  }
}

/**
 * !note Main function to initialize the game.
 * Handles MetaMask connection and player setup.
 */
async function main() {
  const appElement = document.getElementById('app');
  if (!window.ethereum) {
    alert('Please install MetaMask to play this game');
    return;
  }
  const provider = new BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  const playerID = prompt('Enter player id (0 or 1):');
  if (!playerID || (playerID !== '0' && playerID !== '1')) {
    return;
  }
  if (appElement) {
    new TicTacToeClient(appElement, signer, playerID);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  main().catch(console.error);
});
