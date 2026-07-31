'use strict';

const mongoose = require('mongoose');

// ── Sub-document schemas ──────────────────────────────────────────────────────

const lineItemSchema = new mongoose.Schema(
  {
    lineNumber:  { type: Number, required: true },
    sku:         { type: String, required: true, trim: true, uppercase: true },
    description: { type: String, default: '' },
    quantity:    { type: Number, required: true, min: 0 },
    unitPrice:   { type: Number, required: true, min: 0 },
    totalPrice:  { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const partySchema = new mongoose.Schema(
  {
    name:    { type: String, required: true, trim: true },
    address: { type: String, default: '' },
    taxId:   { type: String, default: '', trim: true },
  },
  { _id: false }
);

// ── Root schema ───────────────────────────────────────────────────────────────

const purchaseOrderSchema = new mongoose.Schema(
  {
    poNumber:     { type: String, required: true, trim: true },
    issueDate:    { type: Date,   default: null },
    currency:     { type: String, required: true, trim: true, uppercase: true, default: 'INR' },
    buyer:        { type: partySchema, required: true },
    supplier:     { type: partySchema, required: true },
    lineItems:    { type: [lineItemSchema], required: true },
    totalAmount:  { type: Number, required: true, min: 0, default: 0 },
    paymentTerms: { type: String, default: null },
    filePath:     { type: String, default: null },
  },
  {
    timestamps: true,  // adds createdAt + updatedAt
    versionKey: false, // disables __v
    collection: 'purchase_orders',
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// Non-unique index on poNumber allows duplicate PO document uploads while idx allows efficient querying
purchaseOrderSchema.index({ poNumber: 1 }, { name: 'idx_po_number' });
purchaseOrderSchema.index({ 'supplier.taxId': 1 },  { name: 'idx_po_supplier_tax_id' });
purchaseOrderSchema.index({ issueDate: -1 },         { name: 'idx_po_issue_date' });

// ── Model export ──────────────────────────────────────────────────────────────

const PurchaseOrderModel = mongoose.model('PurchaseOrder', purchaseOrderSchema);

module.exports = PurchaseOrderModel;
