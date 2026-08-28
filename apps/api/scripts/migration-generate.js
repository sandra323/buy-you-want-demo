'use strict';

const { spawnSync } = require('child_process');
const path = require('path');

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error(
    '[migrate:generate] Usage: pnpm --filter api migration:generate -- src/migrations/<Name>',
  );
  process.exit(1);
}

const dataSourcePath = path.join(__dirname, '../src/database/data-source.ts');

const result = spawnSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  [
    'typeorm-ts-node-commonjs',
    'migration:generate',
    ...args,
    '-d',
    dataSourcePath,
  ],
  { stdio: 'inherit', cwd: path.join(__dirname, '..') },
);

process.exit(result.status ?? 1);
