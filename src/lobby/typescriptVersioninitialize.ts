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
import { TicTacToe } from '../../examples/typescript/src/Game';
import { Board } from '../../examples/typescript/src/Board';

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
  onUpdate?: () => void; // <-- Definir el callback opcional
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
    this.onUpdate = config.onUpdate;
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
    console.log('this.state in initialize:', this.state);

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
      this.onUpdate(); // Asegurarse de que onUpdate se llama después de refrescar
    }
  }

  async createMatch(gameName: string, numPlayers: number) {
    try {
      await this.connection?.create(gameName, numPlayers);
      await this.connection?.refresh();

      //*Prueba refrescar pagina.
      window.location.reload();
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

  //* ACA trabajo actualmente.

  // Dentro de la clase Lobby

  async startMatch(gameName: string, matchOpts: MatchOpts) {
    console.log('Iniciando startMatch en typescriptLobby');

    const gameCode = this.connection?._getGameComponents(gameName);
    if (!gameCode) {
      this.state.errorMsg = `Game ${gameName} no es soportado`;
      return;
    }

    // Llama a initializeClient para configurar y renderizar el tablero
    this.initializeClient(matchOpts.playerID, matchOpts.matchID);

    // Actualiza el estado del lobby
    this.state.phase = LobbyPhases.PLAY;
    this.state.runningMatch = {
      matchID: matchOpts.matchID,
      playerID: matchOpts.playerID,
    };

    console.log('Juego iniciado con éxito en startMatch');
  }

  private initializeClient(playerID: string, matchID: string) {
    const appElement = document.getElementById('game-container');
    if (!appElement) {
      console.error('Elemento game-container no encontrado');
      return;
    }

    // Define la función para regresar al lobby
    const backToLobby = () => {
      appElement.innerHTML = '';
      this.enterLobby(this.state.playerName);
      console.log('Regresando al lobby');
    };

    // Crea y renderiza el tablero de juego
    new Board(appElement, this.config.signer, playerID, matchID, backToLobby);
    console.log('initializeClient ha renderizado el tablero.');
  }
}
