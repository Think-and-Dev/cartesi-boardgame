# Chinchón in Cartesi

This example implements a simplified version of the traditional Spanish card game Chinchón using Cartesi Machine. Chinchón is a card game where players try to form card combinations (sequences or groups of the same value) to get rid of their cards.

## About the Game

In this implementation:
- The game is played with a Spanish deck of 40 cards
- Players try to form sequences (3 or more consecutive cards of the same suit) or groups (3 or more cards of the same value)
- The objective is to be the first player to get rid of all their cards

## Running the Example

### Inside Cartesi Machine (Locally)

In order to run the game in the cartesi machine locally, we need to follow the next steps: 

1. Ensure pnpm and the cartesi cli are installed

2. Go to the chinchon folder (`./examples/chinchon`) and run 

```bash
pnpm install
```

> **_NOTE:_**  The default version of pnpm install will try to install the main package from the workspace, for that to work correctly, before the `pnpm install` on the chinchon folder, you will need to run `pnpm proxydirs & pnpm build` on the `./packages/main` folder

3. In the same folder, build the cartesi image for the chinchon game, by running 

```bash
    pnpm build-cartesi-image
```

> **_NOTE:_**  You might need to add execution permissions to the script on `./examples/chinchon/scripts/build-cartesi-image.sh`

> **_NOTE:_** The `--use-local-library-version` parameter can be added to force usage of the local package instead of the npm one when building the cartesi image.

4. Start the CVM with the image, by running the following command on the chinchon folder: 

```bash
    cartesi run
```

5. For the game to run correctly, we need to also run the drand provider, which runs outside of the cartesi machine. Go to the `./packages/drand-provider` folder, and execute:

```bash
    pnpm run dev
```

6. Once the cartesi machine is up and running, with the game inside, and the drand provider is also working, we can start the chinchon frontend, by going to the chinchon example folder (`./examples/chinchon`), and running:

```bash
    pnpm run dev
```

### Outside Cartesi Machine (With nonodo)

1. Ensure pnpm, nonodo and the cartesi cli are installed

2. Go to the chinchon folder (`./examples/chinchon`) and run 

```bash
    pnpm install
```

3. Start nonodo by running

```bash
    nonodo
```

4. On another terminal, we need to run the drand middleware, to do so, go to `./packages/drand-middleware` and execute:

```bash
    cargo run
```

5. For the game to run correctly, we also need to run the drand provider. Get a new terminal, go to the `./packages/drand-provider` folder, and execute:

```bash
    pnpm run dev
```

6. Start the chinchon backend. We will also need a new terminal, move to the chinchon example folder (`./examples/chinchon`), and run: 

```bash
    pnpm start-server-drand
```

6. Once all the components are up and running, we can start the chinchon frontend, by going to the chinchon example folder(`./examples/chinchon`), and running:

```bash
    pnpm run dev
```
