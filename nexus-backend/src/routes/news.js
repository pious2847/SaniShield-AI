const express = require('express');
const ctrl = require('../controllers/newsController');
const { authenticate, requireRole } = require('../middleware/auth');
const { query } = require('../config/database');

// Ensure AI columns exist (idempotent)
query(`ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS ai_sentiment VARCHAR(20) DEFAULT 'neutral'`).catch(() => {});
query(`ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS ai_districts TEXT[]`).catch(() => {});
query(`ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS ai_event_type VARCHAR(50)`).catch(() => {});
query(`ALTER TABLE news_articles ADD COLUMN IF NOT EXISTS ai_processed BOOLEAN DEFAULT false`).catch(() => {});

const router = express.Router();

router.get('/', ctrl.list);
router.get('/recent', ctrl.recent);
router.get('/crawl/status', authenticate, ctrl.crawlStatus);
router.get('/:id', ctrl.getOne);
router.post('/crawl', authenticate, requireRole('admin', 'district_officer'), ctrl.crawl);
router.delete('/purge-irrelevant', authenticate, requireRole('admin'), ctrl.purgeIrrelevant);

module.exports = router;
