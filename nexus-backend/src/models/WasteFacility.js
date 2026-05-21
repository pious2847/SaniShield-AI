const { query } = require('../config/database');

class WasteFacility {
  static async create(data) {
    const { rows } = await query(
      `INSERT INTO waste_facilities
        (name, facility_type, operator, district, community, latitude, longitude,
         capacity_m3, current_load_pct, status, contact_name, contact_phone,
         operating_hours, accepts_waste_types, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [
        data.name, data.facility_type, data.operator||null, data.district, data.community||null,
        data.latitude, data.longitude, data.capacity_m3||null, data.current_load_pct||0,
        data.status||'operational', data.contact_name||null, data.contact_phone||null,
        data.operating_hours||null,
        data.accepts_waste_types ? JSON.stringify(data.accepts_waste_types) : null,
        data.notes||null,
      ]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await query('SELECT * FROM waste_facilities WHERE id=$1', [id]);
    return rows[0]||null;
  }

  static async findAll({ district, facility_type, status } = {}) {
    const conds=[]; const params=[];
    if (district) { conds.push(`district=$${params.length+1}`); params.push(district); }
    if (facility_type) { conds.push(`facility_type=$${params.length+1}`); params.push(facility_type); }
    if (status) { conds.push(`status=$${params.length+1}`); params.push(status); }
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await query(`SELECT * FROM waste_facilities ${where} ORDER BY district, name`, params);
    return rows;
  }

  static async update(id, data) {
    const allowed = ['current_load_pct','status','contact_name','contact_phone','notes','capacity_m3'];
    const fields = Object.keys(data).filter(k=>allowed.includes(k));
    if (!fields.length) return this.findById(id);
    const set = fields.map((f,i)=>`${f}=$${i+1}`).join(', ');
    const { rows } = await query(
      `UPDATE waste_facilities SET ${set}, updated_at=NOW() WHERE id=$${fields.length+1} RETURNING *`,
      [...fields.map(f=>data[f]), id]
    );
    return rows[0];
  }
}

module.exports = WasteFacility;
