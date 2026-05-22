const CommunityHealthScore = require('../models/CommunityHealthScore');
const { computeAllDistricts, computeForDistrict, DISTRICTS } = require('../services/healthScoreService');

async function all(req, res, next) {
  try {
    const rows = await CommunityHealthScore.latestAll();
    const data = rows.map(CommunityHealthScore.parse);
    res.json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
}

async function forDistrict(req, res, next) {
  try {
    let row = await CommunityHealthScore.latestForDistrict(req.params.district);
    if (!row) {
      const validDistrict = DISTRICTS.includes(req.params.district);
      if (!validDistrict) return res.status(404).json({ success: false, message: 'Unknown district' });
      try {
        row = await computeForDistrict(req.params.district);
      } catch (computeErr) {
        console.error('[HealthScore] on-demand compute error:', computeErr.message);
        // Return a synthetic pending score so the frontend renders rather than errors
        return res.json({
          success: true,
          data: {
            id: null, district: req.params.district,
            score: null, ai_narrative: 'Health score is being computed for the first time. Refresh in a moment.',
            components: {}, computed_at: new Date().toISOString(), pending: true,
          },
        });
      }
    }
    res.json({ success: true, data: CommunityHealthScore.parse(row) });
  } catch (e) { next(e); }
}

async function history(req, res, next) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 30;
    const rows = await CommunityHealthScore.historyForDistrict(req.params.district, limit);
    res.json({ success: true, count: rows.length, data: rows.map(CommunityHealthScore.parse) });
  } catch (e) { next(e); }
}

async function compute(req, res, next) {
  try {
    const results = await computeAllDistricts();
    res.json({ success: true, computed: results.length, data: results });
  } catch (e) { next(e); }
}

async function computeOne(req, res, next) {
  try {
    const result = await computeForDistrict(req.params.district);
    res.json({ success: true, data: CommunityHealthScore.parse(result) });
  } catch (e) { next(e); }
}

module.exports = { all, forDistrict, history, compute, computeOne };
