import Database from 'better-sqlite3';
import type { StoredSecret } from '../types/types';
import path from 'path';

const db = new Database(path.join(__dirname, '../../secrets.db'));

// Initialize database with required tables
db.exec(`
  CREATE TABLE IF NOT EXISTS secrets (
    hash TEXT PRIMARY KEY,
    original_value TEXT NOT NULL,
    salt TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

export function closeDatabase(): void {
  db.close();
}

export const secretsDatabase = {
  set(hash: string, secret: StoredSecret): void {
    const stmt = db.prepare(
      'INSERT OR REPLACE INTO secrets (hash, original_value, salt) VALUES (?, ?, ?)'
    );
    stmt.run(hash, JSON.stringify(secret.originalValue), secret.saltUsed);
  },

  get(hash: string): StoredSecret | undefined {
    const stmt = db.prepare(
      'SELECT original_value, salt FROM secrets WHERE hash = ?'
    );
    const result = stmt.get(hash) as
      | { original_value: string; salt: string }
      | undefined;

    if (!result) return undefined;

    return {
      originalValue: JSON.parse(result.original_value),
      saltUsed: result.salt,
    };
  },

  delete(hash: string): void {
    const stmt = db.prepare('DELETE FROM secrets WHERE hash = ?');
    stmt.run(hash);
  },

  // Método para limpiar la base de datos (útil para tests)
  clear(): void {
    db.prepare('DELETE FROM secrets').run();
  },
};
