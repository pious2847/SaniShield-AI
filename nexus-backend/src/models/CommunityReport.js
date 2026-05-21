const { query } = require('../config/database');

class CommunityReport {
  static async create(data) {
    const { rows } = await query(
      `INSERT INTO community_reports
        (unit_id, reported_by, reporter_name, reporter_phone, report_type,
         description, severity, latitude, longitude, photo_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [
        data.unit_id || null, data.reported_by || null,
        data.reporter_name || null, data.reporter_phone || null,
        data.report_type, data.description, data.severity || 'moderate',
        data.latitude || null, data.longitude || null, data.photo_url || null,
      ]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await query(`
      SELECT cr.*, su.name AS unit_name, su.district
      FROM community_reports cr
      LEFT JOIN sanitation_units su ON cr.unit_id = su.id
      WHERE cr.id = $1`, [id]
    );
    return rows[0] || null;
  }

  static async findAll({ status, report_type, district, limit = 50 } = {}) {
    const conditions = [];
    const params = [];
    if (status) { conditions.push(`cr.status = $${params.length + 1}`); params.push(status); }
    if (report_type) { conditions.push(`cr.report_type = $${params.length + 1}`); params.push(report_type); }
    if (district) { conditions.push(`su.district = $${params.length + 1}`); params.push(district); }
    params.push(limit);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await query(`
      SELECT cr.*, su.name AS unit_name, su.district
      FROM community_reports cr
      LEFT JOIN sanitation_units su ON cr.unit_id = su.id
      ${where}
      ORDER BY cr.created_at DESC LIMIT $${params.length}`, params
    );
    return rows;
  }

  static async updateStatus(id, status, assignedTo = null) {
    const { rows } = await query(`
      UPDATE community_reports
      SET status = $1, assigned_to = $2,
          resolved_at = CASE WHEN $1 = 'resolved' THEN NOW() ELSE resolved_at END,
          updated_at = NOW()
      WHERE id = $3 RETURNING *`, [status, assignedTo, id]
    );
    return rows[0];
  }

  static async updateAiAnalysis(id, analysis) {
    await query(
      `UPDATE community_reports SET ai_analysis = $1, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(analysis), id]
    );
  }

  static async recentByDistrict(hours = 48) {
    const { rows } = await query(`
      SELECT su.district, COUNT(*) AS total,
        SUM(CASE WHEN cr.severity = 'critical' THEN 1 ELSE 0 END) AS critical
      FROM community_reports cr
      LEFT JOIN sanitation_units su ON cr.unit_id = su.id
      WHERE cr.created_at >= NOW() - ($1 || ' hours')::INTERVAL
      GROUP BY su.district`, [hours]
    );
    return rows;
  }
}

module.exports = CommunityReport;
