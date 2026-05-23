const axios = require('axios');
const { XMLParser } = require('fast-xml-parser');
const NewsArticle = require('../models/NewsArticle');
const { summarizeNewsForContext, processNewsArticle } = require('./geminiService');

const RSS_FEEDS = [
  // ── Northern Ghana-based media ─────────────────────────────────────────
  { name: 'TV Savannah',          url: 'https://tvsavannah.com/feed/',                  region: 'northern' },
  { name: 'Nkilgi FM',            url: 'https://www.nkilgifm.com/feed/',                region: 'northern' },
  { name: 'Savannah News',        url: 'https://savannahnewsgh.com/feed/',              region: 'northern' },
  { name: 'Northern Star',        url: 'https://northernstargh.com/feed/',              region: 'northern' },
  { name: 'Tamale24',             url: 'https://tamale24.com/feed/',                    region: 'northern' },
  { name: 'Upper East Times',     url: 'https://uppereasttimes.com/feed/',              region: 'northern' },
  { name: 'NorthernGhanaOnline',  url: 'https://northernghanaonline.com/feed/',         region: 'northern' },

  // ── National outlets with strong Northern Ghana coverage ───────────────
  { name: 'GhanaWeb',             url: 'https://www.ghanaweb.com/GhanaHomePage/NewsArchive/rss.php', region: 'national' },
  { name: 'MyJoyOnline',          url: 'https://www.myjoyonline.com/feed/',             region: 'national' },
  { name: 'GraphicOnline',        url: 'https://www.graphic.com.gh/feed',               region: 'national' },
  { name: 'CitiNewsroom',         url: 'https://citinewsroom.com/feed/',                region: 'national' },
  { name: 'Adom Online',          url: 'https://www.adomonline.com/feed/',              region: 'national' },
  { name: 'GBC Ghana Online',     url: 'https://www.gbcghanaonline.com/feed/',          region: 'national' },
  { name: '3News Ghana',          url: 'https://3news.com/feed/',                       region: 'national' },
  { name: 'Ghana News Agency',    url: 'https://www.ghananewsagency.org/rss.xml',       region: 'national' },
  { name: 'Peace FM Online',      url: 'https://www.peacefmonline.com/feed/',           region: 'national' },
];

// Northern Ghana districts and towns — any article mentioning these is auto-kept
const NORTHERN_GHANA_PLACES = [
  'tamale', 'sagnarigu', 'tolon', 'kumbungu', 'nanton', 'savelugu', 'karaga',
  'gushegu', 'yendi', 'bolgatanga', 'navrongo', 'bawku', 'wa', 'damongo',
  'bole', 'salaga', 'nalerigu', 'gambaga', 'walewale', 'tongo', 'paga',
  'northern region', 'upper east', 'upper west', 'north east region',
  'savannah region', 'northern ghana',
];

const KEYWORDS = [
  'flood', 'flooding', 'sanitation', 'toilet', 'cholera', 'diarrhea',
  'water', 'sewage', 'waste', 'open defecation', 'hygiene', 'latrines',
  'fecal sludge', 'wash', 'pit latrine', 'borehole', 'waterborne',
  'rainfall', 'storm', 'overflow', 'contamination', 'disease outbreak',
  ...NORTHERN_GHANA_PLACES,
];

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

// Core WASH/climate keywords — must appear in headline for national outlets
const WASH_KEYWORDS = [
  'flood', 'flooding', 'sanitation', 'toilet', 'cholera', 'diarrhea',
  'sewage', 'open defecation', 'hygiene', 'latrines', 'fecal sludge',
  'borehole', 'waterborne', 'contamination', 'disease outbreak', 'rainfall',
  'pit latrine', 'wash', 'water supply', 'water crisis', 'water shortage',
];

function isRelevant(headline, summary, feedRegion = 'national') {
  if (!headline) return false;
  const hl = headline.toLowerCase();
  const sm = (summary || '').toLowerCase();
  const combined = hl + ' ' + sm;

  if (feedRegion === 'northern') {
    // Northern-based outlets: keep anything with a WASH or place keyword anywhere
    return WASH_KEYWORDS.some(k => combined.includes(k)) ||
      NORTHERN_GHANA_PLACES.some(p => combined.includes(p));
  }

  // National outlets: headline must mention a Northern Ghana place AND article must have a WASH keyword
  const hasNorthernPlace = NORTHERN_GHANA_PLACES.some(p => hl.includes(p));
  const hasWash = WASH_KEYWORDS.some(k => combined.includes(k));
  return hasNorthernPlace && hasWash;
}

