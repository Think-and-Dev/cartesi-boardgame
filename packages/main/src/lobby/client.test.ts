import { LobbyClient, LobbyClientError } from './client';
import { Cartesify } from '@calindra/cartesify';
import dotenv from 'dotenv';

dotenv.config();

// Mock de la función createFetch de Cartesify
jest.mock('@calindra/cartesify', () => ({
  Cartesify: {
    createFetch: jest.fn(),
  },
}));

describe('LobbyClient', () => {
  const mockSigner = { provider: {} } as any; // Signer vacío para el test
  let lobbyClient: LobbyClient;
  let mockFetch: jest.Mock;

  beforeAll(() => {
    // Configuramos las variables de entorno por si no están definidas
    process.env.SERVER = process.env.SERVER || 'http://localhost:8000'; // Valor por defecto
    process.env.DAPP_ADDRESS = process.env.DAPP_ADDRESS || '0xTestDappAddress';
  });

  beforeEach(() => {
    // Simular la implementación de fetch de Cartesify
    mockFetch = jest.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({})), // Por defecto, devuelve un objeto vacío
    });

    (Cartesify.createFetch as jest.Mock).mockReturnValue(mockFetch);

    // Crear instancia del LobbyClient
    lobbyClient = new LobbyClient({
      server: process.env.SERVER,
      nodeUrl: 'http://test-node.com',
      dappAddress: process.env.DAPP_ADDRESS,
      signer: mockSigner,
    });
  });

  afterEach(() => {
    jest.clearAllMocks(); // Limpiar mocks después de cada prueba
  });

  it('debería lanzar un error si nodeUrl no es proporcionado', () => {
    expect(() => new LobbyClient({ server: process.env.SERVER })).toThrow(
      'Node URL is required'
    );
  });

  it('debería listar juegos correctamente', async () => {
    const games = await lobbyClient.listGames();
    expect(games).toEqual({}); // El valor por defecto es un objeto vacío
    expect(mockFetch).toHaveBeenCalledWith(`${process.env.SERVER}/games`, {
      method: undefined,
      body: undefined,
      headers: undefined,
    });
  });

  it('debería listar partidas de un juego correctamente', async () => {
    const gameName = 'test_game';
    const matches = await lobbyClient.listMatches(gameName);
    expect(matches).toEqual({}); // Valor por defecto
    expect(mockFetch).toHaveBeenCalledWith(
      `${process.env.SERVER}/games/${gameName}`,
      {
        method: undefined,
        body: undefined,
        headers: undefined,
      }
    );
  });

  it('debería crear una partida correctamente', async () => {
    const gameName = 'test_game';
    const body = { numPlayers: 2 };
    const createdMatch = { matchID: 'match123' };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(createdMatch)),
    });

    const result = await lobbyClient.createMatch(gameName, body);
    expect(result).toEqual(createdMatch);
    expect(mockFetch).toHaveBeenCalledWith(
      `${process.env.SERVER}/games/${gameName}/create`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('debería unirse a una partida correctamente', async () => {
    const gameName = 'test_game';
    const matchID = 'match123';
    const body = { playerName: 'player1' };
    const joinedMatch = { playerID: 'player123' };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify(joinedMatch)),
    });

    const result = await lobbyClient.joinMatch(gameName, matchID, body);
    expect(result).toEqual(joinedMatch);
    expect(mockFetch).toHaveBeenCalledWith(
      `${process.env.SERVER}/games/${gameName}/${matchID}/join`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('debería salir de una partida correctamente', async () => {
    const gameName = 'test_game';
    const matchID = 'match123';
    const body = { playerID: 'player1', credentials: 'cred123' };

    mockFetch.mockResolvedValueOnce({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({})),
    });

    await lobbyClient.leaveMatch(gameName, matchID, body);
    expect(mockFetch).toHaveBeenCalledWith(
      `${process.env.SERVER}/games/${gameName}/${matchID}/leave`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(body),
        headers: { 'Content-Type': 'application/json' },
      })
    );
  });

  it('debería manejar errores de red correctamente', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    await expect(lobbyClient.listGames()).rejects.toThrow(LobbyClientError);
  });
});
