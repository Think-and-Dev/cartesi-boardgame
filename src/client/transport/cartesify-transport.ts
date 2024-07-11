import type { TransportOpts } from './transport';
import { Transport } from './transport';
import type {
  CredentialedActionShape,
  State,
  ChatMessage,
  PlayerID,
} from '../../types';
import { Cartesify } from '@calindra/cartesify';
import type { ethers } from 'ethers';

interface CartesifyOpts {
  server?: string;
  dappAddress: string;
  nodeUrl?: string;
  signer?: ethers.Signer;
}

type CartesifyTransportOpts = TransportOpts & CartesifyOpts;

export class CartesifyTransport extends Transport {
  protected url: string;
  protected declare matchID: string;
  protected declare playerID: PlayerID | null;
  protected declare credentials?: string;
  protected cartesifyFetch: ReturnType<typeof Cartesify.createFetch>;
  protected pollingInterval: number = 5000; // 5 seconds
  protected pollingHandles: { [key: string]: NodeJS.Timeout } = {};

  constructor(opts: CartesifyTransportOpts) {
    super(opts);
    this.url = opts.server || 'https://localhost:5004';
    opts.nodeUrl = opts.nodeUrl || 'http://localhost:8080';
    this.matchID = opts.matchID || '';
    this.playerID = opts.playerID || null;
    this.credentials = opts.credentials;

    this.cartesifyFetch = Cartesify.createFetch({
      dappAddress: opts.dappAddress,
      endpoints: {
        graphQL: new URL(`${opts.nodeUrl}/graphql`),
        inspect: new URL(`${opts.nodeUrl}/inspect`),
      },
      provider: opts.signer?.provider,
      signer: opts.signer,
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
        this.setConnectionStatus(true);
        this.requestSync();
        this.startPolling();
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
        this.stopPolling();
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (error) {
      console.error('Error disconnecting from backend:', error);
    }
  }

  startPolling(): void {
    const endpoints = ['patch', 'update', 'sync', 'matchData', 'chat'];
    endpoints.forEach((endpoint) => {
      this.pollingHandles[endpoint] = setInterval(async () => {
        try {
          const response = await this.cartesifyFetch(
            `${this.url}/${endpoint}`,
            {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
              },
            }
          );

          if (response.ok) {
            const data = await response.json();
            this.notifyClient({
              type: endpoint as
                | 'patch'
                | 'update'
                | 'sync'
                | 'matchData'
                | 'chat',
              args: data,
            });
          }
        } catch (error) {
          console.error(`Error fetching ${endpoint}:`, error);
        }
      }, this.pollingInterval);
    });
  }

  stopPolling(): void {
    Object.values(this.pollingHandles).forEach((handle) =>
      clearInterval(handle)
    );
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

export function CartesiMultiplayer(cartesifyOpts: CartesifyOpts) {
  return (transportOpts: TransportOpts) =>
    new CartesifyTransport({
      ...cartesifyOpts,
      ...transportOpts,
    });
}

export default CartesifyTransport;
