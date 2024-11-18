/*
 * Copyright 2017 The boardgame.io Authors
 *
 * Use of this source code is governed by a MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import { Client as RawClient } from './client';
import type { ClientOpts, ClientState, _ClientImpl } from './client';

type WrappedBoardDelegates = 'matchID' | 'playerID' | 'credentials';

export type WrappedBoardProps = Pick<
  ClientOpts,
  WrappedBoardDelegates | 'debug'
>;

type ExposedClientProps<G extends any = any> = Pick<
  _ClientImpl<G>,
  | 'log'
  | 'moves'
  | 'events'
  | 'reset'
  | 'undo'
  | 'redo'
  | 'playerID'
  | 'matchID'
  | 'matchData'
  | 'sendChatMessage'
  | 'chatMessages'
>;

export type BoardProps<G extends any = any> = ClientState<G> &
  Omit<WrappedBoardProps, keyof ExposedClientProps<G>> &
  ExposedClientProps<G> & {
    isMultiplayer: boolean;
  };

type VanillaClientOpts<
  G extends any = any,
  P extends BoardProps<G> = BoardProps<G>,
  PluginAPIs extends Record<string, unknown> = Record<string, unknown>
> = Omit<ClientOpts<G, PluginAPIs>, WrappedBoardDelegates> & {
  board?: (props: P) => void; // Cambiado a función pura
  loading?: () => void; // Cambiado a función pura
};

export function Client<
  G extends any = any,
  P extends BoardProps<G> = BoardProps<G>,
  PluginAPIs extends Record<string, unknown> = Record<string, unknown>
>(opts: VanillaClientOpts<G, P, PluginAPIs>) {
  const { game, numPlayers, board, multiplayer, enhancer } = opts;
  let { loading, debug } = opts;

  if (loading === undefined) {
    loading = () => console.log('connecting...'); // Función de carga simple
  }

  type AdditionalProps = Omit<P, keyof BoardProps<G>>;

  return class WrappedBoard {
    client: _ClientImpl<G>;
    unsubscribe?: () => void;
    props: WrappedBoardProps & AdditionalProps;

    constructor(props: WrappedBoardProps & AdditionalProps) {
      this.props = props;

      if (debug === undefined) {
        debug = props.debug;
      }

      this.client = RawClient({
        game,
        debug,
        numPlayers,
        multiplayer,
        matchID: props.matchID,
        playerID: props.playerID,
        credentials: props.credentials,
        enhancer,
      });
    }

    componentDidMount() {
      this.unsubscribe = this.client.subscribe(() => this.update());
      this.client.start();
    }

    componentWillUnmount() {
      this.client.stop();
      this.unsubscribe?.();
    }

    componentDidUpdate(prevProps: WrappedBoardProps & AdditionalProps) {
      if (this.props.matchID !== prevProps.matchID) {
        this.client.updateMatchID(this.props.matchID);
      }
      if (this.props.playerID !== prevProps.playerID) {
        this.client.updatePlayerID(this.props.playerID);
      }
      if (this.props.credentials !== prevProps.credentials) {
        this.client.updateCredentials(this.props.credentials);
      }
    }

    update() {
      const state = this.client.getState();

      if (state === null) {
        loading();
        return;
      }

      if (board) {
        board({
          ...state,
          ...(this.props as P),
          isMultiplayer: !!multiplayer,
          moves: this.client.moves,
          events: this.client.events,
          matchID: this.client.matchID,
          playerID: this.client.playerID,
          reset: this.client.reset,
          undo: this.client.undo,
          redo: this.client.redo,
          log: this.client.log,
          matchData: this.client.matchData,
          sendChatMessage: this.client.sendChatMessage,
          chatMessages: this.client.chatMessages,
        });
      }
    }
  };
}
