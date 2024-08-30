import React from 'react';
import { Lobby } from 'boardgame.io/react';
import { LobbyClient } from '../../../../src/lobby/client';
import { default as BoardTicTacToe } from '../tic-tac-toe/board';
import { default as GameTicTacToe } from '../tic-tac-toe/game';
import './lobby.css';

GameTicTacToe.minPlayers = 1;
GameTicTacToe.maxPlayers = 2;

const serverURL = `http://localhost:8000`;
const nodeURL = `http://localhost:8080`;
console.log(
  'Creating LobbyClient with server:',
  serverURL,
  'and node:',
  nodeURL
);

const importedGames = [{ game: GameTicTacToe, board: BoardTicTacToe }];

const LobbyView = () => (
  <div style={{ padding: 50 }}>
    <h1>Lobby</h1>

    <Lobby
      gameServer={serverURL}
      lobbyServer={serverURL}
      gameComponents={importedGames}
      nodeURL={nodeURL}
    />
  </div>
);

export default LobbyView;
