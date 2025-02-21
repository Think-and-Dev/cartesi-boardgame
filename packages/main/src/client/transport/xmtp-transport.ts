import { CartesifyOpts, CartesifyTransport } from './cartesify-transport';
import type { Conversation } from '@xmtp/xmtp-js';
import { Client } from '@xmtp/xmtp-js';
import { ethers } from 'ethers';
import type { ChatMessage, PlayerID } from '../../types';
import type { TransportOpts } from './transport';

export interface XMTPTransportConfig {
  chainId: string;
  dappAddress: string;
  env?: 'production' | 'dev';
  matchData?: Array<{
    id: number;
    name: string;
    isConnected: boolean;
    data: {
      playerEvmAddress: string;
    };
  }>;
}

export type XMTPTransportOpts = TransportOpts &
  CartesifyOpts &
  XMTPTransportConfig & {
    matchData?: Array<{
      id: number;
      name: string;
      isConnected: boolean;
      data: {
        playerEvmAddress: string;
      };
    }>;
  };

interface MatchPlayer {
  id: string;
  name: string;
  data?: {
    playerEvmAddress: string;
  };
}

export class XMTPTransport extends CartesifyTransport {
  private xmtp: Client | null = null;
  private isInitialized = false;
  private conversationIdMapping: Map<string, string> = new Map();
  private conversations: Map<string, Conversation> = new Map();
  private readonly config: XMTPTransportConfig;
  private signer?: ethers.Signer;
  private matchData: Array<{
    id: number;
    name: string;
    isConnected: boolean;
    data: {
      playerEvmAddress: string;
    };
  }> = [];

  constructor(opts: XMTPTransportOpts) {
    super(opts);
    this.config = {
      chainId: opts.chainId,
      dappAddress: opts.dappAddress,
      env: opts.env || 'production',
      matchData: opts.matchData || [],
    };
    this.signer = opts.signer;
    this.matchData = opts.matchData || [];
  }

  // Method to generate unique conversation IDs
  private getConversationId(matchId: string): string {
    const cached = this.conversationIdMapping.get(matchId);
    if (cached) return cached;

    // Include chainId and dappAddress to avoid collisions between different games/networks
    const conversationId = `game-${this.config.chainId}-${this.config.dappAddress}-${matchId}`;
    this.conversationIdMapping.set(matchId, conversationId);
    return conversationId;
  }

  // Initialize XMTP client
  private async initializeXMTP(signer: any): Promise<void> {
    if (this.isInitialized) return;

    try {
      if (!signer?.getAddress || !signer?.signMessage) {
        throw new Error('Invalid signer provided');
      }

      const address = await signer.getAddress();
      const xmtpSigner = {
        getAddress: async () => address,
        signMessage: async (message: Uint8Array | string) => {
          const messageToSign =
            message instanceof Uint8Array ? ethers.hexlify(message) : message;
          return signer.signMessage(messageToSign);
        },
      };

      this.xmtp = await Client.create(xmtpSigner, {
        env: this.config.env,
      });

      const clientAddress = await this.xmtp.address;
      if (!clientAddress) {
        throw new Error('XMTP client initialization failed');
      }

      this.isInitialized = true;
      console.log('XMTP client initialized for address:', clientAddress);
    } catch (error) {
      console.error('XMTP initialization failed:', error);
      throw error;
    }
  }

  private async setupConversationListeners(
    conversation: Conversation,
    matchId: string
  ) {
    const stream = await conversation.streamMessages();

    (async () => {
      for await (const message of stream) {
        if (message.senderAddress) {
          const chatMessage: ChatMessage = {
            id: message.id,
            sender: message.senderAddress,
            payload: message.content,
          };

          // Notify the client using the existing boardgame.io system
          this.notifyClient({
            type: 'chat',
            args: [matchId, chatMessage],
          });
        }
      }
    })();
  }

  private async getOrCreateConversation(
    matchId: string
  ): Promise<Conversation> {
    if (!this.xmtp) throw new Error('XMTP not initialized');

    const existingConversation = this.conversations.get(matchId);
    if (existingConversation) {
      return existingConversation;
    }

    const conversationId = this.getConversationId(matchId);

    // Obtener la dirección del otro jugador
    const otherPlayerAddress = this.getOtherPlayerAddress();
    if (!otherPlayerAddress) {
      throw new Error('No se pudo encontrar la dirección del otro jugador');
    }

    const conversations = await this.xmtp.conversations.list();
    let conversation = conversations.find(
      (c) => c.context?.conversationId === conversationId
    );

    if (!conversation) {
      conversation = await this.xmtp.conversations.newConversation(
        otherPlayerAddress, // Usar la dirección del otro jugador en lugar de dappAddress
        {
          conversationId,
          metadata: {
            chainId: this.config.chainId,
            dappAddress: this.config.dappAddress,
            gameId: matchId,
            playerIds: `${this.playerID},${otherPlayerAddress}`,
          },
        }
      );
    }

    this.conversations.set(matchId, conversation);
    await this.setupConversationListeners(conversation, matchId);
    return conversation;
  }

  // Método auxiliar para obtener la dirección del otro jugador
  private getOtherPlayerAddress(): string | null {
    console.log('matchData:', this.matchData);
    console.log('playerID:', this.playerID);

    if (!this.matchData || !this.playerID) return null;

    const otherPlayer = this.matchData.find(
      (player) => String(player.id) !== this.playerID
    );

    return otherPlayer?.data?.playerEvmAddress || null;
  }

  // Override base transport methods
  async connect(): Promise<void> {
    await this.initializeXMTP(this.signer);
    await super.connect();
  }

  async disconnect(): Promise<void> {
    const matchId = this.matchID;
    if (this.conversations.has(matchId)) {
      // Clean up listeners and cache
      this.conversations.delete(matchId);
      this.conversationIdMapping.delete(matchId);
    }

    this.isInitialized = false;
    this.xmtp = null;
    await super.disconnect();
  }

  async sendChatMessage(matchId: string, message: ChatMessage): Promise<void> {
    if (!this.isInitialized) {
      await this.initializeXMTP(this.signer);
    }

    try {
      // First send via XMTP
      const conversation = await this.getOrCreateConversation(matchId);
      await conversation.send(message.payload);

      // Then maintain Cartesi functionality
      await super.sendChatMessage(matchId, message);
    } catch (error) {
      console.error('Error sending chat message:', error);
      throw error;
    }
  }

  // Override update methods
  updateMatchID(id: string): void {
    this.matchID = id;
    // Reconnect XMTP conversation for the new match
    this.getOrCreateConversation(id).catch(console.error);
    super.updateMatchID(id);
  }

  updatePlayerID(id: PlayerID): void {
    this.playerID = id;
    super.updatePlayerID(id);
  }
}

export function CartesiMultiplayer(
  XMTPandcartesifyOpts: CartesifyOpts & XMTPTransportConfig
) {
  return (transportOpts: TransportOpts) =>
    new XMTPTransport({
      ...XMTPandcartesifyOpts,
      ...transportOpts,
    });
}
