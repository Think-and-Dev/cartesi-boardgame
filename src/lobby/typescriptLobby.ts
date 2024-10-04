//* Version typescript de React.txs en directorio lobby.

import Cookies from 'js-cookie'; // Cambiado de 'react-cookies' a 'js-cookie'
import { ethers } from 'ethers';
import { Client } from '../client/react';
import { MCTSBot } from '../ai/mcts-bot';
import { Local } from '../client/transport/local';
import type { GameComponent } from './connection';
import { LobbyConnection } from './connection';
import type { MatchOpts } from './match-instance';
import type { LobbyAPI } from '../types';
import { CartesiMultiplayer } from '../client/transport/cartesify-transport';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export enum LobbyPhases {
  ENTER = 'enter',
  PLAY = 'play',
  LIST = 'list',
}

type RunningMatch = {
  app: ReturnType<typeof Client>;
  matchID: string;
  playerID: string;
  credentials?: string;
};

type LobbyConfig = {
  gameComponents: any;
  lobbyServer?: string;
  gameServer?: string;
  debug?: boolean;
  clientFactory?: typeof Client;
  refreshInterval?: number;
  nodeUrl: string;
  dappAddress: string;
  signer: ethers.Signer;
};

type LobbyState = {
  phase: LobbyPhases;
  playerName: string;
  runningMatch?: any;
  errorMsg: string;
  credentialStore: { [playerName: string]: string };
  signer?: ethers.Signer;
};

//* iniciamos el estado (this.state). el equivalente a propiedad state en ejemplo React.
export class Lobby {
  public connection?: ReturnType<typeof LobbyConnection>;
  private config: LobbyConfig;
  public state: LobbyState;
  private _currentInterval?: NodeJS.Timeout;

  constructor(config: LobbyConfig) {
    this.config = config;
    this.state = {
      phase: LobbyPhases.ENTER,
      playerName: 'Visitor',
      runningMatch: undefined,
      errorMsg: '',
      credentialStore: {},
      signer: undefined,
    };
    this._createConnection();
  }

  //* Inicializamos el estado del juego.
  ///!
  async initialize() {
    // Leer la cookie con Cookies.get
    const cookie = Cookies.get('lobbyState');
    let cookieData: any = {};

    if (cookie) {
      try {
        // Intentar convertir a JSON solo si es necesario
        cookieData = typeof cookie === 'string' ? JSON.parse(cookie) : cookie;
      } catch (error) {
        console.error('Error parsing lobbyState cookie:', error);
      }
    }

    console.log('Contenido de la cookie lobbyState:', cookieData); // Para verificar el contenido

    if (cookieData.phase && cookieData.phase === LobbyPhases.PLAY) {
      cookieData.phase = LobbyPhases.LIST;
    }
    if (cookieData.phase && cookieData.phase !== LobbyPhases.ENTER) {
      this._startRefreshInterval();
    }

    // Actualizar el estado con los valores obtenidos de la cookie
    this.state = {
      ...this.state,
      phase: cookieData.phase || LobbyPhases.ENTER,
      playerName: cookieData.playerName || 'Visitor',
      credentialStore: cookieData.credentialStore || {},
    };

    await this._initializeEthereum();
  }

  enterLobby(playerName: string) {
    this.state.playerName = playerName;
    this.state.phase = LobbyPhases.LIST;

    // Almacenar la cookie como JSON string
    Cookies.set(
      'lobbyState',
      JSON.stringify({
        phase: this.state.phase,
        playerName: this.state.playerName,
        credentialStore: this.state.credentialStore,
      })
    );
    console.log('PlayerName stored in state:', this.state.playerName);
    console.log('phase stored in state:', this.state.phase);
    console.log('credentialStore stored in state:', this.state.credentialStore);

    console.log('Entrando al lobby, actualizando partidas');
    this._startRefreshInterval(); // Esto asegura que se actualicen las partidas periódicamente
  }

  //* Equivalente a 'componentDidUpdate' para crear o actualizar la conexión
  private _createConnection() {
    const name = this.state.playerName;
    console.log('name in typescriptLobby:', name);

    console.log('name in _createConnection:', name);

    this.connection = LobbyConnection({
      gameComponents: this.config.gameComponents,
      playerName: name,
      playerCredentials: this.state.credentialStore[name],
      nodeUrl: this.config.nodeUrl,
      server: this.config.lobbyServer,
      dappAddress: this.config.dappAddress,
      signer: this.state.signer,
    });
  }

