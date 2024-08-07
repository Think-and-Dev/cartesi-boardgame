/*
 * Copyright 2017 The boardgame.io Authors
 *
 * Use of this source code is governed by a MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import React from 'react';
import { Client } from 'boardgame.io/react';
import { CartesiMultiplayer } from '@think-and-dev/cartesi-boardgame/multiplayer';
import TicTacToe from './game';
import Board from './board';

const App = Client({
  game: TicTacToe,
  board: Board,
  debug: false,
  multiplayer: CartesiMultiplayer({
    server: 'http://localhost:8000',
    dappAddress: '0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e',
    nodeUrl: 'http://localhost:8080',
  }),
});

const Multiplayer = () => (
  <div>
    <h1>Multiplayer</h1>
    <div className="runner" style={{ maxWidth: '600px' }}>
      <div className="run">
        <App matchID="multi" playerID="0" />
        &lt;App playerID=&quot;0&quot;/&gt;
      </div>
      <div className="run">
        <App matchID="multi" playerID="1" />
        &lt;App playerID=&quot;1&quot;/&gt;
      </div>
    </div>
  </div>
);

export default Multiplayer;
