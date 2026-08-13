'use strict';

const fs = require('fs');
const path = require('path');
const env = require('../../../config/env');
const logger = require('../../../shared/logger');
const DocumentService = require('../service/DocumentService');

const VALID_DOCUMENT_TYPES = ['PURCHASE_ORDER', 'GRN', 'INVOICE'];

/**
 * @class DocumentController
 *
 * Handles HTTP requests for document operations.
 */
class DocumentController {
  /**
   * @param {DocumentService} [documentService]
   */
  constructor(documentService) {
    this._documentService = documentService || new DocumentService();
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
      if (req.file && req.file.path && fs.existsSync(req.file.path)) {
        try {
          fs.unlinkSync(req.file.path);
        } catch (_unlinkErr) {
          // Ignore unlink cleanup error
        }
      }
      next(err);
    }
  };

  /**
   * Handles GET /api/v1/documents?documentType=...&poNumber=...
   */
  getDocuments = async (req, res, next) => {
    try {
      const { documentType, poNumber } = req.query;
      const documents = await this._documentService.findDocuments({ documentType, poNumber });

      return res.status(200).json({
        success: true,
        data: documents,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Handles GET /api/v1/documents/:id
   */
  getDocumentById = async (req, res, next) => {
    try {
      const { id } = req.params;
      const document = await this._documentService.findDocumentById(id);

      if (!document) {
        const error = new Error(`Document with ID "${id}" not found`);
        error.statusCode = 404;
        error.code = 'DOCUMENT_NOT_FOUND';
        throw error;
      }

      return res.status(200).json({
        success: true,
        data: document,
      });
    } catch (err) {
      next(err);
    }
  };

  /**
   * Handles GET /api/v1/documents/:id/file
   */
  streamDocumentFile = async (req, res, next) => {
    try {
      const { id } = req.params;
      const document = await this._documentService.findDocumentById(id);

      if (!document) {
        const error = new Error(`Document with ID "${id}" not found`);
        error.statusCode = 404;
        error.code = 'DOCUMENT_NOT_FOUND';
        throw error;
      }

      const filePath = document.filePath;
      if (!filePath || !fs.existsSync(filePath)) {
        const resolvedPath = filePath ? path.resolve(filePath) : 'N/A';
        const uploadRoot = path.resolve(env.UPLOAD_DIRECTORY || 'uploads');
        const dirExists = filePath ? fs.existsSync(path.dirname(resolvedPath)) : false;
        const filename = document.originalFilename || document.filename || document.documentNumber || 'N/A';

        logger.error(`[FILE_NOT_FOUND Diagnostic] Document ID: "${id}" | Filename: "${filename}" | Stored Path: "${filePath || 'N/A'}" | Resolved Path: "${resolvedPath}" | Exists: false | Directory Exists: ${dirExists} | Upload Root: "${uploadRoot}"`);

        const error = new Error(`Document file for ID "${id}" not found on disk`);
        error.statusCode = 404;
        error.code = 'FILE_NOT_FOUND';
        throw error;
      }

      return res.sendFile(path.resolve(filePath));
    } catch (err) {
      next(err);
    }
  };
}

module.exports = DocumentController;
