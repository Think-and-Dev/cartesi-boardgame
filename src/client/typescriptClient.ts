import { Client as RawClient } from './client'; // Sigue importando las mismas dependencias
import type { ClientOpts, ClientState, _ClientImpl } from './client';
import type { GameComponent } from '../lobby/connection';
import { ethers } from 'ethers';
import { CartesiMultiplayer } from '../client/transport/cartesify-transport'; // Asegúrate de tener esta importación

type RunningMatch = {
  app: _ClientImpl<any>;
  matchID: string;
  playerID: string;
  credentials?: string;
};

// Configuración similar a ReactClientOpts en React.tsx
export interface TypeScriptClientOpts {
  game: GameComponent;
  matchID: string;
  playerID: string;
  credentials?: string;
  signer: ethers.Signer;
  rootElement: HTMLElement; // Elemento donde se renderizará el tablero
}

export class TypeScriptClient {
  private client: _ClientImpl<any>; // Instancia del cliente
  private rootElement: HTMLElement;
  private runningMatch?: RunningMatch;

  constructor(config: TypeScriptClientOpts) {
    this.rootElement = config.rootElement;

    // Crear cliente igual que en React.tsx
    this.client = RawClient({
      game: config.game.game,
      matchID: config.matchID,
      playerID: config.playerID,
      credentials: config.credentials,
      multiplayer: CartesiMultiplayer({
        server: 'http://localhost:8000',
        dappAddress: '0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e',
        nodeUrl: 'http://localhost:8080',
        signer: config.signer,
      }),
    });

    this.client.subscribe(() => this.render()); // Suscribirse a cambios de estado
    this.client.start(); // Iniciar cliente
  }

  //    Función para renderizar el estado del juego en el DOM
  private render() {
    const state = this.client.getState();
    console.log('Rendering state in typescriptClient:', state);

    if (!state) {
      this.renderLoading();
      return;
    }

    this.rootElement.innerHTML = ''; // Limpiar contenido previo

    // Verificar si hay un ganador
    if (state.ctx.gameover) {
      const winner =
        state.ctx.gameover.winner !== undefined
          ? `Winner: ${state.ctx.gameover.winner}`
          : 'Draw!';
      this.renderMessage(winner);
      return;
    }

    this.renderBoard(state); // Llamar a la función para renderizar el tablero
  }

  // Función para renderizar el tablero
  private renderBoard(state: ClientState<any>) {
    const table = document.createElement('table');
    table.setAttribute('id', 'board');

    // Crear filas y celdas del tablero
    for (let i = 0; i < 3; i++) {
      const row = document.createElement('tr');
      for (let j = 0; j < 3; j++) {
        const cell = document.createElement('td');
        const cellIndex = 3 * i + j;
        cell.textContent = state.G.cells[cellIndex] || '';
        cell.onclick = () => this.handleCellClick(cellIndex);
        row.appendChild(cell);
      }
      table.appendChild(row);
    }

    this.rootElement.appendChild(table); // Añadir tablero al DOM
  }

  // Función para manejar el clic en una celda
  private handleCellClick(cellIndex: number) {
    const state = this.client.getState();
    if (state && state.isActive && state.G.cells[cellIndex] === null) {
      this.client.moves.clickCell(cellIndex); // Realizar movimiento
    }
  }

  // Función para renderizar un mensaje en el DOM
  private renderMessage(message: string) {
    const messageElement = document.createElement('p');
    messageElement.textContent = message;
    this.rootElement.appendChild(messageElement);
  }

  // Función para renderizar estado de carga
  private renderLoading() {
    const loadingMessage = document.createElement('p');
    loadingMessage.textContent = 'Connecting...';
    this.rootElement.appendChild(loadingMessage);
  }

  // Función para detener el cliente cuando sea necesario
  public stop() {
    this.client.stop();
  }
}
