/*
 * Copyright 2018 The boardgame.io Authors.
 *
 * Use of this source code is governed by a MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import React from 'react';
import { Client } from 'boardgame.io/react';
import { CartesiMultiplayer } from '@think-and-dev/cartesi-boardgame/multiplayer';
import ChessGame from './game';
import ChessBoard from './board';

const App = Client({
  game: ChessGame,
  board: ChessBoard,
  multiplayer: CartesiMultiplayer({
    server: 'http://localhost:8000',
    dappAddress: '0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e',
    nodeUrl: 'http://localhost:8080',
  }),
});

const Multiplayer = (playerID) => () =>
  (
    <div style={{ padding: 50 }}>
      <App matchID="multi" playerID={playerID} />
      PlayerID: {playerID}
    </div>
  );

export default Multiplayer;
