const NewsArticle = require('../models/NewsArticle');
const { crawlAllFeeds } = require('../services/newsCrawlerService');
const { query } = require('../config/database');

const NATIONAL_SOURCES = ['GhanaWeb','MyJoyOnline','GraphicOnline','CitiNewsroom','Adom Online','GBC Ghana Online','3News Ghana','Ghana News Agency','Peace FM Online'];
const NORTHERN_PLACES = ['tamale','sagnarigu','tolon','kumbungu','nanton','savelugu','karaga','gushegu','yendi','bolgatanga','navrongo','bawku',' wa ','damongo','bole','salaga','nalerigu','gambaga','walewale','tongo','paga','northern region','upper east','upper west','north east region','savannah region','northern ghana'];

async function list(req, res, next) {
  try {
    const { is_flood_related, is_sanitation_related, limit, page } = req.query;
    const lim    = Math.min(parseInt(limit) || 20, 100);
    const pg     = Math.max(parseInt(page) || 1, 1);
    const offset = (pg - 1) * lim;
    const filters = {
      is_flood_related: is_flood_related !== undefined ? is_flood_related === 'true' : undefined,
      is_sanitation_related: is_sanitation_related !== undefined ? is_sanitation_related === 'true' : undefined,
    };
    const [data, total] = await Promise.all([
      NewsArticle.findAll({ ...filters, limit: lim, offset }),
      NewsArticle.count(filters),
    ]);
    res.json({ success: true, count: data.length, total, page: pg, limit: lim, data });
  } catch (e) { next(e); }
}

async function getOne(req, res, next) {
  try {
    const data = await NewsArticle.findById(req.params.id);
    if (!data) return res.status(404).json({ success: false, message: 'Article not found' });
    res.json({ success: true, data });
  } catch (e) { next(e); }
}

let _crawling = false;
let _lastCrawlResult = null;

async function crawl(req, res) {
  if (_crawling) {
    return res.json({ success: true, message: 'Crawl already in progress', running: true, last: _lastCrawlResult });
  }
  _crawling = true;
  res.json({ success: true, message: 'News crawl started', note: 'Runs in background — check /news/recent for new articles' });
  try {
    const result = await crawlAllFeeds();
    _lastCrawlResult = { ...result, completed_at: new Date().toISOString() };
  } catch (e) {
    console.error('[NewsController] crawl error:', e.message);
  } finally {
    _crawling = false;
  }
}

async function crawlStatus(req, res) {
  res.json({ success: true, running: _crawling, last: _lastCrawlResult });
}

async function recent(req, res, next) {
  try {
    const limit = req.query.limit ? parseInt(req.query.limit) : 5;
    const data = await NewsArticle.recent(limit);
    res.json({ success: true, count: data.length, data });
  } catch (e) { next(e); }
}

async function purgeIrrelevant(req, res, next) {
  try {
    const { rows } = await query(
      `SELECT id, source_name, headline FROM news_articles
       WHERE is_flood_related = false AND is_sanitation_related = false
       AND source_name = ANY($1)`,
      [NATIONAL_SOURCES]
    );
    const toDelete = rows.filter(r => {
      const hl = r.headline.toLowerCase();
      return !NORTHERN_PLACES.some(p => hl.includes(p));
    });
    let deleted = 0;
    if (toDelete.length > 0) {
      const ids = toDelete.map(r => r.id);
      const result = await query('DELETE FROM news_articles WHERE id = ANY($1)', [ids]);
      deleted = result.rowCount;
    }
    res.json({ success: true, scanned: rows.length, deleted, kept: rows.length - deleted });
  } catch (e) { next(e); }
}

module.exports = { list, getOne, crawl, crawlStatus, recent, purgeIrrelevant };
