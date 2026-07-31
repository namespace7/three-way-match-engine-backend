'use strict';

const mongoose = require('mongoose');

// ── Sub-document schemas ──────────────────────────────────────────────────────

/**
 * Mirrors domain GRNLineItem value object.
 * _id disabled — line items carry no independent identity in persistence.
 */
const grnLineItemSchema = new mongoose.Schema(
  {
    lineNumber:       { type: Number, required: true },
    sku:              { type: String, required: true, trim: true, uppercase: true },
    orderedQuantity:  { type: Number, required: true, min: 0 },
    receivedQuantity: { type: Number, required: true, min: 0 },
    rejectedQuantity: { type: Number, default: 0,    min: 0 },
    rejectionReason:  { type: String, default: null },
  },
  { _id: false }
);

// ── Root schema ───────────────────────────────────────────────────────────────

/**
 * Persistence schema for the GRN aggregate root.
 *
 * Field names are kept identical to the domain object to allow direct
 * mapping without transformation in the repository layer.
 *
 * No business logic lives here — calculations and acceptance-rate derivations
 * belong in the domain layer (src/domain/GRN.js).
 */
const grnSchema = new mongoose.Schema(
  {
    grnNumber:    { type: String, required: true, trim: true },
    poReference:  { type: String, required: true, trim: true },
    receivedDate: { type: Date,   default: null },
    warehouse:    { type: String, default: '', trim: true },
    receivedBy:   { type: String, default: '', trim: true },
    lineItems:    { type: [grnLineItemSchema], required: true },
  },
  {
    timestamps: true,  // adds createdAt + updatedAt
    versionKey: false, // disables __v
    collection: 'grns',
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// Compound index mirrors GRN's composite identity (grnNumber is unique;
// poReference is included for efficient lookups of all GRNs for a PO).
grnSchema.index({ grnNumber: 1 },   { unique: true, name: 'idx_grn_number' });
grnSchema.index({ poReference: 1 }, { name: 'idx_grn_po_reference' });
grnSchema.index({ poReference: 1, grnNumber: 1 }, { name: 'idx_grn_po_grn' });
grnSchema.index({ receivedDate: -1 },              { name: 'idx_grn_received_date' });

// ── Model export ──────────────────────────────────────────────────────────────

const GRNModel = mongoose.model('GRN', grnSchema);

module.exports = GRNModel;
