import type { TransportOpts } from './transport';
import { Transport } from './transport';
import type {
  CredentialedActionShape,
  State,
  ChatMessage,
  PlayerID,
} from '../../types';
import { Cartesify } from '@calindra/cartesify';

interface CartesifyOpts {
  server?: string;
  cartesifyOpts?: CartesifyOpts;
}

type CartesifyTransportOpts = TransportOpts & CartesifyOpts;

export class CartesifyTransport extends Transport {
  protected url: string;
  protected declare matchID: string;
  protected declare playerID: PlayerID | null;
  protected declare credentials?: string;
  protected cartesifyFetch: ReturnType<typeof Cartesify.createFetch>;

  constructor(opts: TransportOpts) {
    super(opts);
    this.url = opts.server || 'https//localhost:5004';
    this.matchID = opts.matchID || '';
    this.playerID = opts.playerID || null;
    this.credentials = opts.credentials;

    const DAPP_ADDRESS = '';
    this.cartesifyFetch = Cartesify.createFetch({
      dappAddress: DAPP_ADDRESS,
      endpoints: {
        graphQL: new URL(`${this.url}/graphql`),
        inspect: new URL(`${this.url}/inspect`),
      },
    });
  }

  async connect(): Promise<void> {
    try {
      const response = await this.cartesifyFetch(`${this.url}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchID: this.matchID,
          playerID: this.playerID,
          credentials: this.credentials,
        }),
      });

      if (response.ok) {
        // Called when another player makes a move and the
        // master broadcasts the update as a patch to other clients (including
        // this one).
        this.cartesifyFetch(`${this.url}/patch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            matchID: this.matchID,
            playerID: this.playerID,
            credentials: this.credentials,
          }),
        }).then((patchResponse) => {
          if (patchResponse.ok) {
            patchResponse.json().then((data) => {
              this.notifyClient({ type: 'patch', args: data });
            });
          }
        });

        // Called when another player makes a move and the
        // master broadcasts the update to other clients (including
        // this one).
        this.cartesifyFetch(`${this.url}/update`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            matchID: this.matchID,
            playerID: this.playerID,
            credentials: this.credentials,
          }),
        }).then((updateResponse) => {
          if (updateResponse.ok) {
            updateResponse.json().then((data) => {
              this.notifyClient({ type: 'update', args: data });
            });
          }
        });

        // Called when the client first connects to the master
        // and requests the current game state.
        this.cartesifyFetch(`${this.url}/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            matchID: this.matchID,
            playerID: this.playerID,
            credentials: this.credentials,
          }),
        }).then((syncResponse) => {
          if (syncResponse.ok) {
            syncResponse.json().then((data) => {
              this.notifyClient({ type: 'sync', args: data });
            });
          }
        });

        // Called when new player joins the match or changes
        // it's connection status
        this.cartesifyFetch(`${this.url}/matchData`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            matchID: this.matchID,
            playerID: this.playerID,
            credentials: this.credentials,
          }),
        }).then((matchDataResponse) => {
          if (matchDataResponse.ok) {
            matchDataResponse.json().then((data) => {
              this.notifyClient({ type: 'matchData', args: data });
            });
          }
        });

        // Called when a chat message is sent and received in the game.
        // This function handles the chat messages exchanged between players.
        this.cartesifyFetch(`${this.url}/chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            matchID: this.matchID,
            playerID: this.playerID,
            credentials: this.credentials,
          }),
        }).then((chatResponse) => {
          if (chatResponse.ok) {
            chatResponse.json().then((data) => {
              this.notifyClient({ type: 'chat', args: data });
            });
          }
        });

        // Handle connection and disconnection with the server.
        // Establishes the initial connection to the server and handles connect and disconnect events.
        // On connection, the game state is synchronized and the connection state is set as active.
        // In case of disconnection, the connection status is updated as inactive.
        this.setConnectionStatus(true);
      } else {
        throw new Error('Failed to connect');
      }
    } catch (error) {
      console.error('Error connecting to backend:', error);
    }
  }

  async disconnect(): Promise<void> {
    try {
      const response = await this.cartesifyFetch(`${this.url}/disconnect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchID: this.matchID,
          playerID: this.playerID,
          credentials: this.credentials,
        }),
      });

      if (response.ok) {
        this.setConnectionStatus(false);
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (error) {
      console.error('Error disconnecting from backend:', error);
    }
  }

  async sendAction(
    state: State,
    action: CredentialedActionShape.Any
  ): Promise<void> {
    try {
      const response = await this.cartesifyFetch(`${this.url}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          state,
          action,
          matchID: this.matchID,
          playerID: this.playerID,
          credentials: this.credentials,
        }),
      });

      if (response.ok) {
        const updatedState = await response.json();
        this.notifyClient({
          type: 'update',
          args: [this.matchID, updatedState, []],
        });
      } else {
        throw new Error('Failed to send action');
      }
    } catch (error) {
      console.error('Error sending action:', error);
    }
  }

  async sendChatMessage(
    matchID: string,
    chatMessage: ChatMessage
  ): Promise<void> {
    try {
      const response = await this.cartesifyFetch(`${this.url}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchID,
          chatMessage,
          playerID: this.playerID,
          credentials: this.credentials,
        }),
      });

      if (response.ok) {
        this.notifyClient({ type: 'chat', args: [matchID, chatMessage] });
      } else {
        throw new Error('Failed to send chat message');
      }
    } catch (error) {
      console.error('Error sending chat message:', error);
    }
  }

  async requestSync(): Promise<void> {
    try {
      const response = await this.cartesifyFetch(`${this.url}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchID: this.matchID,
          playerID: this.playerID,
          credentials: this.credentials,
          numPlayers: this.numPlayers,
        }),
      });

      if (response.ok) {
        const syncData = await response.json();
        this.notifyClient({ type: 'sync', ...syncData });
      } else {
        throw new Error('Failed to request sync');
      }
    } catch (error) {
      console.error('Error requesting sync:', error);
    }
  }

  updateMatchID(id: string): void {
    this.matchID = id;
    this.requestSync();
  }

  updatePlayerID(id: PlayerID): void {
    this.playerID = id;
    this.requestSync();
  }

  updateCredentials(credentials?: string): void {
    this.credentials = credentials;
    this.requestSync();
  }
}

export function CartesiMultiplayer({ server }: CartesifyOpts = {}) {
  return (transportOpts: CartesifyTransportOpts) =>
    new CartesifyTransport({
      server,
      ...transportOpts,
    });
}

export default CartesifyTransport;
