import type { ComponentType } from 'react';
import { LobbyClient } from './client';
import type { Game, LobbyAPI } from '../types';
import { ethers } from 'ethers';

/**
 * Represents a game component, combining the game logic and its React component.
 */
export interface GameComponent {
  game: Game;
  board: ComponentType<any>;
}

/**
 * Options for initializing a LobbyConnection.
 */
interface LobbyConnectionOpts {
  server: string;
  nodeUrl: string;
  dappAddress: string;
  signer: ethers.Signer;
  playerName?: string;
  playerCredentials?: string;
  gameComponents: GameComponent[];
}

/**
 * LobbyConnection Class
 *
 * This class serves as a higher-level abstraction over the LobbyClient,
 * providing additional functionality for managing game matches and player interactions.
 * It maintains the state of the current player, available matches, and game components.
 */
class _LobbyConnectionImpl {
  client: LobbyClient;
  gameComponents: GameComponent[];
  playerName: string;
  playerCredentials?: string;
  matches: LobbyAPI.MatchList['matches'];

  /**
   * Creates a new LobbyConnection instance.
   *
   * @param opts - Configuration options for the LobbyConnection.
   */
  constructor({
    server,
    nodeUrl,
    dappAddress,
    signer,
    gameComponents,
    playerName,
    playerCredentials,
  }: LobbyConnectionOpts) {
    this.client = new LobbyClient({ server, nodeUrl, dappAddress, signer });
    this.gameComponents = gameComponents;
    this.playerName = playerName || 'Visitor';
    this.playerCredentials = playerCredentials;
    this.matches = [];
  }

  /**
   * Refreshes the list of available matches for all games.
   * This method should be called periodically to keep the match list up-to-date.
   *
   * @throws Will throw an error if unable to retrieve the list of matches.
   */
  async refresh() {
    try {
      this.matches = [];
      const games = await this.client.listGames();
      console.log('Lista de juegos obtenidos:', games);
      for (const game of games) {
        if (!this._getGameComponents(game)) continue;
        const { matches } = await this.client.listMatches(game);
        console.log(`Partidas obtenidas para el juego ${game}:`, matches);
        this.matches.push(...matches);
      }
      console.log('Lista final de partidas (matches):', this.matches);
    } catch (error) {
      throw new Error('failed to retrieve list of matches (' + error + ')');
    }
  }

  _getMatchInstance(matchID: string) {
    for (const inst of this.matches) {
      if (inst['matchID'] === matchID) return inst;
    }
  }

  _getGameComponents(gameName: string) {
    for (const comp of this.gameComponents) {
      if (comp.game.name === gameName) return comp;
    }
  }

  _findPlayer(playerName: string) {
    for (const inst of this.matches) {
      if (inst.players.some((player) => player.name === playerName))
        return inst;
    }
  }

  /**
   * Joins a specific match.
   *
   * @param gameName - The name of the game.
   * @param matchID - The ID of the match to join.
   * @param playerID - The ID to assign to the joining player.
   * @throws Will throw an error if unable to join the match.
   */
  async join(gameName: string, matchID: string, playerID: string) {
    try {
      let inst = this._findPlayer(this.playerName);
      if (inst) {
        throw new Error('player has already joined ' + inst.matchID);
      }
      inst = this._getMatchInstance(matchID);
      if (!inst) {
        throw new Error('game instance ' + matchID + ' not found');
      }
      const json = await this.client.joinMatch(gameName, matchID, {
        playerID,
        playerName: this.playerName,
      });
      inst.players[Number.parseInt(playerID)].name = this.playerName;
      this.playerCredentials = json.playerCredentials;
    } catch (error) {
      throw new Error('failed to join match ' + matchID + ' (' + error + ')');
    }
  }

  /**
   * Leaves the current match.
   *
   * @param gameName - The name of the game.
   * @param matchID - The ID of the match to leave.
   * @throws Will throw an error if unable to leave the match.
   */
  async leave(gameName: string, matchID: string) {
    try {
      const inst = this._getMatchInstance(matchID);
      if (!inst) throw new Error('match instance not found');
      for (const player of inst.players) {
        if (player.name === this.playerName) {
          await this.client.leaveMatch(gameName, matchID, {
            playerID: player.id.toString(),
            credentials: this.playerCredentials,
          });
          delete player.name;
          delete this.playerCredentials;
          return;
        }
      }
      throw new Error('player not found in match');
    } catch (error) {
      throw new Error('failed to leave match ' + matchID + ' (' + error + ')');
    }
  }

  /**
   * Disconnects the current player from the lobby.
   * This method should be called when the player wants to exit the lobby entirely.
   */
  async disconnect() {
    const inst = this._findPlayer(this.playerName);
    if (inst) {
      await this.leave(inst.gameName, inst.matchID);
    }
    this.matches = [];
    this.playerName = 'Visitor';
  }

  /**
   * Creates a new match for a specific game.
   *
   * @param gameName - The name of the game to create a match for.
   * @param numPlayers - The number of players for the new match.
   * @returns A Promise that resolves with the created match details.
   * @throws Will throw an error if unable to create the match.
   */
  async create(gameName: string, numPlayers: number) {
    try {
      const comp = this._getGameComponents(gameName);
      if (!comp) throw new Error('game not found');
      if (
        numPlayers < comp.game.minPlayers ||
        numPlayers > comp.game.maxPlayers
      )
        throw new Error('invalid number of players ' + numPlayers);
      const result = await this.client.createMatch(gameName, { numPlayers });
      return result;
    } catch (error) {
      console.error('Error in create method:', error);
      throw new Error(
        'failed to create match for ' + gameName + ' (' + error + ')'
      );
    }
  }
}

/**
 * Creates and returns a new LobbyConnection instance.
 * This function serves as the public interface for creating a LobbyConnection.
 *
 * @param opts - Configuration options for the LobbyConnection.
 * @returns A new LobbyConnection instance.
 */
export function LobbyConnection(opts: LobbyConnectionOpts) {
  return new _LobbyConnectionImpl(opts);
}
