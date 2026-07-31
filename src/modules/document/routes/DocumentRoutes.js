'use strict';

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const env = require('../../../config/env');
const DocumentController = require('../controller/DocumentController');

const router = express.Router();

// Ensure upload directory exists on startup
if (!fs.existsSync(env.UPLOAD_DIRECTORY)) {
  fs.mkdirSync(env.UPLOAD_DIRECTORY, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, env.UPLOAD_DIRECTORY);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({ storage });
const documentController = new DocumentController();

/**
 * POST /api/v1/documents/upload
 * Multipart form data: file, documentType
 */
router.post('/upload', upload.single('file'), documentController.upload);

module.exports = router;
