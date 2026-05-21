const { query } = require('../config/database');

class NewsArticle {
  static async create(data) {
    try {
      const { rows } = await query(
        `INSERT INTO news_articles
          (headline, summary, full_content, source_name, source_url, published_at,
           categories, districts_mentioned, relevance_score, ai_summary, ai_tags,
           is_flood_related, is_sanitation_related)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
        [
          data.headline, data.summary||null, data.full_content||null,
          data.source_name, data.source_url, data.published_at||null,
          data.categories||null, data.districts_mentioned||null,
          data.relevance_score||0, data.ai_summary||null, data.ai_tags||null,
          data.is_flood_related||false, data.is_sanitation_related||false,
        ]
      );
      return rows[0];
    } catch (err) {
      if (err.code === '23505') return null; // duplicate source_url
      throw err;
    }
  }

  static async findAll({ is_flood_related, is_sanitation_related, limit=20 } = {}) {
    const conds=[]; const params=[];
    if (is_flood_related!==undefined) { conds.push(`is_flood_related=$${params.length+1}`); params.push(!!is_flood_related); }
    if (is_sanitation_related!==undefined) { conds.push(`is_sanitation_related=$${params.length+1}`); params.push(!!is_sanitation_related); }
    params.push(limit);
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT * FROM news_articles ${where} ORDER BY published_at DESC NULLS LAST LIMIT $${params.length}`, params
    );
    return rows;
  }

  static async findById(id) {
    const { rows } = await query('SELECT * FROM news_articles WHERE id=$1', [id]);
    return rows[0]||null;
  }

  static async exists(sourceUrl) {
    const { rows } = await query('SELECT id FROM news_articles WHERE source_url=$1', [sourceUrl]);
    return rows.length > 0;
  }

  static async updateAi(id, aiSummary, aiTags, isFlood, isSanitation) {
    await query(
      `UPDATE news_articles SET ai_summary=$1, ai_tags=$2, is_flood_related=$3, is_sanitation_related=$4 WHERE id=$5`,
      [aiSummary, aiTags, isFlood, isSanitation, id]
    );
  }

  static async recent(limit=5) {
    const { rows } = await query(
      `SELECT headline, summary, source_name, published_at, ai_summary, ai_tags, is_flood_related
       FROM news_articles ORDER BY published_at DESC NULLS LAST LIMIT $1`, [limit]
    );
    return rows;
  }
}

module.exports = NewsArticle;
