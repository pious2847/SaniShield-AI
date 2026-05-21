const multer = require('multer');

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/heic'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`Invalid file type. Allowed: ${ALLOWED_TYPES.join(', ')}`), false);
  }
};

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_SIZE } });

// Single image — field name 'photo'
const uploadPhoto = upload.single('photo');

// Cover image for blog posts
const uploadCover = upload.single('cover_image');

// Multiple photos (up to 5)
const uploadPhotos = upload.array('photos', 5);

// Error handler wrapper
function handleUpload(multerMiddleware) {
  return (req, res, next) => {
    multerMiddleware(req, res, (err) => {
      if (!err) return next();
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ success: false, message: 'File too large. Maximum size is 10MB.' });
      }
      return res.status(400).json({ success: false, message: err.message });
    });
  };
}

module.exports = { uploadPhoto: handleUpload(uploadPhoto), uploadCover: handleUpload(uploadCover), uploadPhotos: handleUpload(uploadPhotos) };
