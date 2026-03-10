#!/usr/bin/env node
require('dotenv').config();
const sequelize = require('../config/database');
const MigrationRunner = require('../config/migrationRunner');

async function main() {
  const command = process.argv[2] || 'up';
  const runner = new MigrationRunner(sequelize);

  try {
    await sequelize.authenticate();
    console.log('Database connected.');  // Keep console for CLI scripts

    if (command === 'rollback') {
      const steps = parseInt(process.argv[3]) || 1;
      await runner.rollback(steps);
    } else {
      await runner.runPending();
    }
  } catch (error) {
    console.error('Migration failed:', error);  // Keep console for CLI scripts
    process.exit(1);
  } finally {
    await sequelize.close();
  }
}

main();
