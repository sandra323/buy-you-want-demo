'use strict';

/**
 * Demo seed runner (`pnpm --filter api seed`, also docker-entrypoint when SEED_ON_BOOT=1).
 *
 * Idempotent: fixture users are upserted by stable id; products by stable UUID.
 * Re-running does not wipe orders/cart and does not fail unique constraints.
 * Does not insert orders or cart rows.
 */

const fs = require('fs');
const path = require('path');

async function loadDataSourceAndSeed() {
  const distDataSource = path.join(
    __dirname,
    '../dist/database/data-source.js',
  );
  const distSeed = path.join(__dirname, '../dist/database/seed.js');

  if (fs.existsSync(distDataSource) && fs.existsSync(distSeed)) {
    return {
      dataSource: require(distDataSource).default,
      runSeed: require(distSeed).runSeed,
    };
  }

  require('ts-node/register/transpile-only');
  require('reflect-metadata');
  return {
    dataSource: require('../src/database/data-source.ts').default,
    runSeed: require('../src/database/seed.ts').runSeed,
  };
}

async function main() {
  const { dataSource, runSeed } = await loadDataSourceAndSeed();
  try {
    await dataSource.initialize();
    await runSeed(dataSource);
    console.log(
      '[seed] Upserted demo user 13800000000, banned fixture 13800000001, and on-sale products.',
    );
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

main().catch((error) => {
  console.error('[seed] seed failed:', error.message);
  process.exit(1);
});
