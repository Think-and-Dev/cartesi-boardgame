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
        players TEXT,
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
      CREATE TABLE IF NOT EXISTS logs (
        matchID TEXT PRIMARY KEY,
        logs TEXT,
        deltaLogs TEXT,
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
        (err, row) => {
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
        (err, row) => {
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
      players: JSON.stringify(opts.players),
      setupData: JSON.stringify(opts.setupData),
      gameover: JSON.stringify(opts.gameover)
    };
    this.db.run(
      `INSERT OR REPLACE INTO metadata (matchID, gameName, players, setupData, gameover, nextMatchID, unlisted, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        matchID,
        jsonMetadata.gameName,
        jsonMetadata.players,
        jsonMetadata.setupData,
        jsonMetadata.gameover,
        jsonMetadata.nextMatchID,
        jsonMetadata.unlisted,
        jsonMetadata.createdAt,
        jsonMetadata.updatedAt
      ], (err, row) => {
        if (err) {
          reject('Error in setMetadata: ' + err);
          return;
        } else {
          return resolve();
        }
    });
    });
  }
  /**
   * Write the match state in DB.
   */
  async setState(matchID: string, state: State, deltalog?: LogEntry[]) {
    try {
      if (deltalog && deltalog.length > 0) {
        const logString = await this.getLog(matchID);
        const log = logString ? JSON.parse(logString) : [];
        await this.setLog(
          matchID,
          JSON.stringify(log),
          JSON.stringify(deltalog)
        );
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
private getLog(matchID : string):Promise<any>{
  return new Promise((resolve, reject) => {
    this.db.get('SELECT logs FROM logs WHERE matchID = ?;', [matchID], (err, row) => {
      if (err) {
        reject('Error in getLog: ' + err);
        return;
      } else {
        return resolve(row ? row : undefined);
      }
    });
  });
}
private getMetada(matchID : string):Promise<any>{
  return new Promise((resolve, reject) => {
    this.db.get('SELECT * FROM metadata WHERE matchID = ?;', [matchID], (err, row) => {
      if (err) {
        reject('Error in getMetada: ' + err);
        return;
      } else {
        return resolve(row ? row : undefined);
      }
    });
  });
}
private setLog(matchID: string,logs: string ,deltaLogs: string):Promise<void>{
  return new Promise((resolve, reject) => {
    this.db.run(
      `INSERT OR REPLACE INTO logs (matchID,logs,deltaLogs) VALUES (?, ?, ?);`,
      [matchID, logs, deltaLogs],(err)=> {
        if (err) {
          reject('Error in setLog: ' + err);
          return;
        } else {
          return resolve();
        }
      });
  });
  }
  private getState(matchID,isInitialState):Promise<MatchRow|undefined> {
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
          state = row ? row : undefined;
        } else {
          state = row ? row : undefined;
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
      console.log(state.currentState);
      result.state = state ? JSON.parse(state.currentState) as State : undefined;// ???????
    }
    if (opts.metadata) {
      console.log('hola metadata');
      let metadata= await this.getMetada(matchID);
      console.log(metadata);
      result.metadata = metadata as Server.MatchData;// ???????
    }
    if (opts.log) {
      console.log('hola logs');
      let logs= await this.getLog(matchID);
      result.log = logs ? JSON.parse(logs) as LogEntry[] : undefined;// ????????
    }
    if (opts.initialState) {
      console.log('hola state dos');
      let state= await this.getState(matchID,isInitialState);
      console.log(state.initialState);
      result.state = state ? JSON.parse(state.initialState) as State : undefined ;// ???????
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
