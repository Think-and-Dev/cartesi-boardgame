import { Client as RawClient } from './client';
import type { ClientOpts, ClientState, _ClientImpl } from './client';
import { Board } from '../../examples/typescript/src/Board2';
import Debug from './debug/Debug.svelte';

interface VanillaClientOpts<G> extends ClientOpts<G> {
  rootElement: HTMLElement;
  board?: (opts: any) => HTMLElement | Board;
}

export class VanillaClient<G> {
  private client: _ClientImpl<G>;
  private rootElement: HTMLElement;
  private boardElement?: HTMLElement | Board;
  private debug: Debug | null = null;
  constructor(opts: VanillaClientOpts<G>) {
    const {
      game,
      numPlayers,
      multiplayer,
      debug,
      enhancer,
      rootElement,
      matchID,
      playerID,
      credentials,
      board,
    } = opts;
    this.rootElement = rootElement;

    this.client = RawClient({
      game,
      numPlayers,
      multiplayer,
      debug,
      enhancer,
      matchID,
      playerID,
      credentials,
    });

    if (board) {
      if (typeof board === 'function') {
        this.boardElement = board({
          moves: this.client.moves,
          events: this.client.events,
          matchID: this.client.matchID,
          playerID: this.client.playerID,
          reset: this.client.reset,
          undo: this.client.undo,
          redo: this.client.redo,
          log: this.client.log,
          matchData: this.client.matchData,
          sendChatMessage: this.client.sendChatMessage,
          chatMessages: this.client.chatMessages,
          isMultiplayer: !!this.client.multiplayer,
        });
      } else {
        this.boardElement = board;
      }
      this.rootElement.appendChild(this.boardElement as HTMLElement);
    }

    if (debug !== false) {
      const debugContainer = document.createElement('div');
      this.rootElement.appendChild(debugContainer);
      this.debug = new Debug({
        target: debugContainer,
        props: { clientManager: this },
      });
    }

    this.client.subscribe(() => this.update());
  }

  public destroy() {
    this.client.stop();
  }

  private update() {
    const state = this.client.getState();
    if (state && this.boardElement instanceof Board) {
      this.boardElement.update(state);
    } else {
      this.renderBoard(state);
    }
  }

  private renderBoard(state: ClientState<G>) {
    if (!this.boardElement || !(this.boardElement instanceof HTMLElement))
      return;

    this.boardElement.innerHTML = '';

    const table = document.createElement('table');
    for (let row = 0; row < 3; row++) {
      const tr = document.createElement('tr');
      for (let col = 0; col < 3; col++) {
        const cell = document.createElement('td');
        const cellIndex = row * 3 + col;
        const cellValue = state.G.cells[cellIndex]; // 'X', 'O' o null

        cell.textContent = cellValue ? cellValue : '';

        if (state.isActive) {
          cell.addEventListener('click', () => {
            this.client.moves.clickCell(cellIndex);
          });
        }

        tr.appendChild(cell);
      }
      table.appendChild(tr);
    }

    // Añadir el tablero actualizado al boardElement
    this.boardElement.appendChild(table);
  }

  public start() {
    this.client.start();
  }

  public stop() {
    this.client.stop();
  }
}
