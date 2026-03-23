const path = require('path');
const { Sequelize } = require('sequelize');
const fs = require('fs');
const logger = require('../services/logger');

/**
 * Simple migration runner using Sequelize QueryInterface.
 * Tracks applied migrations in a `SequelizeMeta` table.
 * Migration files are in backend/src/migrations/ and must export { up(queryInterface, Sequelize), down(queryInterface, Sequelize) }
 */

class MigrationRunner {
  constructor(sequelize) {
    this.sequelize = sequelize;
    this.queryInterface = sequelize.getQueryInterface();
    this.migrationsPath = path.join(__dirname, '..', 'migrations');
  }

  async ensureMetaTable() {
    // Use IF NOT EXISTS to avoid errors that can poison the connection pool
    await this.sequelize.query(`
      CREATE TABLE IF NOT EXISTS "SequelizeMeta" (
        name VARCHAR(255) NOT NULL PRIMARY KEY,
        "executedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }

  async getAppliedMigrations() {
    const [results] = await this.sequelize.query('SELECT name FROM "SequelizeMeta" ORDER BY name ASC');
    return results.map(r => r.name);
  }

  async getPendingMigrations() {
    const applied = await this.getAppliedMigrations();
    
    if (!fs.existsSync(this.migrationsPath)) {
      return [];
    }

    const files = fs.readdirSync(this.migrationsPath)
      .filter(f => f.endsWith('.js'))
      .sort();

    return files.filter(f => !applied.includes(f));
  }

  async runPending() {
    await this.ensureMetaTable();
    const pending = await this.getPendingMigrations();

    if (pending.length === 0) {
      logger.info('No pending migrations.');
      return;
    }

    logger.info(`Running ${pending.length} pending migration(s)...`);

    for (const file of pending) {
      const migration = require(path.join(this.migrationsPath, file));
      const t = await this.sequelize.transaction();
      
      try {
        logger.info(`  Running: ${file}`);
        await migration.up(this.queryInterface, Sequelize, t);
        await this.sequelize.query(
          'INSERT INTO "SequelizeMeta" (name) VALUES (:name)',
          { replacements: { name: file }, transaction: t }
        );
        await t.commit();
        logger.info(`  Completed: ${file}`);
      } catch (error) {
        await t.rollback();
        logger.error(`  Failed: ${file}`, { error: error.message });
        throw error;
      }
    }

    logger.info('All migrations completed successfully.');
  }

  async rollback(steps = 1) {
    await this.ensureMetaTable();
    const applied = await this.getAppliedMigrations();
    const toRollback = applied.slice(-steps);

    for (const file of toRollback.reverse()) {
      const migration = require(path.join(this.migrationsPath, file));
      const t = await this.sequelize.transaction();
      
      try {
        logger.info(`  Rolling back: ${file}`);
        await migration.down(this.queryInterface, Sequelize, t);
        await this.sequelize.query(
          'DELETE FROM "SequelizeMeta" WHERE name = :name',
          { replacements: { name: file }, transaction: t }
        );
        await t.commit();
        logger.info(`  Rolled back: ${file}`);
      } catch (error) {
        await t.rollback();
        logger.error(`  Rollback failed: ${file}`, { error: error.message });
        throw error;
      }
    }
  }
}

module.exports = MigrationRunner;
