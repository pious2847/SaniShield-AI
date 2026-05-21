const cron = require('node-cron');
const { getWeatherForDistrict } = require('./weatherService');
const { crawlAllFeeds } = require('./newsCrawlerService');
const { computeAllDistricts, DISTRICTS } = require('./healthScoreService');
const { assessRiskBatch } = require('./geminiService');
const { checkAndTrigger, FLOOD_THRESHOLD_MM } = require('./floodAssessmentService');
const { scoreAll } = require('./vulnerabilityService');
const WeatherHistory = require('../models/WeatherHistory');
const SanitationUnit = require('../models/SanitationUnit');
const SensorReading = require('../models/SensorReading');
const Alert = require('../models/Alert');

const jobStatus = {};

function recordRun(name) {
  if (!jobStatus[name]) jobStatus[name] = { lastRun: null, runCount: 0 };
  jobStatus[name].lastRun = new Date().toISOString();
  jobStatus[name].runCount++;
}

async function runWeatherArchive() {
  console.log('[Cron:Weather] Archiving weather for all districts...');
  recordRun('weather');
  let success = 0;
  for (const district of DISTRICTS) {
    try {
      await getWeatherForDistrict(district);
      success++;
    } catch (err) {
      console.error(`[Cron:Weather] ${district} error:`, err.message);
    }
  }
  console.log(`[Cron:Weather] Done: ${success}/${DISTRICTS.length} districts`);
}

async function runRiskAssessment(io) {
  console.log('[Cron:Risk] Running batch risk assessment...');
  recordRun('risk_assessment');
  try {
    const units = await SanitationUnit.findAll({ status: 'active', limit: 50 });
    if (!units.length) return;

    let weatherData;
    try { weatherData = await getWeatherForDistrict('Tamale Metro'); } catch { weatherData = null; }

    const unitsWithFill = await Promise.all(units.map(async u => {
      try {
        const latest = await SensorReading.latestForUnit(u.id);
        return { ...u, latest_fill: latest?.fill_level_percent };
      } catch { return u; }
    }));

    const assessments = await assessRiskBatch(unitsWithFill, weatherData);

    for (const a of assessments) {
      if (!a.requires_alert || a.risk_level === 'low') continue;
      const unit = units.find(u => u.id === a.unit_id);
      if (!unit) continue;
      await Alert.create({
        unit_id: a.unit_id,
        district: unit.district,
        alert_type: 'ai_risk_assessment',
        severity: a.risk_level,
        message: a.action || `AI risk assessment: ${a.risk_level} risk detected`,
      });
      if (io) {
        io.to(`district:${unit.district}`).emit('new_alert', {
          unit_id: a.unit_id,
          district: unit.district,
          severity: a.risk_level,
          message: a.action,
        });
      }
    }
    console.log(`[Cron:Risk] Assessed ${assessments.length} units`);
  } catch (err) {
    console.error('[Cron:Risk] Error:', err.message);
  }
}

async function runNewsCrawl() {
  console.log('[Cron:News] Starting news crawl...');
  recordRun('news_crawl');
  try {
    const result = await crawlAllFeeds();
    console.log(`[Cron:News] Done: fetched=${result.fetched} saved=${result.saved}`);
  } catch (err) {
    console.error('[Cron:News] Error:', err.message);
  }
}

async function runHealthScores() {
  console.log('[Cron:Health] Computing health scores...');
  recordRun('health_scores');
  try {
    await computeAllDistricts();
    console.log('[Cron:Health] Done');
  } catch (err) {
    console.error('[Cron:Health] Error:', err.message);
  }
}

async function runFloodCheck(io) {
  console.log('[Cron:Flood] Checking rainfall thresholds...');
  recordRun('flood_check');
  let triggered = 0;
  for (const district of DISTRICTS) {
    try {
      const recent = await WeatherHistory.getForDistrict(district, { limit: 1 });
      const rainfall = parseFloat(recent[0]?.total_precip_24h || recent[0]?.precipitation_mm || 0);
      if (rainfall > FLOOD_THRESHOLD_MM) {
        const assessment = await checkAndTrigger(district, rainfall, io);
        if (assessment) triggered++;
      }
    } catch (err) {
      console.error(`[Cron:Flood] ${district} error:`, err.message);
    }
  }
  console.log(`[Cron:Flood] Done — ${triggered} assessments triggered`);
}

async function runVulnerabilityScoring() {
  console.log('[Cron:Vulnerability] Scoring all assets...');
  recordRun('vulnerability_scoring');
  try {
    await scoreAll();
    console.log('[Cron:Vulnerability] Done');
  } catch (err) {
    console.error('[Cron:Vulnerability] Error:', err.message);
  }
}

function startAllCrons(io) {
  // Every 2 hours — weather archive
  cron.schedule('0 */2 * * *', () => runWeatherArchive(), { name: 'weather-archive' });
  console.log('[Cron] Scheduled: weather archive (every 2h)');

  // Every 6 hours — risk assessment
  cron.schedule('0 */6 * * *', () => runRiskAssessment(io), { name: 'risk-assessment' });
  console.log('[Cron] Scheduled: risk assessment (every 6h)');

  // Every 12 hours — news crawl
  cron.schedule('0 */12 * * *', () => runNewsCrawl(), { name: 'news-crawl' });
  console.log('[Cron] Scheduled: news crawl (every 12h)');

  // Daily at 2am — health scores
  cron.schedule('0 2 * * *', () => runHealthScores(), { name: 'health-scores' });
  console.log('[Cron] Scheduled: health scores (daily 2am)');

  // Every 3 hours — flood detection check
  cron.schedule('0 */3 * * *', () => runFloodCheck(io), { name: 'flood-check' });
  console.log('[Cron] Scheduled: flood detection (every 3h)');

  // Weekly Sunday 3am — vulnerability scoring
  cron.schedule('0 3 * * 0', () => runVulnerabilityScoring(), { name: 'vulnerability-scoring' });
  console.log('[Cron] Scheduled: vulnerability scoring (weekly Sun 3am)');

  // Run weather immediately on startup (non-blocking)
  setTimeout(() => runWeatherArchive(), 5000);
}

function getCronStatus() {
  return {
    jobs: [
      { name: 'weather-archive', schedule: 'every 2 hours', ...jobStatus['weather'] },
      { name: 'risk-assessment', schedule: 'every 6 hours', ...jobStatus['risk_assessment'] },
      { name: 'news-crawl', schedule: 'every 12 hours', ...jobStatus['news_crawl'] },
      { name: 'health-scores', schedule: 'daily at 2am', ...jobStatus['health_scores'] },
      { name: 'flood-check', schedule: 'every 3 hours', ...jobStatus['flood_check'] },
      { name: 'vulnerability-scoring', schedule: 'weekly Sunday 3am', ...jobStatus['vulnerability_scoring'] },
    ],
  };
}

module.exports = { startAllCrons, getCronStatus };
