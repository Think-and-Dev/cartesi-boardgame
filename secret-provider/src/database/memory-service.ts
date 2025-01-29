/**
 * In-Memory Database Service
 * - Stores secrets temporarily in memory
 * - Data is lost when server restarts (more secure)
 * - Fast access and no disk operations
 */

import type { StoredSecret } from '../types/types';

// Our in-memory storage
const secretsMap = new Map<string, StoredSecret>();

export const secretsDatabase = {
  set(hash: string, secret: StoredSecret): void {
    secretsMap.set(hash, secret);
  },

  get(hash: string): StoredSecret | undefined {
    return secretsMap.get(hash);
  },

  delete(hash: string): void {
    secretsMap.delete(hash);
  },

  // Useful for tests
  clear(): void {
    secretsMap.clear();
  },
};

// No need for closeDatabase anymore since we're not using SQLite
