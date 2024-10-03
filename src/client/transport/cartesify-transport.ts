import type { TransportOpts } from './transport';
import { Transport } from './transport';
import type {
  CredentialedActionShape,
  State,
  ChatMessage,
  PlayerID,
} from '../../types';
import { Cartesify } from '@calindra/cartesify';
import { ethers } from 'ethers';
import { toBytes } from 'viem';
import { Client as XMTPClient } from '@xmtp/mls-client';

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
  protected signer: ethers.Signer;
  protected xmtp: any;
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
    this.signer = opts.signer;
    this.cartesifyFetch = Cartesify.createFetch({
      dappAddress: opts.dappAddress,
      endpoints: {
        graphQL: new URL(`${opts.nodeUrl}/graphql`),
        inspect: new URL(`${opts.nodeUrl}/inspect`),
      },
      provider: opts.signer?.provider,
      signer: this.signer,
    });
  }

  async connect(): Promise<void> {
    try {
      await this.requestSync();
      this.startPolling();
      this.setConnectionStatus(true);
      let address = await this.signer.getAddress();
      this.xmtp = await XMTPClient.create(address, {
        env: 'production',
      });
      await this.registerClient(this.xmtp, this.signer);
    } catch (error) {
      console.error('Error connecting to backend:', error);
    }
  }

  async registerClient(client, wallet) {
    if (!client.isRegistered) {
      const signature = toBytes(
        await wallet.signMessage({
          message: client.signatureText,
        })
      );
      client.addEcdsaSignature(signature);
      await client.registerIdentity();
    }
  }
  // Function to send a message to a specific group
  async sendMessageToGroup(client, groupId, messageContent) {
    const conversation = client.conversations.getConversationById(groupId);
    if (!conversation) {
      console.log(`No conversation found with ID: ${groupId}`);
      return;
    }
    await conversation.send(messageContent);
    console.log(`Message sent to group ${groupId}: ${messageContent}`);
  }
  async createGroupConversation(client, msg) {
    const conversation = await client.conversations.newConversation([
      '0x90F79bf6EB2c4f870365E785982E1f101E93b906',
      '0x3c7649064f3764Cdc4E63eEFD3cD0cbB8B715d27',
    ]);
    console.log(conversation.id);
    // Paso 2: Iniciar el streaming de mensajes en la conversación
    await this.streamAndRespond(client, conversation.id, msg);
  }
  // Function to stream all messages and respond to new ones
  async streamAndRespond(client, conversationId, msg) {
    console.log('Iniciando transmisión de mensajes');
    const stream = await client.conversations.streamAllMessages();

    for await (const message of stream) {
      console.log(`Mensaje transmitido: ${message.content}`);
      // Verifica que el mensaje sea de otro participante y que esté en la conversación correcta
      if (
        message.senderInboxId !== client.inboxId &&
        message.conversationId === conversationId
      ) {
        await this.sendMessageToGroup(client, conversationId, msg);
      }
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
          const data = responseData.data;
          this.notifyClient(data);
          this.nextDataIndex = responseData.index + 1;
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
      const response = await this.cartesifyFetch(`${this.url}/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action,
          matchID: this.matchID,
          playerID: this.playerID,
          stateID: state._stateID,
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
      this.createGroupConversation(this.xmtp, chatMessage.payload);
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
