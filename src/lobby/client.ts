import type { LobbyAPI } from '../types';
import { Cartesify } from '@calindra/cartesify';
import type { ethers } from 'ethers';

const assertString = (str: unknown, label: string) => {
  if (!str || typeof str !== 'string') {
    throw new Error(`Expected ${label} string, got "${str}".`);
  }
};
const assertGameName = (name?: string) => assertString(name, 'game name');
const assertMatchID = (id?: string) => assertString(id, 'match ID');

type JSType =
  | 'string'
  | 'number'
  | 'bigint'
  | 'object'
  | 'boolean'
  | 'symbol'
  | 'function'
  | 'undefined';

const validateBody = (
  body: { [key: string]: any } | undefined,
  schema: { [key: string]: JSType | JSType[] }
) => {
  if (!body) throw new Error(`Expected body, got “${body}”.`);
  for (const key in schema) {
    const propSchema = schema[key];
    const types = Array.isArray(propSchema) ? propSchema : [propSchema];
    const received = body[key];
    if (!types.includes(typeof received)) {
      const union = types.join('|');
      throw new TypeError(
        `Expected body.${key} to be of type ${union}, got “${received}”.`
      );
    }
  }
};

/**
 * Custom error class for LobbyClient errors.
 * This class extends the built-in Error class to include additional details about the error.
 */
export class LobbyClientError extends Error {
  readonly details: any;

  /**
   * Creates a new LobbyClientError instance.
   *
   * @param message - The error message.
   * @param details - Additional details about the error.
   */
  constructor(message: string, details: any) {
    super(message);
    this.details = details;
  }
}

/**
 * LobbyClient Class
 *
 * This class is responsible for handling all communications with the lobby server.
 * It provides methods for creating, joining, and managing game matches, as well as
 * retrieving information about available games and current matches.
 *
 * The class uses Cartesify for making authenticated requests to the server, which
 * is crucial for maintaining the integrity and security of the lobby system.
 */
export class LobbyClient {
  private nodeUrl: string;
  private server: string;
  private readonly cartesifyFetch: ReturnType<typeof Cartesify.createFetch>;

  /**
   * Creates a new LobbyClient instance.
   *
   * @param server - The URL of the lobby server. Defaults to 'http://localhost:8000'.
   * @param nodeUrl - The URL of the node. Defaults to 'http://localhost:8080'.
   * @param dappAddress - The Ethereum address of the dapp.
   * @param signer - An ethers.js Signer object for authentication.
   */
  constructor({
    server,
    nodeUrl,
    dappAddress,
    signer,
  }: {
    server?: string;
    nodeUrl?: string;
    dappAddress?: string;
    signer?: ethers.Signer;
  } = {}) {
    this.nodeUrl = nodeUrl || 'http://localhost:8080';
    this.server = server || 'http://localhost:8000';

    if (this.nodeUrl.slice(-1) !== '/') {
      this.nodeUrl += '/';
    }

    // Initialize Cartesify for authenticated requests
    this.cartesifyFetch = Cartesify.createFetch({
      dappAddress,
      endpoints: {
        graphQL: new URL(`${this.nodeUrl}graphql`),
        inspect: new URL(`${this.nodeUrl}inspect`),
      },
      provider: signer?.provider,
      signer: signer,
    });
  }

  /**
   * Sends a request to the specified route using the Cartesify fetch.
   *
   * @param route - The server route to send the request to.
   * @param init - Optional RequestInit object for additional request options.
   * @returns A Promise that resolves with the JSON response from the server.
   * @throws {LobbyClientError} If there's an error with the request or response.
   */
  private async request(route: string, init?: RequestInit) {
    const config: RequestInit = {
      method: init?.method,
      body: init?.body,
      headers: init?.headers,
    };

    try {
      const fullUrl = this.server + route;
      const response = await this.cartesifyFetch(fullUrl, config);
      const responseText = await response.text();

      if (!response.ok) {
        console.error('Error response:', responseText);
        throw new LobbyClientError(
          `HTTP status ${response.status}`,
          responseText
        );
      }

      return JSON.parse(responseText);
    } catch (error) {
      console.error('Request error:', error);
      if (error instanceof LobbyClientError) {
        throw error;
      }
      throw new LobbyClientError(`Network error`, error.message);
    }
  }

  /**
   * Sends a POST request to the specified route.
   *
   * @param route - The server route to send the request to.
   * @param opts - Options for the request, including body and additional init options.
   * @returns A Promise that resolves with the JSON response from the server.
   * @throws {LobbyClientError} If there's an error with the request or response.
   */
  private async post(route: string, opts: { body?: any; init?: RequestInit }) {
    let init: RequestInit = {
      method: 'POST',
      body: JSON.stringify(opts.body),
      headers: { 'Content-Type': 'application/json' },
    };
    if (opts.init) {
      init = {
        ...init,
        ...opts.init,
        headers: { ...init.headers, ...opts.init.headers },
      };
    }

    try {
      const result = await this.request(route, init);
      return result;
    } catch (error) {
      console.error('Error in POST request:', error);
      throw error;
    }
  }

  /**
   * Retrieves a list of all available games from the server.
   *
   * @param init - Optional RequestInit object for additional request options.
   * @returns A Promise that resolves with an array of game names.
   */
  async listGames(init?: RequestInit): Promise<string[]> {
    return this.request('/games', init);
  }