function extractItems(parsed) {
  try {
    const channel = parsed?.rss?.channel || parsed?.feed;
    if (!channel) return [];
    const items = channel.item || channel.entry || [];
    return Array.isArray(items) ? items : [items];
  } catch { return []; }
}

function parseItem(item, sourceName, feedRegion = 'national') {
  const headline = item.title || item['title'] || '';
  const summary = item.description || item.summary || item['content:encoded'] || '';
  const sourceUrl = item.link || item.guid || item.id || '';
  const pubDate = item.pubDate || item.published || item.updated || null;
  const combined = (headline + ' ' + summary).toLowerCase();

  return {
    headline: typeof headline === 'string' ? headline.trim() : String(headline).trim(),
    summary: typeof summary === 'string' ? summary.replace(/<[^>]+>/g, '').trim().slice(0, 500) : '',
    source_name: sourceName,
    source_url: typeof sourceUrl === 'string' ? sourceUrl.trim() : String(sourceUrl).trim(),
    published_at: pubDate ? new Date(pubDate).toISOString() : null,
    is_flood_related: isRelevant(headline, summary, feedRegion) &&
      ['flood', 'flooding', 'rain', 'waterborne', 'water crisis', 'water shortage'].some(k => combined.includes(k)),
    is_sanitation_related: isRelevant(headline, summary, feedRegion) &&
      ['sanitation', 'toilet', 'hygiene', 'sewage', 'cholera', 'open defecation', 'fecal sludge', 'latrine', 'borehole'].some(k => combined.includes(k)),
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
      const data = parseItem(item, feed.name, feed.region);
      if (!data.source_url || !data.headline) { results.skipped++; continue; }
      if (!isRelevant(data.headline, data.summary, feed.region)) { results.skipped++; continue; }

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

async function processUnprocessedArticles() {
  const articles = await NewsArticle.findUnprocessed(8);
  if (articles.length === 0) return { processed: 0, suggestedSources: [] };

  console.log(`[NewsCrawler] AI processing ${articles.length} unprocessed articles...`);
  const suggestedSources = [];
  let processed = 0;

  for (const article of articles) {
    try {
      const result = await processNewsArticle(article);
      if (!result) continue;

      await NewsArticle.updateAi(article.id, {
        sentiment:  result.sentiment,
        districts:  result.affected_districts?.length ? result.affected_districts : null,
        eventType:  result.event_type,
        summary:    result.nexus_summary,
        tags:       result.affected_districts?.length ? result.affected_districts : null,
        isFlood:    result.is_flood_related ?? null,
        isSanitation: result.is_sanitation_related ?? null,
      });

      if (result.suggested_sources?.length) {
        suggestedSources.push(...result.suggested_sources.filter(Boolean));
      }

      processed++;
      // Respect Gemini rate limits — 1.5s between articles
      await new Promise(r => setTimeout(r, 1500));
    } catch (err) {
      console.error(`[NewsCrawler] AI process error for ${article.id}:`, err.message);
    }
  }

  if (suggestedSources.length > 0) {
    console.log('[NewsCrawler] AI suggested new sources:', suggestedSources);
  }

  return { processed, suggestedSources };
}

async function crawlAllFeeds() {
  console.log('[NewsCrawler] Starting crawl of', RSS_FEEDS.length, 'feeds...');
  let total = { fetched: 0, saved: 0, skipped: 0, ai_processed: 0 };

  for (const feed of RSS_FEEDS) {
    const result = await crawlFeed(feed);
    total.fetched += result.fetched;
    total.saved += result.saved;
    total.skipped += result.skipped;
    if (result.saved > 0 || result.fetched > 0) {
      console.log(`[NewsCrawler] ${feed.name}: fetched=${result.fetched} saved=${result.saved} skipped=${result.skipped}`);
    }
  }

  // AI post-processing: enrich newly saved articles
  try {
    const aiResult = await processUnprocessedArticles();
    total.ai_processed = aiResult.processed;
    if (aiResult.suggestedSources.length) {
      console.log('[NewsCrawler] Suggested new sources:', aiResult.suggestedSources.join(', '));
    }
  } catch (err) {
    console.error('[NewsCrawler] AI batch processing error:', err.message);
  }

  // Legacy context summary (only if something new was saved)
  if (total.saved > 0) {
    try {
      const recent = await NewsArticle.recent(10);
      await summarizeNewsForContext(recent);
    } catch (err) {
      console.error('[NewsCrawler] AI context summary error:', err.message);
    }
  }

  console.log(`[NewsCrawler] Complete: fetched=${total.fetched} saved=${total.saved} skipped=${total.skipped} ai_processed=${total.ai_processed}`);
  return total;
}

module.exports = { crawlAllFeeds, RSS_FEEDS };
