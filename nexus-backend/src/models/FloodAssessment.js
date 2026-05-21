const { query } = require('../config/database');

class FloodAssessment {
  static async create(data) {
    const { rows } = await query(
      `INSERT INTO flood_assessments
        (district, trigger_type, trigger_rainfall_mm, trigger_threshold_mm, ai_assessment)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [
        data.district,
        data.trigger_type || 'auto',
        data.trigger_rainfall_mm || null,
        data.trigger_threshold_mm || 25,
        data.ai_assessment || null,
      ]
    );
    return rows[0];
  }

  static async findAll({ district, status, limit = 50 } = {}) {
    const conds = []; const params = [];
    if (district) { conds.push(`district=$${params.length+1}`); params.push(district); }
    if (status) { conds.push(`status=$${params.length+1}`); params.push(status); }
    params.push(limit);
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT * FROM flood_assessments ${where} ORDER BY started_at DESC LIMIT $${params.length}`,
      params
    );
    return rows;
  }

  static async findById(id) {
    const { rows } = await query('SELECT * FROM flood_assessments WHERE id=$1', [id]);
    return rows[0] || null;
  }

  static async updateStatus(id, status) {
    const extra = status === 'completed' ? ', completed_at=NOW()' : '';
    const { rows } = await query(
      `UPDATE flood_assessments SET status=$1${extra} WHERE id=$2 RETURNING *`,
      [status, id]
    );
    return rows[0] || null;
  }

  static async addAssetCheck(data) {
    const { rows } = await query(
      `INSERT INTO asset_flood_checks
        (assessment_id, asset_type, asset_id, asset_name, district, latitude, longitude)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [
        data.assessment_id, data.asset_type, data.asset_id,
        data.asset_name || null, data.district || null,
        data.latitude || null, data.longitude || null,
      ]
    );
    return rows[0];
  }

  static async updateAssetCheck(checkId, data) {
    const allowed = ['status','damage_level','notes','photo_url','cloudinary_id','inspected_by','inspected_at'];
    const fields = Object.keys(data).filter(k => allowed.includes(k));
    if (!fields.length) return this.getAssetCheckById(checkId);
    const extras = [];
    if (data.status && data.status !== 'pending') extras.push('inspected_at=NOW()');
    const set = [...fields.map((f,i) => `${f}=$${i+1}`), ...extras].join(', ');
    const { rows } = await query(
      `UPDATE asset_flood_checks SET ${set} WHERE id=$${fields.length+1} RETURNING *`,
      [...fields.map(f => data[f]), checkId]
    );
    return rows[0] || null;
  }

  static async getAssetChecks(assessmentId) {
    const { rows } = await query(
      'SELECT * FROM asset_flood_checks WHERE assessment_id=$1 ORDER BY created_at',
      [assessmentId]
    );
    return rows;
  }

  static async getAssetCheckById(id) {
    const { rows } = await query('SELECT * FROM asset_flood_checks WHERE id=$1', [id]);
    return rows[0] || null;
  }

  static async getActiveForDistrict(district) {
    const { rows } = await query(
      `SELECT * FROM flood_assessments
       WHERE district=$1 AND status IN ('active','recovery')
       ORDER BY started_at DESC LIMIT 1`,
      [district]
    );
    return rows[0] || null;
  }

  static async updateCounts(id) {
    await query(
      `UPDATE flood_assessments fa SET
        total_assets_flagged = (SELECT COUNT(*) FROM asset_flood_checks WHERE assessment_id=fa.id),
        assets_inspected     = (SELECT COUNT(*) FROM asset_flood_checks WHERE assessment_id=fa.id AND status!='pending'),
        assets_damaged       = (SELECT COUNT(*) FROM asset_flood_checks WHERE assessment_id=fa.id AND damage_level IN ('minor','major')),
        assets_destroyed     = (SELECT COUNT(*) FROM asset_flood_checks WHERE assessment_id=fa.id AND damage_level='destroyed')
       WHERE fa.id=$1`,
      [id]
    );
  }
}

module.exports = FloodAssessment;
