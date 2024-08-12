import React from 'react';
import { Client } from 'boardgame.io/react';
import { CartesiMultiplayer } from '@think-and-dev/cartesi-boardgame/multiplayer';
import TicTacToe from './game';
import Board from './board';
import { useMetaMask } from './metamaskSigner';

const Multiplayer = () => {
  const signer = useMetaMask();

  if (!signer) {
    return <div>Loading...</div>;
  }

  const App = Client({
    game: TicTacToe,
    board: Board,
    debug: false,
    multiplayer: CartesiMultiplayer({
      server: 'http://localhost:8000',
      dappAddress: '0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e',
      nodeUrl: 'http://localhost:8080',
      signer: signer,
    }),
  });

  return (
    <div>
      <h1>Multiplayer</h1>
      <div className="runner" style={{ maxWidth: '600px' }}>
        <div className="run">
          <App matchID="multi" playerID="0" />
          <App playerID="0" />
        </div>
        <div className="run">
          <App matchID="multi" playerID="1" />
          <App playerID="1" />
        </div>
      </div>
    </div>
  );
};

export default Multiplayer;
