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

export class LobbyClient {
  private server: string;
  private readonly cartesifyFetch: ReturnType<typeof Cartesify.createFetch>;

  constructor({
    server,
    dappAddress,
    signer,
  }: {
    server?: string;
    dappAddress?: string;
    signer?: ethers.Signer;
  } = {}) {
    if (!server) throw new Error('Server URL is required');
    this.server = server.replace(/\/$/, '');

    this.cartesifyFetch = Cartesify.createFetch({
      dappAddress,
      endpoints: {
        graphQL: new URL(`${server}/graphql`),
        inspect: new URL(`${server}/inspect`),
      },
      provider: signer?.provider,
      signer: signer,
    });
  }

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

  private async post(route: string, opts: { body?: any; init?: RequestInit }) {
    let init: RequestInit = {
      method: 'POST',
      body: JSON.stringify(opts.body),
      headers: { 'Content-Type': 'application/json' },
    };
    if (opts.init)
      init = {
        ...init,
        ...opts.init,
        headers: { ...init.headers, ...opts.init.headers },
      };
    return this.request(route, init);
  }

  async listGames(init?: RequestInit): Promise<string[]> {
    return this.request('/games', init);
  }

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
      console.error('listMatches error:', error);
      throw error;
    }
  }

  async getMatch(
    gameName: string,
    matchID: string,
    init?: RequestInit
  ): Promise<LobbyAPI.Match> {
    assertGameName(gameName);
    assertMatchID(matchID);
    return this.request(`/games/${gameName}/${matchID}`, init);
  }

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
