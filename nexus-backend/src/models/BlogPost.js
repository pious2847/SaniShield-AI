const { query } = require('../config/database');

function slugify(text) {
  return text.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .slice(0, 280);
}

class BlogPost {
  static async create(data) {
    const slug = data.slug || `${slugify(data.title)}-${Date.now()}`;
    const { rows } = await query(
      `INSERT INTO blog_posts
        (title, slug, summary, content, cover_image_url, cover_cloudinary_id,
         author_type, author_id, author_name, district, tags, status, published_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        data.title, slug, data.summary||null, data.content,
        data.cover_image_url||null, data.cover_cloudinary_id||null,
        data.author_type||'admin', data.author_id||null, data.author_name||'N.E.X.U.S. Team',
        data.district||null, data.tags||[],
        data.status||'draft',
        data.status === 'published' ? new Date().toISOString() : (data.published_at||null),
      ]
    );
    return rows[0];
  }

  static async findAll({ status, author_type, district, tag, limit=20, offset=0 } = {}) {
    const conds=[]; const params=[];
    if (status) { conds.push(`status=$${params.length+1}`); params.push(status); }
    if (author_type) { conds.push(`author_type=$${params.length+1}`); params.push(author_type); }
    if (district) { conds.push(`district=$${params.length+1}`); params.push(district); }
    if (tag) { conds.push(`$${params.length+1}=ANY(tags)`); params.push(tag); }
    params.push(limit, offset);
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT id, title, slug, summary, cover_image_url, author_type, author_name,
              district, tags, status, published_at, view_count, created_at
       FROM blog_posts ${where}
       ORDER BY published_at DESC NULLS LAST, created_at DESC
       LIMIT $${params.length-1} OFFSET $${params.length}`,
      params
    );
    return rows;
  }

  static async findBySlug(slug) {
    const { rows } = await query(`SELECT * FROM blog_posts WHERE slug=$1`, [slug]);
    return rows[0]||null;
  }

  static async findById(id) {
    const { rows } = await query(`SELECT * FROM blog_posts WHERE id=$1`, [id]);
    return rows[0]||null;
  }

  static async update(id, data) {
    const allowed = ['title','slug','summary','content','cover_image_url','cover_cloudinary_id',
      'author_name','district','tags','status'];
    const fields=[]; const params=[];
    for (const k of allowed) {
      if (data[k] !== undefined) { fields.push(`${k}=$${params.length+1}`); params.push(data[k]); }
    }
    if (data.status === 'published') {
      fields.push(`published_at=COALESCE(published_at,NOW())`);
    }
    if (!fields.length) return BlogPost.findById(id);
    fields.push('updated_at=NOW()');
    params.push(id);
    const { rows } = await query(
      `UPDATE blog_posts SET ${fields.join(',')} WHERE id=$${params.length} RETURNING *`, params
    );
    return rows[0]||null;
  }

  static async publish(id) {
    const { rows } = await query(
      `UPDATE blog_posts SET status='published', published_at=COALESCE(published_at,NOW()), updated_at=NOW()
       WHERE id=$1 RETURNING *`, [id]
    );
    return rows[0]||null;
  }

  static async incrementViews(id) {
    await query(`UPDATE blog_posts SET view_count=view_count+1 WHERE id=$1`, [id]);
  }

  static async delete(id) {
    const { rows } = await query(`DELETE FROM blog_posts WHERE id=$1 RETURNING id, cover_cloudinary_id`, [id]);
    return rows[0]||null;
  }

  static async recent(limit=5) {
    const { rows } = await query(
      `SELECT id, title, slug, summary, cover_image_url, author_name, author_type,
              tags, published_at, view_count
       FROM blog_posts WHERE status='published'
       ORDER BY published_at DESC NULLS LAST LIMIT $1`, [limit]
    );
    return rows;
  }

  static async countByAuthorType() {
    const { rows } = await query(
      `SELECT author_type, status, COUNT(*) AS count FROM blog_posts GROUP BY author_type, status`
    );
    return rows;
  }
}

module.exports = BlogPost;
