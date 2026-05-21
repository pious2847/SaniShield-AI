const { query } = require('../config/database');

class CommunityHealthScore {
  static async save(data) {
    const { rows } = await query(
      `INSERT INTO community_health_scores
        (district, community, score, components, toilet_count, avg_fill_level,
         active_alerts, open_dump_sites, flood_risk_avg, od_reports_24h, ai_narrative)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        data.district, data.community||null, data.score,
        JSON.stringify(data.components), data.toilet_count||0,
        data.avg_fill_level||0, data.active_alerts||0, data.open_dump_sites||0,
        data.flood_risk_avg||0, data.od_reports_24h||0, data.ai_narrative||null,
      ]
    );
    return rows[0];
  }

  static async latestAll() {
    const { rows } = await query(`
      SELECT DISTINCT ON (district) * FROM community_health_scores
      WHERE community IS NULL ORDER BY district, computed_at DESC
    `);
    return rows;
  }

  static async latestForDistrict(district) {
    const { rows } = await query(
      `SELECT * FROM community_health_scores WHERE district=$1 AND community IS NULL
       ORDER BY computed_at DESC LIMIT 1`, [district]
    );
    return rows[0]||null;
  }

  static async historyForDistrict(district, limit=30) {
    const { rows } = await query(
      `SELECT * FROM community_health_scores WHERE district=$1 AND community IS NULL
       ORDER BY computed_at DESC LIMIT $2`, [district, limit]
    );
    return rows;
  }

  static parse(row) {
    if (!row) return null;
    return {
      ...row,
      components: typeof row.components === 'string' ? JSON.parse(row.components) : row.components,
    };
  }
}

module.exports = CommunityHealthScore;
