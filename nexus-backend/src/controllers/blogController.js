const BlogPost = require('../models/BlogPost');
const { uploadBuffer, deleteImage, isConfigured } = require('../services/cloudinaryService');
const { generateBlogPost } = require('../services/geminiService');
const { buildBlogNotificationHtml, sendAlertEmail } = require('../services/emailService');

async function create(req, res, next) {
  try {
    const data = { ...req.body };

    // Handle cover image upload if file provided
    if (req.file && isConfigured()) {
      try {
        const result = await uploadBuffer(req.file.buffer, { folder: 'nexus/blog' });
        data.cover_image_url = result.url;
        data.cover_cloudinary_id = result.public_id;
      } catch (err) {
        console.error('[Blog] Cover upload error:', err.message);
      }
    }

    // Set author info from authenticated user
    if (req.user) {
      data.author_id = req.user.id;
      data.author_name = data.author_name || req.user.name;
      if (!data.author_type) {
        data.author_type = ['admin', 'district_officer'].includes(req.user.role) ? 'admin' : 'ngo';
      }
    }

    if (!data.title || !data.content) {
      return res.status(400).json({ success: false, message: 'title and content are required' });
    }

    const post = await BlogPost.create(data);
    res.status(201).json({ success: true, data: post });
  } catch (e) { next(e); }
}

async function list(req, res, next) {
  try {
    const { status, author_type, district, tag, limit, offset } = req.query;
    const effectiveStatus = req.user ? (status || undefined) : 'published';
    const posts = await BlogPost.findAll({
      status: effectiveStatus,
      author_type: author_type||undefined,
      district: district||undefined,
      tag: tag||undefined,
      limit: limit ? parseInt(limit) : 20,
      offset: offset ? parseInt(offset) : 0,
    });
    res.json({ success: true, count: posts.length, data: posts });
  } catch (e) { next(e); }
}

async function getPost(req, res, next) {
  try {
    const post = req.params.id.includes('-')
      ? await BlogPost.findBySlug(req.params.id) || await BlogPost.findById(req.params.id)
      : await BlogPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    // Increment views for published posts (non-blocking)
    if (post.status === 'published') BlogPost.incrementViews(post.id).catch(() => {});
    res.json({ success: true, data: post });
  } catch (e) { next(e); }
}

async function update(req, res, next) {
  try {
    const data = { ...req.body };

    if (req.file && isConfigured()) {
      try {
        // Delete old cover if exists
        const existing = await BlogPost.findById(req.params.id);
        if (existing?.cover_cloudinary_id) {
          deleteImage(existing.cover_cloudinary_id).catch(() => {});
        }
        const result = await uploadBuffer(req.file.buffer, { folder: 'nexus/blog' });
        data.cover_image_url = result.url;
        data.cover_cloudinary_id = result.public_id;
      } catch (err) {
        console.error('[Blog] Cover upload error:', err.message);
      }
    }

    const post = await BlogPost.update(req.params.id, data);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });
    res.json({ success: true, data: post });
  } catch (e) { next(e); }
}

async function publish(req, res, next) {
  try {
    const post = await BlogPost.publish(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found' });

    // Send email notification to admin if configured (non-blocking)
    if (process.env.NOTIFY_EMAIL) {
      sendAlertEmail(
        process.env.NOTIFY_EMAIL,
        `New Blog Post Published: ${post.title}`,
        buildBlogNotificationHtml(post)
      ).catch(() => {});
    }

    res.json({ success: true, data: post });
  } catch (e) { next(e); }
}

async function remove(req, res, next) {
  try {
    const deleted = await BlogPost.delete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'Post not found' });
    if (deleted.cover_cloudinary_id) {
      deleteImage(deleted.cover_cloudinary_id).catch(() => {});
    }
    res.json({ success: true, message: 'Post deleted' });
  } catch (e) { next(e); }
}

async function aiGenerate(req, res, next) {
  try {
    const { topic, district, publish_immediately } = req.body;
    if (!topic) return res.status(400).json({ success: false, message: 'topic is required' });

    const aiResult = await generateBlogPost(topic, { district });

    const post = await BlogPost.create({
      title: aiResult.title,
      summary: aiResult.summary,
      content: aiResult.content,
      tags: aiResult.tags || [],
      district: district||null,
      author_type: 'ai',
      author_name: 'N.E.X.U.S. AI',
      status: publish_immediately === true || publish_immediately === 'true' ? 'published' : 'draft',
    });

    res.status(201).json({
      success: true,
      message: post.status === 'published' ? 'AI post generated and published' : 'AI post generated as draft',
      data: post,
    });
  } catch (e) { next(e); }
}

async function recent(req, res, next) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 5;
    const posts = await BlogPost.recent(limit);
    res.json({ success: true, count: posts.length, data: posts });
  } catch (e) { next(e); }
}

module.exports = { create, list, getPost, update, publish, remove, aiGenerate, recent };
