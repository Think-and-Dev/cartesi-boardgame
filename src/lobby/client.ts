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
  if (!body) throw new Error(`Expected body, got "${body}".`);
  for (const key in schema) {
    const propSchema = schema[key];
    const types = Array.isArray(propSchema) ? propSchema : [propSchema];
    const received = body[key];
    if (!types.includes(typeof received)) {
      const union = types.join('|');
      throw new TypeError(
        `Expected body.${key} to be of type ${union}, got "${received}".`
      );
    }
  }
};

export class LobbyClientError extends Error {
  readonly details: any;

  constructor(message: string, details: any) {
    super(message);
    this.details = details;
  }
}

/**
 * export class LobbyClient
 * Represents a client for interacting with the Cartesi Lobby server.
 *
 * @remarks
 * This class handles communication with the Cartesi node and server.
 * It provides methods to perform various operations related to Cartesi dApps.
 *
 * @example
 * Here's an example of how to instantiate the `LobbyClient`:
 * ```typescript
 * const lobbyClient = new LobbyClient({
 *   server: 'http://example-server.com',
 *   nodeUrl: 'http://example-node.com',
 *   dappAddress: '0xYourDappAddress',
 *   signer: yourSignerInstance,
 * });
 * ```
 *
 * @param server - The URL of the Cartesi server. Defaults to 'http://localhost:8000'.
 * @param nodeUrl - The URL of the Cartesi node. Required.
 * @param dappAddress - The blockchain address of the dApp (Decentralized Application).
 * @param signer - An `ethers.Signer` instance to sign transactions.
 *
 * @throws {Error} Throws an error if `nodeUrl` is not provided.
 */
export class LobbyClient {
  private nodeUrl: string;
  private server: string;
  private readonly cartesifyFetch: ReturnType<typeof Cartesify.createFetch>;

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
    if (!nodeUrl) throw new Error('Node URL is required');

    this.nodeUrl = nodeUrl || 'http://localhost:8080';
    this.server = server || 'http://localhost:8000';

    if (this.nodeUrl.slice(-1) !== '/') {
      this.nodeUrl += '/';
    }

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
   * private async request
   * Sends an HTTP request to a specified route and processes the response.
   *
   * @remarks
   * This method is a utility function to perform HTTP requests to the Cartesi server
   * using the `cartesifyFetch` method. It constructs the request configuration,
   * handles the response, and throws an error if the request fails or if the response
   * status is not OK.
   *
   * @param route - The endpoint route to which the request is sent.
   * @param init - Optional initialization options for the request, such as method, body, and headers.
   *
   * @returns A `Promise` that resolves to the parsed JSON response if the request is successful.
   * Throws a `LobbyClientError` if the request fails or the response status is not OK.
   *
   * @throws {LobbyClientError} Throws an error if there is a network error or if the response
   * status is not OK. The error includes the HTTP status and any additional details.
   *
   * @example
   * ```typescript
   * try {
   *   const result = await this.request('/graphql', {
   *     method: 'POST',
   *     body: JSON.stringify({ query: '{ users { id, name } }' }),
   *     headers: { 'Content-Type': 'application/json' },
   *   });
   *   console.log('Request successful:', result);
   * } catch (error) {
   *   console.error('Request failed:', error);
   * }
   * ```
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
        let details: any;

        try {
          details = JSON.parse(responseText);
        } catch {
          details = responseText;
        }

