'use strict';

/**
 * Allowed status values for a MatchResult.
 * Exported so the matching engine and tests can reference the same constants
 * without hard-coding strings.
 *
 * @readonly
 * @enum {string}
 */
const MatchStatus = Object.freeze({
  PENDING:           'PENDING',           // Initial state — matching not yet run
  MATCHED:           'MATCHED',           // All three documents agree within tolerances
  PARTIAL:           'PARTIALLY_MATCHED', // Backward compatible alias for PARTIALLY_MATCHED
  PARTIALLY_MATCHED: 'PARTIALLY_MATCHED', // Partially fulfilled order without hard errors
  MISMATCHED:        'MISMATCHED',        // One or more critical fields do not agree
  ERROR:             'ERROR',             // Processing failure; cannot determine match
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @class MatchResult
 *
 * Aggregate representing the outcome of a three-way document matching operation
 * (Purchase Order ↔ GRN ↔ Invoice).
 */
class MatchResult {
  /**
   * @param {Object} data
   */
  constructor({
    poNumber,
    grnNumber,
    invoiceNumber,
    status,
    reasons,
    createdAt,
    linkedDocuments,
    itemLevelResults,
    resolvedSku,
    aggregatedQuantities,
    overallTotals,
    documentCounts,
    warnings,
    reasonCodes,
  }) {
    if (!poNumber || typeof poNumber !== 'string') {
      throw new TypeError('MatchResult: poNumber must be a non-empty string');
    }
    if (!grnNumber || typeof grnNumber !== 'string') {
      throw new TypeError('MatchResult: grnNumber must be a non-empty string');
    }
    if (!invoiceNumber || typeof invoiceNumber !== 'string') {
      throw new TypeError('MatchResult: invoiceNumber must be a non-empty string');
    }

    const initialStatus = status ?? MatchStatus.PENDING;
    if (!Object.values(MatchStatus).includes(initialStatus)) {
      throw new TypeError(`MatchResult: invalid status "${initialStatus}"`);
    }

    // Immutable composite identity
    this._poNumber      = Object.freeze(poNumber.trim());
    this._grnNumber     = Object.freeze(grnNumber.trim());
    this._invoiceNumber = Object.freeze(invoiceNumber.trim());

    // Mutable state — controlled via setStatus() and addReason()
    this._status    = initialStatus;
    this._reasons   = Array.isArray(reasons) ? [...reasons] : [];
    this._createdAt = createdAt instanceof Date ? createdAt : new Date();

    const terminalStatuses = [MatchStatus.MATCHED, MatchStatus.MISMATCHED, MatchStatus.ERROR, MatchStatus.PARTIAL];
    this._resolvedAt = terminalStatuses.includes(initialStatus) ? (createdAt instanceof Date ? createdAt : new Date()) : null;

    // Optional expanded matching metadata
    this._linkedDocuments = linkedDocuments || null;
    this._itemLevelResults = Array.isArray(itemLevelResults) ? itemLevelResults : [];
    this._resolvedSku = Array.isArray(resolvedSku) ? resolvedSku : [];
    this._aggregatedQuantities = aggregatedQuantities || null;
    this._overallTotals = overallTotals || null;
    this._documentCounts = documentCounts || null;
    this._warnings = Array.isArray(warnings) ? warnings : [];
    this._reasonCodes = Array.isArray(reasonCodes) ? reasonCodes : [];
  }

  // ── Identifiers ────────────────────────────────────────────────────────────

  /** @returns {string} */
  get poNumber()      { return this._poNumber; }

  /** @returns {string} */
  get grnNumber()     { return this._grnNumber; }

  /** @returns {string} */
  get invoiceNumber() { return this._invoiceNumber; }

  // ── Attribute getters ──────────────────────────────────────────────────────

  /** @returns {string} Current match status. */
  get status() { return this._status; }

  /** @returns {Date} */
  get createdAt() { return this._createdAt; }

  /** @returns {Date|null} Null until the result reaches a terminal status. */
  get resolvedAt() { return this._resolvedAt; }

  // ── Business methods ───────────────────────────────────────────────────────

  addReason(reason) {
    if (!reason || typeof reason !== 'string') {
      throw new TypeError('MatchResult.addReason: reason must be a non-empty string');
    }
    this._reasons.push(reason.trim());
    return this;
  }

  setStatus(status) {
    if (!Object.values(MatchStatus).includes(status)) {
      throw new TypeError(`MatchResult.setStatus: invalid status "${status}". Must be one of: ${Object.values(MatchStatus).join(', ')}`);
    }
    this._status = status;

    const terminalStatuses = [MatchStatus.MATCHED, MatchStatus.MISMATCHED, MatchStatus.ERROR, MatchStatus.PARTIAL];
    if (terminalStatuses.includes(status) && !this._resolvedAt) {
      this._resolvedAt = new Date();
    }

    return this;
  }

  isResolved() {
    return this._resolvedAt !== null;
  }

  isMatched() {
    return this._status === MatchStatus.MATCHED;
  }

  /**
   * Returns a plain-object snapshot of the full result.
   */
  getSummary() {
    const summary = {
      poNumber:      this._poNumber,
      grnNumber:     this._grnNumber,
      invoiceNumber: this._invoiceNumber,
      status:        this._status,
      reasons:       [...this._reasons],
      reasonCount:   this._reasons.length,
      isMatched:     this.isMatched(),
      isResolved:    this.isResolved(),
      createdAt:     this._createdAt.toISOString(),
      resolvedAt:    this._resolvedAt?.toISOString() ?? null,
    };

    if (this._linkedDocuments) summary.linkedDocuments = this._linkedDocuments;
    if (this._itemLevelResults.length > 0) summary.itemLevelResults = this._itemLevelResults;
    if (this._resolvedSku.length > 0) summary.resolvedSku = this._resolvedSku;
    if (this._aggregatedQuantities) summary.aggregatedQuantities = this._aggregatedQuantities;
    if (this._overallTotals) summary.overallTotals = this._overallTotals;
    if (this._documentCounts) summary.documentCounts = this._documentCounts;
    if (this._warnings.length > 0) summary.warnings = this._warnings;
    if (this._reasonCodes.length > 0) summary.reasonCodes = this._reasonCodes;

    return summary;
  }

  /** @returns {Object} Alias of getSummary() for JSON serialisation. */
  toJSON() {
    return this.getSummary();
  }
}

module.exports = MatchResult;
module.exports.MatchStatus = MatchStatus;
