'use strict';

/**
 * Standalone Manual Migration Script: Recreate idx_sku_ean_code with partialFilterExpression.
 *
 * Usage:
 *   node scripts/fixSkuEanIndex.js
 *
 * Note: This script is intended to be executed manually ONCE by an administrator.
 * It is NOT executed automatically by the backend application at runtime.
 */

const mongoose = require('mongoose');
const env = require('../src/config/env');
const SKUModel = require('../src/models/SKUModel');

async function migrateIndex() {
  console.log('=== One-Time Manual Index Migration Script ===\n');
  const mongoUri = env.MONGODB_URI || 'mongodb://localhost:27017/three-way-match-engine';

  console.log(`Connecting to MongoDB at: ${mongoUri}`);
  await mongoose.connect(mongoUri);

  try {
    console.log('1. Checking existing indexes on "skus" collection...');
    const indexes = await SKUModel.collection.indexes();
    console.log('Current indexes:', indexes.map((i) => i.name));

    const eanIndexExists = indexes.some((i) => i.name === 'idx_sku_ean_code');
    if (eanIndexExists) {
      console.log('2. Dropping legacy index "idx_sku_ean_code"...');
      await SKUModel.collection.dropIndex('idx_sku_ean_code');
      console.log('   Legacy index dropped successfully.');
    } else {
      console.log('2. Index "idx_sku_ean_code" does not exist yet. Proceeding to create...');
    }

    console.log('3. Syncing new partialFilterExpression index "idx_sku_ean_code"...');
    await SKUModel.syncIndexes();
    console.log('   Index synced successfully.');

    const updatedIndexes = await SKUModel.collection.indexes();
    console.log('\nUpdated indexes:', JSON.stringify(updatedIndexes, null, 2));
    console.log('\nMigration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err.message);
  } finally {
    await mongoose.disconnect();
  }
}

migrateIndex();
