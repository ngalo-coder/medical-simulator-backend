// services/fileService.js
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const logger = require('../utils/logger');

const fileService = {
  // Configure multer for file uploads
  configureMulter() {
    const storage = multer.diskStorage({
      destination: async (req, file, cb) => {
        const uploadPath = path.join(process.cwd(), 'public/uploads');
        try {
          await fs.mkdir(uploadPath, { recursive: true });
          cb(null, uploadPath);
        } catch (error) {
          cb(error);
        }
      },
      filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const extension = path.extname(file.originalname);
        const filename = `${file.fieldname}-${uniqueSuffix}${extension}`;
        cb(null, filename);
      }
    });

    const fileFilter = (req, file, cb) => {
      const allowedTypes = [
        'image/jpeg',
        'image/png', 
        'image/gif',
        'image/webp',
        'video/mp4',
        'video/webm',
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error(`File type ${file.mimetype} not allowed`), false);
      }
    };

    return multer({
      storage,
      fileFilter,
      limits: {
        fileSize: parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024 // 10MB
      }
    });
  },

  // Process uploaded image
  async processImage(filePath, options = {}) {
    try {
      const {
        width = 800,
        height = 600,
        quality = 85,
        format = 'jpeg'
      } = options;

      const outputPath = filePath.replace(path.extname(filePath), `_processed.${format}`);

      await sharp(filePath)
        .resize(width, height, { 
          fit: 'inside',
          withoutEnlargement: true 
        })
        .jpeg({ quality })
        .toFile(outputPath);

      // Delete original file
      await fs.unlink(filePath);

      return outputPath;
    } catch (error) {
      logger.error('Image processing error:', error);
      throw error;
    }
  },

  // Generate thumbnail
  async generateThumbnail(imagePath, size = 200) {
    try {
      const thumbnailPath = imagePath.replace(
        path.extname(imagePath), 
        `_thumb${path.extname(imagePath)}`
      );

      await sharp(imagePath)
        .resize(size, size, { 
          fit: 'cover',
          position: 'center'
        })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);

      return thumbnailPath;
    } catch (error) {
      logger.error('Thumbnail generation error:', error);
      throw error;
    }
  },

  // Delete file
  async deleteFile(filePath) {
    try {
      await fs.unlink(filePath);
      return true;
    } catch (error) {
      logger.error('File deletion error:', error);
      return false;
    }
  },

  // Get file info
  async getFileInfo(filePath) {
    try {
      const stats = await fs.stat(filePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
        extension: path.extname(filePath),
        name: path.basename(filePath)
      };
    } catch (error) {
      logger.error('Get file info error:', error);
      return null;
    }
  },

  // Validate file
  validateFile(file) {
    const errors = [];

    // Check file size
    const maxSize = parseInt(process.env.MAX_FILE_SIZE) || 10 * 1024 * 1024;
    if (file.size > maxSize) {
      errors.push(`File size exceeds limit of ${maxSize / 1024 / 1024}MB`);
    }

    // Check file type
    const allowedTypes = process.env.ALLOWED_FILE_TYPES 
      ? process.env.ALLOWED_FILE_TYPES.split(',')
      : ['image/jpeg', 'image/png', 'video/mp4', 'application/pdf'];
    
    if (!allowedTypes.includes(file.mimetype)) {
      errors.push(`File type ${file.mimetype} not allowed`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

module.exports = fileService;