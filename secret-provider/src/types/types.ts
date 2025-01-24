export type StoredSecret = {
  originalValue: unknown; // The value we want to hide
  saltUsed: string; // Random value we added for security
};
