//* Version typescript de React.txs en directorio lobby.

import Cookies from 'js-cookie'; // Cambiado de 'react-cookies' a 'js-cookie'
import { ethers } from 'ethers';
import { Client } from '../client/react';
import { VanillaClient } from '../client/vanillaClient';
import { MCTSBot } from '../ai/mcts-bot';
import { Local } from '../client/transport/local';
import type { GameComponent } from './connection';
import { LobbyConnection } from './connection';
import type { MatchOpts } from './match-instance';
import type { LobbyAPI } from '../types';
import { CartesiMultiplayer } from '../client/transport/cartesify-transport';
import { renderLobby } from './vanillaLobbyRender';

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
  app: VanillaClient<any>; // de Client a VanillaClient
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
  onUpdate?: () => void;
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
  public config: LobbyConfig;
  public state: LobbyState;
  private _currentInterval?: NodeJS.Timeout;
  private onUpdate?: () => void; //

  constructor(config: LobbyConfig) {
    this.config = config;
    this.onUpdate = config.onUpdate || (() => {});
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

    this._startRefreshInterval(); // Esto asegura que se actualicen las partidas periódicamente
  }

  //* Equivalente a 'componentDidUpdate' para crear o actualizar la conexión
  private _createConnection() {
    const name = this.state.playerName;

    this.connection = LobbyConnection({
      gameComponents: this.config.gameComponents,
      playerName: name,
      playerCredentials: this.state.credentialStore[name],
      nodeUrl: this.config.nodeUrl,
      server: this.config.lobbyServer,
      dappAddress: this.config.dappAddress,
      signer: this.state.signer,
    });
    // console.log(
    //   'this.connection en _createConnection in typescriptLobby:',
    //   this.connection
    // );
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
      this.config.refreshInterval || 2000
    );
  }

  //* Equivalente a 'componentWillUnmount' para limpiar intervalos.
  public _clearRefreshInterval() {
    if (this._currentInterval) clearInterval(this._currentInterval);
  }

  async _updateConnection() {
    await this.connection?.refresh();

    if (this.onUpdate) {
      this.onUpdate();
    }
  }

  async createMatch(gameName: string, numPlayers: number) {
    try {
      await this.connection?.create(gameName, numPlayers);
      await this.connection?.refresh();
      console.log('gameName en createMatch in typescriptLobby:', gameName);
    } catch (error) {
      console.error('Error creating match:', error);
      this.state.errorMsg = error.message;
    }
  }

  async joinMatch(gameName: string, matchID: string, playerID: string) {
    try {
      console.log('gameName en joinMatch in typescriptLobby:', gameName);
      console.log('matchID en joinMatch in typescriptLobby:', matchID);
      console.log('playerID en joinMatch in typescriptLobby:', playerID);

      await this.connection?.join(gameName, matchID, playerID);
      await this._updateConnection();
      const { playerName, playerCredentials } = this.connection || {};
      console.log(
        'playerCredentials en joinMatch in typescriptLobby:',
        playerCredentials
      );

      if (playerName && playerCredentials) {
        this._updateCredentials(playerName, playerCredentials);
        console.log(
          'playerCredentials en joinMatch in typescriptLobby:',
          playerCredentials
        );
      }
    } catch (error) {
      this.state.errorMsg = error.message;
    }
  }

  private _updateCredentials(playerName: string, credentials: string) {
    this.state.credentialStore[playerName] = credentials;
    console.log(
      'credentialStore en _updateCredentials in typescriptLobby:',
      this.state.credentialStore
    );

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

  //* ACA trabajo actualmente.

  async startMatch(gameName: string, matchOpts: MatchOpts) {
    //* gameName in startMatch in typescriptLobby: tic-tac-toe OK
    //* Object { matchID: "TgdlFiykNK9", playerID: "1", numPlayers: 2 } OK

    const gameCode = this.connection?._getGameComponents(gameName);
    //*  Object { game: {…}, board: class Board}
    //* board: class Board { constructor(rootElement, signer, playerID, matchID, backToLobby) }​
    //* game: Object { name: "tic-tac-toe", minPlayers: 1, maxPlayers: 2, … }
    //* <prototype>: Object { … }

    if (!gameCode) {
      this.state.errorMsg = `Game ${gameName} not supported`;
      return;
    }

    let multiplayer = undefined;
    if (matchOpts.numPlayers > 1) {
      //* llega 2

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

    console.log('clientFactory en typescriptLobby:', this.config.clientFactory);

    const app = new VanillaClient({
      game: gameCode.game,
      board: gameCode.board,
      debug: this.config.debug,
      multiplayer,
      rootElement: document.getElementById('game-container')!, // Asegúrate de tener un elemento root adecuado en tu HTML
      matchID: matchOpts.matchID,
      playerID: matchOpts.playerID,
      credentials: this.connection?.playerCredentials,
    });

    console.log('app in startMatch in typescriptLobby:', app); //! app esta llegnado undefined.

    const match = {
      app: app!, //! undefined
      matchID: matchOpts.matchID, //* OK
      playerID: matchOpts.numPlayers > 1 ? matchOpts.playerID : '0', //* OK
      credentials: this.connection?.playerCredentials, //* OK
    };
    console.log('match in startMatch in typescriptLobby:', match);

    this._clearRefreshInterval();
    this.state.phase = LobbyPhases.PLAY;
    this.state.runningMatch = match;
  }
}
