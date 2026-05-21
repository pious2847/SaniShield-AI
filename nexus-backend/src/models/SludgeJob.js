const { query } = require('../config/database');

class SludgeJob {
  static async create(data) {
    const { rows } = await query(
      `INSERT INTO sludge_jobs
        (toilet_id, gatherer_id, facility_id, district, community, status,
         waste_type, pickup_lat, pickup_lon, created_by, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        data.toilet_id || null,
        data.gatherer_id || null,
        data.facility_id || null,
        data.district,
        data.community || null,
        data.gatherer_id ? 'assigned' : 'pending',
        data.waste_type || 'fecal_sludge',
        data.pickup_lat || null,
        data.pickup_lon || null,
        data.created_by || null,
        data.notes || null,
      ]
    );
    return rows[0];
  }

  static async findAll({ district, gatherer_id, facility_id, status, limit = 100 } = {}) {
    const conds = []; const params = [];
    if (district) { conds.push(`district=$${params.length+1}`); params.push(district); }
    if (gatherer_id) { conds.push(`gatherer_id=$${params.length+1}`); params.push(gatherer_id); }
    if (facility_id) { conds.push(`facility_id=$${params.length+1}`); params.push(facility_id); }
    if (status) { conds.push(`status=$${params.length+1}`); params.push(status); }
    params.push(limit);
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT * FROM sludge_jobs ${where} ORDER BY created_at DESC LIMIT $${params.length}`,
      params
    );
    return rows;
  }

  static async findById(id) {
    const { rows } = await query('SELECT * FROM sludge_jobs WHERE id=$1', [id]);
    return rows[0] || null;
  }

  static async updateStatus(id, status, extra = {}) {
    const allowed = ['gatherer_id','facility_id','volume_litres','waste_type',
      'pickup_lat','pickup_lon','pickup_at','pickup_photo_url','pickup_cloudinary_id',
      'delivery_lat','delivery_lon','delivered_at','delivery_photo_url','delivery_cloudinary_id','notes'];
    const fields = ['status', ...Object.keys(extra).filter(k => allowed.includes(k))];
    const values = [status, ...fields.slice(1).map(f => extra[f])];
    const set = fields.map((f,i) => `${f}=$${i+1}`).join(', ');
    const { rows } = await query(
      `UPDATE sludge_jobs SET ${set}, updated_at=NOW() WHERE id=$${fields.length+1} RETURNING *`,
      [...values, id]
    );
    return rows[0] || null;
  }

  static async confirmTreatment(id, notes) {
    const { rows } = await query(
      `UPDATE sludge_jobs
       SET status='completed', chain_complete=true,
           treatment_confirmed_at=NOW(), treatment_notes=$1, updated_at=NOW()
       WHERE id=$2 RETURNING *`,
      [notes || null, id]
    );
    return rows[0] || null;
  }

  static async chainStats(district) {
    let sql = `
      SELECT
        district,
        COUNT(*) AS total_jobs,
        SUM(CASE WHEN chain_complete THEN 1 ELSE 0 END) AS completed_jobs,
        SUM(CASE WHEN status='cancelled' THEN 1 ELSE 0 END) AS cancelled_jobs,
        ROUND(100.0 * SUM(CASE WHEN chain_complete THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0), 1) AS completion_rate_pct
      FROM sludge_jobs`;
    const params = [];
    if (district) { sql += ` WHERE district=$1`; params.push(district); }
    sql += ' GROUP BY district ORDER BY district';
    const { rows } = await query(sql, params);
    return rows;
  }

  static async recentByDistrict(hours = 24) {
    const { rows } = await query(
      `SELECT * FROM sludge_jobs
       WHERE created_at >= NOW() - ($1 || ' hours')::INTERVAL
       ORDER BY created_at DESC`,
      [hours]
    );
    return rows;
  }
}

module.exports = SludgeJob;
