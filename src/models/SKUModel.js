'use strict';

const mongoose = require('mongoose');

// ── Root schema ───────────────────────────────────────────────────────────────

const skuSchema = new mongoose.Schema(
  {
    skuCode:             { type: String, required: true, trim: true, uppercase: true },
    eanCode:             { type: String, default: null,  trim: true },
    name:                { type: String, default: '', trim: true },
    description:         { type: String, default: '', trim: true },
    category:            { type: String, default: '', trim: true },
    unitPrice:           { type: Number, required: true, min: 0 },
    priceTolerance:      { type: Number, default: 0.02,  min: 0, max: 1 },
    tolerancePercentage: { type: Number, default: 2.0,   min: 0, max: 100 },
    unit:                { type: String, default: 'EACH', trim: true, uppercase: true },
    isActive:            { type: Boolean, default: true },
  },
  {
    timestamps: true,  // adds createdAt + updatedAt
    versionKey: false, // disables __v
    collection: 'skus',
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

skuSchema.index({ skuCode: 1 },  { unique: true,                  name: 'idx_sku_code' });
skuSchema.index({ eanCode: 1 },  { unique: true, sparse: true,    name: 'idx_sku_ean_code' });
skuSchema.index({ isActive: 1 },                                  { name: 'idx_sku_is_active' });

// ── Model export ──────────────────────────────────────────────────────────────

const SKUModel = mongoose.model('SKU', skuSchema);

module.exports = SKUModel;
