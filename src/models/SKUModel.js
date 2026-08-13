'use strict';

const mongoose = require('mongoose');

// ── Sub-document schemas ──────────────────────────────────────────────────────

const aliasSchema = new mongoose.Schema(
  {
    code:        { type: String, required: true, trim: true, uppercase: true },
    vendorGstin: { type: String, default: null,  trim: true, uppercase: true },
  },
  { _id: false }
);

// ── Root schema ───────────────────────────────────────────────────────────────

const skuSchema = new mongoose.Schema(
  {
    skuCode:             { type: String, required: true, trim: true, uppercase: true },
    eanCode:             { type: String, default: null,  trim: true },
    aliases:             { type: [aliasSchema], default: [] },
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

skuSchema.index({ skuCode: 1 }, { unique: true, name: 'idx_sku_code' });

// Partial filter expression ensures uniqueness is enforced ONLY when eanCode is a non-empty string.
// Documents with eanCode: null, eanCode: undefined, or eanCode: "" are completely ignored by the unique index.
skuSchema.index(
  { eanCode: 1 },
  {
    unique: true,
    partialFilterExpression: { eanCode: { $type: 'string', $gt: '' } },
    name: 'idx_sku_ean_code',
  }
);

skuSchema.index(
  { 'aliases.code': 1, 'aliases.vendorGstin': 1 },
  { name: 'idx_sku_aliases_code_vendor' }
);

skuSchema.index({ isActive: 1 }, { name: 'idx_sku_is_active' });

// ── Model export ──────────────────────────────────────────────────────────────

const SKUModel = mongoose.model('SKU', skuSchema);

module.exports = SKUModel;
