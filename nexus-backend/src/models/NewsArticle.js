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

  static async findAll({ is_flood_related, is_sanitation_related, limit=20, offset=0 } = {}) {
    const conds=[]; const params=[];
    if (is_flood_related!==undefined) { conds.push(`is_flood_related=$${params.length+1}`); params.push(!!is_flood_related); }
    if (is_sanitation_related!==undefined) { conds.push(`is_sanitation_related=$${params.length+1}`); params.push(!!is_sanitation_related); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    params.push(limit); params.push(offset);
    const { rows } = await query(
      `SELECT * FROM news_articles ${where} ORDER BY published_at DESC NULLS LAST LIMIT $${params.length-1} OFFSET $${params.length}`, params
    );
    return rows;
  }

  static async count({ is_flood_related, is_sanitation_related } = {}) {
    const conds=[]; const params=[];
    if (is_flood_related!==undefined) { conds.push(`is_flood_related=$${params.length+1}`); params.push(!!is_flood_related); }
    if (is_sanitation_related!==undefined) { conds.push(`is_sanitation_related=$${params.length+1}`); params.push(!!is_sanitation_related); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await query(`SELECT COUNT(*) AS c FROM news_articles ${where}`, params);
    return parseInt(rows[0].c);
  }

  static async findById(id) {
    const { rows } = await query('SELECT * FROM news_articles WHERE id=$1', [id]);
    return rows[0]||null;
  }

  static async exists(sourceUrl) {
    const { rows } = await query('SELECT id FROM news_articles WHERE source_url=$1', [sourceUrl]);
    return rows.length > 0;
  }

  static async updateAi(id, { sentiment, districts, eventType, summary, tags, isFlood, isSanitation }) {
    await query(
      `UPDATE news_articles SET
        ai_sentiment=$1, ai_districts=$2, ai_event_type=$3,
        ai_summary=$4, ai_tags=$5,
        is_flood_related=COALESCE($6, is_flood_related),
        is_sanitation_related=COALESCE($7, is_sanitation_related),
        ai_processed=true
       WHERE id=$8`,
      [sentiment||'neutral', districts||null, eventType||null,
       summary||null, tags||null, isFlood, isSanitation, id]
    );
  }

  static async findUnprocessed(limit=10) {
    const { rows } = await query(
      `SELECT id, headline, summary, source_name, is_flood_related, is_sanitation_related
       FROM news_articles WHERE ai_processed=false OR ai_processed IS NULL
       ORDER BY published_at DESC NULLS LAST LIMIT $1`, [limit]
    );
    return rows;
  }

  static async recent(limit=5) {
    const { rows } = await query(
      `SELECT id, headline, summary, source_name, source_url, published_at,
              ai_summary, ai_tags, ai_sentiment, ai_districts, ai_event_type,
              is_flood_related, is_sanitation_related, ai_processed
       FROM news_articles ORDER BY published_at DESC NULLS LAST LIMIT $1`, [limit]
    );
    return rows;
  }
}

module.exports = NewsArticle;
