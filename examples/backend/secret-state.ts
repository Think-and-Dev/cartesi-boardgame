/**
 * !warning This implementation only secures secret states in the frontend. Backend security is not yet supported
 * and may leak information to other users/players.
 *
 * !note Secret states management module with hash verification for game implementation.
 */
import { ethers } from 'ethers';

/**
 * !note Interface that defines the structure for secret states with hash verification.
 * Each player has their values and a corresponding hash for verification.
 * @interface SecretStateWithHash
 */
export interface SecretStateWithHash {
  [key: string]: {
    values: (number | null)[];
    hash: string;
  };
}

/**
 * !note Generates a cryptographic hash for an array of values.
 * @param values - Array of numbers to hash
 * @returns Keccak256 hash of the values
 */
export const generateHash = (values: (number | null)[]): string => {
  // Se convierte el array de números a string y lo hasheamos
  const stringValues = values.map((v) => v?.toString() || 'null').join(',');
  return ethers.keccak256(ethers.toUtf8Bytes(stringValues));
};

/**
 * !note Initializes secret states with hash verification for both players.
 * @returns SecretStateWithHash object containing random numbers and their hashes
 *
 * !warning While the hash provides verification, the backend storage still needs
 * proper security implementation to prevent unauthorized access.
 */
export const setupSecretWithHash = (): SecretStateWithHash => {
  const secret = {
    '0': {
      values: Array(3)
        .fill(0)
        .map(() => Math.floor(Math.random() * 100)),
      hash: '',
    },
    '1': {
      values: Array(3)
        .fill(0)
        .map(() => Math.floor(Math.random() * 100)),
      hash: '',
    },
  };

  // Se Generan los hashes para cada jugador
  secret['0'].hash = generateHash(secret['0'].values);
  secret['1'].hash = generateHash(secret['1'].values);

  return secret;
};

/**
 * !note Higher-order component that adds secret state functionality with hash verification.
 * @param game - The base game to be enhanced with secret states
 *
 * !warning Current implementation provides hash verification but backend security
 * needs additional implementation for complete security.
 */
export const withSecretStateHash = (game: any) => {
  return {
    ...game,
    setup: (ctx: any, setupData?: any) => {
      const baseG = game.setup(ctx, setupData);
      return {
        ...baseG,
        secret: setupSecretWithHash(),
      };
    },
    // Solo se envian los hashes al servidor
    filterSecretState: (G: any, playerID: string) => {
      const filteredG = { ...G };
      if (filteredG.secret) {
        Object.keys(filteredG.secret).forEach((pid) => {
          if (pid !== playerID) {
            // Solo se envia el hash para otros jugadores
            filteredG.secret[pid] = {
              values: Array(3).fill(null),
              hash: filteredG.secret[pid].hash,
            };
          }
        });
      }
      return filteredG;
    },
  };
};

/**
 * !note Verifies if provided values match their original hash.
 * @param values - Array of numbers to verify
 * @param hash - Original hash to compare against
 * @returns boolean indicating if the values match the hash
 */
export const verifySecretState = (
  values: (number | null)[],
  hash: string
): boolean => {
  return generateHash(values) === hash;
};
