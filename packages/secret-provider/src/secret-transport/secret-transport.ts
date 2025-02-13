/*
 * Copyright 2017 The boardgame.io Authors
 *
 * Use of this source code is governed by a MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

/**
 * Base Transport class for secret management
 * Handles communication between secret-provider and Cartesi Machine
 */
export interface SecretTransportOpts {
  server?: string;
  dappAddress: string;
  nodeUrl?: string;
  matchID?: string;
}

export abstract class SecretTransport {
  protected url: string;
  protected matchID: string;
  protected pollingInterval = 1000;
  protected pollingEnabled: boolean;
  isConnected = false;

  constructor(opts: SecretTransportOpts) {
    this.url = opts.server || "http://localhost:4001";
    this.matchID = opts.matchID || "default";
    this.pollingEnabled = false;
  }

  /** Start polling mechanism */
  protected startPolling(): void {
    this.pollingEnabled = true;
    this.doPoll();
  }

  /** Stop polling mechanism */
  protected stopPolling(): void {
    this.pollingEnabled = false;
  }

  /** Poll for updates */
  protected abstract doPoll(): Promise<void>;

  /** Connect to secret provider */
  abstract connect(): Promise<void>;

  /** Disconnect from secret provider */
  abstract disconnect(): Promise<void>;

  /** Send shuffled deck hashes to Cartesi */
  abstract sendShuffledDeck(
    hashes: Array<{ key: string; hash: string }>
  ): Promise<void>;

  /** Update match identifier */
  abstract updateMatchID(id: string): void;

  /** Update connection status */
  protected setConnectionStatus(isConnected: boolean): void {
    this.isConnected = isConnected;
  }

  /** Notify client of updates */
  protected notifyClient(data: any): void {
    // Implementación opcional para subclases
  }
}
