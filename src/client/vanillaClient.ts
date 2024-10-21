import { Client as RawClient } from './client';
import type { ClientOpts, ClientState, _ClientImpl } from './client';
import Debug from './debug/Debug.svelte';

interface VanillaClientOpts<G> extends ClientOpts<G> {
  rootElement: HTMLElement;
  board?: ((opts: any) => HTMLElement) | HTMLElement;
}

export class VanillaClient<G> {
  private client: _ClientImpl<G>; // Instancia del cliente de boardgame.io
  private rootElement: HTMLElement; // Elemento raíz donde se monta el contenido
  private boardElement?: HTMLElement; // Contenedor para el tablero
  private debugPanel: Debug | null = null; // Contenedor para el panel de depuración

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

    // Renderizar el panel de depuración `Debug` en un contenedor si `debug` está habilitado
    if (debug !== false) {
      // Crear un contenedor `div` para el panel de depuración
      const debugContainer = document.createElement('div');
      this.rootElement.appendChild(debugContainer);
      // Instanciar `Debug` y montarlo en el contenedor `debugContainer`
      this.debugPanel = new Debug({
        target: debugContainer,
        props: { clientManager: this },
      });
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
    const state = this.client.getState();
    if (state && this.boardElement) {
      // Si hay un estado y un elemento de tablero, renderizar el tablero
      this.renderBoard(state);
    } else {
      // Si no hay estado, renderizar un mensaje de carga
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
