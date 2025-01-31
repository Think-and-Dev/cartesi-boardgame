import type { SecretTransportOpts } from './secret-transport';
import { Transport } from './secret-transport';
import { Cartesify } from '@calindra/cartesify';
import type { ethers } from 'ethers';

interface CartesifyOpts {
  server?: string;
  dappAddress: string;
  nodeUrl?: string;
  signer?: ethers.Signer;
}

type CartesifyTransportOpts = SecretTransportOpts & CartesifyOpts;

export class SecretCartesifyTransport extends Transport {
  protected url: string;
  public cartesifyFetch: ReturnType<typeof Cartesify.createFetch>;
  protected pollingInterval = 1000; // 5 seconds
  protected pollingEnabled: boolean;
  nextDataIndex: number;

  constructor(opts: CartesifyTransportOpts) {
    super(opts);
    this.url = opts.server || 'http://localhost:4001';

    if (this.url.slice(-1) != '/') {
      this.url = this.url + '/';
    }

    opts.nodeUrl = opts.nodeUrl || 'http://localhost:8080';
    this.matchID = opts.matchID || 'default';
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
      await this.requestSync();
      this.startPolling();
      this.setConnectionStatus(true);
    } catch (error) {
      console.error('Error connecting to backend:', error);
    }
  }

  async doPoll() {
    try {
      const response = await this.cartesifyFetch(
        `${this.url}/data?` +
          new URLSearchParams({
            matchID: this.matchID,
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

  async requestSync(): Promise<void> {
    try {
      const response = await this.cartesifyFetch(`${this.url}/sync`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          matchID: this.matchID,
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

  /**
   * Sends shuffled deck hashes to the Cartesi Machine
   *
   * @description
   * This method sends the shuffled deck state to be stored in the Cartesi Machine.
   * It uses the advance state endpoint to ensure the deck state is recorded on-chain.
   *
   * @param shuffledHashes - Array of card hashes with their corresponding keys
   * @param shuffledHashes.key - Identifier for each card (e.g., "card1", "card2")
   * @param shuffledHashes.hash - Cryptographic hash representing the card value
   *
   * @returns Promise<Response> - Response from the Cartesi advance endpoint
   *
   * @example
   * await transport.sendShuffledDeck([
   *   { key: "card1", hash: "0x123..." },
   *   { key: "card2", hash: "0x456..." }
   * ]);
   */
  async sendShuffledDeck(shuffledHashes: Array<{ key: string; hash: string }>) {
    return this.cartesifyFetch(`${this.url}/advance`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'STORE_SHUFFLED_DECK',
        payload: { hashes: shuffledHashes },
      }),
    });
  }

  async disconnect(): Promise<void> {
    this.setConnectionStatus(false);
    this.stopPolling();
  }
}

export function SecretCartesiMultiplayer(cartesifyOpts: CartesifyOpts) {
  return (transportOpts: SecretTransportOpts) =>
    new SecretCartesifyTransport({
      ...cartesifyOpts,
      ...transportOpts,
    });
}

export default SecretCartesifyTransport;
