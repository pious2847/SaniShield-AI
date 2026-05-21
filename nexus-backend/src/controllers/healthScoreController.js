const CommunityHealthScore = require('../models/CommunityHealthScore');
const { computeAllDistricts, computeForDistrict } = require('../services/healthScoreService');

async function all(req, res, next) {
  try {
    const rows = await CommunityHealthScore.latestAll();
    const data = rows.map(CommunityHealthScore.parse);
    res.json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
}

async function forDistrict(req, res, next) {
  try {
    const row = await CommunityHealthScore.latestForDistrict(req.params.district);
    if (!row) return res.status(404).json({ success: false, message: 'No score found for district' });
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
