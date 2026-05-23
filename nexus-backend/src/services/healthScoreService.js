const CommunityHealthScore = require('../models/CommunityHealthScore');
const { computeHealthScore } = require('./geminiService');
const { query } = require('../config/database');

const DISTRICTS = [
  'Tamale Metro', 'Sagnarigu', 'Tolon', 'Kumbungu', 'Nanton',
  'Savelugu', 'Karaga', 'Gushegu', 'Yendi', 'Northern',
];

async function gatherDistrictData(district) {
  const [toilets, alerts, dumps, odRows, weatherRow, unitRows] = await Promise.all([
    query(`SELECT COUNT(*) AS c, AVG(CASE WHEN condition IN ('good','fair') THEN 1.0 ELSE 0 END)*100 AS pct
           FROM registered_toilets WHERE district=$1`, [district]),
    query(`SELECT COUNT(*) AS c FROM alerts a JOIN sanitation_units su ON a.unit_id=su.id WHERE su.district=$1 AND a.status='active'`, [district]),
    query(`SELECT COUNT(*) AS c FROM illegal_dump_sites WHERE district=$1 AND status='open'`, [district]),
    query(`SELECT COUNT(*) AS c FROM od_events WHERE district=$1 AND created_at>=NOW()-INTERVAL '24 hours'`, [district]),
    query(`SELECT AVG(precipitation_mm) AS avg_precip FROM weather_history
           WHERE district=$1 AND recorded_at>=NOW()-INTERVAL '7 days'`, [district]),
    query(`SELECT AVG(fill_level_percent) AS avg_fill FROM sensor_readings sr
           JOIN sanitation_units su ON sr.unit_id=su.id
           WHERE su.district=$1 AND sr.recorded_at>=NOW()-INTERVAL '24 hours'`, [district]),
  ]);

  const avgPrecip = parseFloat(weatherRow.rows[0]?.avg_precip || 0);
  const floodRiskAvg = Math.min(100, Math.round(avgPrecip * 2));

  return {
    district,
    toilet_count: parseInt(toilets.rows[0]?.c || 0),
    avg_fill_level: Math.round(parseFloat(unitRows.rows[0]?.avg_fill || 0)),
    active_alerts: parseInt(alerts.rows[0]?.c || 0),
    open_dump_sites: parseInt(dumps.rows[0]?.c || 0),
    flood_risk_avg: floodRiskAvg,
    od_reports_24h: parseInt(odRows.rows[0]?.c || 0),
  };
}

async function computeForDistrict(district) {
  const districtData = await gatherDistrictData(district);
  let aiResult;
  try {
    aiResult = await computeHealthScore(districtData);
  } catch (err) {
    console.error(`[HealthScore] AI error for ${district}:`, err.message);
    const penalty = (districtData.active_alerts * 5) + (districtData.open_dump_sites * 3) +
      (districtData.od_reports_24h * 10) + Math.max(0, districtData.avg_fill_level - 60);
    aiResult = {
      score: Math.max(0, Math.min(100, 70 - penalty)),
      components: {
        toilet_coverage: Math.min(100, districtData.toilet_count * 5),
        fill_levels: Math.max(0, 100 - districtData.avg_fill_level),
        alerts: Math.max(0, 100 - districtData.active_alerts * 10),
        dumps: Math.max(0, 100 - districtData.open_dump_sites * 15),
        flood_risk: Math.max(0, 100 - districtData.flood_risk_avg),
        od_reports: Math.max(0, 100 - districtData.od_reports_24h * 20),
      },
      narrative: `${district} has ${districtData.toilet_count} registered toilets, ${districtData.active_alerts} active alerts, and ${districtData.open_dump_sites} open dump sites.`,
    };
  }

  return CommunityHealthScore.save({
    district,
    score: aiResult.score,
    components: aiResult.components,
    toilet_count: districtData.toilet_count,
    avg_fill_level: districtData.avg_fill_level,
    active_alerts: districtData.active_alerts,
    open_dump_sites: districtData.open_dump_sites,
    flood_risk_avg: districtData.flood_risk_avg,
    od_reports_24h: districtData.od_reports_24h,
    ai_narrative: aiResult.narrative,
  });
}

async function computeAllDistricts() {
  console.log('[HealthScore] Computing health scores for', DISTRICTS.length, 'districts...');
  const results = [];
  for (const district of DISTRICTS) {
    try {
      const row = await computeForDistrict(district);
      results.push(row);
      console.log(`[HealthScore] ${district}: score=${row.score}`);
    } catch (err) {
      console.error(`[HealthScore] Error for ${district}:`, err.message);
    }
  }
  return results;
}

module.exports = { computeForDistrict, computeAllDistricts, DISTRICTS };
