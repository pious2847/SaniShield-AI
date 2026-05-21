const PDFDocument = require('pdfkit');
const { query } = require('../config/database');
const { DISTRICTS } = require('./healthScoreService');

const NEXUS_GREEN = '#2e7d32';
const NEXUS_BLUE  = '#0d47a1';

async function _districtData(district) {
  const [hsRows, assetRows, alertRows, schoolRows, dumpRows, sludgeRows] = await Promise.allSettled([
    query(`SELECT score, ai_narrative FROM community_health_scores WHERE district=$1 ORDER BY computed_at DESC LIMIT 1`, [district]),
    query(`SELECT
      (SELECT COUNT(*) FROM registered_toilets WHERE district=$1) AS toilets,
      (SELECT COUNT(*) FROM sanitation_units WHERE district=$1) AS units,
      (SELECT COUNT(*) FROM waste_facilities WHERE district=$1) AS facilities,
      (SELECT COUNT(*) FROM gatherers WHERE district=$1 AND is_active=true) AS gatherers`, [district]),
    query(`SELECT COUNT(*) AS cnt24h FROM alerts a JOIN sanitation_units su ON a.unit_id=su.id WHERE su.district=$1 AND a.created_at>=NOW()-INTERVAL '24 hours'`, [district]),
    query(`SELECT COUNT(*) AS total, SUM(CASE WHEN meets_unicef_standard THEN 1 ELSE 0 END) AS compliant FROM school_sanitation_metrics WHERE district=$1`, [district]),
    query(`SELECT COUNT(*) AS open_dumps FROM illegal_dump_sites WHERE district=$1 AND status='open'`, [district]),
    query(`SELECT COUNT(*) AS total_jobs, SUM(CASE WHEN chain_complete THEN 1 ELSE 0 END) AS completed FROM sludge_jobs WHERE district=$1`, [district]),
  ]);

  return {
    health: hsRows.status === 'fulfilled' ? hsRows.value.rows[0] : null,
    assets: assetRows.status === 'fulfilled' ? assetRows.value.rows[0] : {},
    alerts24h: alertRows.status === 'fulfilled' ? parseInt(alertRows.value.rows[0]?.cnt24h || 0) : 0,
    schools: schoolRows.status === 'fulfilled' ? schoolRows.value.rows[0] : {},
    dumps: dumpRows.status === 'fulfilled' ? parseInt(dumpRows.value.rows[0]?.open_dumps || 0) : 0,
    sludge: sludgeRows.status === 'fulfilled' ? sludgeRows.value.rows[0] : {},
  };
}

async function generateDistrictPdf(district) {
  const d = await _districtData(district);
  const now = new Date();

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];
    doc.on('data', chunk => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Header
    doc.rect(0, 0, doc.page.width, 80).fill(NEXUS_GREEN);
    doc.fillColor('white').fontSize(22).font('Helvetica-Bold')
       .text('N.E.X.U.S.', 50, 20);
    doc.fontSize(10).font('Helvetica')
       .text('Northern Environmental X-system for Universal Sanitation', 50, 46);
    doc.fillColor('white').fontSize(8)
       .text(`Generated: ${now.toUTCString()}`, 50, 62);

    // District title
    doc.fillColor(NEXUS_BLUE).fontSize(18).font('Helvetica-Bold')
       .text(`District Report: ${district}`, 50, 100);
    doc.moveTo(50, 124).lineTo(545, 124).stroke(NEXUS_GREEN);

    let y = 135;

    const section = (title) => {
      doc.fillColor(NEXUS_GREEN).fontSize(12).font('Helvetica-Bold').text(title, 50, y);
      y += 18;
      doc.moveTo(50, y).lineTo(545, y).stroke('#cccccc');
      y += 8;
      doc.fillColor('#111111').fontSize(10).font('Helvetica');
    };

    const row = (label, value) => {
      doc.font('Helvetica-Bold').text(label + ': ', 60, y, { continued: true });
      doc.font('Helvetica').text(String(value ?? 'N/A'));
      y += 16;
    };

    // Health Score
    section('Community Health Score');
    row('Score', d.health?.score ? `${parseFloat(d.health.score).toFixed(1)} / 100` : 'Not computed');
    if (d.health?.ai_narrative) {
      doc.fontSize(9).fillColor('#333333').text(d.health.ai_narrative, 60, y, { width: 485 });
      y += doc.heightOfString(d.health.ai_narrative, { width: 485 }) + 8;
    }
    y += 6;

    // Assets Summary
    section('Assets Summary');
    row('Registered Toilets', d.assets.toilets || 0);
    row('Sanitation Units (IoT)', d.assets.units || 0);
    row('Waste Treatment Facilities', d.assets.facilities || 0);
    row('Active Waste Gatherers', d.assets.gatherers || 0);
    y += 6;

    // Incidents
    section('Incidents (24 hours)');
    row('Active Alerts', d.alerts24h);
    row('Open Illegal Dump Sites', d.dumps);
    y += 6;

    // School Compliance
    section('School WASH Compliance (UNICEF Standard)');
    const totalSchools = parseInt(d.schools.total || 0);
    const compliant = parseInt(d.schools.compliant || 0);
    const compRate = totalSchools > 0 ? Math.round((compliant / totalSchools) * 100) : 0;
    row('Total Schools Tracked', totalSchools);
    row('UNICEF-Compliant Schools', compliant);
    row('Compliance Rate', `${compRate}%`);
    y += 6;

    // Sludge Chain
    section('Fecal Sludge Service Chain');
    const totalJobs = parseInt(d.sludge.total_jobs || 0);
    const completedJobs = parseInt(d.sludge.completed || 0);
    const chainRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;
    row('Total Collection Jobs', totalJobs);
    row('Chain Complete (toilet→facility)', completedJobs);
    row('Chain Completion Rate', `${chainRate}%`);
    y += 6;

    // Recommendations
    section('Recommendations');
    const recs = [];
    if (parseFloat(d.health?.score || 100) < 60) recs.push('Priority: address low health score — increase toilet coverage and reduce dump sites');
    if (d.dumps > 3) recs.push(`${d.dumps} open dump sites require NGO/gatherer assignment`);
    if (compRate < 70) recs.push('School WASH compliance is below 70% — engage district education office');
    if (chainRate < 60) recs.push('Fecal sludge chain completion is low — review gatherer capacity and facility intake');
    if (!recs.length) recs.push('District metrics are within acceptable range — continue monitoring');
    recs.forEach(rec => {
      doc.fontSize(9).fillColor('#333333').text(`• ${rec}`, 60, y, { width: 485 });
      y += 14;
    });

    // Footer
    doc.rect(0, doc.page.height - 30, doc.page.width, 30).fill(NEXUS_GREEN);
    doc.fillColor('white').fontSize(8).font('Helvetica')
       .text('N.E.X.U.S. — Northern Ghana Sanitation Intelligence Platform', 50, doc.page.height - 20);

    doc.end();
  });
}

