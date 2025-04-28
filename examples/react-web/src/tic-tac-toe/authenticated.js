/*
 * Copyright 2018 The boardgame.io Authors
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
import PropTypes from 'prop-types';
import request from 'superagent';

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

class AuthenticatedClient extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      matchID: 'matchID',
      players: [],
      credentials: '',
    };
  }

  async componentDidMount() {
    const { matchID } = this.state;
    const response = await request
      .get(`http://${hostname}:8000/matches/tic-tac-toe/${matchID}`)
      .set('Accept', 'application/json');

    this.setState({ players: response.body.players });
  }

  render() {
    const { matchID, players } = this.state;
    return (
      <div>
        <App
          matchID={matchID}
          playerID="0"
          credentials="optional-credentials"
        />
        <div>
          <h3>Players:</h3>
          <ul>
            {players.map((player) => (
              <li key={player.id}>{player.name}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
}

AuthenticatedClient.propTypes = {
  matchID: PropTypes.string,
  playerID: PropTypes.string,
  credentials: PropTypes.string,
};

export default AuthenticatedClient;
