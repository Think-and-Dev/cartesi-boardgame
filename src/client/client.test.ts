/*
 * Copyright 2017 The boardgame.io Authors
 *
 * Use of this source code is governed by a MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import { INVALID_MOVE } from '../core/constants';
import { createStore } from 'redux';
import { CreateGameReducer } from '../core/reducer';
import { InitializeGame } from '../core/initialize';
import { Client, createMoveDispatchers } from './client';
import { ProcessGameConfig } from '../core/game';
import { DummyTransport } from './transport/dummy';
import { CartesifyTransport } from './transport/cartesify-transport';
import type { Transport } from './transport/transport';
import { LocalTransport, Local } from './transport/local';
import { SocketIO } from './transport/socketio';
import {
  update,
  sync,
  makeMove,
  gameEvent,
  patch,
} from '../core/action-creators';
import * as Actions from '../core/action-types';
import Debug from './debug/Debug.svelte';
import { error } from '../core/logger';
import type { Game, LogEntry, State, SyncInfo } from '../types';
import type { Operation } from 'rfc6902';
import type { TransportData } from '../master/master';

jest.mock('../core/logger', () => ({
  info: jest.fn(),
  error: jest.fn(),
}));

describe('basic', () => {
  let client: ReturnType<typeof Client>;
  const initial = { initial: true };

  const game: Game = {
    setup: () => initial,
  };

  beforeAll(() => {
    client = Client({ game });
  });

  test('getState', () => {
    expect(client.getState().G).toEqual(initial);
  });

  test('getInitialState', () => {
    expect(client.getInitialState().G).toEqual(initial);
  });
});

test('move api', () => {
  const client = Client({
    game: {
      moves: {
        A: (_, arg) => ({ arg }),
      },
    },
  });

  expect(client.getState().G).toEqual({});
  client.moves.A(42);
  expect(client.getState().G).toEqual({ arg: 42 });
});

describe('namespaced moves', () => {
  let client: ReturnType<typeof Client>;
  beforeAll(() => {
    client = Client({
      game: {
        moves: {
          A: () => 'A',
        },

        phases: {
          PA: {
            moves: {
              B: () => 'B',
              C: () => 'C',
            },
          },
        },
      },
    });
  });

  test('top-level moves', () => {
    expect(client.moves.A).toBeInstanceOf(Function);
  });

  test('phase-level moves', () => {
    expect(client.moves.B).toBeInstanceOf(Function);
    expect(client.moves.C).toBeInstanceOf(Function);
  });

  test('moves are allowed only when phase is active', () => {
    client.moves.A();
    expect(client.getState().G).toEqual('A');

    client.moves.B();
    expect(error).toHaveBeenCalledWith('disallowed move: B');
    client.moves.C();
    expect(error).toHaveBeenCalledWith('disallowed move: C');

    client.events.setPhase('PA');
    expect(client.getState().ctx.phase).toBe('PA');

    client.moves.A();
    expect(error).toHaveBeenCalledWith('disallowed move: A');
    client.moves.B();
    expect(client.getState().G).toEqual('B');
    client.moves.C();
    expect(client.getState().G).toEqual('C');
  });
});

test('isActive', () => {
  const client = Client({
    game: {
      moves: {
        A: (_, arg) => ({ arg }),
      },

      endIf: ({ G }) => G.arg == 42,
    },
  });

  expect(client.getState().G).toEqual({});
  expect(client.getState().isActive).toBe(true);
  client.moves.A(42);
  expect(client.getState().G).toEqual({ arg: 42 });
  expect(client.getState().isActive).toBe(false);
});

describe('multiplayer', () => {
  describe('CartesifyTransport', () => {
    let client;

    beforeAll(() => {
      client = Client({
        game: {},
        multiplayer: 'cartesify',
      });
      client.start();
    });

    afterAll(() => {
      client.stop();
    });

    test('CartesifyTransport is used', () => {
      expect(client.transport instanceof CartesifyTransport).toBe(true);
    });

    describe('local master', () => {
      let client0;
      let client1;
      let spec;

      beforeAll(() => {
        spec = {
          game: { moves: { A: ({ playerID }) => ({ A: playerID }) } },
          multiplayer: Local(),
        };

        client0 = Client({ ...spec, playerID: '0' });
        client1 = Client({ ...spec, playerID: '1' });
      });

      afterAll(() => {
        client0.stop();
        client1.stop();
      });

      test('correct transport used', () => {
        expect(client0.transport instanceof LocalTransport).toBe(true);
        expect(client1.transport instanceof LocalTransport).toBe(true);
      });

      test('multiplayer interactions', () => {
        expect(client0.getState().ctx.currentPlayer).toBe('0');
        expect(client1.getState().ctx.currentPlayer).toBe('0');

        client0.moves.A();

        expect(client0.getState().G).toEqual({ A: '0' });
        expect(client1.getState().G).toEqual({ A: '0' });

        client0.events.endTurn();

        expect(client0.getState().ctx.currentPlayer).toBe('1');
        expect(client1.getState().ctx.currentPlayer).toBe('1');

        client1.moves.A();

        expect(client0.getState().G).toEqual({ A: '1' });
        expect(client1.getState().G).toEqual({ A: '1' });

        client0.sendChatMessage({ message: 'foo' });

        expect(client0.chatMessages).toEqual([
          expect.objectContaining({ sender: '0', payload: { message: 'foo' } }),
        ]);
        expect(client1.chatMessages).toEqual([
          expect.objectContaining({ sender: '0', payload: { message: 'foo' } }),
        ]);
      });

      test('send', async () => {
        await expect(
          Promise.all([
            new Promise<void>((resolve) =>
              client0.transport.subscribe(
                ({ type }) => type === 'chat' && resolve()
              )
            ),
            client0.send({ type: 'bar', payload: { message: 'bar' } }),
          ])
        ).resolves.toBeUndefined();
      });

      test('reconnect with state updates', () => {
        client0.disconnect();
        client0.connect();

        client0.moves.A();

        expect(client0.getState().G).toEqual({ A: '1' });
        expect(client1.getState().G).toEqual({ A: '1' });
      });
    });
  });
});

describe('createMoveDispatchers', () => {
  const Game = {
    moves: {
      A: (G) => G,
      B: () => INVALID_MOVE,
    },
  };

  const reducer = CreateGameReducer({ game: Game });

  const store = createStore(reducer, InitializeGame({ game: Game }));

  const m = createMoveDispatchers(store, Game);

  test('move dispatcher', () => {
    expect(typeof m.A).toBe('function');
    expect(typeof m.B).toBe('function');
  });

  test('move execution', () => {
    const state = m.A();
    expect(state).not.toBe(undefined);
  });

  test('invalid move', () => {
    const state = m.B();
    expect(state).toBe(undefined);
  });
});

describe('plugins', () => {
  let client: ReturnType<typeof Client>;
  const plugin = {
    name: 'plugin',
    api: () => ({
      test: () => 'test',
    }),
    flush: () => null,
    setup: () => ({}),
  };

  const game: Game = {
    setup: () => ({}),
    plugins: [plugin],
  };

  beforeAll(() => {
    client = Client({ game });
  });

  test('initialize plugin', () => {
    expect(client.getState().plugins.plugin).toEqual({});
  });

  test('api', () => {
    expect(client.getState().plugins.plugin?.api().test()).toEqual('test');
  });
});

describe('Authentication and Reconnection', () => {
  let client;
  const game: Game = {
    moves: { A: (_, arg) => ({ arg }) },
  };

  beforeEach(() => {
    client = Client({ game, multiplayer: SocketIO() });
  });

  afterEach(() => {
    client.stop();
  });

  test('update credentials', () => {
    client.updateCredentials('new-credentials');
    expect(client.credentials).toBe('new-credentials');
  });

  test('credentials included in actions', () => {
    jest.spyOn(client.transport, 'sendAction');
    client.updateCredentials('new-credentials');
    client.moves.A(42);
    expect(client.transport.sendAction).toHaveBeenCalledWith(
      expect.objectContaining({
        credentials: 'new-credentials',
      }),
      expect.anything()
    );
  });

  test('automatic reconnection', () => {
    return new Promise<void>((done) => {
      jest.spyOn(client.transport, 'connect');
      client.start();
      client.transport.socket.emit('disconnect');
      setTimeout(() => {
        expect(client.transport.connect).toHaveBeenCalledTimes(2);
        done();
      }, 1000);
    });
  });
});

describe('receiveTransportData', () => {
  let sendToClient: (data: TransportData) => void;
  let client: ReturnType<typeof Client>;
  let requestSync: jest.Mock;

  beforeEach(() => {
    requestSync = jest.fn();
    client = Client({
      game: {},
      matchID: 'A',
      debug: false,
      // Use the multiplayer interface to extract the client callback
      // and use it to send updates to the client directly.
      multiplayer: ({ transportDataCallback }) => {
        sendToClient = transportDataCallback;
        return {
          connect() {},
          disconnect() {},
          subscribe() {},
          requestSync,
        } as unknown as Transport;
      },
    });
    client.start();
  });

  afterEach(() => {
    client.stop();
  });

  test('discards update with wrong matchID', () => {
    sendToClient({
      type: 'sync',
      args: ['wrongID', { state: { G: 'G', ctx: {} } } as SyncInfo],
    });
    expect(client.getState()).toBeNull();
  });

  test('applies sync', () => {
    const state = { G: 'G', ctx: {} };
    sendToClient({ type: 'sync', args: ['A', { state } as SyncInfo] });
    expect(client.getState().G).toEqual(state.G);
  });

  test('applies update', () => {
    const state1 = { G: 'G1', _stateID: 1, ctx: {} } as State;
    const state2 = { G: 'G2', _stateID: 2, ctx: {} } as State;
    sendToClient({ type: 'sync', args: ['A', { state: state1 } as SyncInfo] });
    sendToClient({ type: 'update', args: ['A', state2, []] });
    expect(client.getState().G).toEqual(state2.G);
  });

  test('ignores stale update', () => {
    const state1 = { G: 'G1', _stateID: 1, ctx: {} } as State;
    const state2 = { G: 'G2', _stateID: 0, ctx: {} } as State;
    sendToClient({ type: 'sync', args: ['A', { state: state1 } as SyncInfo] });
    sendToClient({ type: 'update', args: ['A', state2, []] });
    expect(client.getState().G).toEqual(state1.G);
  });

  test('applies a patch', () => {
    const state = { G: 'G1', _stateID: 1, ctx: {} } as State;
    sendToClient({ type: 'sync', args: ['A', { state } as SyncInfo] });
    sendToClient({
      type: 'patch',
      args: ['A', 1, 2, [{ op: 'replace', path: '/_stateID', value: 2 }], []],
    });
    expect(client.getState()._stateID).toBe(2);
  });

  test('ignores patch for different state ID', () => {
    const state = { G: 'G1', _stateID: 1, ctx: {} } as State;
    sendToClient({ type: 'sync', args: ['A', { state } as SyncInfo] });
    sendToClient({
      type: 'patch',
      args: ['A', 2, 3, [{ op: 'replace', path: '/_stateID', value: 3 }], []],
    });
    expect(client.getState()._stateID).toBe(1);
  });

  test('resyncs after failed patch', () => {
    const state = { G: 'G1', _stateID: 1, ctx: {} } as State;
    sendToClient({ type: 'sync', args: ['A', { state } as SyncInfo] });
    expect(requestSync).not.toHaveBeenCalled();
    // Send bad patch.
    sendToClient({
      type: 'patch',
      args: ['A', 1, 2, [{ op: 'replace', path: '/_stateIDD', value: 2 }], []],
    });
    // State is unchanged and the client requested to resync.
    expect(client.getState()._stateID).toBe(1);
    expect(requestSync).toHaveBeenCalled();
  });

  test('updates match metadata', () => {
    expect(client.matchData).toBeUndefined();
    const matchData = [{ id: 0 }];
    sendToClient({ type: 'matchData', args: ['A', matchData] });
    expect(client.matchData).toEqual(matchData);
  });

  test('appends a chat message', () => {
    expect(client.chatMessages).toEqual([]);
    const message = { id: 'x', sender: '0', payload: 'hi' };
    sendToClient({ type: 'chat', args: ['A', message] });
    expect(client.chatMessages).toEqual([message]);
  });
});

describe('strip secret only on server', () => {
  type G = { secret?: number[]; sum?: number; A?: string };
  let client0;
  let client1;
  let spec: { game: Game<G>; multiplayer };
  const initial = { secret: [1, 2, 3, 4], sum: 0 };
  beforeAll(() => {
    spec = {
      game: {
        setup: () => initial,
        playerView: ({ G }) => {
          const r = { ...G };
          r.sum = r.secret.reduce((prev, curr) => prev + curr);
          delete r.secret;
          return r;
        },
        moves: { A: ({ playerID }) => ({ A: playerID }) },
      },
      multiplayer: Local(),
    };

    client0 = Client({ ...spec, playerID: '0' });
    client1 = Client({ ...spec, playerID: '1' });

    client0.start();
    client1.start();
  });

  test('secret stripped', () => {
    expect(client0.getState().G).toEqual({ sum: 10 });
    expect(client1.getState().G).toEqual({ sum: 10 });
  });

  afterAll(() => {
    client0.stop();
    client1.stop();
  });
});

test('accepts enhancer for store', () => {
  let spyDispatcher;
  const spyEnhancer =
    (vanillaCreateStore) =>
    (...args) => {
      const vanillaStore = vanillaCreateStore(...args);
      return {
        ...vanillaStore,
        dispatch: (spyDispatcher = jest.fn(vanillaStore.dispatch)),
      };
    };
  const client = Client({
    game: {
      moves: {
        A: (_, arg) => ({ arg }),
      },
    },
    enhancer: spyEnhancer,
  });

  expect(spyDispatcher.mock.calls).toHaveLength(0);
  client.moves.A(42);
  expect(spyDispatcher.mock.calls).toHaveLength(1);
});

describe('event dispatchers', () => {
  const clientEvents = [
    'endTurn',
    'pass',
    'endPhase',
    'setPhase',
    'endGame',
    'setActivePlayers',
    'endStage',
    'setStage',
  ];
  test('default', () => {
    const game: Game = {};
    const client = Client({ game });
    expect(Object.keys(client.events)).toEqual(clientEvents);
    expect(client.getState().ctx.turn).toBe(1);
    client.events.endTurn();
    expect(client.getState().ctx.turn).toBe(2);
  });

  test('all events', () => {
    const game: Game = {
      events: {
        endPhase: true,
        endGame: true,
      },
    };
    const client = Client({ game });
    expect(Object.keys(client.events)).toEqual(clientEvents);
    expect(client.getState().ctx.turn).toBe(1);
    client.events.endTurn();
    expect(client.getState().ctx.turn).toBe(2);
  });

  test('no events', () => {
    const game: Game = {
      events: {
        endGame: false,
        endPhase: false,
        setPhase: false,
        endTurn: false,
        pass: false,
        setActivePlayers: false,
        endStage: false,
        setStage: false,
      },
    };
    const client = Client({ game });
    expect(Object.keys(client.events)).toEqual([]);
  });
});

describe('move dispatchers', () => {
  const game = ProcessGameConfig({
    moves: {
      A: ({ G }) => G,
      B: ({ playerID }) => ({ moved: playerID }),
      C: () => ({ victory: true }),
    },
    endIf: ({ G, ctx }) => (G.victory ? ctx.currentPlayer : undefined),
  });
  const reducer = CreateGameReducer({ game });
  const initialState = InitializeGame({ game });

  test('basic', () => {
    const store = createStore(reducer, initialState);
    const api = createMoveDispatchers(game.moveNames, store);

    expect(Object.getOwnPropertyNames(api)).toEqual(['A', 'B', 'C']);
    expect(api.unknown).toBe(undefined);

    api.A();
    expect(store.getState().G).not.toMatchObject({ moved: true });
    expect(store.getState().G).not.toMatchObject({ victory: true });

    api.B();
    expect(store.getState().G).toMatchObject({ moved: '0' });

    store.dispatch(gameEvent('endTurn', null, '0'));

    api.B();
    expect(store.getState().G).toMatchObject({ moved: '1' });

    api.C();
    expect(store.getState().G).toMatchObject({ victory: true });
  });

  test('with undefined playerID - single player mode', () => {
    const store = createStore(reducer, initialState);
    const api = createMoveDispatchers(game.moveNames, store);
    api.B();
    expect(store.getState().G).toMatchObject({ moved: '0' });
  });

  test('with undefined playerID - multiplayer mode', () => {
    const store = createStore(reducer, initialState);
    const api = createMoveDispatchers(
      game.moveNames,
      store,
      undefined,
      null,
      true
    );
    api.B();
    expect(store.getState().G).toMatchObject({ moved: undefined });
  });

  test('with null playerID - single player mode', () => {
    const store = createStore(reducer, initialState);
    const api = createMoveDispatchers(game.moveNames, store, null);
    api.B();
    expect(store.getState().G).toMatchObject({ moved: '0' });
  });

  test('with null playerID - multiplayer mode', () => {
    const store = createStore(reducer, initialState);
    const api = createMoveDispatchers(game.moveNames, store, null, null, true);
    api.B();
    expect(store.getState().G).toMatchObject({ moved: null });
  });
});

describe('transient handling', () => {
  let client = null;

  beforeEach(() => {
    client = Client({
      game: {
        moves: {
          A: () => ({}),
          Invalid: () => INVALID_MOVE,
        },
      },
    });
  });

  test('regular move', () => {
    const result = client.moves.A();
    // TODO(#723): Check against a successful ActionResult.
    expect(result).toBeUndefined();
    const state = client.store.getState();
    // Slightly paranoid check to ensure we don't erroneously add transients.
    expect(state).toEqual(
      expect.not.objectContaining({ transients: expect.anything() })
    );
  });

  test('invalid move', () => {
    const result = client.moves.Invalid();
    // TODO(#723): Check against an errored ActionResult.
    expect(result).toBeUndefined();
    const state = client.store.getState();
    // Ensure we've stripped the transients automagically.
    // At the time this test was written, this effectively ensures that Client
    // hooks up the TransientHandlingMiddleware correctly.
    expect(state).toEqual(
      expect.not.objectContaining({ transients: expect.anything() })
    );
  });
});

describe('log handling', () => {
  let client = null;

  beforeEach(() => {
    client = Client({
      game: {
        moves: {
          A: () => ({}),
        },
      },
    });
  });

  test('regular', () => {
    client.moves.A();
    client.moves.A();

    expect(client.log).toEqual([
      {
        action: makeMove('A', [], '0'),
        _stateID: 0,
        phase: null,
        turn: 1,
      },
      {
        action: makeMove('A', [], '0'),
        _stateID: 1,
        phase: null,
        turn: 1,
      },
    ]);
  });

  test('update', () => {
    const state = { restore: true, _stateID: 0 } as unknown as State;
    const deltalog = [
      {
        action: {},
        _stateID: 0,
      },
      {
        action: {},
        _stateID: 1,
      },
    ] as LogEntry[];
    const action = update(state, deltalog);

    client.store.dispatch(action);
    client.store.dispatch(action);

    expect(client.log).toEqual(deltalog);
  });

  test('patch', () => {
    const patches = [
      { op: 'replace', path: '/_stateID', value: 1 },
    ] as Operation[];
    const deltalog = [
      {
        action: {},
        _stateID: 0,
      },
      {
        action: {},
        _stateID: 1,
      },
    ] as LogEntry[];
    const action = patch(0, 1, patches, deltalog);
    client.store.dispatch(action);

    expect(client.log).toEqual(deltalog);
  });

  test('sync', () => {
    const state = { restore: true };
    const log = ['0', '1'];
    const action = sync({ state, log } as unknown as SyncInfo);

    client.store.dispatch(action);
    client.store.dispatch(action);

    expect(client.log).toEqual(log);
  });

  test('update - log missing', () => {
    const action = update(undefined, undefined);
    client.store.dispatch(action);
    expect(client.log).toEqual([]);
  });

  test('sync - log missing', () => {
    const action = sync({} as SyncInfo);
    client.store.dispatch(action);
    expect(client.log).toEqual([]);
  });
});

describe('undo / redo', () => {
  const game: Game = {
    moves: {
      A: (_, arg) => ({ arg }),
    },
  };

  test('basic', () => {
    const client = Client({ game });

    expect(client.getState().G).toEqual({});
    client.moves.A(42);
    expect(client.getState().G).toEqual({ arg: 42 });

    client.undo();
    expect(client.getState().G).toEqual({});

    client.redo();
    expect(client.getState().G).toEqual({ arg: 42 });
  });
});

describe('subscribe', () => {
  let client;
  let fn;
  beforeAll(() => {
    const game: Game = {
      moves: {
        A: ({ G }) => {
          G.moved = true;
        },
      },
    };
    client = Client({ game });
    fn = jest.fn();
    client.subscribe(fn);
  });

  test('called at the beginning', () => {
    expect(fn).toBeCalledWith(
      expect.objectContaining({
        G: {},
        ctx: expect.objectContaining({ turn: 1 }),
      })
    );
  });

  test('called after a move', () => {
    fn.mockClear();
    client.moves.A();
    expect(fn).toBeCalledWith(
      expect.objectContaining({
        G: { moved: true },
      })
    );
  });

  test('called after an event', () => {
    fn.mockClear();
    client.events.endTurn();
    expect(fn).toBeCalledWith(
      expect.objectContaining({
        ctx: expect.objectContaining({ turn: 2 }),
      })
    );
  });

  test('multiple subscriptions', () => {
    fn.mockClear();

    const fn2 = jest.fn();
    const unsubscribe = client.subscribe(fn2);

    // The subscriber that just subscribed is notified.
    expect(fn).not.toBeCalled();
    expect(fn2).toBeCalledWith(
      expect.objectContaining({
        G: { moved: true },
      })
    );

    fn.mockClear();
    fn2.mockClear();

    client.moves.A();

    // Both subscribers are notified.
    expect(fn).toBeCalledWith(
      expect.objectContaining({
        G: { moved: true },
      })
    );
    expect(fn2).toBeCalledWith(
      expect.objectContaining({
        G: { moved: true },
      })
    );

    unsubscribe();

    fn.mockClear();
    fn2.mockClear();

    // The subscriber the unsubscribed is not notified.
    client.moves.A();
    expect(fn).toBeCalledWith(
      expect.objectContaining({
        G: { moved: true },
      })
    );
    expect(fn2).not.toBeCalled();
  });

  test('transport notifies subscribers', () => {
    let transport: ReturnType<ReturnType<typeof SocketIO>>;
    const multiplayer = (opts: any) => {
      transport = SocketIO()(opts);
      return transport;
    };
    const client = Client({ game: {}, multiplayer });
    const fn = jest.fn();
    client.subscribe(fn);
    client.start();
    fn.mockClear();
    (transport as any).connectionStatusCallback();
    expect(fn).toHaveBeenCalled();
    client.stop();
  });

  describe('multiplayer', () => {
    test('subscribe before start', () => {
      const fn = jest.fn();
      const client = Client({
        game: {},
        multiplayer: Local(),
      });
      client.subscribe(fn);
      expect(fn).not.toBeCalled();
      client.start();
      expect(fn).toBeCalled();
      client.stop();
    });

    test('subscribe after start', () => {
      const fn = jest.fn();
      const client = Client({
        game: {},
        multiplayer: Local(),
      });
      client.start();
      client.subscribe(fn);
      expect(fn).toBeCalled();
      client.stop();
    });
  });
});

test('override game state', () => {
  const game: Game = {
    moves: {
      A: ({ G }) => {
        G.moved = true;
      },
    },
  };
  const client = Client({ game });
  client.moves.A();
  expect(client.getState().G).toEqual({ moved: true });
  client.overrideGameState({ G: { override: true }, ctx: {} });
  expect(client.getState().G).toEqual({ override: true });
  client.overrideGameState(null);
  expect(client.getState().G).toEqual({ moved: true });
});

// TODO(#941): These tests should validate DOM mounting/unmounting.
describe('start / stop', () => {
  beforeEach(() => {
    // Don't let other calls to `error` pollute this state.
    jest.resetAllMocks();
  });

  test('mount on custom element', () => {
    const el = document.createElement('div');
    const client = Client({ game: {}, debug: { target: el } });
    expect(() => {
      client.start();
      client.stop();
    }).not.toThrow();
    expect(error).not.toHaveBeenCalled();
  });

  test('no error when mounting on null element', () => {
    const client = Client({ game: {}, debug: { target: null } }) as any;
    expect(() => {
      client.start();
      client.stop();
    }).not.toThrow();

    client.start();
    client.stop();
    expect(client.manager.debugPanel).toBe(null);
  });

  test('override debug implementation', () => {
    const client = Client({ game: {}, debug: { impl: Debug } });
    expect(() => {
      client.start();
      client.stop();
    }).not.toThrow();

    client.start();
    client.stop();
    expect(error).not.toHaveBeenCalled();
  });

  test('production mode', () => {
    process.env.NODE_ENV = 'production';
    const client = Client({ game: {} });
    expect(() => {
      client.start();
      client.stop();
    }).not.toThrow();
    expect(error).not.toHaveBeenCalled();
  });

  test('try to stop without starting', () => {
    const client = Client({ game: {} });
    expect(() => {
      client.stop();
    }).not.toThrow();
    expect(error).not.toHaveBeenCalled();
  });
});
