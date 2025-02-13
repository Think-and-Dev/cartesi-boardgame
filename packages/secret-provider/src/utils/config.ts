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
  CARTESI_DAPP_ADDRESS: string;
  CARTESI_NODE_URL: string;
}

export const config: Config = {
  // Conf salt for hashing
  SALT_BYTES: 16,

  // hashing
  HASH_ALGORITHM: "sha256",

  // DB path
  DB_PATH: process.env.SECRET_PROVIDER_DB_PATH || "secrets.db",

  CARTESI_DAPP_ADDRESS: process.env.CARTESI_DAPP_ADDRESS || "",
  CARTESI_NODE_URL: process.env.CARTESI_NODE_URL || "http://localhost:8080",
};
