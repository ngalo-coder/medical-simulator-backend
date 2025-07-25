#!/usr/bin/env node

/**
 * Database Migration Script
 * Handles database schema updates and data migrations
 */

const mongoose = require('mongoose');
const { connectDB } = require('../config/database');
const logger = require('../utils/logger');
require('dotenv').config();

class MigrationRunner {
  constructor() {
    this.migrations = [];
    this.migrationCollection = 'migrations';
  }

  // Add a migration
  addMigration(version, description, up, down) {
    this.migrations.push({
      version,
      description,
      up,
      down,
      timestamp: new Date()
    });
  }

  // Get applied migrations
  async getAppliedMigrations() {
    try {
      const db = mongoose.connection.db;
      const collection = db.collection(this.migrationCollection);
      const applied = await collection.find({}).sort({ version: 1 }).toArray();
      return applied.map(m => m.version);
    } catch (error) {
      logger.warn('No migration collection found, assuming fresh database');
      return [];
    }
  }

  // Record migration as applied
  async recordMigration(migration) {
    const db = mongoose.connection.db;
    const collection = db.collection(this.migrationCollection);
    
    await collection.insertOne({
      version: migration.version,
      description: migration.description,
      appliedAt: new Date(),
      checksum: this.calculateChecksum(migration)
    });
  }

  // Remove migration record
  async removeMigrationRecord(version) {
    const db = mongoose.connection.db;
    const collection = db.collection(this.migrationCollection);
    await collection.deleteOne({ version });
  }

  // Calculate migration checksum
  calculateChecksum(migration) {
    const crypto = require('crypto');
    const content = migration.up.toString() + migration.down.toString();
    return crypto.createHash('md5').update(content).digest('hex');
  }

  // Run pending migrations
  async migrate() {
    console.log('🔄 Starting database migration...\n');
    
    const appliedMigrations = await this.getAppliedMigrations();
    const pendingMigrations = this.migrations.filter(
      m => !appliedMigrations.includes(m.version)
    );

    if (pendingMigrations.length === 0) {
      console.log('✅ No pending migrations found');
      return;
    }

    console.log(`📋 Found ${pendingMigrations.length} pending migrations:`);
    pendingMigrations.forEach(m => {
      console.log(`  - ${m.version}: ${m.description}`);
    });
    console.log();

    for (const migration of pendingMigrations) {
      try {
        console.log(`⏳ Applying migration ${migration.version}: ${migration.description}`);
        
        await migration.up();
        await this.recordMigration(migration);
        
        console.log(`✅ Migration ${migration.version} applied successfully`);
      } catch (error) {
        console.error(`❌ Migration ${migration.version} failed:`, error.message);
        throw error;
      }
    }

    console.log('\n🎉 All migrations completed successfully!');
  }

  // Rollback last migration
  async rollback(targetVersion = null) {
    console.log('🔄 Starting migration rollback...\n');
    
    const appliedMigrations = await this.getAppliedMigrations();
    
    if (appliedMigrations.length === 0) {
      console.log('✅ No migrations to rollback');
      return;
    }

    let migrationsToRollback;
    
    if (targetVersion) {
      const targetIndex = appliedMigrations.indexOf(targetVersion);
      if (targetIndex === -1) {
        throw new Error(`Migration ${targetVersion} not found in applied migrations`);
      }
      migrationsToRollback = appliedMigrations.slice(targetIndex + 1).reverse();
    } else {
      // Rollback only the last migration
      migrationsToRollback = [appliedMigrations[appliedMigrations.length - 1]];
    }

    console.log(`📋 Rolling back ${migrationsToRollback.length} migrations:`);
    migrationsToRollback.forEach(version => {
      const migration = this.migrations.find(m => m.version === version);
      console.log(`  - ${version}: ${migration?.description || 'Unknown'}`);
    });
    console.log();

    for (const version of migrationsToRollback) {
      const migration = this.migrations.find(m => m.version === version);
      
      if (!migration) {
        console.warn(`⚠️  Migration ${version} not found in code, skipping rollback`);
        continue;
      }

      try {
        console.log(`⏳ Rolling back migration ${version}: ${migration.description}`);
        
        await migration.down();
        await this.removeMigrationRecord(version);
        
        console.log(`✅ Migration ${version} rolled back successfully`);
      } catch (error) {
        console.error(`❌ Rollback of migration ${version} failed:`, error.message);
        throw error;
      }
    }

    console.log('\n🎉 Rollback completed successfully!');
  }

