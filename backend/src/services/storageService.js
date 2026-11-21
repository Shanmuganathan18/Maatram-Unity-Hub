/**
 * src/services/storageService.js
 * Handles file storage and uploads using multer.
 * Validates file sizes, allowed extensions, and generates collision-resistant names.
 */
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const env = require('../config/env');
const { ValidationError } = require('../utils/errors');

const uploadDirectory = path.resolve(env.storage.uploadDir);

// Ensure the local uploads directory exists
if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDirectory);
  },
  filename: (req, file, cb) => {
    // Generate safe, unique filename: timestamp-random.ext
    const ext = path.extname(file.originalname).toLowerCase();
    const safeBase = path
      .basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30);
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${safeBase}-${unique}${ext}`);
  },
});

// Allowed mime types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

const fileFilter = (req, file, cb) => {
  if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new ValidationError(
        `File type ${file.mimetype} is not allowed. Supported types: JPG, PNG, WEBP, PDF, CSV, Excel.`,
      ),
      false,
    );
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: env.storage.maxFileSizeMb * 1024 * 1024,
  },
  fileFilter,
});

const memoryUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter,
});

module.exports = {
  upload,
  memoryUpload,
  uploadDirectory,
};

