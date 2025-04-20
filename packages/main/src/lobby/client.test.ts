import dotenv from 'dotenv';
import { LobbyClient, LobbyClientError } from './client';
import { Cartesify } from '@calindra/cartesify';

/**
 * The `LobbyClient` class provides a set of methods for interacting with a game lobby server.
 * It uses the `Cartesify` library to make HTTP requests to the server.
 *
 * The class requires the following environment variables to be set:
 * - `DAPP_ADDRESS`: The address of the game lobby server.
 * - `SERVER`: The base URL of the game lobby server.
 *
 * The `LobbyClient` class provides the following methods:
 * - `listGames()`: Retrieves a list of available games from the server.
 * - `listMatches(gameName: string)`: Retrieves a list of matches for the specified game.
 * - `createMatch(gameName: string, body: { numPlayers: number })`: Creates a new match for the specified game.
 * - `joinMatch(gameName: string, matchID: string, body: { playerName: string })`: Joins a player to the specified match.
 * - `leaveMatch(gameName: string, matchID: string, body: { playerID: string, credentials: string })`: Removes a player from the specified match.
 * - `updatePlayer(gameName: string, matchID: string, body: { playerID: string, credentials: string, newName: string })`: Updates the player's information in the specified match.
 * - `playAgain(gameName: string, matchID: string, body: { playerID: string, credentials: string })`: Starts a new match after the current one has ended.
 *
 * The class also includes error handling for network errors that may occur during the requests.
 */
dotenv.config();

jest.mock('@calindra/cartesify', () => ({
  Cartesify: {
    createFetch: jest.fn(),
  },
}));

describe('LobbyClient', () => {
  const { DAPP_ADDRESS, SERVER } = process.env;
  let lobbyClient;
  let mockFetch;

  beforeAll(() => {
    if (!DAPP_ADDRESS || !SERVER) {
      throw new Error(
        'Missing required environment variables DAPP_ADDRESS or SERVER'
      );
    }
  });

  beforeEach(() => {
    mockFetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve([]),
      })
    );
    (Cartesify.createFetch as jest.Mock).mockImplementation(() => mockFetch);
    lobbyClient = new LobbyClient();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test('should list games', async () => {
    const games = await lobbyClient.listGames();
    expect(games).toEqual([]);
    expect(mockFetch).toHaveBeenCalledWith(`${SERVER}/games`, {
      method: undefined,
      body: undefined,
      headers: undefined,
    });
  });

  test('should list matches for a game', async () => {
    const gameName = 'test_game';
    const matches = await lobbyClient.listMatches(gameName);
    expect(matches).toEqual([]);
    expect(mockFetch).toHaveBeenCalledWith(`${SERVER}/games/${gameName}`, {
      method: undefined,
      body: undefined,
      headers: undefined,
    });
  });

  test('should create a match', async () => {
    const gameName = 'test_game';
    const body = { numPlayers: 2 };
    const createdMatch = { matchID: 'match123' };
    mockFetch.mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(createdMatch),
      })
    );
    const result = await lobbyClient.createMatch(gameName, body);
    expect(result).toEqual(createdMatch);
    expect(mockFetch).toHaveBeenCalledWith(
      `${SERVER}/games/${gameName}/create`,
      {
        method: 'post',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      }
    );
  });

  test('should throw an error if createMatch body is invalid', async () => {
    const gameName = 'test_game';
    const body = { numPlayers: 'two' }; // Invalid numPlayers type

    await expect(lobbyClient.createMatch(gameName, body)).rejects.toThrow(
      'Expected body.numPlayers to be of type number, got "two".'
    );
  });

  test('should join a match', async () => {
    const gameName = 'test_game';
    const matchID = 'match123';
    const body = { playerName: 'player1' };
    const joinedMatch = { playerID: 'player123' };
    mockFetch.mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(joinedMatch),
      })
    );
    const result = await lobbyClient.joinMatch(gameName, matchID, body);
    expect(result).toEqual(joinedMatch);
    expect(mockFetch).toHaveBeenCalledWith(
      `${SERVER}/games/${gameName}/${matchID}/join`,
      {
        method: 'post',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      }
    );
  });

  test('should leave a match', async () => {
    const gameName = 'test_game';
    const matchID = 'match123';
    const body = { playerID: 'player1', credentials: 'cred123' };
    mockFetch.mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    );
    await lobbyClient.leaveMatch(gameName, matchID, body);
    expect(mockFetch).toHaveBeenCalledWith(
      `${SERVER}/games/${gameName}/${matchID}/leave`,
      {
        method: 'post',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      }
    );
  });

  test('should update player information', async () => {
    const gameName = 'test_game';
    const matchID = 'match123';
    const body = {
      playerID: 'player1',
      credentials: 'cred123',
      newName: 'newName',
    };
    mockFetch.mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({}),
      })
    );
    await lobbyClient.updatePlayer(gameName, matchID, body);
    expect(mockFetch).toHaveBeenCalledWith(
      `${SERVER}/games/${gameName}/${matchID}/update`,
      {
        method: 'post',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      }
    );
  });

  test('should play again', async () => {
    const gameName = 'test_game';
    const matchID = 'match123';
    const body = { playerID: 'player1', credentials: 'cred123' };
    const nextMatch = { matchID: 'match456' };
    mockFetch.mockReturnValueOnce(
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve(nextMatch),
      })
    );
    const result = await lobbyClient.playAgain(gameName, matchID, body);
    expect(result).toEqual(nextMatch);
    expect(mockFetch).toHaveBeenCalledWith(
      `${SERVER}/games/${gameName}/${matchID}/playAgain`,
      {
        method: 'post',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      }
    );
  });

  test('should handle network error in request', async () => {
    mockFetch.mockReturnValueOnce(Promise.reject(new Error('Network error')));

    await expect(lobbyClient.listGames()).rejects.toThrow(LobbyClientError);
  });
});
