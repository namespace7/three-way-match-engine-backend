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
   * @param {string} filePath     - Path to the uploaded file on disk.
   * @param {string} documentType - Expected type ('PURCHASE_ORDER' | 'GRN' | 'INVOICE').
   * @returns {Promise<Object>} The saved document.
   */
  async upload(filePath, documentType) {
    const fs = require('fs');
    if (!filePath || !fs.existsSync(filePath)) {
      const error = new Error(`Uploaded file not found on disk at path: "${filePath || 'N/A'}"`);
      error.statusCode = 400;
      error.code = 'FILE_UPLOAD_FAILED';
      throw error;
    }

    const raw = await this._parse(filePath, documentType);
    const mapped = this._map(raw, documentType);

    const validation = this._validate(mapped, documentType);
    if (!validation.valid) {
      const error = new Error(`Document validation failed: ${validation.errors.join(', ')}`);
      error.statusCode = 400;
      error.code = 'DOCUMENT_VALIDATION_ERROR';
      error.errors = validation.errors;
      throw error;
    }

    const savedDocument = await this._persist(mapped, documentType, filePath);
    return savedDocument;
  }

  /**
   * Queries documents across repositories filtered by documentType and poNumber.
   */
  async findDocuments({ documentType, poNumber } = {}) {
    const poFilter = poNumber ? { poNumber } : {};
    const refFilter = poNumber ? { poReference: poNumber } : {};

    if (documentType) {
      const type = documentType.trim().toUpperCase();
      console.log(`DocumentService: findDocuments called with documentType="${type}" and poNumber="${poNumber || 'N/A'}"`);
      const repo = this._repositories[type];
      if (repo && typeof repo.findMany === 'function') {
        const filter = type === 'PURCHASE_ORDER' ? poFilter : refFilter;
        return await repo.findMany(filter);
      }
      return [];
    }

    const [pos, grns, invoices] = await Promise.all([
      this._repositories.PURCHASE_ORDER.findMany ? this._repositories.PURCHASE_ORDER.findMany(poFilter) : [],
      this._repositories.GRN.findMany ? this._repositories.GRN.findMany(refFilter) : [],
      this._repositories.INVOICE.findMany ? this._repositories.INVOICE.findMany(refFilter) : [],
    ]);

    return [...pos, ...grns, ...invoices];
  }

  /**
   * Finds a document by Mongo ID across repositories.
   */
  async findDocumentById(id) {
    for (const repoKey of ['PURCHASE_ORDER', 'GRN', 'INVOICE']) {
      const repo = this._repositories[repoKey];
      if (repo && typeof repo.findById === 'function') {
        try {
          const doc = await repo.findById(id);
          if (doc) return doc;
        } catch (_err) {
          // Ignore invalid ObjectId errors
        }
      }
    }
    return null;
  }

  /**
   * Delegates file parsing to the injected parser.
   * @private
   */
  async _parse(filePath, documentType) {
    return this._parser.parse(filePath, documentType);
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
  async _persist(mapped, documentType, filePath) {
    const repo = this._repositories[documentType];
    if (!repo) {
      throw new Error(`DocumentService: repository for documentType "${documentType}" not found`);
    }

    const dataToSave = typeof mapped.toJSON === 'function' ? mapped.toJSON() : { ...mapped };
    if (filePath) {
      dataToSave.filePath = filePath;
    }
    return await repo.create(dataToSave);
  }
}

module.exports = DocumentService;
