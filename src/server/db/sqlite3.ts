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
  /**
   * Creates a new Sqlite storage.
   */
  constructor() {
    super();
    this.db = new sqlite3.Database('sqlite.db', (err) => {
      if (err) {
        console.error('Error creating DB: ', err.message);
      } else {
        console.log('DB Sqlite created successfully');
        this.initializeTables();
      }
    }); 
  }
  private async initializeTables() {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS matches (
        matchID TEXT PRIMARY KEY,
        initialState TEXT,
        currentState TEXT
      )
    `);
    this.db.run(`
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
    `);
    this.db.run(`
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
    `);
    this.db.run(`
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
    `);
  }
  async connect() {//???????
    console.log('HIZO COONECT LA DB');
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
      console.log('CREATE MATCH DE SQLITE3');
      // I think it is not necessary to wait for every method call. i have add await before each method?
       this.createMatchinDb(matchID,opts.initialState);
       this.setState(matchID, opts.initialState);
       this.setMetadata(matchID,opts.metadata);
       console.log(' TERMINA CREATE MATCH DE SQLITE3');
    } catch (error) {
      console.log(`An error ocurred in create match for ID: ${matchID}`);
    }
  }
  /**
   * Create the match in DB for an especific matchId.
   */
  private createMatchinDb(matchID, InitialState): Promise<void> {
    const jsonInitialState = JSON.stringify(InitialState);
    return new Promise((resolve, reject) => {
      this.db.run(
        `INSERT INTO matches (matchID, initialState, currentState) VALUES (?, ?, ?)`,
        [matchID, jsonInitialState, jsonInitialState],
        (err) => {
          if (err) {
            reject('Error in updateMatchinDb: ' + err);
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
  private updateMatchinDb(matchID: string, state: State): Promise<void> {
    return new Promise((resolve, reject) => {
      let jsonState = JSON.stringify(state);
      this.db.run(
        `UPDATE matches SET currentState = ? WHERE matchID = ?`,
        [jsonState, matchID],
        (err) => {
          if (err) {
            reject('Error in updateMatchinDb: ' + err);
            return;
          } else {
            return resolve();
          }
        }
      );
    });
  }
  /**
   * Create metadata in DB for an especific matchId
   */
  async setMetadata(matchID: string, opts: Server.MatchData): Promise<void> {
    return new Promise((resolve, reject) => {
      const jsonMetadata = {
        ...opts,
        setupData: JSON.stringify(opts.setupData),
        gameover: JSON.stringify(opts.gameover)
      };
  
      this.db.run(
        `INSERT OR REPLACE INTO metadata (matchID, gameName, setupData, gameover, nextMatchID, unlisted, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          matchID,
          jsonMetadata.gameName,
          jsonMetadata.setupData,
          jsonMetadata.gameover,
          jsonMetadata.nextMatchID,
          jsonMetadata.unlisted,
          jsonMetadata.createdAt,
          jsonMetadata.updatedAt
        ], 
        async (err) => {
          if (err) {
            reject('Error in setMetadata: ' + err);
            return;
          }
          try {
            await this.setPlayers(matchID, opts.players);
            resolve();
          } catch (error) {
            reject('Error in setMetadata (players): ' + error);
          }
        }
      );
    });
  }
