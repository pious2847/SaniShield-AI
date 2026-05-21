const cloudinary = require('cloudinary').v2;

function getConfigured() {
  if (!process.env.CLOUDINARY_CLOUD_NAME) {
    throw new Error('Cloudinary not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in .env');
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
  });
  return cloudinary;
}

async function uploadBuffer(buffer, options = {}) {
  const cl = getConfigured();
  const folder = options.folder || 'nexus/general';
  return new Promise((resolve, reject) => {
    const stream = cl.uploader.upload_stream(
      {
        folder,
        resource_type: 'image',
        quality: 'auto:good',
        fetch_format: 'auto',
        transformation: options.transformation || [],
      },
      (error, result) => {
        if (error) return reject(error);
        resolve({
          url: result.secure_url,
          public_id: result.public_id,
          width: result.width,
          height: result.height,
          format: result.format,
          bytes: result.bytes,
        });
      }
    );
    stream.end(buffer);
  });
}

async function uploadFromUrl(url, options = {}) {
  const cl = getConfigured();
  const result = await cl.uploader.upload(url, {
    folder: options.folder || 'nexus/general',
    resource_type: 'image',
    quality: 'auto:good',
  });
  return { url: result.secure_url, public_id: result.public_id };
}

async function deleteImage(publicId) {
  try {
    const cl = getConfigured();
    return await cl.uploader.destroy(publicId);
  } catch (err) {
    console.error('[Cloudinary] Delete error:', err.message);
    return null;
  }
}

function isConfigured() {
  return !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);
}

module.exports = { uploadBuffer, uploadFromUrl, deleteImage, isConfigured };
