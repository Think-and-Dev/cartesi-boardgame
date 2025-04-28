import { InMemory } from './inmemory';
import { FlatFile } from './flatfile';
import { Sqlite } from './sqlite3';

const DBFromEnv = () => {
  return process.env.FLATFILE_DIR
    ? new FlatFile({
        dir: process.env.FLATFILE_DIR,
      })
    : new InMemory();
};

export { InMemory, FlatFile, DBFromEnv, Sqlite };
