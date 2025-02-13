/**
 * TypeScript Type Definitions
 * - StoredSecret: Structure for stored secrets
 * - Includes original value and salt used
 */
export interface StoredSecret {
  originalValue: unknown; // The value we want to hide
  saltUsed: string; // Random value we added for security
}

// Cartesi
export interface ShuffledHashesPayload {
  hashes: Array<{
    key: string;
    hash: string;
  }>;
}

export interface ShuffledDeck {
  hashes: Array<{
    key: string;
    hash: string;
  }>;
}
