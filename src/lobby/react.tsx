import React from 'react';
import Cookies from 'react-cookies';
import PropTypes from 'prop-types';
import type { DebugOpt } from '../client/client';
import { Client } from '../client/react';
import { MCTSBot } from '../ai/mcts-bot';
import { Local } from '../client/transport/local';
import type { GameComponent } from './connection';
import { LobbyConnection } from './connection';
import LobbyLoginForm from './login-form';
import type { MatchOpts } from './match-instance';
import LobbyMatchInstance from './match-instance';
import LobbyCreateMatchForm from './create-match-form';
import type { LobbyAPI } from '../types';
import { CartesiMultiplayer } from '../client/transport/cartesify-transport';
import { ethers } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

enum LobbyPhases {
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

type LobbyProps = {
  gameComponents: GameComponent[];
  lobbyServer?: string;
  gameServer?: string;
  debug?: DebugOpt | boolean;
  clientFactory?: typeof Client;
  refreshInterval?: number;
  renderer?: (args: {
    errorMsg: string;
    gameComponents: GameComponent[];
    matches: LobbyAPI.MatchList['matches'];
    phase: LobbyPhases;
    playerName: string;
    runningMatch?: RunningMatch;
    handleEnterLobby: (playerName: string) => void;
    handleExitLobby: () => Promise<void>;
    handleCreateMatch: (gameName: string, numPlayers: number) => Promise<void>;
    handleJoinMatch: (
      gameName: string,
      matchID: string,
      playerID: string
    ) => Promise<void>;
    handleLeaveMatch: (gameName: string, matchID: string) => Promise<void>;
    handleExitMatch: () => void;
    handleRefreshMatches: () => Promise<void>;
    handleStartMatch: (gameName: string, matchOpts: MatchOpts) => void;
  }) => JSX.Element;
  nodeUrl: string;
  dappAddress: string
  signer: ethers.Signer;
};

type LobbyState = {
  phase: LobbyPhases;
  playerName: string;
  runningMatch?: RunningMatch;
  errorMsg: string;
  credentialStore?: { [playerName: string]: string };
  signer?: ethers.Signer;
};

/**
 * Lobby Component
 * 
 * This React component serves as the main interface for the game lobby.
 * It manages the lobby's state, including user authentication, game creation,
 * joining matches, and transitioning between different lobby phases.
 * 
 * The component integrates with the LobbyConnection to communicate with the server
 * and uses various sub-components to render different parts of the lobby interface.
 * 
 * @param {Array}  gameComponents - An array of Board and Game objects for the supported games.
 * @param {string} lobbyServer - Address of the lobby server (for example 'localhost:8000').
 *                               If not set, defaults to the server that served the page.
 * @param {string} gameServer - Address of the game server (for example 'localhost:8001').
 *                              If not set, defaults to the server that served the page.
 * @param {function} clientFactory - Function that is used to create the game clients.
 * @param {number} refreshInterval - Interval between server updates (default: 2000ms).
 * @param {bool}   debug - Enable debug information (default: false).
 *
 * Returns:
 *   A React component that provides a UI to create, list, join, leave, play or
 *   spectate matches (game instances).
*/
class Lobby extends React.Component<LobbyProps, LobbyState> {
  static propTypes = {
    gameComponents: PropTypes.array.isRequired,
    lobbyServer: PropTypes.string,
    gameServer: PropTypes.string,
    debug: PropTypes.bool,
    clientFactory: PropTypes.func,
    refreshInterval: PropTypes.number,
  };

  static defaultProps = {
    debug: false,
    clientFactory: Client,
    refreshInterval: 2000,
  };

  // state = {
  state: LobbyState = {
    phase: LobbyPhases.ENTER,
    playerName: 'Visitor',
    runningMatch: null,
    errorMsg: '',
    credentialStore: {},
    signer: null,
  };

  private connection?: ReturnType<typeof LobbyConnection>;
  private _currentInterval?: NodeJS.Timeout;

  /**
   * Initializes the component, setting up the LobbyConnection and loading saved state.
   */
  constructor(props: LobbyProps) {
    super(props);
    this._createConnection(this.props);
    // this._initializeEthereum();
  }

  /**
   * Lifecycle method: Loads saved state from cookies and initializes Ethereum connection.
   */
  componentDidMount() {
    const cookie = Cookies.load('lobbyState') || {};
    if (cookie.phase && cookie.phase === LobbyPhases.PLAY) {
      cookie.phase = LobbyPhases.LIST;
    }
    if (cookie.phase && cookie.phase !== LobbyPhases.ENTER) {
      this._startRefreshInterval();
    }
    this.setState({
      phase: cookie.phase || LobbyPhases.ENTER,
      playerName: cookie.playerName || 'Visitor',
      credentialStore: cookie.credentialStore || {},
    });
    this._initializeEthereum();
  }

