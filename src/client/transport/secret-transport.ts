/*
 * Copyright 2017 The boardgame.io Authors
 *
 * Use of this source code is governed by a MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import type { ProcessGameConfig } from '../../core/game';
import type { Game } from '../../types';

export interface SecretTransportOpts {
  transportDataCallback: (data: any) => void;
  gameName?: string;
  gameKey: Game;
  game: ReturnType<typeof ProcessGameConfig>;
  matchID?: string;
  numPlayers?: number;
  server?: string;
}

export abstract class Transport {
  protected gameName: string;
  protected matchID: string;
  protected numPlayers: number;
  private transportDataCallback: (data: any) => void;
  private connectionStatusCallback: () => void = () => {};
  isConnected = false;

  constructor({
    transportDataCallback,
    gameName,
    matchID,
    numPlayers,
  }: SecretTransportOpts) {
    this.transportDataCallback = transportDataCallback;
    this.gameName = gameName || 'default';
    this.matchID = matchID || 'default';
    this.numPlayers = numPlayers || 2;
  }

  /** Subscribe to connection state changes. */
  subscribeToConnectionStatus(fn: () => void): void {
    this.connectionStatusCallback = fn;
  }

  /** Transport implementations should call this when they connect/disconnect. */
  protected setConnectionStatus(isConnected: boolean): void {
    this.isConnected = isConnected;
    this.connectionStatusCallback();
  }

  /** Transport implementations should call this when they receive data from a master. */
  protected notifyClient(data: any): void {
    this.transportDataCallback(data);
  }

  /** Called by the client to connect the transport. */
  abstract connect(): void;
  /** Called by the client to disconnect the transport. */
  abstract disconnect(): void;
  /** Called by the client to request a sync action from the transport. */
  abstract requestSync(): void;
  /** Called by the client to update the matchID it wants to connect to. */
  abstract updateMatchID(id: string): void;
}
