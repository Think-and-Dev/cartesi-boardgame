import Koa from 'koa';
import Router from '@koa/router';
import bodyParser from 'koa-bodyparser';
import crypto from 'crypto';
import { config } from './config';

const app = new Koa();
const router = new Router();

type StoredSecret = {
  originalValue: unknown; // The value we want to hide
  saltUsed: string; // Random value we added for security
};

// Store secrets in memory (like a simple database)
const secretsDatabase = new Map<string, StoredSecret>();

// Check if a string looks like an Ethereum address
function isValidEthereumAddress(address: string): boolean {
  return /^0x[\dA-Fa-f]{40}$/.test(address);
}

// Create a hash from a value
function createHash(value: string): {
  hashedValue: string;
  randomSalt: string;
} {
  // Create a random value to make our hash more secure
  const randomSalt = crypto.randomBytes(config.SALT_BYTES).toString('hex');

  // Combine our value with the random salt
  const hashMaker = crypto.createHash(config.HASH_ALGORITHM);
  hashMaker.update(value + randomSalt);

  return {
    hashedValue: hashMaker.digest('hex'),
    randomSalt: randomSalt,
  };
}

// Make sure we got a valid object in the request
async function checkRequestBody(ctx: Koa.Context, next: Koa.Next) {
  if (!ctx.request.body || typeof ctx.request.body !== 'object') {
    ctx.status = 400;
    ctx.body = { error: 'Please send a valid JSON object' };
    return;
  }
  await next();
}

// Make sure we got a valid Ethereum address
async function checkEthereumAddress(ctx: Koa.Context, next: Koa.Next) {
  const { address } = ctx.params;
  if (!isValidEthereumAddress(address)) {
    ctx.status = 400;
    ctx.body = { error: 'Please provide a valid Ethereum address' };
    return;
  }
  await next();
}

// Route to create hashes from values
router.post('/hash', checkRequestBody, async (ctx) => {
  const inputData = ctx.request.body as Record<string, unknown>;
  const hashedSecrets = [];

  // Create a hash for each value in the input
  for (const [key, value] of Object.entries(inputData)) {
    // Convert the value to a string so we can hash it
    const valueAsString = JSON.stringify(value);

    // Create a hash with a random salt
    const { hashedValue, randomSalt } = createHash(valueAsString);

    // Save the original value and salt
    secretsDatabase.set(hashedValue, {
      originalValue: value,
      saltUsed: randomSalt,
    });

    // Add the result to our list
    hashedSecrets.push({
      key: key,
      hash: hashedValue,
    });
  }

  // Send back all the hashes we created
  ctx.body = { hashes: hashedSecrets };
});

// Route to reveal a secret value
router.get('/reveal/:hash/:address', checkEthereumAddress, async (ctx) => {
  const { hash } = ctx.params;

  // Try to find the secret
  const secret = secretsDatabase.get(hash);

  // If we can't find it, tell the user
  if (!secret) {
    ctx.status = 404;
    ctx.body = { error: 'Could not find this secret' };
    return;
  }

  // Return the secret and its salt
  ctx.body = {
    value: secret.originalValue,
    salt: secret.saltUsed,
  };
});

// Set up our server
app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());

// Start listening for requests
const PORT = process.env.SECRET_PROVIDER_PORT || 3001;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
