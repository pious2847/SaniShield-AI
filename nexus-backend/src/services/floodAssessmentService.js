const FloodAssessment = require('../models/FloodAssessment');
const WeatherHistory = require('../models/WeatherHistory');
const { queryWithRetry: query } = require('../config/database');
const broadcastService = require('./broadcastService');

const FLOOD_THRESHOLD_MM = 25;

async function _buildAssessment(district, rainfallMm, triggerType, io) {
  const existing = await FloodAssessment.getActiveForDistrict(district);
  if (existing) return existing;

  const assessment = await FloodAssessment.create({
    district,
    trigger_type: triggerType,
    trigger_rainfall_mm: rainfallMm,
    trigger_threshold_mm: FLOOD_THRESHOLD_MM,
  });

  // Flag all toilets in district (registered_toilets has no flood_zone_risk column)
  const { rows: toilets } = await query(
    `SELECT id, owner_name AS name, district, community, latitude, longitude
     FROM registered_toilets
     WHERE district=$1 AND latitude IS NOT NULL`,
    [district]
  );

  // Flag high/critical flood-zone sanitation units
  const { rows: units } = await query(
    `SELECT id, name, district, location_name AS community, latitude, longitude
     FROM sanitation_units
     WHERE district=$1 AND flood_zone_risk IN ('high','critical')`,
    [district]
  );

  const checkInserts = [
    ...toilets.map(t => FloodAssessment.addAssetCheck({
      assessment_id: assessment.id,
      asset_type: 'toilet',
      asset_id: t.id,
      asset_name: t.name,
      district: t.district,
      latitude: t.latitude,
      longitude: t.longitude,
    })),
    ...units.map(u => FloodAssessment.addAssetCheck({
      assessment_id: assessment.id,
      asset_type: 'sanitation_unit',
      asset_id: u.id,
      asset_name: u.name,
      district: u.district,
      latitude: u.latitude,
      longitude: u.longitude,
    })),
  ];
  await Promise.allSettled(checkInserts);
  await FloodAssessment.updateCounts(assessment.id);

  // Update flood_check_status on flagged toilets
  if (toilets.length) {
    const ids = toilets.map(t => t.id);
    await query(
      `UPDATE registered_toilets SET flood_check_status='pending' WHERE id = ANY($1::uuid[])`,
      [ids]
    );
  }

  // Broadcast alert
  broadcastService.createAndSend(
    {
      event: 'flood_assessment_triggered',
      district,
      rainfall_mm: rainfallMm,
      assets_flagged: toilets.length + units.length,
    },
    [district],
    io
  ).catch(err => console.error('[FloodAssessment] Broadcast error:', err.message));

  if (io) {
    io.to(`district:${district}`).emit('flood_assessment_started', {
      assessment_id: assessment.id,
      district,
      trigger_rainfall_mm: rainfallMm,
      total_assets_flagged: toilets.length + units.length,
    });
  }

  return assessment;
}

async function checkAndTrigger(district, rainfallMm, io) {
  if (rainfallMm <= FLOOD_THRESHOLD_MM) return null;
  return _buildAssessment(district, rainfallMm, 'auto', io);
}

async function manualTrigger(district, io) {
  const latest = await WeatherHistory.getForDistrict(district, { limit: 1 });
  const rainfallMm = latest[0]?.total_precip_24h || latest[0]?.precipitation_mm || 0;
  return _buildAssessment(district, rainfallMm, 'manual', io);
}

async function markComplete(assessmentId) {
  await FloodAssessment.updateCounts(assessmentId);
  return FloodAssessment.updateStatus(assessmentId, 'completed');
}

module.exports = { checkAndTrigger, manualTrigger, markComplete, FLOOD_THRESHOLD_MM };
