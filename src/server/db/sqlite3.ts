import type { State, Server, LogEntry } from '../../types';
import * as StorageAPI from './base';
import sqlite3 from 'sqlite3';
interface MatchRow {
  matchID: string;
  initialState: string | null;
  currentState: string | null;
}

/**
 * Sqlite data storage.
 */
export class Sqlite extends StorageAPI.Async {
  private db: sqlite3.Database;
  private initPromise: Promise<void>;
  /**
   * Creates a new Sqlite storage.
   */
  constructor() {
    super();
    this.initPromise = new Promise<void>((resolve, reject) => {
      this.db = new sqlite3.Database('sqlite.db', (err) => {
        if (err) {
          console.error('Error creating DB:', err.message);
          reject(err);
        } else {
          this.initializeTables().then(resolve).catch(reject);
          console.log('DB Sqlite created successfully');
        }
      });
    });
  }

  private async initializeTables(): Promise<void> {
    try {
      await Promise.all([
        this.runQuery(`
          CREATE TABLE IF NOT EXISTS matches (
            matchID TEXT PRIMARY KEY,
            initialState TEXT,
            currentState TEXT
          )
        `),
        this.runQuery(`
          CREATE TABLE IF NOT EXISTS metadata (
            matchID TEXT PRIMARY KEY,
            gameName TEXT,
            setupData TEXT,
            gameover TEXT,
            nextMatchID TEXT,
            unlisted BOOLEAN,
            createdAt INTEGER,
            updatedAt INTEGER,
            FOREIGN KEY(matchID) REFERENCES matches(matchID)
          )
        `),
        this.runQuery(`
          CREATE TABLE IF NOT EXISTS players (
            matchID TEXT,
            id INTEGER,
            name TEXT,
            credentials TEXT,
            data TEXT,
            isConnected BOOLEAN,
            PRIMARY KEY (matchID, id),
            FOREIGN KEY(matchID) REFERENCES matches(matchID)
          )
        `),
        this.runQuery(`
          CREATE TABLE IF NOT EXISTS logs (
            logID INTEGER PRIMARY KEY AUTOINCREMENT,
            matchID TEXT,
            action TEXT,
            _stateID INTEGER,
            turn INTEGER,
            phase TEXT,
            redact BOOLEAN,
            automatic BOOLEAN,
            metadata TEXT,
            patch TEXT,
            FOREIGN KEY(matchID) REFERENCES matches(matchID)
          )
        `),
      ]);
    } catch (error) {
      console.error('Error initializing tables:', error.message);
      throw error;
    }
  }
  async connect() {
    await this.initPromise;
  }
  /**
   * Create a new match.
   *
   * @override
   */
  async createMatch(
    matchID: string,
    opts: StorageAPI.CreateMatchOpts
  ): Promise<void> {
    try {
      await Promise.all([
        this.createMatchInDb(matchID, opts.initialState),
        this.setState(matchID, opts.initialState),
        this.setMetadata(matchID, opts.metadata),
      ]);
    } catch {
      console.log(`An error ocurred in create match for ID: ${matchID}`);
    }
  }
  /**
   * Create the match in DB for an especific matchId.
   */
  private createMatchInDb(matchID, InitialState): Promise<void> {
    const jsonInitialState = JSON.stringify(InitialState);
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO matches (matchID, initialState, currentState) VALUES (?, ?, ?)',
        [matchID, jsonInitialState, jsonInitialState],
        (err) => {
          if (err) {
            console.log('Error in createMatchinDb' + err);
            reject('Error in createMatchinDb: ' + err);
            return;
          } else {
            console.log(`A new match has been created with ID: ${matchID}`);
            return resolve();
          }
        }
      );
    });
  }
  /**
   * Update the match in DB for an especific matchId.
   */
  private updateMatchInDb(matchID: string, state: State): Promise<void> {
    return new Promise((resolve, reject) => {
      const jsonState = JSON.stringify(state);
      this.db.run(
        'UPDATE matches SET currentState = ? WHERE matchID = ?',
        [jsonState, matchID],
        (err) => {
          if (err) {
            console.log('Error in updateMatchinDb' + err);
            reject('Error in updateMatchinDb: ' + err);
            return;
          } else {
            console.log('updateMatchinDb succesfully');
            return resolve();
          }
        }
      );
    });
  }
  /**
   * Create metadata in DB for an especific matchId
   */
  async setMetadata(matchID: string, opts: Server.MatchData) {
    await new Promise<void>((resolve, reject) => {
      const jsonMetadata = {
        ...opts,
        setupData: JSON.stringify(opts.setupData),
        gameover: JSON.stringify(opts.gameover),
      };
      this.db.run(
        'INSERT OR REPLACE INTO metadata (matchID, gameName, setupData, gameover, nextMatchID, unlisted, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?);',
        [
          matchID,
          jsonMetadata.gameName,
          jsonMetadata.setupData,
          jsonMetadata.gameover,
          jsonMetadata.nextMatchID,
          jsonMetadata.unlisted,
          jsonMetadata.createdAt,
          jsonMetadata.updatedAt,
        ],
        async (err) => {
          if (err) {
            console.log('Error in setMetadata:' + err);
            reject('Error in setMetadata: ' + err);
            return;
          }
          try {
            if (opts.players) {
              await this.setPlayers(matchID, opts.players);
            }
            resolve();
          } catch (error) {
            console.log('Error in setMetadata (players):' + error);
            reject('Error in setMetadata (players): ' + error);
          }
        }
      );
    });
  }
  private async setPlayers(matchId, playersList) {
    const players = playersList;
    const playerInsertPromises = Object.keys(players).map(async (playerID) => {
      const player = players[playerID];
      await new Promise<void>((resolve, reject) => {
        this.db.run(
          'INSERT OR REPLACE INTO players (matchID, id, name, credentials, data, isConnected) VALUES (?, ?, ?, ?, ?, ?);',
          [
            matchId,
            playerID,
            player.name || '',
            player.credentials || '',
            JSON.stringify(player.data),
            player.isConnected ? 1 : 0,
          ],
          (err) => {
            if (err) {
              console.log('Error in setPlayers' + err);
              reject('Error in setPlayers: ' + err);
            } else {
              resolve();
            }
          }
        );
      });
    });
    await Promise.all(playerInsertPromises);
  }
  /**
   * Write the match state in DB.
   */
  async setState(matchID: string, state: State, deltalog?: LogEntry[]) {
    try {
      if (deltalog && deltalog.length > 0) {
        const existingLogs = (await this.getLog(matchID)) as LogEntry[];
        const combinedLogs = [...existingLogs, ...deltalog];
        await this.setLog(matchID, combinedLogs);
        console.log(`Create a log succesfully for matchId:${matchID}`);
      }
      await this.updateMatchInDb(matchID, state);
    } catch (error) {
      console.log(
        `An error ocurred for matchId in setState:${matchID}:`,
        error
      );
    }
  }
  private getLog(matchID: string): Promise<LogEntry[]> {
    return new Promise((resolve, reject) => {
      this.db.all<any>(
        'SELECT * FROM logs WHERE matchID = ?;',
        [matchID],
        (err, rows) => {
          if (err) {
            console.log('Error in getLog: ' + err);
            reject('Error in getLog: ' + err);
            return;
          } else {
            const logs = rows.map((row) => ({
              action: row.action ? JSON.parse(row.action) : null,
              _stateID: row._stateID,
              turn: row.turn,
              phase: row.phase,
              redact: row.redact,
              automatic: row.automatic,
              metadata: row.metadata ? JSON.parse(row.metadata) : null,
              patch: row.patch ? JSON.parse(row.patch) : null,
            }));
            resolve(logs);
          }
        }
      );
    });
  }
  async getMetadata(matchID: string): Promise<Server.MatchData | undefined> {
    try {
      const metadataRow = await new Promise<Server.MatchData>(
        (resolve, reject) => {
          this.db.get<Server.MatchData>(
            'SELECT * FROM metadata WHERE matchID = ?;',
            [matchID],
            (err, row) => {
              if (err) {
                console.log('Error in getMetadata (metadata): ' + err);
                reject('Error in getMetadata (metadata): ' + err);
              } else {
                resolve(row);
              }
            }
          );
        }
      );

      if (!metadataRow) {
        return undefined;
      }
      const players = await this.getPlayers(matchID);

      return {
        gameName: metadataRow.gameName,
        players: players,
        setupData: metadataRow.setupData
          ? JSON.parse(metadataRow.setupData)
          : undefined,
        gameover: metadataRow.gameover
          ? JSON.parse(metadataRow.gameover)
          : undefined,
        nextMatchID: metadataRow.nextMatchID,
        unlisted: metadataRow.unlisted,
        createdAt: metadataRow.createdAt,
        updatedAt: metadataRow.updatedAt,
      };
    } catch (error) {
      console.log('Error in getMetadata' + error);
      throw new Error('Error in getMetadata: ' + error);
    }
  }
  private async getPlayers(
    matchID: string
  ): Promise<{ [id: number]: Server.PlayerMetadata }> {
    return new Promise((resolve, reject) => {
      this.db.all<Server.PlayerMetadata>(
        'SELECT * FROM players WHERE matchID = ?;',
        [matchID],
        (err, rows) => {
          if (err) {
            console.log('Error in getPlayers' + err);
            reject('Error in getPlayers: ' + err);
          } else {
            const playersObject: { [id: number]: Server.PlayerMetadata } = {};
            rows.forEach((row) => {
              playersObject[row.id] = {
                id: row.id,
                name: row.name,
                credentials: row.credentials,
                data: row.data ? JSON.parse(row.data) : null,
                isConnected: row.isConnected,
              };
            });
            resolve(playersObject);
          }
        }
      );
    });
  }

  private setLog(matchID: string, logs: LogEntry[]): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        `
      DELETE FROM logs WHERE matchID = ?;
    `,
        [matchID]
      );

      const db = this.db.prepare(`
      INSERT INTO logs (matchID, action, _stateID, turn, phase, redact, automatic, metadata, patch)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

      logs.forEach((log) => {
        db.run([
          matchID,
          JSON.stringify(log.action),
          log._stateID,
          log.turn,
          log.phase,
          log.redact ?? null,
          log.automatic ?? null,
          JSON.stringify(log.metadata),
          JSON.stringify(log.patch),
        ]);
      });

      db.finalize((err) => {
        if (err) {
          console.log('Error in setLog: ' + err);
          reject('Error in setLog: ' + err);
          return;
        }
        console.log('Set log succesfully: ');
        resolve();
      });
    });
  }
  private getState(matchID, isInitialState): Promise<string | undefined> {
    return new Promise((resolve, reject) => {
      try {
        this.db.get<MatchRow>(
          'SELECT matchID,initialState,currentState FROM matches WHERE matchID = ?;',
          [matchID],
          (err, row) => {
            if (err) {
              reject('Error in getState: ' + err);
              return;
            }
            if (!row) {
              console.log('not result of DB');
              resolve(undefined);
              return;
            }
            let state;
            if (isInitialState) {
              state = row ? row.initialState : undefined;
            } else {
              state = row ? row.currentState : undefined;
            }
            return resolve(state);
          }
        );
      } catch {
        console.log('Error in getState');
        return undefined;
      }
    });
  }
  /**
   * Fetches state for a particular matchID.
   */
  async fetch<O extends StorageAPI.FetchOpts>(
    matchID: string,
    opts: O
  ): Promise<StorageAPI.FetchResult<O>> {
    const result = {} as StorageAPI.FetchFields;
    const isInitialState = true;

    if (opts.state) {
      const state = await this.getState(matchID, !isInitialState);
      result.state = state ? (JSON.parse(state) as State) : undefined;
    }
    if (opts.metadata) {
      const metadata = await this.getMetadata(matchID);
      result.metadata = metadata as Server.MatchData;
    }
    if (opts.log) {
      const logs = await this.getLog(matchID);
      result.log = logs as LogEntry[];
    }
    if (opts.initialState) {
      const state = await this.getState(matchID, isInitialState);
      result.initialState = state ? (JSON.parse(state) as State) : undefined;
    }

    return result as StorageAPI.FetchResult<O>;
  }
  /**
   * Remove the match  from DB for matchId
   */
  private deleteMatch(matchID: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        //I do not delete the match, only the status of this match.
        'DELETE from matches WHERE matchID = ?',
        [matchID],
        (err) => {
          if (err) {
            console.log('Error in delete match: ' + err);
            reject('Error in delete match: ' + err);
            return;
          } else {
            return resolve();
          }
        }
      );
    });
  }
  /**
   * Remove the logs from DB for matchId
   */
  private deleteLogs(matchID: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        //I do not delete the match, only the status of this match.
        'DELETE from logs WHERE matchID = ?',
        [matchID],
        (err) => {
          if (err) {
            console.log('Error in delete state: ' + err);
            reject('Error in delete state: ' + err);
            return;
          } else {
            return resolve();
          }
        }
      );
    });
  }
  /**
   * Remove the match metadata from DB for matchId
   */
  private deleteMetadata(matchID: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(
        'DELETE from metadata WHERE matchID = ?',
        [matchID],
        (err) => {
          if (err) {
            console.log('Error in delete metadata: ' + err);
            reject('Error in delete metadata: ' + err);
            return;
          } else {
            return resolve();
          }
        }
      );
    });
  }
  /**
   * Remove the players from DB for matchId
   */
  private deletePlayers(matchID: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE from players WHERE matchID = ?', [matchID], (err) => {
        if (err) {
          console.log('Error in delete players: ' + err);
          reject('Error in delete players: ' + err);
          return;
        } else {
          return resolve();
        }
      });
    });
  }
  /**
   * Remove the match state from DB.
   */
  async wipe(matchID: string) {
    try {
      await Promise.all([
        this.deleteMatch(matchID),
        this.deleteMetadata(matchID),
        this.deleteLogs(matchID),
        this.deletePlayers(matchID),
      ]);
      console.log(`Successfully wiped all data for matchID: ${matchID}`);
    } catch (error) {
      console.log(
        `Failed to wipe data for matchID: ${matchID}. Error: ${error}`
      );
      throw error;
    }
  }
  /**
   * Return all keys.
   *
   * @override
   */
  async listMatches(opts?: StorageAPI.ListMatchesOpts): Promise<string[]> {
    let query = 'SELECT matchID FROM metadata  WHERE 1=1';
    const params: any[] = [];

    if (opts) {
      if (opts.gameName !== undefined) {
        query += ' AND gameName = ?';
        params.push(opts.gameName);
      }

      if (opts.where !== undefined) {
        if (opts.where.isGameover !== undefined) {
          query +=
            ' AND gameover IS ' + (opts.where.isGameover ? 'NOT NULL' : 'NULL');
        }

        if (opts.where.updatedBefore !== undefined) {
          query += ' AND updatedAt < ?';
          params.push(opts.where.updatedBefore);
        }

        if (opts.where.updatedAfter !== undefined) {
          query += ' AND updatedAt > ?';
          params.push(opts.where.updatedAfter);
        }
      }
    }

    return new Promise<string[]>((resolve, reject) => {
      this.db.all<{ matchID: string }>(query, params, (err, rows) => {
        if (err) {
          console.log('Error in listMatches: ' + err);
          reject('Error in listMatches: ' + err);
        } else {
          const matchIDs = rows.map((row) => row.matchID);
          resolve(matchIDs);
        }
      });
    });
  }

  /**
   * Deletes all data from the db tables
   */
  public async clear(): Promise<void> {
    const tables = ['matches', 'metadata', 'logs', 'players'];
    const promises = tables.map(
      (table) =>
        new Promise<void>((resolve, reject) => {
          this.db.run(`DELETE FROM ${table}`, (err) => {
            if (err) {
              console.log(`Error deleting from ${table}: ${err}`);
              reject(`Error deleting from ${table}: ${err}`);
            } else {
              resolve();
            }
          });
        })
    );
    try {
      await Promise.all(promises);
      console.log('All tables cleared successfully.');
    } catch (error) {
      console.log('Error clearing all tables:', error);
      throw error;
    }
  }
  /**
   * Execute query.
   *
   */
  private runQuery(query: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.db.run(query, (err) => {
        if (err) {
          console.log('Error run query  all tables:', err);
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}
