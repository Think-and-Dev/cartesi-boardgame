// src/svelte.d.ts
declare module '*.svelte' {
  import type { SvelteComponentTyped } from 'svelte';
  const component: SvelteComponentTyped<
    Record<string, unknown>,
    Record<string, unknown>,
    Record<string, unknown>
  >;
  export default component;
}