  // List migration status
  async status() {
    console.log('📊 Migration Status:\n');
    
    const appliedMigrations = await this.getAppliedMigrations();
    
    this.migrations.forEach(migration => {
      const isApplied = appliedMigrations.includes(migration.version);
      const status = isApplied ? '✅ Applied' : '⏳ Pending';
      console.log(`${status} - ${migration.version}: ${migration.description}`);
    });
    
    console.log(`\nTotal: ${this.migrations.length} migrations, ${appliedMigrations.length} applied`);
  }
}

// Define migrations
const setupMigrations = (runner) => {
  // Migration 001: Add indexes for better performance
  runner.addMigration(
    '001',
    'Add database indexes for performance optimization',
    async () => {
      const db = mongoose.connection.db;
      
      // User indexes
      await db.collection('users').createIndex({ email: 1 }, { unique: true });
      await db.collection('users').createIndex({ 'profile.firstName': 'text', 'profile.lastName': 'text' });
      await db.collection('users').createIndex({ 'profile.institution': 1 });
      await db.collection('users').createIndex({ role: 1 });
      await db.collection('users').createIndex({ 'statistics.lastActiveDate': -1 });

      // Case indexes
      await db.collection('cases').createIndex({ specialty: 1 });
      await db.collection('cases').createIndex({ difficulty: 1 });
      await db.collection('cases').createIndex({ bodySystem: 1 });
      await db.collection('cases').createIndex({ tags: 1 });
      await db.collection('cases').createIndex({ 'metadata.status': 1 });
      await db.collection('cases').createIndex({ 'metadata.author': 1 });
      await db.collection('cases').createIndex({ createdAt: -1 });
      await db.collection('cases').createIndex({
        title: 'text',
        description: 'text',
        'presentation.chiefComplaint': 'text'
      });

      // Progress indexes
      await db.collection('progresses').createIndex({ userId: 1, caseId: 1 });
      await db.collection('progresses').createIndex({ sessionId: 1 }, { unique: true });
      await db.collection('progresses').createIndex({ status: 1 });
      await db.collection('progresses').createIndex({ createdAt: -1 });

      // Review indexes
      await db.collection('reviews').createIndex({ caseId: 1 });
      await db.collection('reviews').createIndex({ userId: 1 });
      await db.collection('reviews').createIndex({ createdAt: -1 });

      // Discussion indexes
      await db.collection('discussions').createIndex({ caseId: 1 });
      await db.collection('discussions').createIndex({ parentId: 1 });
      await db.collection('discussions').createIndex({ author: 1 });
      await db.collection('discussions').createIndex({ createdAt: -1 });
      await db.collection('discussions').createIndex({ tags: 1 });
      await db.collection('discussions').createIndex({ isPinned: -1, createdAt: -1 });
      await db.collection('discussions').createIndex({ content: 'text', title: 'text' });

      // Analytics indexes
      await db.collection('analytics').createIndex({ userId: 1 });
      await db.collection('analytics').createIndex({ caseId: 1 });
      await db.collection('analytics').createIndex({ date: 1 });
      await db.collection('analytics').createIndex({ eventType: 1 });

      console.log('  ✅ Database indexes created successfully');
    },
    async () => {
      const db = mongoose.connection.db;
      
      // Drop indexes (be careful with this in production)
      const collections = ['users', 'cases', 'progresses', 'reviews', 'discussions', 'analytics'];
      
      for (const collectionName of collections) {
        try {
          const collection = db.collection(collectionName);
          const indexes = await collection.indexes();
          
          // Drop all indexes except _id
          for (const index of indexes) {
            if (index.name !== '_id_') {
              await collection.dropIndex(index.name);
            }
          }
        } catch (error) {
          console.warn(`  ⚠️  Could not drop indexes for ${collectionName}:`, error.message);
        }
      }
      
      console.log('  ✅ Database indexes dropped successfully');
    }
  );

  // Migration 002: Add user statistics fields
  runner.addMigration(
    '002',
    'Add missing user statistics fields',
    async () => {
      const db = mongoose.connection.db;
      
      await db.collection('users').updateMany(
        { 'statistics.streakDays': { $exists: false } },
        {
          $set: {
            'statistics.streakDays': 0,
            'statistics.lastActiveDate': new Date(),
            'statistics.loginCount': 0
          }
        }
      );
      
      console.log('  ✅ User statistics fields added');
    },
    async () => {
      const db = mongoose.connection.db;
      
      await db.collection('users').updateMany(
        {},
        {
          $unset: {
            'statistics.streakDays': '',
            'statistics.loginCount': ''
          }
        }
      );
      
      console.log('  ✅ User statistics fields removed');
    }
  );

  // Migration 003: Update case metadata structure
  runner.addMigration(
    '003',
    'Update case metadata structure with new fields',
    async () => {
      const db = mongoose.connection.db;
      
      await db.collection('cases').updateMany(
        { 'metadata.viewCount': { $exists: false } },
        {
          $set: {
            'metadata.viewCount': 0,
            'metadata.completionCount': 0,
            'metadata.averageScore': 0,
            'metadata.averageTime': 0
          }
        }
      );
      
      console.log('  ✅ Case metadata structure updated');
    },
    async () => {
      const db = mongoose.connection.db;
      
      await db.collection('cases').updateMany(
        {},
        {
          $unset: {
            'metadata.viewCount': '',
            'metadata.completionCount': '',
            'metadata.averageScore': '',
            'metadata.averageTime': ''
          }
        }
      );
      
      console.log('  ✅ Case metadata fields removed');
    }
  );

  // Migration 004: Add progress tracking enhancements
  runner.addMigration(
    '004',
    'Enhance progress tracking with detailed metrics',
    async () => {
      const db = mongoose.connection.db;
      
      await db.collection('progresses').updateMany(
        { percentageScore: { $exists: false } },
        [
          {
            $set: {
              percentageScore: {
                $cond: {
                  if: { $gt: ['$maxPossibleScore', 0] },
                  then: { $multiply: [{ $divide: ['$score', '$maxPossibleScore'] }, 100] },
                  else: 0
                }
              }
            }
          }
        ]
      );
      
      console.log('  ✅ Progress tracking enhanced');
    },
    async () => {
      const db = mongoose.connection.db;
      
      await db.collection('progresses').updateMany(
        {},
        {
          $unset: {
            percentageScore: ''
          }
        }
      );
      
      console.log('  ✅ Progress enhancements removed');
    }
  );
};

// Main execution
const runMigrations = async () => {
  try {
    await connectDB();
    console.log('📡 Connected to database\n');
    
    const runner = new MigrationRunner();
    setupMigrations(runner);
    
    const command = process.argv[2] || 'migrate';
    
    switch (command) {
      case 'migrate':
        await runner.migrate();
        break;
      case 'rollback':
        const targetVersion = process.argv[3];
        await runner.rollback(targetVersion);
        break;
      case 'status':
        await runner.status();
        break;
      default:
        console.log('Usage: node migrate.js [migrate|rollback|status] [target_version]');
        console.log('  migrate - Apply pending migrations');
        console.log('  rollback [version] - Rollback to specific version (or last migration)');
        console.log('  status - Show migration status');
    }
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n📡 Database connection closed');
  }
};

// Export for testing
module.exports = {
  MigrationRunner,
  setupMigrations,
  runMigrations
};

// Run if called directly
if (require.main === module) {
  runMigrations();
}