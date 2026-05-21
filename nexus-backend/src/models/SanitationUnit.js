const { query } = require('../config/database');

class SanitationUnit {
  static async create(data) {
    const { rows } = await query(
      `INSERT INTO sanitation_units
        (name, unit_type, location_name, district, latitude, longitude, capacity,
         is_school, school_name, student_population, elevation_meters, flood_zone_risk,
         is_solar_powered, status, installed_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15) RETURNING *`,
      [
        data.name, data.unit_type, data.location_name, data.district,
        data.latitude, data.longitude, data.capacity || 1,
        data.is_school || false, data.school_name || null,
        data.student_population || null, data.elevation_meters || null,
        data.flood_zone_risk || 'low', data.is_solar_powered || false,
        data.status || 'operational', data.installed_at || null,
      ]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await query('SELECT * FROM sanitation_units WHERE id = $1', [id]);
    return rows[0] || null;
  }

  static async findAll({ district, status, flood_zone_risk, is_school } = {}) {
    const conditions = [];
    const params = [];
    if (district) { conditions.push(`district = $${params.length + 1}`); params.push(district); }
    if (status) { conditions.push(`status = $${params.length + 1}`); params.push(status); }
    if (flood_zone_risk) { conditions.push(`flood_zone_risk = $${params.length + 1}`); params.push(flood_zone_risk); }
    if (is_school !== undefined) { conditions.push(`is_school = $${params.length + 1}`); params.push(!!is_school); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const { rows } = await query(`SELECT * FROM sanitation_units ${where} ORDER BY created_at DESC`, params);
    return rows;
  }

  static async findHighRisk() {
    const { rows } = await query(`
      SELECT * FROM sanitation_units
      WHERE flood_zone_risk IN ('high','critical') OR status = 'critical'
      ORDER BY flood_zone_risk DESC, status DESC
    `);
    return rows;
  }

  static async update(id, data) {
    const allowed = ['name', 'status', 'flood_zone_risk', 'last_maintained', 'unit_type',
                     'location_name', 'is_solar_powered', 'elevation_meters'];
    const fields = Object.keys(data).filter(k => allowed.includes(k));
    if (!fields.length) return this.findById(id);
    const set = fields.map((f, i) => `${f} = $${i + 1}`).join(', ');
    const { rows } = await query(
      `UPDATE sanitation_units SET ${set}, updated_at = NOW() WHERE id = $${fields.length + 1} RETURNING *`,
      [...fields.map(f => data[f]), id]
    );
    return rows[0];
  }

  static async countByDistrict() {
    const { rows } = await query(`
      SELECT district,
        COUNT(*) AS total,
        SUM(CASE WHEN status = 'critical' THEN 1 ELSE 0 END) AS critical_count,
        SUM(CASE WHEN flood_zone_risk IN ('high','critical') THEN 1 ELSE 0 END) AS high_risk_count,
        SUM(CASE WHEN is_school THEN 1 ELSE 0 END) AS school_units
      FROM sanitation_units GROUP BY district ORDER BY district
    `);
    return rows;
  }
}

module.exports = SanitationUnit;
