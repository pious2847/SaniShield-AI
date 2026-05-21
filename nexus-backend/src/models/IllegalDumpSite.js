const { query } = require('../config/database');

class IllegalDumpSite {
  static async create(data) {
    const { rows } = await query(
      `INSERT INTO illegal_dump_sites
        (district, community, latitude, longitude, severity, waste_types,
         estimated_volume_m3, photo_url, description, reporter_name, reporter_phone, reported_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
      [
        data.district, data.community||null, data.latitude, data.longitude,
        data.severity||'moderate', data.waste_types||null, data.estimated_volume_m3||null,
        data.photo_url||null, data.description||null, data.reporter_name||null,
        data.reporter_phone||null, data.reported_by||null,
      ]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await query(
      `SELECT d.*, n.name AS assigned_ngo_name FROM illegal_dump_sites d
       LEFT JOIN ngos n ON d.assigned_ngo_id=n.id WHERE d.id=$1`, [id]
    );
    return rows[0]||null;
  }

  static async findAll({ district, status, severity, limit=100 } = {}) {
    const conds=[]; const params=[];
    if (district) { conds.push(`d.district=$${params.length+1}`); params.push(district); }
    if (status) { conds.push(`d.status=$${params.length+1}`); params.push(status); }
    if (severity) { conds.push(`d.severity=$${params.length+1}`); params.push(severity); }
    params.push(limit);
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT d.*, n.name AS assigned_ngo_name FROM illegal_dump_sites d
       LEFT JOIN ngos n ON d.assigned_ngo_id=n.id
       ${where} ORDER BY d.created_at DESC LIMIT $${params.length}`, params
    );
    return rows;
  }

  static async updateStatus(id, status, assignedNgoId=null, assignedGathererId=null) {
    const { rows } = await query(
      `UPDATE illegal_dump_sites SET status=$1, assigned_ngo_id=$2, assigned_gatherer_id=$3,
       resolved_at=CASE WHEN $1='resolved' THEN NOW() ELSE resolved_at END,
       updated_at=NOW() WHERE id=$4 RETURNING *`,
      [status, assignedNgoId, assignedGathererId, id]
    );
    return rows[0];
  }

  static async setAiAnalysis(id, analysis) {
    await query(`UPDATE illegal_dump_sites SET ai_analysis=$1, updated_at=NOW() WHERE id=$2`,
      [JSON.stringify(analysis), id]);
  }

  static async countByDistrict() {
    const { rows } = await query(`
      SELECT district, COUNT(*) AS total,
        SUM(CASE WHEN status='open' THEN 1 ELSE 0 END) AS open_count,
        SUM(CASE WHEN severity='critical' THEN 1 ELSE 0 END) AS critical_count
      FROM illegal_dump_sites GROUP BY district ORDER BY district
    `);
    return rows;
  }
}

module.exports = IllegalDumpSite;