  /**
   * Retrieves a list of matches for a specific game.
   *
   * @param gameName - The name of the game to list matches for.
   * @param where - Optional filter criteria for the matches.
   * @param init - Optional RequestInit object for additional request options.
   * @returns A Promise that resolves with a MatchList object containing the matches.
   */
  async listMatches(
    gameName: string,
    where?: {
      isGameover?: boolean;
      updatedBefore?: number;
      updatedAfter?: number;
    },
    init?: RequestInit
  ): Promise<LobbyAPI.MatchList> {
    assertGameName(gameName);
    let query = '';

    if (where) {
      const queries = [];
      const { isGameover, updatedBefore, updatedAfter } = where;

      if (isGameover !== undefined) queries.push(`isGameover=${isGameover}`);
      if (updatedBefore) queries.push(`updatedBefore=${updatedBefore}`);
      if (updatedAfter) queries.push(`updatedAfter=${updatedAfter}`);
      if (queries.length > 0) query = '?' + queries.join('&');
    }

    const fullUrl = `/games/${gameName}${query}`;

    try {
      const response = await this.request(fullUrl, init);
      return response;
    } catch (error) {
      console.error('listMatches error: in client.ts', error);
      throw error;
    }
  }

  /**
   * Retrieves information about a specific match.
   *
   * @param gameName - The name of the game.
   * @param matchID - The ID of the match to retrieve.
   * @param init - Optional RequestInit object for additional request options.
   * @returns A Promise that resolves with the Match object containing the match details.
   * @throws {LobbyClientError} If there's an error retrieving the match information.
   */
  async getMatch(
    gameName: string,
    matchID: string,
    init?: RequestInit
  ): Promise<LobbyAPI.Match> {
    assertGameName(gameName);
    assertMatchID(matchID);
    const fullUrl = `/games/${gameName}/${matchID}`;
    return this.request(fullUrl, init);
  }

  /**
   * Creates a new match for the specified game.
   *
   * @param gameName - The name of the game to create a match for.
   * @param body - The request body containing match creation details.
   * @param init - Optional RequestInit object for additional request options.
   * @returns A Promise that resolves with the CreatedMatch object containing the new match details.
   * @throws {LobbyClientError} If there's an error creating the match.
   */
  async createMatch(
    gameName: string,
    body: {
      numPlayers: number;
      setupData?: any;
      unlisted?: boolean;
      [key: string]: any;
    },
    init?: RequestInit
  ): Promise<LobbyAPI.CreatedMatch> {
    assertGameName(gameName);
    validateBody(body, { numPlayers: 'number' });
    try {
      const result = await this.post(`/games/${gameName}/create`, {
        body,
        init,
      });
      return result;
    } catch (error) {
      console.error('Error creating match:', error);
      throw error;
    }
  }

  /**
   * Joins an existing match for the specified game.
   *
   * @param gameName - The name of the game.
   * @param matchID - The ID of the match to join.
   * @param body - The request body containing player details.
   * @param init - Optional RequestInit object for additional request options.
   * @returns A Promise that resolves with the JoinedMatch object containing the joined match details.
   * @throws {LobbyClientError} If there's an error joining the match.
   */
  async joinMatch(
    gameName: string,
    matchID: string,
    body: {
      playerID?: string;
      playerName: string;
      data?: any;
      [key: string]: any;
    },
    init?: RequestInit
  ): Promise<LobbyAPI.JoinedMatch> {
    assertGameName(gameName);
    assertMatchID(matchID);
    validateBody(body, {
      playerID: ['string', 'undefined'],
      playerName: 'string',
    });
    return this.post(`/games/${gameName}/${matchID}/join`, { body, init });
  }

  /**
   * Leaves an existing match.
   *
   * @param gameName - The name of the game.
   * @param matchID - The ID of the match to leave.
   * @param body - The request body containing player credentials.
   * @param init - Optional RequestInit object for additional request options.
   * @returns A Promise that resolves when the player has successfully left the match.
   * @throws {LobbyClientError} If there's an error leaving the match.
   */
  async leaveMatch(
    gameName: string,
    matchID: string,
    body: {
      playerID: string;
      credentials: string;
      [key: string]: any;
    },
    init?: RequestInit
  ): Promise<void> {
    assertGameName(gameName);
    assertMatchID(matchID);
    validateBody(body, { playerID: 'string', credentials: 'string' });
    await this.post(`/games/${gameName}/${matchID}/leave`, { body, init });
  }

  /**
   * Updates a player's information in an existing match.
   *
   * @param gameName - The name of the game.
   * @param matchID - The ID of the match.
   * @param body - The request body containing updated player information.
   * @param init - Optional RequestInit object for additional request options.
   * @returns A Promise that resolves when the player information has been successfully updated.
   * @throws {LobbyClientError} If there's an error updating the player information.
   */
  async updatePlayer(
    gameName: string,
    matchID: string,
    body: {
      playerID: string;
      credentials: string;
      newName?: string;
      data?: any;
      [key: string]: any;
    },
    init?: RequestInit
  ): Promise<void> {
    assertGameName(gameName);
    assertMatchID(matchID);
    validateBody(body, { playerID: 'string', credentials: 'string' });

    await this.post(`/games/${gameName}/${matchID}/update`, { body, init });
  }

  /**
   * Initiates a new match with the same players after the current match ends.
   *
   * @param gameName - The name of the game.
   * @param matchID - The ID of the current match.
   * @param body - The request body containing player credentials and new match options.
   * @param init - Optional RequestInit object for additional request options.
   * @returns A Promise that resolves with the NextMatch object containing the new match details.
   * @throws {LobbyClientError} If there's an error initiating the new match.
   */
  async playAgain(
    gameName: string,
    matchID: string,
    body: {
      playerID: string;
      credentials: string;
      unlisted?: boolean;
      [key: string]: any;
    },
    init?: RequestInit
  ): Promise<LobbyAPI.NextMatch> {
    assertGameName(gameName);
    assertMatchID(matchID);
    validateBody(body, { playerID: 'string', credentials: 'string' });
    return this.post(`/games/${gameName}/${matchID}/playAgain`, { body, init });
  }
}
