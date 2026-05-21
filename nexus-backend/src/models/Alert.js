const { query } = require('../config/database');

class Alert {
  static async create(data) {
    const { rows } = await query(
      `INSERT INTO alerts (unit_id, prediction_id, alert_type, severity, title, message, sms_recipients)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        data.unit_id, data.prediction_id || null,
        data.alert_type, data.severity, data.title, data.message,
        data.sms_recipients ? JSON.stringify(data.sms_recipients) : null,
      ]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await query(`
      SELECT a.*, su.name AS unit_name, su.district, su.location_name, su.is_school, su.school_name
      FROM alerts a
      JOIN sanitation_units su ON a.unit_id = su.id
      WHERE a.id = $1`, [id]
    );
    return rows[0] || null;
  }

  static async findAll({ status, severity, district, limit = 50 } = {}) {
    const conditions = [];
    const params = [];
    if (status) { conditions.push(`a.status = $${params.length + 1}`); params.push(status); }
    if (severity) { conditions.push(`a.severity = $${params.length + 1}`); params.push(severity); }
    if (district) { conditions.push(`su.district = $${params.length + 1}`); params.push(district); }
    params.push(limit);
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await query(`
      SELECT a.*, su.name AS unit_name, su.district, su.location_name, su.is_school
      FROM alerts a
      JOIN sanitation_units su ON a.unit_id = su.id
      ${where}
      ORDER BY a.created_at DESC LIMIT $${params.length}`, params
    );
    return rows;
  }

  static async activeForUnit(unit_id) {
    const { rows } = await query(
      `SELECT * FROM alerts WHERE unit_id = $1 AND status = 'active' ORDER BY created_at DESC`,
      [unit_id]
    );
    return rows;
  }

  static async acknowledge(id, userId) {
    const { rows } = await query(`
      UPDATE alerts SET status = 'acknowledged', acknowledged_by = $1,
        acknowledged_at = NOW(), updated_at = NOW()
      WHERE id = $2 RETURNING *`, [userId, id]
    );
    return rows[0];
  }

  static async resolve(id) {
    const { rows } = await query(`
      UPDATE alerts SET status = 'resolved', resolved_at = NOW(), updated_at = NOW()
      WHERE id = $1 RETURNING *`, [id]
    );
    return rows[0];
  }

  static async markSmsSent(id) {
    await query(`UPDATE alerts SET sms_sent = true, updated_at = NOW() WHERE id = $1`, [id]);
  }

  static async countActive() {
    const { rows } = await query(
      `SELECT severity, COUNT(*) AS count FROM alerts WHERE status = 'active' GROUP BY severity`
    );
    return rows;
  }

  static async recentByDistrict(hours = 24) {
    const { rows } = await query(`
      SELECT su.district, COUNT(*) AS total_alerts,
        SUM(CASE WHEN a.severity = 'critical' THEN 1 ELSE 0 END) AS critical,
        SUM(CASE WHEN a.severity = 'danger' THEN 1 ELSE 0 END) AS danger
      FROM alerts a
      JOIN sanitation_units su ON a.unit_id = su.id
      WHERE a.created_at >= NOW() - ($1 || ' hours')::INTERVAL
      GROUP BY su.district`, [hours]
    );
    return rows;
  }
}

module.exports = Alert;
