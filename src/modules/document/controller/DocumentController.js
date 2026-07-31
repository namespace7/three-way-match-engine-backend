'use strict';

const MockDocumentParser = require('../parser/MockDocumentParser');
const DocumentMapper = require('../mapper/DocumentMapper');
const DocumentValidator = require('../validator/DocumentValidator');
const DocumentService = require('../service/DocumentService');

const VALID_DOCUMENT_TYPES = ['PURCHASE_ORDER', 'GRN', 'INVOICE'];

/**
 * @class DocumentController
 *
 * Handles HTTP requests for document operations.
 * Responsibilities: receive request, validate multipart inputs, call DocumentService, return JSON response.
 * Contains no business logic.
 */
class DocumentController {
  /**
   * @param {DocumentService} [documentService]
   */
  constructor(documentService) {
    this._documentService = documentService || new DocumentService(
      new MockDocumentParser(),
      new DocumentMapper(),
      new DocumentValidator()
    );
  }

  /**
   * Handles POST /api/v1/documents/upload
   */
  upload = async (req, res, next) => {
    try {
      if (!req.file) {
        const error = new Error('File is required');
        error.statusCode = 400;
        error.code = 'VALIDATION_ERROR';
        throw error;
      }

      const { documentType } = req.body;
      if (!documentType) {
        const error = new Error('documentType is required');
        error.statusCode = 400;
        error.code = 'VALIDATION_ERROR';
        throw error;
      }

      const normalizedType = documentType.trim().toUpperCase();
      if (!VALID_DOCUMENT_TYPES.includes(normalizedType)) {
        const error = new Error(
          `Invalid documentType "${documentType}". Must be one of: ${VALID_DOCUMENT_TYPES.join(', ')}`
        );
        error.statusCode = 400;
        error.code = 'VALIDATION_ERROR';
        throw error;
      }

      const savedDocument = await this._documentService.upload(req.file.path, normalizedType);

      return res.status(201).json({
        success: true,
        data: savedDocument,
      });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = DocumentController;
