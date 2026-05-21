const WeatherHistory = require('../models/WeatherHistory');

async function getForDistrict(req, res, next) {
  try {
    const { from, to, limit } = req.query;
    const data = await WeatherHistory.getForDistrict(req.params.district, {
      from: from || undefined,
      to: to || undefined,
      limit: limit ? parseInt(limit) : 168,
    });
    res.json({ success: true, district: req.params.district, count: data.length, data });
  } catch (e) { next(e); }
}

async function getSummary(req, res, next) {
  try {
    const days = req.query.days ? parseInt(req.query.days) : 7;
    const data = await WeatherHistory.getSummary(req.params.district, days);
    res.json({ success: true, district: req.params.district, days, data });
  } catch (e) { next(e); }
}

async function heavyRain(req, res, next) {
  try {
    const threshold = req.query.threshold ? parseFloat(req.query.threshold) : 20;
    const days = req.query.days ? parseInt(req.query.days) : 30;
    const data = await WeatherHistory.heavyRainEvents(req.params.district, threshold, days);
    res.json({ success: true, district: req.params.district, threshold_mm: threshold, count: data.length, data });
  } catch (e) { next(e); }
}

async function latestAll(req, res, next) {
  try {
    const data = await WeatherHistory.latestPerDistrict();
    res.json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
}

module.exports = { getForDistrict, getSummary, heavyRain, latestAll };
