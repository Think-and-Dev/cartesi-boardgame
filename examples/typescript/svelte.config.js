import sveltePreprocess from 'svelte-preprocess';

export default {
  preprocess: sveltePreprocess({
    typescript: true,
    sourceMap: true,
  }),
  compilerOptions: {
    dev: process.env.NODE_ENV !== 'production',
  },
};
