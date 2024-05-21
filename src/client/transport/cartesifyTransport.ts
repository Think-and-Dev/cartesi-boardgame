import { Transport, TransportOpts } from './transport';
import { CredentialedActionShape, State, ChatMessage, PlayerID } from '../../types';
import Cartesify from '@calindra/cartesify';

export class CartesifyTransport extends Transport {
  private url: string;
  private matchID: string;
  private playerID: PlayerID;
  private credentials?: string;
  private cartesifyFetch: typeof fetch;

  constructor(opts: TransportOpts) {
    super(opts);
    this.url = opts.server || '';
    this.matchID = '';
    this.playerID = '';
    this.credentials = undefined;

    const DAPP_ADDRESS = '';    
    const cartesify = Cartesify.createFetch({
      dappAddress: DAPP_ADDRESS,
      endpoints: {
        graphQL: new URL('http://localhost:8080/graphql'),
        inspect: new URL('http://localhost:8080/inspect'),
      },
    });
    this.cartesifyFetch = cartesify;
  }

  async connect(): Promise<void> {
    try {
      const response = await this.cartesifyFetch(`${this.url}/connect`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ matchID: this.matchID, playerID: this.playerID, credentials: this.credentials }),
      });

      if (response.ok) {
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
        body: JSON.stringify({ matchID: this.matchID, playerID: this.playerID, credentials: this.credentials }),
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

  async sendAction(state: State, action: CredentialedActionShape.Any): Promise<void> {
    try {
      const response = await this.cartesifyFetch(`${this.url}/actions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ state, action, matchID: this.matchID, playerID: this.playerID, credentials: this.credentials }),
      });

      if (response.ok) {
        const updatedState = await response.json();
        this.notifyClient({ type: 'update', state: updatedState });
      } else {
        throw new Error('Failed to send action');
      }
    } catch (error) {
      console.error('Error sending action:', error);
    }
  }

  async sendChatMessage(matchID: string, chatMessage: ChatMessage): Promise<void> {
    try {
      const response = await this.cartesifyFetch(`${this.url}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ matchID, chatMessage, playerID: this.playerID, credentials: this.credentials }),
      });

      if (response.ok) {
        this.notifyClient({ type: 'chat', chatMessage });
      } else {
        throw new Error('Failed to send chat message');
      }
    } catch (error) {
      console.error('Error sending chat message:', error);
    }
  }

  async requestSync(): Promise<void> {
    try {
      const response = await this.cartesifyFetch(`${this.url}/sync/${this.matchID}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.credentials}`,
        },
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
  }

  updatePlayerID(id: PlayerID): void {
    this.playerID = id;
  }

  updateCredentials(credentials?: string): void {
    this.credentials = credentials;
  }
}

export default CartesifyTransport;