        throw new LobbyClientError(`HTTP status ${response.status}`, details);
      }

      return JSON.parse(responseText);
    } catch (error) {
      console.error('Request error:', error);
      throw new LobbyClientError(`Network error`, error.message);
    }
  }

  /**
   * private async post
   * Sends a POST request to a specified route with the given options.
   *
   * @remarks
   * This method simplifies sending POST requests by automatically setting
   * the method to 'POST' and serializing the body as JSON. It also merges
   * any additional initialization options provided in `opts.init` with the
   * default configuration, ensuring that headers are properly combined.
   *
   * @param route - The endpoint route to which the POST request is sent.
   * @param opts - Options for the POST request.
   * @param opts.body - The body content of the POST request. It will be serialized to JSON.
   * @param opts.init - Optional initialization options for the request, such as additional headers.
   *
   * @returns A `Promise` that resolves to the response of the request, handled by the `request` method.
   *
   * @example
   * ```typescript
   * const response = await this.post('/data', {
   *   body: { key: 'value' },
   *   init: { headers: { Authorization: 'Bearer token' } }
   * });
   * console.log('POST request successful:', response);
   * ```
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

    return this.request(route, init);
  }

  async listGames(init?: RequestInit): Promise<string[]> {
    return this.request('/games', init);
  }

  /**
   * async listMatches
   * Retrieves a list of matches for a specific game, optionally filtered by criteria.
   *
   * @remarks
   * This method sends a request to retrieve a list of matches for the specified game.
   * It allows for optional filtering based on whether the game is over, and the update times.
   * The `where` parameter provides filtering options, and `init` can be used to pass additional
   * request initialization options.
   *
   * @param gameName - The name of the game for which matches are to be listed.
   * @param where - Optional filtering criteria for the matches.
   * @param where.isGameover - Filter to include only matches that are either over or ongoing.
   * @param where.updatedBefore - Filter to include only matches updated before a specific timestamp.
   * @param where.updatedAfter - Filter to include only matches updated after a specific timestamp.
   * @param init - Optional initialization options for the request, such as headers or credentials.
   *
   * @returns A `Promise` that resolves to a `LobbyAPI.MatchList` object containing the list of matches.
   *
   * @throws Throws an error if the request fails, including logging the error details to the console.
   *
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
   * async getMatch
   * Retrieves details of a specific match for a given game.
   *
   * @remarks
   * This method sends a request to retrieve the details of a specific match identified by `matchID`
   * for the specified `gameName`. It uses the `request` method to perform the HTTP request, allowing
   * optional initialization options to be passed through the `init` parameter.
   *
   * @param gameName - The name of the game for which the match details are to be retrieved.
   * @param matchID - The unique identifier of the match whose details are to be fetched.
   * @param init - Optional initialization options for the request, such as headers or credentials.
   *
   * @returns A `Promise` that resolves to a `LobbyAPI.Match` object containing the match details.
   *
   * @example
   * ```typescript
   * const match = await this.getMatch('chess', '12345', { headers: { Authorization: 'Bearer token' } });
   * console.log('Match details:', match);
   * ```
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
   * async createMatch
   * Creates a new match for a specified game.
   *
   * @remarks
   * This method sends a POST request to create a new match for the given `gameName`.
   * It validates the game name and the body parameters before sending the request.
   * The request body includes the number of players required for the match and
   * optionally setup data or whether the match should be unlisted.
   *
   * @param gameName - The name of the game for which a new match is being created.
   * @param body - An object containing details about the match to be created.
   * @param body.numPlayers - The number of players required for the match. This is a required field.
   * @param body.setupData - Optional data used to set up the match.
   * @param body.unlisted - Optional boolean indicating whether the match should be unlisted.
   * @param body.[key: string] - Additional optional properties that can be included in the match creation request.
   * @param init - Optional initialization options for the request, such as headers or credentials.
   *
   * @returns A `Promise` that resolves to a `LobbyAPI.CreatedMatch` object containing details about the newly created match.
   *
   * @throws Throws an error if the `gameName` is invalid or if the body parameters do not meet validation requirements.
   *
   * @example
   * ```typescript
   * try {
   *   const newMatch = await this.createMatch('chess', {
   *     numPlayers: 2,
   *     setupData: { initialBoard: 'default' },
   *     unlisted: true,
   *   }, { headers: { Authorization: 'Bearer token' } });
   *   console.log('New match created:', newMatch);
   * } catch (error) {
   *   console.error('Failed to create match:', error);
   * }
   * ```
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
    return this.post(`/games/${gameName}/create`, { body, init });
  }

  /**
   *  async joinMatch
   * Joins an existing match for a specified game.
   *
   * @remarks
   * This method sends a POST request to join an existing match identified by `matchID` for the given `gameName`.
   * It validates the game name, match ID, and the body parameters before sending the request.
   * The request body includes the player details required to join the match, such as `playerName` and optionally `playerID` and other data.
   *
   * @param gameName - The name of the game to join.
   * @param matchID - The unique identifier of the match to join.
   * @param body - An object containing the player's details to join the match.
   * @param body.playerID - Optional unique identifier for the player.
   * @param body.playerName - The name of the player joining the match. This is a required field.
   * @param body.data - Optional additional data to include when joining the match.
   * @param body.[key: string] - Additional optional properties that can be included in the join request.
   * @param init - Optional initialization options for the request, such as headers or credentials.
   *
   * @returns A `Promise` that resolves to a `LobbyAPI.JoinedMatch` object containing details about the joined match.
   *
   * @throws Throws an error if the `gameName` or `matchID` is invalid, or if the body parameters do not meet validation requirements.
   *
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
   * async leaveMatch
   * Leaves an existing match for a specified game.
   *
   * @remarks
   * This method sends a POST request to leave an existing match identified by `matchID` for the given `gameName`.
   * It validates the game name, match ID, and the body parameters before sending the request.
   * The request body must include the player's `playerID` and `credentials` for authentication purposes.
   *
   * @param gameName - The name of the game from which the player wants to leave.
   * @param matchID - The unique identifier of the match to leave.
   * @param body - An object containing the player's details required to leave the match.
   * @param body.playerID - The unique identifier of the player who is leaving the match. This is a required field.
   * @param body.credentials - The credentials of the player required for authentication. This is a required field.
   * @param body.[key: string] - Additional optional properties that can be included in the leave request.
   * @param init - Optional initialization options for the request, such as headers or credentials.
   *
   * @returns A `Promise` that resolves to `void` once the request is complete.
   *
   * @throws Throws an error if the `gameName` or `matchID` is invalid, or if the body parameters do not meet validation requirements.
   *
   * @example
   * ```typescript
   * try {
   *   await this.leaveMatch('chess', 'match123', {
   *     playerID: 'player456',
   *     credentials: 'player-credentials',
   *   }, { headers: { Authorization: 'Bearer token' } });
   *   console.log('Successfully left the match.');
   * } catch (error) {
   *   console.error('Failed to leave the match:', error);
   * }
   * ```
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
   * async updatePlayer
   * Updates the information of a player in an existing match for a specified game.
   *
   * @remarks
   * This method sends a POST request to update a player's information in an existing match identified by `matchID` for the given `gameName`.
   * It validates the game name, match ID, and the body parameters before sending the request.
   * The request body must include the player's `playerID` and `credentials` for authentication, along with any new data to update, such as `newName` or additional player data.
   *
   * @param gameName - The name of the game in which the player's information is being updated.
   * @param matchID - The unique identifier of the match in which the player's information is being updated.
   * @param body - An object containing the player's current details and the new information to update.
   * @param body.playerID - The unique identifier of the player whose information is being updated. This is a required field.
   * @param body.credentials - The credentials of the player required for authentication. This is a required field.
   * @param body.newName - Optional new name for the player.
   * @param body.data - Optional additional data to update for the player.
   * @param body.[key: string] - Additional optional properties that can be included in the update request.
   * @param init - Optional initialization options for the request, such as headers or credentials.
   *
   * @returns A `Promise` that resolves to `void` once the request is complete.
   *
   * @throws Throws an error if the `gameName` or `matchID` is invalid, or if the body parameters do not meet validation requirements.
   *
   * @example
   * ```typescript
   * try {
   *   await this.updatePlayer('chess', 'match123', {
   *     playerID: 'player456',
   *     credentials: 'player-credentials',
   *     newName: 'AliceUpdated',
   *     data: { rank: 'intermediate' },
   *   }, { headers: { Authorization: 'Bearer token' } });
   *   console.log('Player information updated successfully.');
   * } catch (error) {
   *   console.error('Failed to update player information:', error);
   * }
   * ```
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
   * async playAgain
   * Initiates a new match for the same game with the same players from an existing match.
   *
   * @remarks
   * This method sends a POST request to start a new match using the same players from an existing match identified by `matchID` for the given `gameName`.
   * It validates the game name, match ID, and the body parameters before sending the request.
   * The request body must include the player's `playerID` and `credentials` for authentication, and can optionally specify whether the new match should be unlisted.
   *
   * @param gameName - The name of the game for which a new match is being initiated.
   * @param matchID - The unique identifier of the existing match from which the new match is being started.
   * @param body - An object containing the player's details required to initiate the new match.
   * @param body.playerID - The unique identifier of the player initiating the new match. This is a required field.
   * @param body.credentials - The credentials of the player required for authentication. This is a required field.
   * @param body.unlisted - Optional boolean indicating whether the new match should be unlisted.
   * @param body.[key: string] - Additional optional properties that can be included in the play again request.
   * @param init - Optional initialization options for the request, such as headers or credentials.
   *
   * @returns A `Promise` that resolves to a `LobbyAPI.NextMatch` object containing details about the newly created match.
   *
   * @throws Throws an error if the `gameName` or `matchID` is invalid, or if the body parameters do not meet validation requirements.
   *
   * @example
   * ```typescript
   * try {
   *   const nextMatch = await this.playAgain('chess', 'match123', {
   *     playerID: 'player456',
   *     credentials: 'player-credentials',
   *     unlisted: true,
   *   }, { headers: { Authorization: 'Bearer token' } });
   *   console.log('Next match created:', nextMatch);
   * } catch (error) {
   *   console.error('Failed to initiate next match:', error);
   * }
   * ```
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
