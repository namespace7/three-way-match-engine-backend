'use strict';

const mongoose = require('mongoose');

// ── Root schema ───────────────────────────────────────────────────────────────

/**
 * Persistence schema for the SKU entity.
 *
 * Field names are kept identical to the domain object to allow direct
 * mapping without transformation in the repository layer.
 *
 * No business logic lives here — price-tolerance calculations belong
 * in the domain layer (src/domain/SKU.js).
 *
 * Additional field `eanCode` (EAN-13 / GTIN barcode) is included at the
 * persistence layer because it is a catalogue attribute not needed by the
 * matching engine's domain logic but required for warehouse and integrations.
 */
const skuSchema = new mongoose.Schema(
  {
    skuCode:        { type: String, required: true, trim: true, uppercase: true },
    eanCode:        { type: String, default: null,  trim: true },
    description:    { type: String, default: '', trim: true },
    unitPrice:      { type: Number, required: true, min: 0 },
    priceTolerance: { type: Number, default: 0.05,  min: 0, max: 1 },
    unit:           { type: String, default: 'EACH', trim: true, uppercase: true },
    isActive:       { type: Boolean, default: true },
  },
  {
    timestamps: true,  // adds createdAt + updatedAt
    versionKey: false, // disables __v
    collection: 'skus',
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// Both skuCode and eanCode must be globally unique identifiers.
// sparse: true on eanCode allows multiple documents with null eanCode.
skuSchema.index({ skuCode: 1 },  { unique: true,                  name: 'idx_sku_code' });
skuSchema.index({ eanCode: 1 },  { unique: true, sparse: true,    name: 'idx_sku_ean_code' });
skuSchema.index({ isActive: 1 },                                  { name: 'idx_sku_is_active' });

// ── Model export ──────────────────────────────────────────────────────────────

const SKUModel = mongoose.model('SKU', skuSchema);

module.exports = SKUModel;
