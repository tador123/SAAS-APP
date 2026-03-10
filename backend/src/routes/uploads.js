const router = require('express').Router();
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');
const fs = require('fs');
const { authenticate, authorize } = require('../middleware/auth');

// Ensure upload directories exist
const UPLOAD_ROOT = process.env.UPLOAD_DIR || path.join(__dirname, '..', '..', 'uploads');
const ALLOWED_TYPES = {
  room: { dir: 'rooms', maxSize: 5 * 1024 * 1024 },       // 5 MB
  menu: { dir: 'menu', maxSize: 5 * 1024 * 1024 },        // 5 MB
  profile: { dir: 'profiles', maxSize: 2 * 1024 * 1024 },  // 2 MB
};
const ALLOWED_MIMETYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

// Create directories on startup
Object.values(ALLOWED_TYPES).forEach(({ dir }) => {
  const fullDir = path.join(UPLOAD_ROOT, dir);
  fs.mkdirSync(fullDir, { recursive: true });
});

// Multer storage — files get random names to prevent overwrites
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const typeConfig = ALLOWED_TYPES[req.body.type || req.query.type];
    if (!typeConfig) {
      return cb(new Error('Invalid upload type'));
    }
    cb(null, path.join(UPLOAD_ROOT, typeConfig.dir));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = crypto.randomBytes(16).toString('hex') + ext;
    cb(null, name);
  },
});

const fileFilter = (req, file, cb) => {
  if (!ALLOWED_MIMETYPES.includes(file.mimetype)) {
    return cb(new Error(`Invalid file type. Allowed: ${ALLOWED_MIMETYPES.join(', ')}`), false);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // max 5MB default; per-type checked below
});

// POST /api/uploads/image — upload a single image
router.post(
  '/image',
  authenticate,
  authorize('admin', 'manager', 'receptionist', 'chef'),
  upload.single('image'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided.' });
    }

    const uploadType = req.body.type || req.query.type;
    if (!ALLOWED_TYPES[uploadType]) {
      return res.status(400).json({ error: `Invalid type. Allowed: ${Object.keys(ALLOWED_TYPES).join(', ')}` });
    }

    const typeConfig = ALLOWED_TYPES[uploadType];
    if (req.file.size > typeConfig.maxSize) {
      // Remove oversized file
      fs.unlink(req.file.path, () => {});
      return res.status(400).json({ error: `File too large. Max ${typeConfig.maxSize / (1024 * 1024)}MB for ${uploadType}.` });
    }

    const relativePath = `/uploads/${typeConfig.dir}/${req.file.filename}`;
    res.json({
      url: relativePath,
      filename: req.file.filename,
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
    });
  }
);

// POST /api/uploads/images — upload multiple images (max 10)
router.post(
  '/images',
  authenticate,
  authorize('admin', 'manager', 'receptionist', 'chef'),
  upload.array('images', 10),
  (req, res) => {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'No image files provided.' });
    }

    const uploadType = req.body.type || req.query.type;
    if (!ALLOWED_TYPES[uploadType]) {
      return res.status(400).json({ error: `Invalid type. Allowed: ${Object.keys(ALLOWED_TYPES).join(', ')}` });
    }

    const typeConfig = ALLOWED_TYPES[uploadType];
    const results = req.files.map(file => ({
      url: `/uploads/${typeConfig.dir}/${file.filename}`,
      filename: file.filename,
      originalName: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    }));

    res.json({ files: results });
  }
);

// DELETE /api/uploads/:type/:filename — delete a previously uploaded file
router.delete(
  '/:type/:filename',
  authenticate,
  authorize('admin', 'manager'),
  (req, res) => {
    const { type, filename } = req.params;
    const typeConfig = ALLOWED_TYPES[type];
    if (!typeConfig) {
      return res.status(400).json({ error: 'Invalid upload type.' });
    }

    // Prevent path traversal
    const safeName = path.basename(filename);
    const filePath = path.join(UPLOAD_ROOT, typeConfig.dir, safeName);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found.' });
    }

    fs.unlinkSync(filePath);
    res.json({ message: 'File deleted.' });
  }
);

// Multer error handler
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File too large.' });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ error: 'Too many files. Maximum 10.' });
    }
    return res.status(400).json({ error: err.message });
  }
  if (err) {
    return res.status(400).json({ error: err.message });
  }
  next();
});

module.exports = router;
