/**
 * src/modules/uploads/upload.controller.js
 */
const { success } = require('../../utils/response');
const { ValidationError } = require('../../utils/errors');
const env = require('../../config/env');

const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ValidationError('No file uploaded');
    }

    // Relative public URL
    const fileUrl = `${env.app.baseUrl}/uploads/${req.file.filename}`;

    return success(
      res,
      {
        fileName: req.file.filename,
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        url: fileUrl,
      },
      'File uploaded successfully',
    );
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadFile,
};

