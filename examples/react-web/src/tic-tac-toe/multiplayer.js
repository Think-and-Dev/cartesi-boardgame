import React, { useState, useEffect } from 'react';
import { Client } from 'cartesi-boardgame/react';
import { CartesiMultiplayer } from 'cartesi-boardgame/multiplayer';
import TicTacToe from './game';
import Board from './board';
import { BrowserProvider } from 'ethers';

const Multiplayer = () => {
  const [signer, setSigner] = useState(null);

  useEffect(() => {
    async function fetchSigner() {
      if (!window.ethereum) {
        alert('Please install MetaMask to play this game');
        return;
      }
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      setSigner(signer);
    }
    fetchSigner();
  }, []);

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
