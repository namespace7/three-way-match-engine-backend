'use strict';

const DocumentParser = require('../parser/DocumentParser');
const DocumentMapper = require('../mapper/DocumentMapper');
const DocumentValidator = require('../validator/DocumentValidator');

/**
 * @class DocumentService
 *
 * Orchestrates the full document upload pipeline:
 *
 *   parse  →  map  →  validate  →  return result
 *
 * Dependencies (parser, mapper, validator) are injected through the constructor
 * so that any concrete or mock implementation can be substituted without
 * modifying this class.
 *
 * Design notes (SOLID):
 *  - Single Responsibility : orchestrates the pipeline; delegates every concern
 *                            to a specialised collaborator.
 *  - Open/Closed           : swap parsers, mappers, or validators via injection.
 *  - Liskov Substitution   : any DocumentParser subclass works transparently.
 *  - Interface Segregation : service only calls the interface methods it needs.
 *  - Dependency Inversion  : depends on abstractions (base classes), not concretes.
 *
 * @typedef  {Object} UploadResult
 * @property {boolean}                    success        - True when parse + map + validate all pass.
 * @property {string}                     documentType   - Detected type ('PURCHASE_ORDER' | 'GRN' | 'INVOICE').
 * @property {Record<string, unknown>}    raw            - Parsed output before mapping.
 * @property {Record<string, unknown>}    mapped         - Canonical domain object after mapping.
 * @property {{ valid: boolean, errors: string[] }} validation - Validation result.
 */
class DocumentService {
  /**
   * @param {DocumentParser}    parser    - Concrete parser implementation.
   * @param {DocumentMapper}    mapper    - Mapper that converts raw data to domain objects.
   * @param {DocumentValidator} validator - Validator that enforces business rules.
   */
  constructor(parser, mapper, validator) {
    if (!(parser instanceof DocumentParser)) {
      throw new TypeError('DocumentService: parser must extend DocumentParser');
    }
    if (!(mapper instanceof DocumentMapper)) {
      throw new TypeError('DocumentService: mapper must be an instance of DocumentMapper');
    }
    if (!(validator instanceof DocumentValidator)) {
      throw new TypeError('DocumentService: validator must be an instance of DocumentValidator');
    }

    this._parser = parser;
    this._mapper = mapper;
    this._validator = validator;
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  /**
   * Runs the full document processing pipeline for an uploaded file.
   *
   * Steps:
   *  1. Parse  — extract raw structured data from the file.
   *  2. Map    — transform raw data into a canonical domain object.
   *  3. Validate — enforce business rules on the domain object.
   *
   * Does NOT persist anything to a database.
   *
   * @param {string} filePath     - Path to the uploaded file on disk.
   * @param {string} documentType - Expected type ('PURCHASE_ORDER' | 'GRN' | 'INVOICE').
   * @returns {Promise<UploadResult>}
   */
  async upload(filePath, documentType) {
    // ── Step 1: Parse ────────────────────────────────────────────────────────
    const raw = await this._parse(filePath);

    // ── Step 2: Map ──────────────────────────────────────────────────────────
    const mapped = this._map(raw, documentType);

    // ── Step 3: Validate ─────────────────────────────────────────────────────
    const validation = this._validate(mapped, documentType);

    return {
      success: validation.valid,
      documentType,
      raw,
      mapped,
      validation,
    };
  }

  // ---------------------------------------------------------------------------
  // Private pipeline steps (each independently unit-testable)
  // ---------------------------------------------------------------------------

  /**
   * Delegates file parsing to the injected parser.
   * @private
   * @param {string} filePath
   * @returns {Promise<Record<string, unknown>>}
   */
  async _parse(filePath) {
    return this._parser.parse(filePath);
  }

  /**
   * Dispatches to the correct mapper method based on `documentType`.
   * @private
   * @param {Record<string, unknown>} raw
   * @param {string} documentType
   * @returns {Record<string, unknown>}
   */
  _map(raw, documentType) {
    const strategies = {
      PURCHASE_ORDER: () => this._mapper.mapPurchaseOrder(raw),
      GRN: () => this._mapper.mapGRN(raw),
      INVOICE: () => this._mapper.mapInvoice(raw),
    };

    const strategy = strategies[documentType];

    if (!strategy) {
      throw new Error(`DocumentService: unsupported documentType "${documentType}"`);
    }

    return strategy();
  }

  /**
   * Dispatches to the correct validator method based on `documentType`.
   * @private
   * @param {Record<string, unknown>} mapped
   * @param {string} documentType
   * @returns {{ valid: boolean, errors: string[] }}
   */
  _validate(mapped, documentType) {
    const strategies = {
      PURCHASE_ORDER: () => this._validator.validatePurchaseOrder(mapped),
      GRN: () => this._validator.validateGRN(mapped),
      INVOICE: () => this._validator.validateInvoice(mapped),
    };

    const strategy = strategies[documentType];

    if (!strategy) {
      throw new Error(`DocumentService: unsupported documentType "${documentType}"`);
    }

    return strategy();
  }
}

module.exports = DocumentService;
