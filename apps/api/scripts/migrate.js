'use strict';

const fs = require('fs');
const path = require('path');

async function loadDataSource() {
  const distPath = path.join(__dirname, '../dist/database/data-source.js');

  if (fs.existsSync(distPath)) {
    return require(distPath).default;
  }

  require('ts-node/register/transpile-only');
  return require('../src/database/data-source.ts').default;
}

async function main() {
  const dataSource = await loadDataSource();
  try {
    await dataSource.initialize();

    const executed = await dataSource.runMigrations();
    if (executed.length === 0) {
      console.log('[migrate] No pending migrations.');
    } else {
      console.log(`[migrate] Applied ${executed.length} migration(s).`);
      for (const migration of executed) {
        console.log(`  - ${migration.name}`);
      }
    }
  } finally {
    if (dataSource.isInitialized) {
      await dataSource.destroy();
    }
  }
}

main().catch((error) => {
  console.error('[migrate] migration:run failed:', error.message);
  process.exit(1);
});