  /**
   * Lifecycle method: Updates the connection when relevant state changes.
   */
  componentDidUpdate(prevProps: LobbyProps, prevState: LobbyState) {
    const name = this.state.playerName;
    const creds = this.state.credentialStore[name];
    if (
      prevState.phase !== this.state.phase ||
      prevState.credentialStore[name] !== creds ||
      prevState.playerName !== name
    ) {
      this._createConnection(this.props);
      this._updateConnection();
      const cookie = {
        phase: this.state.phase,
        playerName: name,
        credentialStore: this.state.credentialStore,
      };
      Cookies.save('lobbyState', cookie, { path: '/' });
    }
    if (prevProps.refreshInterval !== this.props.refreshInterval) {
      this._startRefreshInterval();
    }
  }

  /**
   * Lifecycle method: Cleans up intervals when the component is unmounted.
   */
  componentWillUnmount() {
    this._clearRefreshInterval();
  }

  _startRefreshInterval() {
    this._clearRefreshInterval();
    this._currentInterval = setInterval(
      this._updateConnection,
      this.props.refreshInterval
    );
  }

  _clearRefreshInterval() {
    clearInterval(this._currentInterval);
  }

  /**
   * Initializes the Ethereum connection for the lobby.
   * This method attempts to connect to the user's Ethereum wallet (e.g., MetaMask).
   */
  _initializeEthereum = async () => {
    if (window.ethereum) {
      try {
        await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        this.setState({ signer }, () => {
          this._createConnection(this.props);
        });
      } catch (error) {
        console.error("Failed to initialize Ethereum signer:", error);
        this.setState({ errorMsg: "Failed to connect to Ethereum wallet" });
      }
    } else {
      console.error("Ethereum object not found, do you have MetaMask installed?");
      this.setState({ errorMsg: "Ethereum wallet not detected" });
    }
  }

  /**
   * Creates or updates the LobbyConnection based on current props and state.
   */
  _createConnection = (props: LobbyProps) => {
    const name = this.state.playerName;
    this.connection = LobbyConnection({
      gameComponents: props.gameComponents,
      playerName: name,
      playerCredentials: this.state.credentialStore[name],
      nodeUrl: props.nodeUrl,
      server: props.lobbyServer,
      dappAddress: props.dappAddress,
      signer: this.state.signer,
    });
  };

  /**
   * Updates the player's credentials in the state.
   */
  _updateCredentials = (playerName: string, credentials: string) => {
    this.setState((prevState) => {
      // clone store or componentDidUpdate will not be triggered
      const store = Object.assign({}, prevState.credentialStore);
      store[playerName] = credentials;
      return { credentialStore: store };
    });
  };

  /**
   * Refreshes the lobby state by fetching updated information from the server.
   */
  _updateConnection = async () => {
    await this.connection.refresh();
    this.forceUpdate();
  };

  /**
   * Handles the player entering the lobby.
   */
  _enterLobby = (playerName: string) => {
    this._startRefreshInterval();
    this.setState({ playerName, phase: LobbyPhases.LIST });
  };

  /**
   * Handles the player exiting the lobby.
   */
  _exitLobby = async () => {
    this._clearRefreshInterval();
    await this.connection.disconnect();
    this.setState({ phase: LobbyPhases.ENTER, errorMsg: '' });
  };

  /**
   * Creates a new match for the specified game.
   */
  _createMatch = async (gameName: string, numPlayers: number) => {
    try {
      await this.connection.create(gameName, numPlayers);
      await this.connection.refresh();
      // rerender
      this.setState({});
    } catch (error) {
      console.error('Error in _createMatch:', error); // Add
      this.setState({ errorMsg: error.message });
    }
  };

  /**
   * Joins an existing match.
   */
  _joinMatch = async (gameName: string, matchID: string, playerID: string) => {
    try {
      await this.connection.join(gameName, matchID, playerID);
      await this.connection.refresh();
      this._updateCredentials(
        this.connection.playerName,
        this.connection.playerCredentials
      );
    } catch (error) {
      this.setState({ errorMsg: error.message });
    }
  };

  /**
   * Leaves the current match.
   */
  _leaveMatch = async (gameName: string, matchID: string) => {
    try {
      await this.connection.leave(gameName, matchID);
      await this.connection.refresh();
      this._updateCredentials(
        this.connection.playerName,
        this.connection.playerCredentials
      );
    } catch (error) {
      this.setState({ errorMsg: error.message });
    }
  };

