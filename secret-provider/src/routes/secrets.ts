import type Koa from 'koa';
import Router from '@koa/router';
import {
  createHash,
  isValidEthereumAddress,
  shuffledSecret,
} from '../utils/secret-utils';
import { secretsDatabase } from '../database/memory-service';

const router = new Router();

/**
 * API Routes for Secret Management
 * Endpoints:
 * - POST /hash: Generates hashes for secret values
 * - GET /reveal/:hash/:address: Reveals original value for a hash
 * Includes request validation and error handling
 */

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

  // Generate hashes
  for (const [key, value] of Object.entries(inputData)) {
    const valueAsString = JSON.stringify(value);
    const { hashedValue, randomSalt } = createHash(valueAsString);

    secretsDatabase.set(hashedValue, {
      originalValue: value,
      saltUsed: randomSalt,
    });

    hashedSecrets.push({
      key: key,
      hash: hashedValue,
    });
  }

  // Return shuffled hashes
  ctx.body = { hashes: shuffledSecret(hashedSecrets) };
});

// Route to reveal a secret value
router.get('/reveal/:hash/:address', checkEthereumAddress, async (ctx) => {
  const { hash } = ctx.params;
  const secret = secretsDatabase.get(hash);

  if (!secret) {
    ctx.status = 404;
    ctx.body = { error: 'Could not find this secret' };
    return;
  }

  ctx.body = {
    value: secret.originalValue,
    salt: secret.saltUsed,
  };
});

export default router;
