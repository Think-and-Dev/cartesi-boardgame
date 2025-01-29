/**
 * TypeScript Type Definitions
 * - StoredSecret: Structure for stored secrets
 * - Includes original value and salt used
 */
export type StoredSecret = {
  originalValue: unknown; // The value we want to hide
  saltUsed: string; // Random value we added for security
};
