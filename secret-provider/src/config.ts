/**
 * Central Configuration
 * - SALT_BYTES: Size of salt for hashing
 * - HASH_ALGORITHM: Hashing algorithm used
 * - DB_PATH: Database file location
 * Configurable through environment variables
 */

export interface Config {
  SALT_BYTES: number;
  HASH_ALGORITHM: string;
  DB_PATH: string;
}

export const config: Config = {
  // Conf salt for hashing
  SALT_BYTES: 16,

  // hashing
  HASH_ALGORITHM: 'sha256',

  // DB path
  DB_PATH: process.env.SECRET_PROVIDER_DB_PATH || 'secrets.db',
};
