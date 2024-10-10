/*
 * Copyright 2017 The boardgame.io Authors
 *
 * Use of this source code is governed by a MIT-style
 * license that can be found in the LICENSE file or at
 * https://opensource.org/licenses/MIT.
 */

import { Sqlite } from './sqlite3';
import type { State, Server, LogEntry } from '../../types';

describe('Sqlite', () => {
  //Initial values.
  let db: Sqlite;
  const matchIdentifier = 'matchID';
  const logEntry1: LogEntry = {
    _stateID: 0,
    action: {
      type: 'MAKE_MOVE',
      payload: { type: '', playerID: '0', args: [] },
    },
    turn: 0,
    phase: '',
    redact: null,
    metadata: null,
    automatic: null,
    patch: null,
  };
  const logEntry2: LogEntry = {
    _stateID: 1,
    action: {
      type: 'MAKE_MOVE',
      payload: { type: '', playerID: '0', args: [] },
    },
    turn: 1,
    phase: '',
    redact: null,
    metadata: null,
    automatic: null,
    patch: null,
  };
  const logEntry3: LogEntry = {
    _stateID: 1,
    action: {
      type: 'MAKE_MOVE',
      payload: { type: '', playerID: '0', args: [] },
    },
    turn: 1,
    phase: '',
  };
  const timestamp = new Date(2020, 4);
  const timestamp2 = new Date(2020, 2, 15);
  // Create game.
  const state: unknown = { a: 1 };
  const metadata: Server.MatchData = {
    gameName: 'tic-tac-toe',
    players: {},
    createdAt: null,
    updatedAt: null,
  };

  beforeAll(async () => {
    db = new Sqlite();
    await db.connect();
  });
  afterEach(async () => {
    await db.clear();
  });

  test('create a match', async () => {
    // Must return undefined when no game exists.
    const result = await db.fetch(matchIdentifier, { state: true });
    expect(result.state).toEqual(undefined);
    await db.createMatch(matchIdentifier, {
      initialState: state as State,
      metadata: metadata,
    });
    //Must return created game.
    {
      const result = await db.fetch(matchIdentifier, {
        state: true,
        metadata: true,
        initialState: true,
      });
      expect(result.state).toEqual({ a: 1 });
      expect(result.initialState).toEqual(result.state);
      expect(result.metadata).toEqual({
        gameName: 'tic-tac-toe',
        setupData: undefined,
        gameover: undefined,
        players: {},
        unlisted: null,
        nextMatchID: null,
        createdAt: null,
        updatedAt: null,
      });
    }

    // // Must return all keys
    const keys = await db.listMatches();
    expect(keys).toEqual([matchIdentifier]);

    // Must remove match from DB
    await db.wipe(matchIdentifier);
    expect(
      await db.fetch(matchIdentifier, {
        metadata: true,
        state: true,
        log: true,
      })
    ).toEqual({ log: [], metadata: undefined, state: undefined });

    // Shall not return error
    await db.wipe(matchIdentifier);

    // Shall create match, then clear DB, then check whether DB is cleared
    await db.setState('game2', state as State);
    const keys2 = await db.listMatches();
    expect(keys2).toHaveLength(0);
  });

  test('log', async () => {
    await db.setState(matchIdentifier, null, [logEntry1]);
    await db.setState(matchIdentifier, null, [logEntry2]);
    await db.setState(matchIdentifier, null, [logEntry3]);

    const result = await db.fetch(matchIdentifier, { log: true });
    expect(result.log).toEqual([logEntry1, logEntry2, logEntry2]);
  });

  let listOfMatchesIds;
  const verifyInitialKeys = async () => {
    listOfMatchesIds = await db.listMatches();
    expect(listOfMatchesIds).toEqual(
      expect.arrayContaining(['matchID', 'matchID2', 'matchID3'])
    );
  };
  describe('listMatches', () => {
    beforeEach(async () => {
      const state: unknown = { a: 1 };
      await db.createMatch('matchID', {
        initialState: state as State,
        metadata: {
          gameName: 'game1',
          updatedAt: new Date(2020, 3).getTime(),
        } as Server.MatchData,
      });

      await db.createMatch('matchID2', {
        initialState: state as State,
        metadata: {
          gameName: 'game1',
          gameover: 'gameover',
          updatedAt: new Date(2020, 5).getTime(),
        } as Server.MatchData,
      });

      await db.createMatch('matchID3', {
        initialState: state as State,
        metadata: {
          gameName: 'game2',
          updatedAt: new Date(2020, 4).getTime(),
        } as Server.MatchData,
      });
    });

    test('filter by gameName', async () => {
      await verifyInitialKeys();

      listOfMatchesIds = await db.listMatches({ gameName: 'game1' });
      expect(listOfMatchesIds).toEqual(
        expect.arrayContaining(['matchID', 'matchID2'])
      );

      listOfMatchesIds = await db.listMatches({ gameName: 'game2' });
      expect(listOfMatchesIds).toEqual(['matchID3']);
    });
    test('filter by isGameover', async () => {
      await verifyInitialKeys();

      listOfMatchesIds = await db.listMatches({ where: { isGameover: true } });
      expect(listOfMatchesIds).toEqual(['matchID2']);

      listOfMatchesIds = await db.listMatches({ where: { isGameover: false } });
      expect(listOfMatchesIds).toEqual(
        expect.arrayContaining(['matchID', 'matchID3'])
      );
    });
    test('filter by updatedBefore', async () => {
      await verifyInitialKeys();

      listOfMatchesIds = await db.listMatches({
        where: { updatedBefore: timestamp.getTime() },
      });
      expect(listOfMatchesIds).toEqual(expect.arrayContaining(['matchID']));
    });
    test('filter by updatedAfter', async () => {
      await verifyInitialKeys();

      listOfMatchesIds = await db.listMatches({
        where: { updatedAfter: timestamp.getTime() },
      });
      expect(listOfMatchesIds).toEqual(['matchID2']);
    });
    test('filter combined', async () => {
      let listOfMatchedIds = await db.listMatches({
        gameName: 'chess',
        where: { isGameover: true },
      });
      expect(listOfMatchedIds).toEqual([]);

      listOfMatchedIds = await db.listMatches({
        where: { isGameover: true, updatedBefore: timestamp.getTime() },
      });
      expect(listOfMatchedIds).toEqual([]);

      listOfMatchedIds = await db.listMatches({
        where: { isGameover: false, updatedBefore: timestamp.getTime() },
      });
      expect(listOfMatchedIds).toEqual(['matchID']);

      listOfMatchedIds = await db.listMatches({
        where: { isGameover: true, updatedAfter: timestamp.getTime() },
      });
      expect(listOfMatchedIds).toEqual(['matchID2']);

      listOfMatchedIds = await db.listMatches({
        where: { isGameover: false, updatedAfter: timestamp.getTime() },
      });
      expect(listOfMatchedIds).toEqual([]);

      listOfMatchedIds = await db.listMatches({
        where: {
          updatedBefore: timestamp.getTime(),
          updatedAfter: timestamp2.getTime(),
        },
      });
      expect(listOfMatchedIds).toEqual(['matchID']);
    });
  });
});