  private async _initializeEthereum() {
    if (window.ethereum) {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        this.state.signer = signer;
        this._createConnection();
      } catch (error) {
        console.error('Failed to initialize Ethereum signer:', error);
        this.state.errorMsg = 'Failed to connect to Ethereum wallet';
      }
    } else {
      console.error(
        'Ethereum object not found, do you have MetaMask installed?'
      );
      this.state.errorMsg = 'Ethereum wallet not detected';
    }
  }

  public _startRefreshInterval() {
    this._clearRefreshInterval();
    this._currentInterval = setInterval(
      () => this._updateConnection(),
      this.config.refreshInterval || 10000 //!cambiar luego a 2000
    );
  }

  //* Equivalente a 'componentWillUnmount' para limpiar intervalos.
  public _clearRefreshInterval() {
    if (this._currentInterval) clearInterval(this._currentInterval);
  }

  async _updateConnection() {
    await this.connection?.refresh();
    //* FUNCIONAAA EL REFRESHHHHHHHHHHHH!!!!!
    console.log('Conexión actualizada:', this.connection.matches);
    //* Las partidas se muestran.
  }

  async createMatch(gameName: string, numPlayers: number) {
    try {
      await this.connection?.create(gameName, numPlayers);
      await this._updateConnection();
    } catch (error) {
      console.error('Error creating match:', error);
      this.state.errorMsg = error.message;
    }
  }

  async joinMatch(gameName: string, matchID: string, playerID: string) {
    try {
      await this.connection?.join(gameName, matchID, playerID);
      await this._updateConnection();
      const { playerName, playerCredentials } = this.connection || {};
      if (playerName && playerCredentials) {
        this._updateCredentials(playerName, playerCredentials);
      }
    } catch (error) {
      this.state.errorMsg = error.message;
    }
  }

  private _updateCredentials(playerName: string, credentials: string) {
    this.state.credentialStore[playerName] = credentials;
    Cookies.set(
      'lobbyState',
      JSON.stringify({
        phase: this.state.phase,
        playerName: this.state.playerName,
        credentialStore: this.state.credentialStore,
      }),
      { path: '/' }
    );
  }

  async leaveMatch(gameName: string, matchID: string) {
    try {
      await this.connection?.leave(gameName, matchID);
      await this._updateConnection();
    } catch (error) {
      this.state.errorMsg = error.message;
    }
  }

  async startMatch(gameName: string, matchOpts: MatchOpts) {
    const gameCode = this.connection?._getGameComponents(gameName);
    console.log('gameCode in startMatch', gameCode);

    if (!gameCode) {
      this.state.errorMsg = `Game ${gameName} not supported`;
      return;
    }

    let multiplayer;
    if (matchOpts.numPlayers > 1) {
      try {
        let signer: ethers.Signer;
        if (window.ethereum) {
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          const provider = new ethers.BrowserProvider(window.ethereum);
          signer = await provider.getSigner();
        } else {
          throw new Error(
            'Ethereum object not found, do you have MetaMask installed?'
          );
        }

        multiplayer = CartesiMultiplayer({
          server: 'http://localhost:8000',
          dappAddress: '0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e',
          nodeUrl: 'http://localhost:8080',
          signer: signer,
        });
      } catch (error) {
        console.error('Error creating Cartesify multiplayer:', error);
        this.state.errorMsg = error.message;
        return;
      }
    } else {
      const maxPlayers = gameCode.game.maxPlayers;
      const bots: { [id: string]: typeof MCTSBot } = {};
      for (let i = 1; i < maxPlayers; i++) {
        bots[i + ''] = MCTSBot;
      }
      multiplayer = Local({ bots });
    }

    const app = this.config.clientFactory?.({
      game: gameCode.game,
      board: gameCode.board,
      debug: this.config.debug,
      multiplayer,
    });

    const match = {
      app: app!,
      matchID: matchOpts.matchID,
      playerID: matchOpts.numPlayers > 1 ? matchOpts.playerID : '0',
      credentials: this.connection?.playerCredentials,
    };

    this._clearRefreshInterval();
    this.state.phase = LobbyPhases.PLAY;
    this.state.runningMatch = match;
  }
}
