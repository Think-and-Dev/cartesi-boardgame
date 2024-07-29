import type { LobbyAPI } from '../types';
import { Cartesify } from '@calindra/cartesify';

const assertString = (str: unknown, label: string) => {
  if (!str || typeof str !== 'string') {
    throw new Error(`Expected ${label} string, got "${str}".`);
  }
};

// Validaciones específicas para nombre de juego e ID de partida
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

// Función para validar el cuerpo de las solicitudes
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
  }: { server?: string; dappAddress?: string } = {}) {
    if (!server) throw new Error('Server URL is required');
    this.server = server.replace(/\/$/, ''); // Eliminar la barra final si existe
    this.cartesifyFetch = Cartesify.createFetch({
      dappAddress,
      endpoints: {
        graphQL: new URL(`${this.server}/graphql`),
        inspect: new URL(`${this.server}/inspect`),
      },
    });
  }

  // Método genérico para hacer solicitudes
  private async request(route: string, init?: RequestInit) {
    const config: RequestInit = {
      method: init?.method,
      body: init?.body,
      headers: init?.headers,
    };

    try {
      const fullUrl = this.server + route; // Construcción de la URL completa
      console.log('Request URL:', fullUrl); // Log the full URL
      const response = await this.cartesifyFetch(fullUrl, config);
      console.log('Response status:', response.status); // Log the status
      const responseText = await response.text();
      console.log('Response text:', responseText); // Log the text of the response

      if (!response.ok) {
        let details: any;

        try {
          details = JSON.parse(responseText); // Intentar parsear el texto como JSON
        } catch {
          details = responseText;
        }

        throw new LobbyClientError(`HTTP status ${response.status}`, details);
      }

      return JSON.parse(responseText); // Parse the text as JSON for the return value
    } catch (error) {
      console.error('Request error:', error); // Log the error
      throw new LobbyClientError(`Network error`, error.message);
    }
  }

  // Método para hacer solicitudes POST
  private async post(route: string, opts: { body?: any; init?: RequestInit }) {
    let init: RequestInit = {
      method: 'post',
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

  // async listMatches(
  //   gameName: string,
  //   where?: {
  //     isGameover?: boolean;
  //     updatedBefore?: number;
  //     updatedAfter?: number;
  //   },
  //   init?: RequestInit
  // ): Promise<LobbyAPI.MatchList> {
  //   assertGameName(gameName);
  //   let query = '';
  //   if (where) {
  //     const queries = [];
  //     const { isGameover, updatedBefore, updatedAfter } = where;
  //     if (isGameover !== undefined) queries.push(`isGameover=${isGameover}`);
  //     if (updatedBefore) queries.push(`updatedBefore=${updatedBefore}`);
  //     if (updatedAfter) queries.push(`updatedAfter=${updatedAfter}`);
  //     if (queries.length > 0) query = '?' + queries.join('&');
  //   }
  //   return this.request(`/games/${gameName}${query}`, init);
  // }

  async listMatches(
    gameName: string,
    where?: {
      isGameover?: boolean;
      updatedBefore?: number;
      updatedAfter?: number;
    },
    init?: RequestInit
  ): Promise<LobbyAPI.MatchList> {
    console.log('Llegue hasta aca en client.ts linea 157');
    // Log the gameName and where parameters
    console.log('listMatches called with:', { gameName, where, init });
    // Assert game name is valid
    assertGameName(gameName);
    let query = '';
    if (where) {
      const queries = [];
      const { isGameover, updatedBefore, updatedAfter } = where;
      // Log the values of the where object
      console.log('where object values:', {
        isGameover,
        updatedBefore,
        updatedAfter,
      });

      if (isGameover !== undefined) queries.push(`isGameover=${isGameover}`);
      if (updatedBefore) queries.push(`updatedBefore=${updatedBefore}`);
      if (updatedAfter) queries.push(`updatedAfter=${updatedAfter}`);

      // Log the constructed queries array
      console.log('Constructed queries:', queries);

      if (queries.length > 0) query = '?' + queries.join('&');
    }

    // Log the final query string
    console.log('Final query string:', query);

    // Log the full URL being requested
    const fullUrl = `/games/${gameName}${query}`;
    console.log('Requesting URL:', fullUrl);

    // Make the request and log the response
    try {
      const response = await this.request(fullUrl, init);
      console.log('listMatches response:', response);
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
