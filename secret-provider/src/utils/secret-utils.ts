import crypto from 'crypto';
import { config } from '../config';

export function isValidEthereumAddress(address: string): boolean {
  return /^0x[\dA-Fa-f]{40}$/.test(address);
}

export function createHash(value: string): {
  hashedValue: string;
  randomSalt: string;
} {
  const randomSalt = crypto.randomBytes(config.SALT_BYTES).toString('hex');
  const hashMaker = crypto.createHash(config.HASH_ALGORITHM);
  hashMaker.update(value + randomSalt);

  return {
    hashedValue: hashMaker.digest('hex'),
    randomSalt: randomSalt,
  };
}

// Simple array shuffling function
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

// Shuffle array of secret hashes for added randomness
export function shuffleSecretArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}
