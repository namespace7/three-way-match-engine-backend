'use strict';

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const env = require('../../../config/env');
const DocumentController = require('../controller/DocumentController');

const router = express.Router();

// Ensure absolute upload directory path
const getUploadDirectory = () => {
  const targetDir = path.resolve(env.UPLOAD_DIRECTORY || './uploads');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  return targetDir;
};

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, getUploadDirectory());
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const ALLOWED_MIME_TYPES = ['application/pdf', 'image/png', 'image/jpeg'];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    const error = new Error('Only PDF, PNG and JPEG files are supported.');
    error.statusCode = 415;
    error.code = 'UNSUPPORTED_FILE_TYPE';
    cb(error, false);
  }
};

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
  fileFilter,
});

const documentController = new DocumentController();

/**
 * POST /api/v1/documents/upload
 */
router.post('/upload', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      if (err.code === 'UNSUPPORTED_FILE_TYPE' || err.statusCode === 415) {
        err.statusCode = 415;
        err.code = 'UNSUPPORTED_FILE_TYPE';
        err.message = 'Only PDF, PNG and JPEG files are supported.';
      }
      return next(err);
    }
    documentController.upload(req, res, next);
  });
});

/**
 * GET /api/v1/documents?documentType=...&poNumber=...
 */
router.get('/', documentController.getDocuments);

/**
 * GET /api/v1/documents/:id
 */
router.get('/:id', documentController.getDocumentById);

/**
 * GET /api/v1/documents/:id/file
 */
router.get('/:id/file', documentController.streamDocumentFile);

module.exports = router;
