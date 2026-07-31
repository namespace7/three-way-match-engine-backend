'use strict';

const mongoose = require('mongoose');

// ── Sub-document schemas ──────────────────────────────────────────────────────

/**
 * Mirrors domain InvoiceLineItem value object.
 * _id disabled — line items carry no independent identity in persistence.
 */
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

/**
 * Persistence schema for the Invoice aggregate root.
 *
 * Field names are kept identical to the domain object to allow direct
 * mapping without transformation in the repository layer.
 *
 * No business logic lives here — overdue checks and quantity derivations
 * belong in the domain layer (src/domain/Invoice.js).
 */
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
  },
  {
    timestamps: true,  // adds createdAt + updatedAt
    versionKey: false, // disables __v
    collection: 'invoices',
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

invoiceSchema.index({ invoiceNumber: 1 }, { unique: true, name: 'idx_invoice_number' });
invoiceSchema.index({ poReference: 1 },   { name: 'idx_invoice_po_reference' });
invoiceSchema.index({ poReference: 1, invoiceNumber: 1 }, { name: 'idx_invoice_po_invoice' });
invoiceSchema.index({ dueDate: 1 },                       { name: 'idx_invoice_due_date' });
invoiceSchema.index({ 'supplier.taxId': 1 },              { name: 'idx_invoice_supplier_tax_id' });

// ── Model export ──────────────────────────────────────────────────────────────

const InvoiceModel = mongoose.model('Invoice', invoiceSchema);

module.exports = InvoiceModel;
