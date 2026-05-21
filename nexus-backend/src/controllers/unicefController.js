const SchoolSanitationMetric = require('../models/SchoolSanitationMetric');
const OdEvent = require('../models/OdEvent');
const { query } = require('../config/database');

async function addSchool(req, res, next) {
  try {
    const data = req.body;
    data.meets_unicef_standard = SchoolSanitationMetric.computeUnicefStandard(data);
    const result = await SchoolSanitationMetric.save(data);
    res.status(201).json({ success: true, data: result });
  } catch (e) { next(e); }
}

async function listSchools(req, res, next) {
  try {
    const { district, meets_unicef_standard, limit } = req.query;
    const data = await SchoolSanitationMetric.findAll({
      district: district || undefined,
      meets_unicef_standard: meets_unicef_standard !== undefined ? meets_unicef_standard === 'true' : undefined,
      limit: limit ? parseInt(limit) : 100,
    });
    res.json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
}

async function getSchool(req, res, next) {
  try {
    const data = await SchoolSanitationMetric.findById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'School not found' });
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function updateSchool(req, res, next) {
  try {
    if (Object.keys(req.body).some(k => ['student_count','girl_count','boy_count','total_toilets',
      'girl_toilets','boy_toilets','has_handwashing'].includes(k))) {
      const current = await SchoolSanitationMetric.findById(req.params.id);
      if (current) {
        const merged = { ...current, ...req.body };
        req.body.meets_unicef_standard = SchoolSanitationMetric.computeUnicefStandard(merged);
      }
    }
    const data = await SchoolSanitationMetric.update(req.params.id, req.body);
    if (!data) return res.status(404).json({ success: false, message: 'School not found' });
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function odEvents(req, res, next) {
  try {
    const { district, status, limit } = req.query;
    const data = await OdEvent.findAll({
      district: district || undefined,
      status: status || undefined,
      near_school: true,
      limit: limit ? parseInt(limit) : 50,
    });
    res.json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
}

async function reportOd(req, res, next) {
  try {
    const data = await OdEvent.create(req.body);
    res.status(201).json({ success: true, data });
  } catch (e) { next(e); }
}

async function compliance(req, res, next) {
  try {
    const data = await SchoolSanitationMetric.countByDistrict();
    const result = data.map(row => ({
      district: row.district,
      total_schools: parseInt(row.total_schools),
      compliant_schools: parseInt(row.compliant_schools),
      compliance_rate_pct: row.total_schools > 0
        ? Math.round((row.compliant_schools / row.total_schools) * 100) : 0,
      total_students: parseInt(row.total_students || 0),
      total_toilets: parseInt(row.total_toilets || 0),
      avg_health_score: parseFloat(row.avg_health_score || 0),
    }));
    res.json({ success: true, count: result.length, data: result });
  } catch (e) { next(e); }
}

async function stats(req, res, next) {
  try {
    const [schoolRows, odRows, districtRows] = await Promise.all([
      query(`SELECT COUNT(*) AS total_schools, SUM(student_count) AS total_students,
              SUM(total_toilets) AS total_toilets,
              SUM(CASE WHEN meets_unicef_standard THEN 1 ELSE 0 END) AS compliant
             FROM school_sanitation_metrics`),
      query(`SELECT COUNT(*) AS total_od_24h FROM od_events WHERE created_at>=NOW()-INTERVAL '24 hours'`),
      query(`SELECT COUNT(*) AS near_school_od FROM od_events WHERE near_school=true AND created_at>=NOW()-INTERVAL '7 days'`),
    ]);

    const s = schoolRows.rows[0];
    res.json({
      success: true,
      data: {
        total_schools: parseInt(s.total_schools || 0),
        total_students: parseInt(s.total_students || 0),
        total_toilets: parseInt(s.total_toilets || 0),
        compliant_schools: parseInt(s.compliant || 0),
        compliance_rate_pct: s.total_schools > 0
          ? Math.round((s.compliant / s.total_schools) * 100) : 0,
        od_events_24h: parseInt(odRows.rows[0]?.total_od_24h || 0),
        od_near_school_7d: parseInt(districtRows.rows[0]?.near_school_od || 0),
        students_per_toilet_avg: s.total_toilets > 0
          ? Math.round(s.total_students / s.total_toilets) : null,
        unicef_standard: '1 toilet per 50 students, separate facilities, handwashing',
      },
    });
  } catch (e) { next(e); }
}

async function mhmCompliance(req, res, next) {
  try {
    const { rows } = await query(`
      SELECT
        district,
        COUNT(*) AS total_schools,
        SUM(CASE WHEN mhm_room_count > 0 THEN 1 ELSE 0 END) AS has_mhm_room,
        SUM(CASE WHEN mhm_has_water THEN 1 ELSE 0 END) AS has_water,
        SUM(CASE WHEN mhm_has_disposal THEN 1 ELSE 0 END) AS has_disposal,
        SUM(CASE WHEN mhm_is_functional THEN 1 ELSE 0 END) AS fully_functional,
        ROUND(100.0 * SUM(CASE WHEN mhm_is_functional THEN 1 ELSE 0 END) / NULLIF(COUNT(*),0), 1) AS mhm_compliance_rate_pct
      FROM school_sanitation_metrics
      GROUP BY district ORDER BY district
    `);
    res.json({ success: true, count: rows.length, data: rows });
  } catch (e) { next(e); }
}

async function updateMhm(req, res, next) {
  try {
    const mhmFields = ['mhm_room_count','mhm_has_water','mhm_has_disposal','mhm_is_functional','mhm_notes'];
    const fields = Object.keys(req.body).filter(k => mhmFields.includes(k));
    if (!fields.length) return res.status(400).json({ success: false, message: 'No valid MHM fields provided' });
    const set = fields.map((f,i) => `${f}=$${i+1}`).join(', ');
    const { rows } = await query(
      `UPDATE school_sanitation_metrics SET ${set}, updated_at=NOW() WHERE id=$${fields.length+1} RETURNING *`,
      [...fields.map(f => req.body[f]), req.params.id]
    );
    if (!rows.length) return res.status(404).json({ success: false, message: 'School not found' });
    res.json({ success: true, data: rows[0] });
  } catch (e) { next(e); }
}

module.exports = { addSchool, listSchools, getSchool, updateSchool, odEvents, reportOd, compliance, stats, mhmCompliance, updateMhm };
