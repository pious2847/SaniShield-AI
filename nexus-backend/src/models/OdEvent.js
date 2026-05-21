const { query } = require('../config/database');

class OdEvent {
  static async create(data) {
    const { rows } = await query(
      `INSERT INTO od_events
        (district, community, latitude, longitude, near_school, school_name,
         distance_to_school_m, reported_by, reporter_name, reporter_phone,
         photo_url, description, severity)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING *`,
      [
        data.district, data.community||null, data.latitude||null, data.longitude||null,
        data.near_school||false, data.school_name||null, data.distance_to_school_m||null,
        data.reported_by||null, data.reporter_name||null, data.reporter_phone||null,
        data.photo_url||null, data.description||null, data.severity||'moderate',
      ]
    );
    return rows[0];
  }

  static async findAll({ district, near_school, status, limit=50 } = {}) {
    const conds=[]; const params=[];
    if (district) { conds.push(`district=$${params.length+1}`); params.push(district); }
    if (near_school!==undefined) { conds.push(`near_school=$${params.length+1}`); params.push(!!near_school); }
    if (status) { conds.push(`status=$${params.length+1}`); params.push(status); }
    params.push(limit);
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT * FROM od_events ${where} ORDER BY created_at DESC LIMIT $${params.length}`, params
    );
    return rows;
  }

  static async nearSchools(radiusM=500) {
    const { rows } = await query(
      `SELECT * FROM od_events WHERE near_school=true OR distance_to_school_m<=$1
       ORDER BY created_at DESC`, [radiusM]
    );
    return rows;
  }

  static async countRecent(hours=24) {
    const { rows } = await query(
      `SELECT district, COUNT(*) AS count, SUM(CASE WHEN near_school THEN 1 ELSE 0 END) AS near_school_count
       FROM od_events WHERE created_at>=NOW()-($1||' hours')::INTERVAL GROUP BY district`,
      [hours]
    );
    return rows;
  }

  static async resolve(id) {
    const { rows } = await query(
      `UPDATE od_events SET status='resolved' WHERE id=$1 RETURNING *`, [id]
    );
    return rows[0];
  }
}

module.exports = OdEvent;
