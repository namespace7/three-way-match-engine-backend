'use strict';

const mongoose = require('mongoose');

// ── Sub-document schemas ──────────────────────────────────────────────────────

const invoiceLineItemSchema = new mongoose.Schema(
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

const invoiceSupplierSchema = new mongoose.Schema(
  {
    name:        { type: String, required: true, trim: true },
    address:     { type: String, default: '' },
    taxId:       { type: String, default: '', trim: true },
    bankAccount: { type: String, default: '', trim: true },
  },
  { _id: false }
);

// ── Root schema ───────────────────────────────────────────────────────────────

const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: { type: String, required: true, trim: true },
    poReference:   { type: String, required: true, trim: true },
    grnReference:  { type: String, default: null,  trim: true },
    issueDate:     { type: Date,   default: null },
    dueDate:       { type: Date,   default: null },
    currency:      { type: String, required: true, trim: true, uppercase: true, default: 'USD' },
    supplier:      { type: invoiceSupplierSchema, required: true },
    lineItems:     { type: [invoiceLineItemSchema], required: true },
    subtotal:      { type: Number, required: true, min: 0, default: 0 },
    taxAmount:     { type: Number, default: 0,     min: 0 },
    totalAmount:   { type: Number, required: true, min: 0, default: 0 },
    filePath:      { type: String, default: null },
  },
  {
    timestamps: true,  // adds createdAt + updatedAt
    versionKey: false, // disables __v
    collection: 'invoices',
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// Non-unique index on invoiceNumber allows duplicate invoice document uploads
invoiceSchema.index({ invoiceNumber: 1 }, { name: 'idx_invoice_number' });
invoiceSchema.index({ poReference: 1 },   { name: 'idx_invoice_po_reference' });
invoiceSchema.index({ poReference: 1, invoiceNumber: 1 }, { name: 'idx_invoice_po_invoice' });
invoiceSchema.index({ dueDate: 1 },                       { name: 'idx_invoice_due_date' });
invoiceSchema.index({ 'supplier.taxId': 1 },              { name: 'idx_invoice_supplier_tax_id' });

// ── Model export ──────────────────────────────────────────────────────────────

const InvoiceModel = mongoose.model('Invoice', invoiceSchema);

module.exports = InvoiceModel;
