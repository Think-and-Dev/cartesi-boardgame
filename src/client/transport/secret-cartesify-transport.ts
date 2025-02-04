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

/**
 * Secret Cartesi Transport
 * Handles communication between the secret-ßprovider and Cartesi Machine
 * specifically for secret management (hashed deck)
 */
export class SecretCartesifyTransport extends Transport {
  /**
   * Creates a new instance of SecretCartesifyTransport
   * @param opts - Configuration options for the transport
   */
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

  /**
   * Establishes connection with the secret provider
   * Initializes polling and sync mechanisms
   */
  async connect(): Promise<void> {
    try {
      await this.requestSync();
      this.startPolling();
      this.setConnectionStatus(true);
    } catch (error) {
      console.error('Error connecting to backend:', error);
    }
  }

  /**
   * Polls the secret provider for updates
   * Handles data retrieval and client notifications
   */
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

  /**
   * Starts the polling mechanism
   * Used to keep the connection alive and receive updates
   */
  startPolling(): void {
    this.pollingEnabled = true;
    this.doPoll();
  }

  /**
   * Stops the polling mechanism
   * Called during disconnect or cleanup
   */
  stopPolling(): void {
    this.pollingEnabled = false;
  }

  /**
   * Requests synchronization with the secret provider
   * Ensures the client has the latest state
   */
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

  /**
   * Updates the match identifier
   * Triggers a sync to ensure consistency
   * @param id - New match ID
   */
  updateMatchID(id: string): void {
    this.matchID = id;
    this.requestSync();
  }

  /**
   * Sends shuffled deck hashes to the Cartesi Machine
   * Uses the advance endpoint to record the deck state on-chain
   * @param shuffledHashes - Array of card hashes with their keys
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

  /**
   * Disconnects from the secret provider
   * Cleans up resources and stops polling
   */
  async disconnect(): Promise<void> {
    this.setConnectionStatus(false);
    this.stopPolling();
  }
}

/**
 * Factory function to create a SecretCartesifyTransport instance
 * @param cartesifyOpts - Cartesi-specific configuration options
 */
export function SecretCartesiMultiplayer(cartesifyOpts: CartesifyOpts) {
  return (transportOpts: SecretTransportOpts) =>
    new SecretCartesifyTransport({
      ...cartesifyOpts,
      ...transportOpts,
    });
}

export default SecretCartesifyTransport;