private async setPlayers(matchId,playersList){
  const players = playersList;
  const playerInsertPromises = Object.keys(players).map((playerID) => {
  const player = players[playerID];
    return new Promise<void>((resolve, reject) => {
      this.db.run(
        `INSERT OR REPLACE INTO players (matchID, id, name, credentials, data, isConnected) VALUES (?, ?, ?, ?, ?, ?);`,
        [
          matchId,
          playerID,
          player.name || '',
          player.credentials || '',
          JSON.stringify(player.data),
          player.isConnected ? 1 : 0
        ],
        (err) => {
          if (err) {
            reject('Error in setMetadata: ' + err);
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
        const existingLogs = await this.getLog(matchID) as LogEntry[];
        const combinedLogs = [...existingLogs, ...deltalog];
        await this.setLog(matchID, combinedLogs);
        console.log(`Create a log succesfully for matchId:${matchID}`);
      }
      await this.updateMatchinDb(matchID, state);
    } catch (error) {
      console.log(
        `An error ocurred for matchId in setState:${matchID}:`,
        error
      );
    }
  }
private getLog(matchID : string):Promise<LogEntry[]>{
  return new Promise((resolve, reject) => {
    this.db.all<any>('SELECT * FROM logs WHERE matchID = ?;', [matchID], (err, rows) => {
      if (err) {
        reject('Error in getLog: ' + err);
        return;
      } else {
        const logs = rows.map(row => ({
          action:  row.action ? JSON.parse(row.action) : null,
          _stateID: row._stateID,
          turn: row.turn,
          phase: row.phase,
          redact: row.redact,
          automatic: row.automatic,
          metadata: row.metadata ? JSON.parse(row.metadata) : null,
          patch: row.patch ? JSON.parse(row.patch) : null
        }));
        resolve(logs);
      }
    });
  });
}
async getMetadata(matchID: string): Promise<Server.MatchData | undefined> {
  try {
      const metadataRow = await new Promise<Server.MatchData>((resolve, reject) => {
      this.db.get<Server.MatchData>('SELECT * FROM metadata WHERE matchID = ?;', [matchID], (err, row) => {
        if (err) {
          reject('Error in getMetadata (metadata): ' + err);
        } else {
          resolve(row);
        }
      });
    });

    if (!metadataRow) {
      return undefined;
    }
    const players = await this.getPlayers(matchID);

    return {
      gameName: metadataRow.gameName,
      players: players,
      setupData: metadataRow.setupData ? JSON.parse(metadataRow.setupData) : undefined,
      gameover: metadataRow.gameover ? JSON.parse(metadataRow.gameover) : undefined,
      nextMatchID: metadataRow.nextMatchID,
      unlisted: metadataRow.unlisted,
      createdAt: metadataRow.createdAt,
      updatedAt: metadataRow.updatedAt
    };
  } catch (err) {
    throw new Error('Error in getMetadata: ' + err);
  }
}
private async getPlayers(matchID: string): Promise<{ [id: number]: Server.PlayerMetadata }> {
  return new Promise((resolve, reject) => {
    this.db.all<Server.PlayerMetadata>('SELECT * FROM players WHERE matchID = ?;', [matchID], (err, rows) => {
      if (err) {
        reject('Error in getPlayers: ' + err);
      } else {
        const playersObject: { [id: number]: Server.PlayerMetadata } = {};
        rows.forEach(row => {
          playersObject[row.id] = {
            id: row.id,
            name: row.name,
            credentials: row.credentials,
            data: row.data ? JSON.parse(row.data) : null,
            isConnected: row.isConnected
          };
        });
        resolve(playersObject);
      }
    });
  });
}

private setLog(matchID: string,logs: LogEntry[]):Promise<void>{
  return new Promise((resolve, reject) => {
    this.db.run(`
      DELETE FROM logs WHERE matchID = ?;
    `, [matchID]);
    
    const db = this.db.prepare(`
      INSERT INTO logs (matchID, action, _stateID, turn, phase, redact, automatic, metadata, patch)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    logs.forEach(log => {
      db.run([
        matchID,
        JSON.stringify(log.action),
        log._stateID,
        log.turn,
        log.phase,
        log.redact ?? null,
        log.automatic ?? null,
        JSON.stringify(log.metadata),
        JSON.stringify(log.patch)
      ]);
    });

    db.finalize(err => {
      if (err) {
        reject('Error in setLog: ' + err);
        return;
      }
      resolve();
    });
  });
  }
  private getState(matchID,isInitialState):Promise<string|undefined> {
    return new Promise((resolve, reject) => {
    this.db.get<MatchRow>(
      `SELECT matchID,initialState,currentState FROM matches WHERE matchID = ?;`,
      [matchID],
      (err,row) => {
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
          state = row ? row.currentState: undefined;
        }
        return resolve(state);
      }
    );
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
    let isInitialState: boolean = true;
 
    if (opts.state) {
      console.log('hola state uno');
      let state= await this.getState(matchID,!isInitialState);
      result.state = state ? JSON.parse(state) as State : undefined;
    }
    if (opts.metadata) {
      console.log('hola metadata');
      let metadata= await this.getMetadata(matchID);
      console.log(metadata);
      result.metadata = metadata as Server.MatchData;
    }
    if (opts.log) {
      console.log('hola logs');
      let logs= await this.getLog(matchID);
      result.log = logs as LogEntry[];
      console.log(result.log);
    }
    if (opts.initialState) {
      console.log('hola state dos');
      let state= await this.getState(matchID,isInitialState);
      result.state = state ? JSON.parse(state) as State : undefined ;
    }
    
    return result as StorageAPI.FetchResult<O>;
  }
  /**
   * Remove the match state from DB.
   */
  async wipe(matchID: string) {
    // this.state.delete(matchID);
    // this.metadata.delete(matchID);
  }
  /**
   * Return all keys.
   *
   * @override
   */
  async listMatches(opts?: StorageAPI.ListMatchesOpts): Promise<string[]> {
    // return [...this.metadata.entries()]
    //   .filter(([, metadata]) => {
    //     if (!opts) {
    //       return true;
    //     }
    //     if (
    //       opts.gameName !== undefined &&
    //       metadata.gameName !== opts.gameName
    //     ) {
    //       return false;
    //     }
    //     if (opts.where !== undefined) {
    //       if (opts.where.isGameover !== undefined) {
    //         const isGameover = metadata.gameover !== undefined;
    //         if (isGameover !== opts.where.isGameover) {
    //           return false;
    //         }
    //       }
    //       if (
    //         opts.where.updatedBefore !== undefined &&
    //         metadata.updatedAt >= opts.where.updatedBefore
    //       ) {
    //         return false;
    //       }
    //       if (
    //         opts.where.updatedAfter !== undefined &&
    //         metadata.updatedAt <= opts.where.updatedAfter
    //       ) {
    //         return false;
    //       }
    //     }
    //     return true;
    //   })
    //   .map(([key]) => key);
    return null;
  }
}
