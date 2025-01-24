export interface Config {
  SALT_BYTES: number;
  HASH_ALGORITHM: string;
}

export const config: Config = {
  // Configuración del salt para el hashing
  SALT_BYTES: 16,

  // Algoritmo de hashing
  HASH_ALGORITHM: 'sha256',
};
