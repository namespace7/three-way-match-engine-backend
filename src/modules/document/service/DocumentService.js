'use strict';

const DocumentParser = require('../parser/DocumentParser');
const ParserFactory = require('../parser/ParserFactory');
const DocumentMapper = require('../mapper/DocumentMapper');
const DocumentValidator = require('../validator/DocumentValidator');
const PurchaseOrderRepository = require('../../../repositories/PurchaseOrderRepository');
const GRNRepository = require('../../../repositories/GRNRepository');
const InvoiceRepository = require('../../../repositories/InvoiceRepository');

/**
 * @class DocumentService
 *
 * Orchestrates the full document upload pipeline:
 *
 *   parse → map → validate → persist using repository → return saved document
 *
 * Dependencies (parser, mapper, validator, repositories) can be injected through
 * the constructor for full flexibility and testability.
 */
class DocumentService {
  /**
   * @param {DocumentParser} [parser] - If omitted, resolved via ParserFactory.
   * @param {DocumentMapper} [mapper]
   * @param {DocumentValidator} [validator]
   * @param {Object} [repositories={}]
   */
  constructor(parser, mapper, validator, repositories = {}) {
    const resolvedParser = parser || ParserFactory.createParser();
    const resolvedMapper = mapper || new DocumentMapper();
    const resolvedValidator = validator || new DocumentValidator();

    if (!(resolvedParser instanceof DocumentParser)) {
      throw new TypeError('DocumentService: parser must extend DocumentParser');
    }
    if (!(resolvedMapper instanceof DocumentMapper)) {
      throw new TypeError('DocumentService: mapper must be an instance of DocumentMapper');
    }
    if (!(resolvedValidator instanceof DocumentValidator)) {
      throw new TypeError('DocumentService: validator must be an instance of DocumentValidator');
    }

    this._parser = resolvedParser;
    this._mapper = resolvedMapper;
    this._validator = resolvedValidator;
    this._repositories = {
      PURCHASE_ORDER: repositories.purchaseOrder || repositories.PURCHASE_ORDER || new PurchaseOrderRepository(),
      GRN: repositories.grn || repositories.GRN || new GRNRepository(),
      INVOICE: repositories.invoice || repositories.INVOICE || new InvoiceRepository(),
    };
  }

  /**
   * Runs the full document processing and persistence pipeline.
   *
   * Steps:
   *  1. Parse     — extract raw structured data from the file.
   *  2. Map       — transform raw data into a canonical domain object.
   *  3. Validate  — enforce business rules on the domain object.
   *  4. Persist   — save to MongoDB via the corresponding repository.
   *  5. Return    — return the persisted document.
   *
   * @param {string} filePath     - Path to the uploaded file on disk.
   * @param {string} documentType - Expected type ('PURCHASE_ORDER' | 'GRN' | 'INVOICE').
   * @returns {Promise<Object>} The saved document.
   */
  async upload(filePath, documentType) {
    // ── Step 1: Parse ────────────────────────────────────────────────────────
    const raw = await this._parse(filePath);

    // ── Step 2: Map ──────────────────────────────────────────────────────────
    const mapped = this._map(raw, documentType);

    // ── Step 3: Validate ─────────────────────────────────────────────────────
    const validation = this._validate(mapped, documentType);
    if (!validation.valid) {
      const error = new Error(`Document validation failed: ${validation.errors.join(', ')}`);
      error.statusCode = 400;
      error.code = 'DOCUMENT_VALIDATION_ERROR';
      error.errors = validation.errors;
      throw error;
    }

    // ── Step 4: Persist ──────────────────────────────────────────────────────
    const savedDocument = await this._persist(mapped, documentType);

    // ── Step 5: Return saved document ───────────────────────────────────────
    return savedDocument;
  }

  /**
   * Delegates file parsing to the injected parser.
   * @private
   */
  async _parse(filePath) {
    return this._parser.parse(filePath);
  }

  /**
   * Dispatches to the correct mapper method based on `documentType`.
   * @private
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

  /**
   * Saves the domain object data using the appropriate repository.
   * @private
   */
  async _persist(mapped, documentType) {
    const repo = this._repositories[documentType];
    if (!repo) {
      throw new Error(`DocumentService: repository for documentType "${documentType}" not found`);
    }

    const dataToSave = typeof mapped.toJSON === 'function' ? mapped.toJSON() : mapped;
    return await repo.create(dataToSave);
  }
}

module.exports = DocumentService;
