import { Ctx } from '@think-and-dev/cartesi-boardgame/client';

export interface SecretState {
  [key: string]: (number | null)[];
}

export const setupSecret = (): SecretState => {
  const secret = {
    '0': Array(3)
      .fill(0)
      .map(() => Math.floor(Math.random() * 100)),
    '1': Array(3)
      .fill(0)
      .map(() => Math.floor(Math.random() * 100)),
  };
  return secret;
};

export const withSecretState = (game: any) => {
  return {
    ...game,
    setup: (ctx: Ctx, setupData?: any) => {
      const baseG = game.setup(ctx, setupData);
      const result = {
        ...baseG,
        secret: setupSecret(),
      };
      return result;
    },
  };
};
