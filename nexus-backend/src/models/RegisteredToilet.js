const { query } = require('../config/database');

class RegisteredToilet {
  static async create(data) {
    const { rows } = await query(
      `INSERT INTO registered_toilets
        (owner_name, owner_phone, toilet_type, ownership_type, location_name, district,
         community, latitude, longitude, condition, num_users, has_water, has_handwashing, photo_url)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [
        data.owner_name, data.owner_phone, data.toilet_type, data.ownership_type,
        data.location_name, data.district, data.community || null,
        data.latitude, data.longitude, data.condition || 'unknown',
        data.num_users || 1, data.has_water || false, data.has_handwashing || false,
        data.photo_url || null,
      ]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await query('SELECT * FROM registered_toilets WHERE id = $1', [id]);
    return rows[0] || null;
  }

  static async findAll({ district, ownership_type, condition, is_verified, limit = 200 } = {}) {
    const conds = []; const params = [];
    if (district) { conds.push(`district = $${params.length+1}`); params.push(district); }
    if (ownership_type) { conds.push(`ownership_type = $${params.length+1}`); params.push(ownership_type); }
    if (condition) { conds.push(`condition = $${params.length+1}`); params.push(condition); }
    if (is_verified !== undefined) { conds.push(`is_verified = $${params.length+1}`); params.push(!!is_verified); }
    params.push(limit);
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await query(`SELECT * FROM registered_toilets ${where} ORDER BY registered_at DESC LIMIT $${params.length}`, params);
    return rows;
  }

  static async verify(id, userId) {
    const { rows } = await query(
      `UPDATE registered_toilets SET is_verified=true, verified_by=$1, updated_at=NOW() WHERE id=$2 RETURNING *`,
      [userId, id]
    );
    return rows[0];
  }

  static async update(id, data) {
    const allowed = ['condition','has_water','has_handwashing','num_users','photo_url','location_name'];
    const fields = Object.keys(data).filter(k => allowed.includes(k));
    if (!fields.length) return this.findById(id);
    const set = fields.map((f,i) => `${f}=$${i+1}`).join(', ');
    const { rows } = await query(
      `UPDATE registered_toilets SET ${set}, updated_at=NOW() WHERE id=$${fields.length+1} RETURNING *`,
      [...fields.map(f=>data[f]), id]
    );
    return rows[0];
  }

  static async countByDistrict() {
    const { rows } = await query(`
      SELECT district,
        COUNT(*) AS total,
        SUM(CASE WHEN condition='good' THEN 1 ELSE 0 END) AS good,
        SUM(CASE WHEN condition='poor' OR condition='non_functional' THEN 1 ELSE 0 END) AS poor,
        SUM(CASE WHEN ownership_type='public' THEN 1 ELSE 0 END) AS public_count,
        SUM(CASE WHEN ownership_type='household' THEN 1 ELSE 0 END) AS household_count
      FROM registered_toilets GROUP BY district ORDER BY district
    `);
    return rows;
  }
}

module.exports = RegisteredToilet;
