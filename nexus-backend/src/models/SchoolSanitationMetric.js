const { query } = require('../config/database');

class SchoolSanitationMetric {
  static async save(data) {
    const { rows } = await query(
      `INSERT INTO school_sanitation_metrics
        (school_name, district, community, latitude, longitude,
         student_count, girl_count, boy_count,
         total_toilets, girl_toilets, boy_toilets,
         has_handwashing, has_menstrual_hygiene, meets_unicef_standard,
         sanitation_unit_id, health_score, last_assessed)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17) RETURNING *`,
      [
        data.school_name, data.district, data.community||null,
        data.latitude||null, data.longitude||null,
        data.student_count||0, data.girl_count||0, data.boy_count||0,
        data.total_toilets||0, data.girl_toilets||0, data.boy_toilets||0,
        data.has_handwashing||false, data.has_menstrual_hygiene||false,
        data.meets_unicef_standard||false,
        data.sanitation_unit_id||null, data.health_score||null,
        data.last_assessed||new Date().toISOString(),
      ]
    );
    return rows[0];
  }

  static async findAll({ district, meets_unicef_standard, limit=100 } = {}) {
    const conds=[]; const params=[];
    if (district) { conds.push(`district=$${params.length+1}`); params.push(district); }
    if (meets_unicef_standard !== undefined) {
      conds.push(`meets_unicef_standard=$${params.length+1}`);
      params.push(!!meets_unicef_standard);
    }
    params.push(limit);
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await query(
      `SELECT * FROM school_sanitation_metrics ${where} ORDER BY school_name ASC LIMIT $${params.length}`,
      params
    );
    return rows;
  }

  static async findById(id) {
    const { rows } = await query(
      'SELECT * FROM school_sanitation_metrics WHERE id=$1', [id]
    );
    return rows[0]||null;
  }

  static async update(id, data) {
    const fields = [];
    const params = [];
    const allowed = [
      'school_name','district','community','latitude','longitude',
      'student_count','girl_count','boy_count','total_toilets','girl_toilets',
      'boy_toilets','has_handwashing','has_menstrual_hygiene','meets_unicef_standard',
      'sanitation_unit_id','health_score','last_assessed',
    ];
    for (const key of allowed) {
      if (data[key] !== undefined) {
        fields.push(`${key}=$${params.length+1}`);
        params.push(data[key]);
      }
    }
    if (!fields.length) return SchoolSanitationMetric.findById(id);
    fields.push(`updated_at=NOW()`);
    params.push(id);
    const { rows } = await query(
      `UPDATE school_sanitation_metrics SET ${fields.join(',')} WHERE id=$${params.length} RETURNING *`,
      params
    );
    return rows[0]||null;
  }

  static async countByDistrict() {
    const { rows } = await query(`
      SELECT district,
        COUNT(*) AS total_schools,
        SUM(student_count) AS total_students,
        SUM(total_toilets) AS total_toilets,
        SUM(CASE WHEN meets_unicef_standard THEN 1 ELSE 0 END) AS compliant_schools,
        ROUND(AVG(health_score)::numeric, 1) AS avg_health_score
      FROM school_sanitation_metrics
      GROUP BY district ORDER BY district
    `);
    return rows;
  }

  static async belowStandard(district) {
    const params = [];
    let where = `WHERE meets_unicef_standard=false`;
    if (district) { where += ` AND district=$1`; params.push(district); }
    const { rows } = await query(
      `SELECT * FROM school_sanitation_metrics ${where} ORDER BY health_score ASC NULLS LAST`,
      params
    );
    return rows;
  }

  static async linkToUnit(schoolId, unitId) {
    const { rows } = await query(
      `UPDATE school_sanitation_metrics SET sanitation_unit_id=$1, updated_at=NOW()
       WHERE id=$2 RETURNING *`,
      [unitId, schoolId]
    );
    return rows[0]||null;
  }

  static computeUnicefStandard(data) {
    if (!data.student_count || data.student_count === 0) return false;
    const studentToiletRatio = data.student_count / Math.max(data.total_toilets||1, 1);
    const girlToiletRatio = (data.girl_count||0) / Math.max(data.girl_toilets||1, 1);
    return (
      studentToiletRatio <= 50 &&
      girlToiletRatio <= 50 &&
      (data.has_handwashing === true) &&
      (data.total_toilets >= 2)
    );
  }
}

module.exports = SchoolSanitationMetric;
