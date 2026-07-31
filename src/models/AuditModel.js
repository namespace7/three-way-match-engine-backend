'use strict';

const mongoose = require('mongoose');

// ── Constants ─────────────────────────────────────────────────────────────────

/**
 * Allowed values for the `action` field.
 * Mirrors the operations performed in the application.
 *
 * @readonly
 * @enum {string}
 */
const AUDIT_ACTIONS = Object.freeze([
  'DOCUMENT_UPLOADED',
  'DOCUMENT_PARSED',
  'DOCUMENT_MAPPED',
  'DOCUMENT_VALIDATED',
  'MATCH_INITIATED',
  'MATCH_COMPLETED',
  'MATCH_FAILED',
  'DOCUMENT_DELETED',
  'USER_LOGIN',
  'USER_LOGOUT',
]);

/**
 * Allowed values for the `entityType` field.
 *
 * @readonly
 * @enum {string}
 */
const AUDIT_ENTITY_TYPES = Object.freeze([
  'PURCHASE_ORDER',
  'GRN',
  'INVOICE',
  'SKU',
  'MATCH_RESULT',
  'USER',
]);

// ── Root schema ───────────────────────────────────────────────────────────────

/**
 * Persistence schema for immutable audit log entries.
 *
 * Audit records are append-only — they are never updated or deleted.
 * The schema reflects this by providing no mutable state fields beyond
 * the payload snapshot captured at the time of the event.
 *
 * poNumber is included as a top-level indexed field because the majority
 * of audit queries filter by PO (e.g. "show all events for PO-2024-0001").
 */
const auditSchema = new mongoose.Schema(
  {
    // Document correlation
    poNumber:      { type: String, default: null, trim: true },
    grnNumber:     { type: String, default: null, trim: true },
    invoiceNumber: { type: String, default: null, trim: true },

    // What happened
    action:        { type: String, required: true, enum: AUDIT_ACTIONS },

    // Which domain entity was involved
    entityType:    { type: String, required: true, enum: AUDIT_ENTITY_TYPES },
    entityId:      { type: String, required: true, trim: true },

    // Who triggered the event
    performedBy:   { type: String, default: 'SYSTEM', trim: true },

    // Flexible snapshot of the event payload (e.g. diff, error message, result summary)
    metadata:      { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  {
    timestamps: true,  // adds createdAt + updatedAt (createdAt = event timestamp)
    versionKey: false, // disables __v
    collection: 'audit_logs',
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────

// Primary lookup: all audit events for a given PO
auditSchema.index({ poNumber: 1 },                        { name: 'idx_audit_po_number' });

// Secondary lookups
auditSchema.index({ entityType: 1, entityId: 1 },         { name: 'idx_audit_entity' });
auditSchema.index({ action: 1 },                          { name: 'idx_audit_action' });
auditSchema.index({ performedBy: 1 },                     { name: 'idx_audit_performed_by' });
auditSchema.index({ createdAt: -1 },                      { name: 'idx_audit_created_at' });

// Compound: all events for a PO in chronological order
auditSchema.index({ poNumber: 1, createdAt: -1 },         { name: 'idx_audit_po_timeline' });

// ── Model export ──────────────────────────────────────────────────────────────

const AuditModel = mongoose.model('Audit', auditSchema);

module.exports = AuditModel;
module.exports.AUDIT_ACTIONS = AUDIT_ACTIONS;
module.exports.AUDIT_ENTITY_TYPES = AUDIT_ENTITY_TYPES;
