import { Client as RawClient } from './client';
import type { ClientOpts, ClientState, _ClientImpl } from './client';

interface VanillaClientOpts<G> extends ClientOpts<G> {
  rootElement: HTMLElement;
  board?: ((opts: any) => HTMLElement) | HTMLElement;
}

export class VanillaClient<G> {
  private client: _ClientImpl<G>;
  private rootElement: HTMLElement;
  private boardElement?: HTMLElement;

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

    // Instanciar el cliente de boardgame.io con las opciones proporcionadas
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

    // Verificar si board es una función o un HTMLElement
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
          isMultiplayer: !!multiplayer,
        });
      } else {
        this.boardElement = board;
      }
      this.rootElement.appendChild(this.boardElement);
    }

    // Suscribirse al cliente para actualizar el DOM cuando cambie el estado
    this.client.subscribe(() => this.update());
  }

  // Método de limpieza para detener el cliente
  public destroy() {
    this.client.stop();
  }

  // Método de actualización para gestionar cambios de estado
  private update() {
    const state: ClientState<G> = this.client.getState();
    if (state && this.boardElement) {
      // Actualizar el contenido basado en el estado
      this.renderBoard(state);
    } else {
      this.renderLoading();
    }
  }

  // Renderiza el tablero de juego basado en el estado actual
  private renderBoard(state: ClientState<G>) {
    if (!this.boardElement) return;

    // Aquí puedes añadir lógica específica de renderizado
    this.boardElement.innerHTML = ''; // Limpia el contenido del tablero antes de renderizar
    // Reemplazar esto por la lógica real de renderizado según el estado
    // this.boardElement.appendChild(...);
  }

  // Renderizar un mensaje de carga mientras el cliente se conecta
  private renderLoading() {
    this.rootElement.innerHTML = '<div class="loading">Connecting...</div>';
  }
}
