const NewsArticle = require('../models/NewsArticle');
const { crawlAllFeeds } = require('../services/newsCrawlerService');

async function list(req, res, next) {
  try {
    const { is_flood_related, is_sanitation_related, limit } = req.query;
    const data = await NewsArticle.findAll({
      is_flood_related: is_flood_related !== undefined ? is_flood_related === 'true' : undefined,
      is_sanitation_related: is_sanitation_related !== undefined ? is_sanitation_related === 'true' : undefined,
      limit: limit ? parseInt(limit) : 20,
    });
    res.json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
}

async function getOne(req, res, next) {
  try {
    const data = await NewsArticle.findById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Article not found' });
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

async function crawl(req, res, next) {
  try {
    const result = await crawlAllFeeds();
    res.json({ success: true, data: result });
  } catch (e) { next(e); }
}

async function recent(req, res, next) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 5;
    const data = await NewsArticle.recent(limit);
    res.json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
}

module.exports = { list, getOne, crawl, recent };
