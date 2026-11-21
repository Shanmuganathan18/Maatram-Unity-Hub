/**
 * src/modules/uploads/upload.routes.js
 */
const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { requireActiveAccount } = require('../../middleware/authorize');
const { upload } = require('../../services/storageService');
const uploadController = require('./upload.controller');

const router = Router();

router.post(
  '/',
  authenticate,
  requireActiveAccount,
  upload.single('file'),
  uploadController.uploadFile,
);

module.exports = router;