async function generateDistrictCsv(district, dataType) {
  const types = {
    toilets: {
      sql: `SELECT id, owner_name, owner_phone, toilet_type, ownership_type, condition,
                   district, community, latitude, longitude, num_users, has_water,
                   has_handwashing, is_verified, vulnerability_score, registered_at
            FROM registered_toilets WHERE district=$1 ORDER BY registered_at DESC`,
      headers: 'id,owner_name,owner_phone,toilet_type,ownership_type,condition,district,community,latitude,longitude,num_users,has_water,has_handwashing,is_verified,vulnerability_score,registered_at',
      fields: ['id','owner_name','owner_phone','toilet_type','ownership_type','condition','district','community','latitude','longitude','num_users','has_water','has_handwashing','is_verified','vulnerability_score','registered_at'],
    },
    gatherers: {
      sql: `SELECT id, full_name, phone, district, vehicle_type, is_active, is_available, waste_types, total_collections, rating, registered_at
            FROM gatherers WHERE district=$1 ORDER BY registered_at DESC`,
      headers: 'id,full_name,phone,district,vehicle_type,is_active,is_available,waste_types,total_collections,rating,registered_at',
      fields: ['id','full_name','phone','district','vehicle_type','is_active','is_available','waste_types','total_collections','rating','registered_at'],
    },
    dumps: {
      sql: `SELECT id, district, community, severity, waste_types, estimated_volume_m3, status, description, reporter_name, created_at
            FROM illegal_dump_sites WHERE district=$1 ORDER BY created_at DESC`,
      headers: 'id,district,community,severity,waste_types,estimated_volume_m3,status,description,reporter_name,created_at',
      fields: ['id','district','community','severity','waste_types','estimated_volume_m3','status','description','reporter_name','created_at'],
    },
    schools: {
      sql: `SELECT id, school_name, district, community, student_count, total_toilets, girl_toilets,
                   has_handwashing, mhm_is_functional, meets_unicef_standard, health_score, last_assessed
            FROM school_sanitation_metrics WHERE district=$1 ORDER BY school_name`,
      headers: 'id,school_name,district,community,student_count,total_toilets,girl_toilets,has_handwashing,mhm_is_functional,meets_unicef_standard,health_score,last_assessed',
      fields: ['id','school_name','district','community','student_count','total_toilets','girl_toilets','has_handwashing','mhm_is_functional','meets_unicef_standard','health_score','last_assessed'],
    },
  };

  const spec = types[dataType];
  if (!spec) throw new Error(`Unknown dataType: ${dataType}. Use toilets|gatherers|dumps|schools`);

  const { rows } = await query(spec.sql, [district]);
  const escape = v => {
    if (v === null || v === undefined) return '';
    const s = Array.isArray(v) ? v.join(';') : String(v);
    return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [spec.headers, ...rows.map(r => spec.fields.map(f => escape(r[f])).join(','))];
  return lines.join('\n');
}

module.exports = { generateDistrictPdf, generateDistrictCsv };
