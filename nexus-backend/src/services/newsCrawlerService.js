const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const NewsArticle = require('../models/NewsArticle');
const { summarizeNewsForContext } = require('./geminiService');

const RSS_FEEDS = [
  { name: 'GhanaWeb', url: 'https://www.ghanaweb.com/GhanaHomePage/NewsArchive/rss.php' },
  { name: 'MyJoyOnline', url: 'https://www.myjoyonline.com/feed/' },
  { name: 'GraphicOnline', url: 'https://www.graphic.com.gh/feed' },
  { name: 'CitiNewsroom', url: 'https://citinewsroom.com/feed/' },
];

const KEYWORDS = [
  'flood', 'flooding', 'sanitation', 'toilet', 'cholera', 'diarrhea',
  'northern region', 'tamale', 'northern ghana', 'water', 'sewage',
  'waste', 'open defecation', 'hygiene', 'latrines', 'sagnarigu',
];

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

function isRelevant(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  return KEYWORDS.some(k => lower.includes(k));
}

function extractItems(parsed) {
  try {
    const channel = parsed?.rss?.channel || parsed?.feed;
    if (!channel) return [];
    const items = channel.item || channel.entry || [];
    return Array.isArray(items) ? items : [items];
  } catch { return []; }
}

function parseItem(item, sourceName) {
  const headline = item.title || item['title'] || '';
  const summary = item.description || item.summary || item['content:encoded'] || '';
  const sourceUrl = item.link || item.guid || item.id || '';
  const pubDate = item.pubDate || item.published || item.updated || null;

  return {
    headline: typeof headline === 'string' ? headline.trim() : String(headline).trim(),
    summary: typeof summary === 'string' ? summary.replace(/<[^>]+>/g, '').trim().slice(0, 500) : '',
    source_name: sourceName,
    source_url: typeof sourceUrl === 'string' ? sourceUrl.trim() : String(sourceUrl).trim(),
    published_at: pubDate ? new Date(pubDate).toISOString() : null,
    is_flood_related: isRelevant((headline + ' ' + summary).toLowerCase()) &&
      ['flood', 'flooding', 'rain', 'water'].some(k => (headline + ' ' + summary).toLowerCase().includes(k)),
    is_sanitation_related: isRelevant((headline + ' ' + summary).toLowerCase()) &&
      ['sanitation', 'toilet', 'hygiene', 'waste', 'sewage', 'cholera', 'open defecation'].some(k =>
        (headline + ' ' + summary).toLowerCase().includes(k)),
  };
}

async function crawlFeed(feed) {
  const results = { fetched: 0, saved: 0, skipped: 0 };
  try {
    const response = await axios.get(feed.url, {
      timeout: 15000,
      headers: { 'User-Agent': 'NEXUS-SanitationMonitor/2.0 (Northern Ghana AI Platform)' },
    });
    const parsed = parser.parse(response.data);
    const items = extractItems(parsed);
    results.fetched = items.length;

    for (const item of items) {
      const data = parseItem(item, feed.name);
      if (!data.source_url || !data.headline) { results.skipped++; continue; }
      if (!isRelevant(data.headline + ' ' + data.summary)) { results.skipped++; continue; }

      const exists = await NewsArticle.exists(data.source_url);
      if (exists) { results.skipped++; continue; }

      await NewsArticle.create(data);
      results.saved++;
    }
  } catch (err) {
    console.error(`[NewsCrawler] Feed ${feed.name} error:`, err.message);
  }
  return results;
}

async function crawlAllFeeds() {
  console.log('[NewsCrawler] Starting crawl of', RSS_FEEDS.length, 'feeds...');
  let total = { fetched: 0, saved: 0, skipped: 0 };

  for (const feed of RSS_FEEDS) {
    const result = await crawlFeed(feed);
    total.fetched += result.fetched;
    total.saved += result.saved;
    total.skipped += result.skipped;
    console.log(`[NewsCrawler] ${feed.name}: fetched=${result.fetched} saved=${result.saved} skipped=${result.skipped}`);
  }

  if (total.saved > 0) {
    try {
      const recent = await NewsArticle.recent(10);
      await summarizeNewsForContext(recent);
    } catch (err) {
      console.error('[NewsCrawler] AI summarization error:', err.message);
    }
  }

  console.log(`[NewsCrawler] Complete: total fetched=${total.fetched} saved=${total.saved} skipped=${total.skipped}`);
  return total;
}

module.exports = { crawlAllFeeds, RSS_FEEDS };
