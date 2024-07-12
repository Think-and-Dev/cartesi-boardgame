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
  protected cartesifyFetch: ReturnType<typeof Cartesify.createFetch>;
  protected pollingInterval = 1000; // 5 seconds
  protected pollingEnabled: boolean;
  nextDataIndex: number;

  constructor(opts: CartesifyTransportOpts) {
    super(opts);
    this.url = opts.server || 'https://127.0.0.1:8000';

    if (this.url.slice(-1) != '/') {
      // add trailing slash if not already present
      this.url = this.url + '/';
    }
    this.url += this.gameName;
    opts.nodeUrl = opts.nodeUrl || 'http://localhost:8080';
    this.matchID = opts.matchID || 'default';
    this.playerID = opts.playerID || null;
    this.credentials = opts.credentials;
    this.pollingEnabled = false;
    this.nextDataIndex = 0;

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
        await this.requestSync();
        this.startPolling();
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
        this.stopPolling();
      } else {
        throw new Error('Failed to disconnect');
      }
    } catch (error) {
      console.error('Error disconnecting from backend:', error);
    }
  }

  async doPoll() {
    try {
      const response = await this.cartesifyFetch(
        `${this.url}/data?` +
          new URLSearchParams({
            matchID: this.matchID,
            playerID: this.playerID,
            index: this.nextDataIndex.toString(),
          }).toString(),
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const responseData = await response.json();
        if (
          responseData &&
          responseData.data &&
          responseData.index == this.nextDataIndex
        ) {
          this.nextDataIndex = responseData.index + 1;
          const data = responseData.data;
          this.notifyClient(data);
        }
      }
    } catch (error) {
      console.error(`Error fetching data:`, error);
    } finally {
      if (this.pollingEnabled) {
        setTimeout(() => this.doPoll(), this.pollingInterval);
      }
    }
  }

  startPolling(): void {
    this.pollingEnabled = true;
    this.doPoll();
  }

  stopPolling(): void {
    this.pollingEnabled = false;
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

      if (!response.ok) {
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
