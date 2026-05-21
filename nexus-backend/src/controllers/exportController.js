const { generateDistrictPdf, generateDistrictCsv } = require('../services/reportGeneratorService');
const { query } = require('../config/database');

async function districtPdf(req, res, next) {
  try {
    const district = decodeURIComponent(req.params.district);
    const buffer = await generateDistrictPdf(district);
    const filename = `nexus-report-${district.replace(/\s+/g, '_')}-${new Date().toISOString().slice(0,10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (e) { next(e); }
}

async function districtCsv(req, res, next) {
  try {
    const district = decodeURIComponent(req.params.district);
    const dataType = req.query.type || 'toilets';
    const csv = await generateDistrictCsv(district, dataType);
    const filename = `nexus-${dataType}-${district.replace(/\s+/g, '_')}-${new Date().toISOString().slice(0,10)}.csv`;
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(csv);
  } catch (e) { next(e); }
}

async function fullDataJson(req, res, next) {
  try {
    const district = req.query.district;
    if (!district) return res.status(400).json({ success: false, message: 'district query param required' });

    const [toilets, units, facilities, gatherers, dumps, schools, healthScores, sludge] = await Promise.allSettled([
      query('SELECT * FROM registered_toilets WHERE district=$1 ORDER BY registered_at DESC', [district]),
      query('SELECT * FROM sanitation_units WHERE district=$1 ORDER BY installed_at DESC', [district]),
      query('SELECT * FROM waste_facilities WHERE district=$1', [district]),
      query('SELECT * FROM gatherers WHERE district=$1 AND is_active=true', [district]),
      query('SELECT * FROM illegal_dump_sites WHERE district=$1 ORDER BY created_at DESC', [district]),
      query('SELECT * FROM school_sanitation_metrics WHERE district=$1', [district]),
      query('SELECT * FROM community_health_scores WHERE district=$1 ORDER BY computed_at DESC LIMIT 5', [district]),
      query('SELECT * FROM sludge_jobs WHERE district=$1 ORDER BY created_at DESC LIMIT 100', [district]),
    ]);

    const rows = r => r.status === 'fulfilled' ? r.value.rows : [];
    res.json({
      success: true,
      district,
      exported_at: new Date().toISOString(),
      data: {
        registered_toilets: rows(toilets),
        sanitation_units: rows(units),
        waste_facilities: rows(facilities),
        gatherers: rows(gatherers),
        illegal_dump_sites: rows(dumps),
        school_sanitation_metrics: rows(schools),
        community_health_scores: rows(healthScores),
        sludge_jobs: rows(sludge),
      },
    });
  } catch (e) { next(e); }
}

module.exports = { districtPdf, districtCsv, fullDataJson };
