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
  PENDING:    'PENDING',     // Initial state — matching not yet run
  MATCHED:    'MATCHED',     // All three documents agree within tolerances
  PARTIAL:    'PARTIAL',     // Some lines match; others have discrepancies
  MISMATCHED: 'MISMATCHED',  // One or more critical fields do not agree
  ERROR:      'ERROR',       // Processing failure; cannot determine match
});

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @class MatchResult
 *
 * Aggregate representing the outcome of a three-way document matching operation
 * (Purchase Order ↔ GRN ↔ Invoice).
 *
 * Identity: composite of `poNumber + grnNumber + invoiceNumber` — set once
 * and frozen.  The status and reasons list are mutable via controlled methods
 * because the matching engine builds the result incrementally.
 *
 * @typedef {Object} MatchResultData
 * @property {string}   poNumber
 * @property {string}   grnNumber
 * @property {string}   invoiceNumber
 * @property {string}   [status]     - Initial status (defaults to PENDING).
 * @property {string[]} [reasons]    - Pre-populated list of reason strings.
 * @property {Date}     [createdAt]  - Defaults to now.
 */
class MatchResult {
  /**
   * @param {MatchResultData} data
   */
  constructor({ poNumber, grnNumber, invoiceNumber, status, reasons, createdAt }) {
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
    this._resolvedAt = null;
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

  /**
   * Appends a human-readable explanation for why the match passed or failed.
   * The matching engine calls this once per discrepancy or confirmation found.
   *
   * @param {string} reason - Non-empty descriptive string.
   * @returns {this} Fluent — allows chaining multiple addReason() calls.
   */
  addReason(reason) {
    if (!reason || typeof reason !== 'string') {
      throw new TypeError('MatchResult.addReason: reason must be a non-empty string');
    }
    this._reasons.push(reason.trim());
    return this;
  }

  /**
   * Transitions the result to a new status.
   * Once a terminal status (MATCHED, MISMATCHED, ERROR) is set the result
   * records a `resolvedAt` timestamp.
   *
   * @param {string} status - One of the MatchStatus constants.
   * @returns {this} Fluent.
   */
  setStatus(status) {
    if (!Object.values(MatchStatus).includes(status)) {
      throw new TypeError(`MatchResult.setStatus: invalid status "${status}". Must be one of: ${Object.values(MatchStatus).join(', ')}`);
    }
    this._status = status;

    const terminalStatuses = [MatchStatus.MATCHED, MatchStatus.MISMATCHED, MatchStatus.ERROR];
    if (terminalStatuses.includes(status) && !this._resolvedAt) {
      this._resolvedAt = new Date();
    }

    return this;
  }

  /**
   * Checks whether this result has reached a terminal (non-pending) state.
   * @returns {boolean}
   */
  isResolved() {
    return this._resolvedAt !== null;
  }

  /**
   * Checks whether the three-way match was fully successful.
   * @returns {boolean}
   */
  isMatched() {
    return this._status === MatchStatus.MATCHED;
  }

  /**
   * Returns a plain-object snapshot of the full result.
   * Safe to log, serialise, or pass to a persistence layer.
   *
   * @returns {{
   *   poNumber:      string,
   *   grnNumber:     string,
   *   invoiceNumber: string,
   *   status:        string,
   *   reasons:       string[],
   *   reasonCount:   number,
   *   isMatched:     boolean,
   *   isResolved:    boolean,
   *   createdAt:     string,
   *   resolvedAt:    string|null,
   * }}
   */
  getSummary() {
    return {
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
  }

  /** @returns {Object} Alias of getSummary() for JSON serialisation. */
  toJSON() {
    return this.getSummary();
  }
}

module.exports = MatchResult;
module.exports.MatchStatus = MatchStatus;
