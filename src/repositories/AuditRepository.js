'use strict';

const AuditModel = require('../models/AuditModel');

/**
 * @class AuditRepository
 *
 * Data access layer for the `audit_logs` collection.
 *
 * Audit records are **append-only** by convention.
 * This repository therefore exposes no `update` or `delete` methods.
 * All reads are provided to allow audit trail queries.
 *
 * Responsibilities:
 *  - Insert new audit log entries.
 *  - Read audit log entries by various filters.
 *
 * Explicitly excluded:
 *  - Update / delete (audit records must be immutable)
 *  - Business logic  (belongs in domain/service layers)
 *  - HTTP / Express  (belongs in controller layer)
 */
class AuditRepository {
  // ── Create ──────────────────────────────────────────────────────────────────

  /**
   * Inserts a single audit log entry.
   * @param {Object} data - Plain object matching the Audit schema.
   * @param {string} data.action       - One of the AUDIT_ACTIONS enum values.
   * @param {string} data.entityType   - One of the AUDIT_ENTITY_TYPES enum values.
   * @param {string} data.entityId     - The string identifier of the affected entity.
   * @param {string} [data.poNumber]   - Correlated PO number, if applicable.
   * @param {string} [data.grnNumber]  - Correlated GRN number, if applicable.
   * @param {string} [data.invoiceNumber] - Correlated Invoice number, if applicable.
   * @param {string} [data.performedBy]   - Actor (userId or 'SYSTEM').
   * @param {Object} [data.metadata]      - Arbitrary event payload snapshot.
   * @returns {Promise<import('mongoose').Document>} The saved audit document.
   */
  async create(data) {
    const doc = new AuditModel(data);
    return doc.save();
  }

  /**
   * Inserts multiple audit log entries in a single operation.
   * Useful for bulk-logging a sequence of events atomically.
   * @param {Object[]} dataArray - Array of plain objects matching the Audit schema.
   * @returns {Promise<import('mongoose').Document[]>}
   */
  async createMany(dataArray) {
    return AuditModel.insertMany(dataArray, { ordered: true });
  }

  // ── Read ────────────────────────────────────────────────────────────────────

  /**
   * Finds a single audit entry by its MongoDB `_id`.
   * @param {string} id
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findById(id) {
    return AuditModel.findById(id).lean();
  }

  /**
   * Returns all audit entries associated with the given `poNumber`.
   * Uses the `idx_audit_po_timeline` compound index for efficient retrieval.
   * @param {string}  poNumber
   * @param {Object}  [options={}]
   * @param {number}  [options.limit=100]
   * @param {number}  [options.skip=0]
   * @param {Object}  [options.sort]        - Defaults to newest-first.
   * @returns {Promise<import('mongoose').Document[]>}
   */
  async findByPoNumber(poNumber, { limit = 100, skip = 0, sort = { createdAt: -1 } } = {}) {
    return AuditModel
      .find({ poNumber })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  }

  /**
   * Returns all audit entries for a specific entity (entityType + entityId pair).
   * Uses the `idx_audit_entity` compound index.
   * @param {string}  entityType - e.g. 'PURCHASE_ORDER', 'GRN', 'INVOICE'.
   * @param {string}  entityId   - The domain identifier of the entity.
   * @param {Object}  [options={}]
   * @param {number}  [options.limit=100]
   * @param {number}  [options.skip=0]
   * @param {Object}  [options.sort]
   * @returns {Promise<import('mongoose').Document[]>}
   */
  async findByEntity(entityType, entityId, { limit = 100, skip = 0, sort = { createdAt: -1 } } = {}) {
    return AuditModel
      .find({ entityType, entityId })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  }

  /**
   * Returns all audit entries for a specific action type.
   * Uses the `idx_audit_action` index.
   * @param {string}  action  - One of the AUDIT_ACTIONS enum values.
   * @param {Object}  [options={}]
   * @param {number}  [options.limit=100]
   * @param {number}  [options.skip=0]
   * @param {Object}  [options.sort]
   * @returns {Promise<import('mongoose').Document[]>}
   */
  async findByAction(action, { limit = 100, skip = 0, sort = { createdAt: -1 } } = {}) {
    return AuditModel
      .find({ action })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  }

  /**
   * Returns all audit entries performed by a specific actor.
   * Uses the `idx_audit_performed_by` index.
   * @param {string}  performedBy - User ID string or 'SYSTEM'.
   * @param {Object}  [options={}]
   * @param {number}  [options.limit=100]
   * @param {number}  [options.skip=0]
   * @param {Object}  [options.sort]
   * @returns {Promise<import('mongoose').Document[]>}
   */
  async findByPerformedBy(performedBy, { limit = 100, skip = 0, sort = { createdAt: -1 } } = {}) {
    return AuditModel
      .find({ performedBy })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  }

  /**
   * Returns all audit entries within the given date range.
   * Uses the `idx_audit_created_at` index.
   * @param {Date}    from  - Start of the time window (inclusive).
   * @param {Date}    to    - End of the time window (inclusive).
   * @param {Object}  [options={}]
   * @param {number}  [options.limit=200]
   * @param {number}  [options.skip=0]
   * @param {Object}  [options.sort]
   * @returns {Promise<import('mongoose').Document[]>}
   */
  async findByDateRange(from, to, { limit = 200, skip = 0, sort = { createdAt: -1 } } = {}) {
    return AuditModel
      .find({ createdAt: { $gte: from, $lte: to } })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  }

  /**
   * Returns all audit entries matching the given filter.
   * @param {Object}  [filter={}]
   * @param {Object}  [options={}]
   * @param {number}  [options.limit=100]
   * @param {number}  [options.skip=0]
   * @param {Object}  [options.sort]
   * @param {string}  [options.projection]
   * @returns {Promise<import('mongoose').Document[]>}
   */
  async findMany(filter = {}, { limit = 100, skip = 0, sort = { createdAt: -1 }, projection } = {}) {
    return AuditModel
      .find(filter, projection)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  }

  /**
   * Counts audit entries matching the given filter.
   * @param {Object} [filter={}]
   * @returns {Promise<number>}
   */
  async count(filter = {}) {
    return AuditModel.countDocuments(filter);
  }
}

module.exports = AuditRepository;
