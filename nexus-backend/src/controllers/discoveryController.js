const { runDiscovery, getDiscoveryStats } = require('../services/locationDiscoveryService');

let _running = false;

async function trigger(req, res) {
  if (_running) {
    return res.status(409).json({ error: 'A discovery run is already in progress' });
  }
  _running = true;
  res.json({ message: 'Location discovery started', note: 'This runs in background — poll /stats for results' });

  runDiscovery()
    .then(result => console.log('[Discovery] Manual trigger complete:', JSON.stringify(result.stats)))
    .catch(err => console.error('[Discovery] Manual trigger error:', err.message))
    .finally(() => { _running = false; });
}

async function stats(req, res) {
  try {
    const data = await getDiscoveryStats();
    res.json({ running: _running, ...data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}

module.exports = { trigger, stats };