  /**
   * Starts a match, setting up the game client and transitioning to the play phase.
   */
  _startMatch = async (gameName: string, matchOpts: MatchOpts) => {
    const gameCode = this.connection._getGameComponents(gameName);
    if (!gameCode) {
      this.setState({
        errorMsg: 'game ' + gameName + ' not supported',
      });
      return;
    }

    let multiplayer = undefined;
    if (matchOpts.numPlayers > 1) {
      try {
        let signer: ethers.Signer;
        if (window.ethereum) {
          await window.ethereum.request({ method: 'eth_requestAccounts' });
          const provider = new ethers.BrowserProvider(window.ethereum);
          signer = await provider.getSigner();
        } else {
          throw new Error("Ethereum object not found, do you have MetaMask installed?");
        }

        multiplayer = CartesiMultiplayer({
          server: 'http://localhost:8000',
          dappAddress: '0xab7528bb862fB57E8A2BCd567a2e929a0Be56a5e',
          nodeUrl: 'http://localhost:8080',
          signer: signer,
        });
      } catch (error) {
        console.error('Error creating Cartesify multiplayer:', error);
        this.setState({ errorMsg: error.message });
        return;
      }
    }

    if (matchOpts.numPlayers == 1) {
      const maxPlayers = gameCode.game.maxPlayers;
      const bots = {};
      for (let i = 1; i < maxPlayers; i++) {
        bots[i + ''] = MCTSBot;
      }
      multiplayer = Local({ bots });
    }

    const app = this.props.clientFactory({
      game: gameCode.game,
      board: gameCode.board,
      debug: this.props.debug,
      multiplayer,
    });

    const match = {
      app: app,
      matchID: matchOpts.matchID,
      playerID: matchOpts.numPlayers > 1 ? matchOpts.playerID : '0',
      credentials: this.connection.playerCredentials,
    };

    this._clearRefreshInterval();
    this.setState({ phase: LobbyPhases.PLAY, runningMatch: match });
  };

  /**
   * Exits the current match and returns to the lobby.
   */
  _exitMatch = () => {
    this._startRefreshInterval();
    this.setState({ phase: LobbyPhases.LIST, runningMatch: null });
  };

  _getPhaseVisibility = (phase: LobbyPhases) => {
    return this.state.phase !== phase ? 'hidden' : 'phase';
  };

  /**
   * Renders the list of available matches.
   */
  renderMatches = (
    matches: LobbyAPI.MatchList['matches'],
    playerName: string
  ) => {
    return matches.map((match) => {
      const { matchID, gameName, players } = match;
      const uniqueKey = `${gameName}-${matchID}-${Date.now()}`;
      return (
        <LobbyMatchInstance
          // key={'instance-' + matchID}
          key={uniqueKey}
          match={{ matchID, gameName, players: Object.values(players) }}
          playerName={playerName}
          onClickJoin={this._joinMatch}
          onClickLeave={this._leaveMatch}
          onClickPlay={this._startMatch}
        />
      );
    });
  };

  /**
   * Renders the main lobby interface, including login, match list, and game interface.
   */
  render() {
    const { gameComponents, renderer } = this.props;
    const { errorMsg, playerName, phase, runningMatch } = this.state;

    if (renderer) {
      return renderer({
        errorMsg,
        gameComponents,
        matches: this.connection.matches,
        phase,
        playerName,
        runningMatch,
        handleEnterLobby: this._enterLobby,
        handleExitLobby: this._exitLobby,
        handleCreateMatch: this._createMatch,
        handleJoinMatch: this._joinMatch,
        handleLeaveMatch: this._leaveMatch,
        handleExitMatch: this._exitMatch,
        handleRefreshMatches: this._updateConnection,
        handleStartMatch: this._startMatch,
      });
    }

    return (
      <div id="lobby-view" style={{ padding: 50 }}>
        <div className={this._getPhaseVisibility(LobbyPhases.ENTER)}>
          <LobbyLoginForm
            key={playerName}
            playerName={playerName}
            onEnter={this._enterLobby}
          />
        </div>

        <div className={this._getPhaseVisibility(LobbyPhases.LIST)}>
          <p>Welcome, {playerName}</p>

          <div className="phase-title" id="match-creation">
            <span>Create a match:</span>
            <LobbyCreateMatchForm
              games={gameComponents}
              createMatch={this._createMatch}
            />
          </div>
          <p className="phase-title">Join a match:</p>
          <div id="instances">
            <table>
              <tbody>
                {this.renderMatches(this.connection.matches, playerName)}
              </tbody>
            </table>
            <span className="error-msg">
              {errorMsg}
              <br />
            </span>
          </div>
          <p className="phase-title">
            Matches that become empty are automatically deleted.
          </p>
        </div>

        <div className={this._getPhaseVisibility(LobbyPhases.PLAY)}>
          {runningMatch && (
            <runningMatch.app
              matchID={runningMatch.matchID}
              playerID={runningMatch.playerID}
              credentials={runningMatch.credentials}
            />
          )}
          <div className="buttons" id="match-exit">
            <button onClick={this._exitMatch}>Exit match</button>
          </div>
        </div>

        <div className="buttons" id="lobby-exit">
          <button onClick={this._exitLobby}>Exit lobby</button>
        </div>
      </div>
    );
  }
}

export default Lobby;