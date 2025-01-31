import { CartesifyTransport } from './cartesify-transport';
import type { TransportOpts } from './transport';
import type {
  CredentialedActionShape,
  State,
  ChatMessage,
  PlayerID,
  Ctx,
  Move,
} from '../../types';
import type { ProcessGameConfig } from '../../core/game';

// Mock the Cartesify module and the fetch function it exports.
let fetchMock: jest.Mock;
const getFetchMock = () => fetchMock;
jest.mock('@calindra/cartesify', () => {
  return {
    Cartesify: {
      createFetch: jest.fn().mockImplementation((x) => getFetchMock()),
    },
  };
});

describe('CartesifyTransport', () => {
  let transportOpts: TransportOpts;

  beforeEach(() => {
    fetchMock = jest.fn().mockResolvedValue({
      ok: true,
      json: jest.fn().mockResolvedValue({}),
    });
    // Define a mock ProcessedGame object
    const mockGame: ReturnType<typeof ProcessGameConfig> = {
      flow: {
        ctx: (numPlayers: number) => ({} as Ctx),
        init: (state: State<any>) => state,
        isPlayerActive: (_G: any, ctx: Ctx, playerID: string) => true,
        eventHandlers: {
          endStage: undefined,
          setStage: undefined,
          endTurn: undefined,
          pass: undefined,
          endPhase: undefined,
          setPhase: undefined,
          endGame: undefined,
          setActivePlayers: undefined,
        },
        // processGameEvent: jest.fn(),
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        getMove: (ctx: Ctx, name: string, playerID: string) => ({} as Move),
        eventNames: [],
        enabledEventNames: [],
        moveMap: undefined,
        moveNames: [],
        processMove: undefined,
        processEvent: undefined,
      },
      moveNames: [],
      pluginNames: [],
      processMove: jest.fn(),
      setup: jest.fn(),
      name: 'mockGame',
    };

    transportOpts = {
      server: 'http://localhost:5004',
      transportDataCallback: jest.fn(),
      gameKey: mockGame,
      game: mockGame,
      matchID: 'test-match',
      playerID: 'player1' as PlayerID,
      credentials: 'test-credentials',
    };
  });

  it('should initialize correctly', () => {
    const transport = new CartesifyTransport(transportOpts);
    expect(transport).toBeTruthy();
    expect(transport).toHaveProperty('url', 'http://localhost:5004');
  });

  it('should use default server URL if none is provided', () => {
    const transport = new CartesifyTransport({
      transportDataCallback: jest.fn(),
      gameKey: transportOpts.gameKey,
      game: transportOpts.game,
    });
    expect((transport as any).url).toBe('https//localhost:5004');
  });

  it('should call connect endpoint on connect', async () => {
    const transport = new CartesifyTransport(transportOpts);
    await transport.connect();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5004/connect',
      expect.any(Object)
    );
  });

  it('should handle error during connect', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error'));
    const transport = new CartesifyTransport(transportOpts);
    await expect(transport.connect()).resolves.not.toThrow();
  });

  it('should call disconnect endpoint on disconnect', async () => {
    const transport = new CartesifyTransport(transportOpts);
    await transport.disconnect();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5004/disconnect',
      expect.any(Object)
    );
  });

  it('should handle error during disconnect', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error'));
    const transport = new CartesifyTransport(transportOpts);
    await expect(transport.disconnect()).resolves.not.toThrow();
  });

  it('should call actions endpoint on sendAction', async () => {
    const transport = new CartesifyTransport(transportOpts);
    const state: State = {} as State;
    const action: CredentialedActionShape.Any =
      {} as CredentialedActionShape.Any;
    await transport.sendAction(state, action);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5004/actions',
      expect.any(Object)
    );
  });

  it('should handle error during sendAction', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error'));
    const transport = new CartesifyTransport(transportOpts);
    const state: State = {} as State;
    const action: CredentialedActionShape.Any =
      {} as CredentialedActionShape.Any;
    await expect(transport.sendAction(state, action)).resolves.not.toThrow();
  });

  it('should call chat endpoint on sendChatMessage', async () => {
    const transport = new CartesifyTransport(transportOpts);
    const chatMessage: ChatMessage = {} as ChatMessage;
    await transport.sendChatMessage('matchID', chatMessage);
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5004/chat',
      expect.any(Object)
    );
  });

  it('should handle error during sendChatMessage', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error'));
    const transport = new CartesifyTransport(transportOpts);
    const chatMessage: ChatMessage = {} as ChatMessage;
    await expect(
      transport.sendChatMessage('matchID', chatMessage)
    ).resolves.not.toThrow();
  });

  it('should call sync endpoint on requestSync', async () => {
    const transport = new CartesifyTransport(transportOpts);
    await transport.requestSync();
    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:5004/sync',
      expect.any(Object)
    );
  });

  it('should handle error during requestSync', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error'));
    const transport = new CartesifyTransport(transportOpts);
    await expect(transport.requestSync()).resolves.not.toThrow();
  });

  it('should update matchID and call requestSync', () => {
    const transport = new CartesifyTransport(transportOpts);
    const requestSyncSpy = jest
      .spyOn(transport, 'requestSync')
      .mockImplementation(jest.fn());
    transport.updateMatchID('newMatchID');
    expect((transport as any).matchID).toBe('newMatchID');
    expect(requestSyncSpy).toHaveBeenCalled();
  });

  it('should update playerID and call requestSync', () => {
    const transport = new CartesifyTransport(transportOpts);
    const requestSyncSpy = jest
      .spyOn(transport, 'requestSync')
      .mockImplementation(jest.fn());
    transport.updatePlayerID('newPlayerID' as PlayerID);
    expect((transport as any).playerID).toBe('newPlayerID');
    expect(requestSyncSpy).toHaveBeenCalled();
  });

  it('should update credentials and call requestSync', () => {
    const transport = new CartesifyTransport(transportOpts);
    const requestSyncSpy = jest
      .spyOn(transport, 'requestSync')
      .mockImplementation(jest.fn());
    transport.updateCredentials('newCredentials');
    expect((transport as any).credentials).toBe('newCredentials');
    expect(requestSyncSpy).toHaveBeenCalled();
  });
});
