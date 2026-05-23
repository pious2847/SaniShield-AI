const { GoogleGenerativeAI } = require('@google/generative-ai');

let genAI;

function getClient() {
  if (!genAI) {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not set in environment variables');
    }
    genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  }
  return genAI;
}

// Model fallback chain — 2.5-flash is primary on this project, 2.0-flash as fallback
const MODEL_CHAIN = ['gemini-2.5-flash', 'gemini-2.0-flash'];

function getModel(modelId = MODEL_CHAIN[0]) {
  return getClient().getGenerativeModel({ model: modelId });
}

function extractRetryDelay(err) {
  try {
    const match = err.message?.match(/retryDelay.*?(\d+)s/);
    if (match) return parseInt(match[1], 10);
    const secMatch = err.message?.match(/retry in ([\d.]+)s/i);
    if (secMatch) return Math.ceil(parseFloat(secMatch[1]));
  } catch {}
  return 30;
}

async function safeGenerate(prompt) {
  let lastErr;
  for (const modelId of MODEL_CHAIN) {
    try {
      const model = getModel(modelId);
      const result = await model.generateContent(prompt);
      return result.response.text();
    } catch (err) {
      lastErr = err;
      const is429 = err.message?.includes('429') || err.status === 429;
      if (is429) {
        console.warn(`[Gemini] 429 on ${modelId}, trying next model…`);
        continue;
      }
      console.error(`[Gemini] Error on ${modelId}:`, err.message);
      throw err;
    }
  }
  // All models exhausted — attach retry info so controller can forward it
  const retryAfter = extractRetryDelay(lastErr);
  const rateLimitErr = new Error('Gemini quota exceeded across all models');
  rateLimitErr.isRateLimit = true;
  rateLimitErr.retryAfter = retryAfter;
  throw rateLimitErr;
}

/**
 * Analyze sensor data and predict overflow risk
 */
async function predictOverflowRisk(unit, sensorReading, fillTrend) {
  const hoursToFull = fillTrend.rate_per_hour > 0
    ? Math.round((100 - sensorReading.fill_level_percent) / fillTrend.rate_per_hour)
    : null;

  const prompt = `
You are an AI sanitation engineer for N.E.X.U.S., a smart sanitation monitoring system in Northern Ghana.

Analyze the following data for a sanitation unit and provide an overflow risk assessment.

SANITATION UNIT:
- Name: ${unit.name}
- Type: ${unit.unit_type}
- Location: ${unit.location_name}, ${unit.district} District
- Is School Facility: ${unit.is_school ? `Yes - ${unit.school_name} (${unit.student_population || 'unknown'} students)` : 'No'}
- Elevation: ${unit.elevation_meters || 'unknown'} meters
- Flood Zone Risk: ${unit.flood_zone_risk}

CURRENT SENSOR READINGS:
- Waste Fill Level: ${sensorReading.fill_level_percent}%
- Water Level Around Unit: ${sensorReading.water_level_cm} cm
- Temperature: ${sensorReading.temperature_celsius || 'N/A'}°C
- Humidity: ${sensorReading.humidity_percent || 'N/A'}%
- Hazardous Gas (ppm): ${sensorReading.gas_ppm || 0}
- Battery: ${sensorReading.battery_percent}%

FILL RATE TREND (last 6 hours):
- Fill rate: ${fillTrend.rate_per_hour}% per hour
- Estimated time to full capacity: ${hoursToFull !== null ? `${hoursToFull} hours` : 'Cannot calculate'}

Respond ONLY with a valid JSON object in this exact format:
{
  "risk_level": "low|moderate|high|critical",
  "risk_score": <number 0-100>,
  "predicted_overflow_hours": <number or null>,
  "confidence_percent": <number 0-100>,
  "reasoning": "<2-3 sentence explanation>",
  "recommendations": [
    "<action 1>",
    "<action 2>",
    "<action 3>"
  ],
  "sms_message": "<concise SMS alert message under 160 chars if risk is high/critical, else null>"
}`;

  const text = await safeGenerate(prompt);
  return parseJsonResponse(text);
}

/**
 * Analyze weather + sensor data to predict flood-driven sanitation failure
 */
async function predictFloodRisk(unit, sensorReading, weatherData) {
  const prompt = `
You are an AI sanitation flood risk analyst for N.E.X.U.S. in Northern Ghana.

Analyze this data and predict flood-driven sanitation system failure risk.

SANITATION UNIT:
- Name: ${unit.name}
- Location: ${unit.location_name}, ${unit.district} District
- Type: ${unit.unit_type}
- Is School: ${unit.is_school ? `Yes - ${unit.school_name}` : 'No'}
- Elevation: ${unit.elevation_meters || 'unknown'} meters
- Known Flood Zone Risk: ${unit.flood_zone_risk}

CURRENT SENSOR STATE:
- Fill Level: ${sensorReading.fill_level_percent}%
- Water Level Around Unit: ${sensorReading.water_level_cm} cm
- Humidity: ${sensorReading.humidity_percent || 'N/A'}%

WEATHER FORECAST (next 24 hours):
- Current rainfall (mm): ${weatherData?.current?.precipitation || 0}
- Forecast total rain (mm): ${weatherData?.forecast?.total_precipitation_24h || 0}
- Max precipitation rate: ${weatherData?.forecast?.max_precipitation_rate || 0} mm/hr
- Current wind speed: ${weatherData?.current?.windspeed || 0} km/h
- Season context: ${weatherData?.season || 'wet season'}

Respond ONLY with a valid JSON object:
{
  "risk_level": "low|moderate|high|critical",
  "risk_score": <number 0-100>,
  "flood_intrusion_risk_hours": <estimated hours until potential flood intrusion, or null>,
  "confidence_percent": <number 0-100>,
  "reasoning": "<2-3 sentence explanation focused on flood + sanitation interaction>",
  "recommendations": [
    "<action 1>",
    "<action 2>",
    "<action 3>"
  ],
  "sms_message": "<concise SMS alert under 160 chars if risk is high/critical, else null>",
  "evacuate_school": <boolean>
}`;

  const text = await safeGenerate(prompt);
  return parseJsonResponse(text);
}

/**
 * Generate maintenance schedule optimization for a set of units
 */
async function generateMaintenancePlan(units, recentReadings) {
  const unitSummaries = units.slice(0, 10).map(u => {
    const reading = recentReadings.find(r => r.unit_id === u.id);
    return `- ${u.name} (${u.district}): Fill ${reading?.fill_level_percent || 'N/A'}%, Status: ${u.status}, Last maintained: ${u.last_maintained || 'unknown'}`;
  }).join('\n');

  const prompt = `
You are a sanitation maintenance coordinator for N.E.X.U.S. in Northern Ghana.

Optimize the maintenance schedule for these sanitation units:

${unitSummaries}

Respond ONLY with a valid JSON object:
{
  "priority_units": [
    {
      "unit_name": "<name>",
      "urgency": "immediate|this_week|this_month",
      "reason": "<one sentence>",
      "action": "<specific action needed>"
    }
  ],
  "optimal_routes": [
    "<route description combining nearby units>"
  ],
  "general_recommendations": [
    "<recommendation 1>",
    "<recommendation 2>"
  ],
  "estimated_worker_days": <number>
}`;

  const text = await safeGenerate(prompt);
  return parseJsonResponse(text);
}

/**
 * Analyze a community incident report with NLP
 */
async function analyzeCommunityReport(report, unitContext) {
  const prompt = `
You are an AI triage assistant for N.E.X.U.S., a sanitation emergency system in Northern Ghana.

A community member has submitted this sanitation incident report:

REPORT:
- Type: ${report.report_type}
- Description: "${report.description}"
- Severity reported by user: ${report.severity}
- Location: ${unitContext?.location_name || 'Unknown'}, ${unitContext?.district || 'Unknown'} District
- Nearby unit: ${unitContext?.name || 'Not specified'} (${unitContext?.unit_type || 'unknown type'})

Respond ONLY with a valid JSON object:
{
  "validated_severity": "low|moderate|high|critical",
  "category": "<health_risk|infrastructure_damage|overflow|contamination|hygiene|safety>",
  "is_emergency": <boolean>,
  "required_response": "<immediate|within_24h|within_week|routine>",
  "analysis": "<2 sentence assessment>",
  "action_items": [
    "<specific action 1>",
    "<specific action 2>"
  ],
  "public_health_risk": <boolean>
}`;

  const text = await safeGenerate(prompt);
  return parseJsonResponse(text);
}

/**
 * Generate district-wide sanitation intelligence summary for dashboard
 */
async function generateDistrictSummary(district, stats) {
  const prompt = `
You are a public health AI analyst for N.E.X.U.S. in Northern Ghana.

Generate an intelligence briefing for ${district} District:

STATISTICS:
- Total sanitation units: ${stats.total_units}
- Critical status units: ${stats.critical_units}
- High-risk flood zones: ${stats.high_risk_units}
- Active alerts: ${stats.active_alerts}
- School units affected: ${stats.school_units_at_risk}
- Recent community reports (48h): ${stats.recent_reports}
- Average fill level: ${stats.avg_fill_level}%

Respond ONLY with a valid JSON object:
{
  "district_risk_level": "low|moderate|high|critical",
  "headline": "<one impactful headline sentence>",
  "key_concerns": [
    "<concern 1>",
    "<concern 2>",
    "<concern 3>"
  ],
  "immediate_actions": [
    "<action 1>",
    "<action 2>"
  ],
  "positive_notes": "<what is working well, one sentence>",
  "population_at_risk": "<estimated description>"
}`;

  const text = await safeGenerate(prompt);
  return parseJsonResponse(text);
}

function parseJsonResponse(text) {
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) return JSON.parse(match[0]);
    throw new Error('Gemini returned non-JSON response');
  }
}

async function generateBroadcast(triggerContext, targetDistricts) {
  const prompt = `
You are an AI emergency broadcast system for N.E.X.U.S. in Northern Ghana.

Generate an emergency broadcast alert based on this trigger event:
TRIGGER: ${JSON.stringify(triggerContext)}
TARGET DISTRICTS: ${targetDistricts.join(', ')}

Respond ONLY with a valid JSON object:
{
  "title": "<short alert title, max 80 chars>",
  "message": "<full broadcast message in clear language for Northern Ghana communities, 2-4 sentences>",
  "sms_message": "<SMS version max 160 chars — include district name and core action>",
  "broadcast_type": "weather_warning|flood_risk|health_advisory|maintenance_notice|evacuation|general_info",
  "severity": "info|warning|critical|emergency",
  "ai_context": {
    "trigger_summary": "<one sentence>",
    "affected_population_estimate": "<description>",
    "recommended_actions": ["<action 1>", "<action 2>", "<action 3>"]
  }
}`;
  const text = await safeGenerate(prompt);
  return parseJsonResponse(text);
}

async function answerHygieneQuestion(question, userContext = {}) {
  const prompt = `
You are an AI hygiene educator for N.E.X.U.S., serving communities in Northern Ghana.
Provide practical, culturally appropriate sanitation and hygiene guidance.

USER QUESTION: "${question}"
CONTEXT: District: ${userContext.district || 'Northern Ghana'}, Language preference: ${userContext.language || 'English'}

Respond ONLY with a valid JSON object:
{
  "answer": "<clear, practical answer in 2-4 sentences appropriate for rural Northern Ghana>",
  "key_points": [
    "<practical key point 1>",
    "<practical key point 2>",
    "<practical key point 3>"
  ],
  "local_context": "<one sentence specific to Northern Ghana communities, climate, or culture>",
  "language_note": "<optional: note if Dagbani/Twi phrase would help, else null>",
  "urgency": "informational|advisory|urgent"
}`;
  const text = await safeGenerate(prompt);
  return parseJsonResponse(text);
}

async function analyzeIllegalDump(dumpData, nearbyContext = {}) {
  const prompt = `
You are an AI environmental health analyst for N.E.X.U.S. in Northern Ghana.

Analyze this illegal dump site report:
DUMP SITE:
- Location: ${dumpData.community || 'Unknown'}, ${dumpData.district} District
- Description: ${dumpData.description || 'Not provided'}
- Severity reported: ${dumpData.severity}
- Waste types: ${dumpData.waste_types || 'Unknown'}
- Estimated volume: ${dumpData.estimated_volume_m3 || 'Unknown'} m³
NEARBY CONTEXT: Schools within 500m: ${nearbyContext.nearby_schools || 0}, Water sources: ${nearbyContext.water_sources || 'unknown'}

Respond ONLY with a valid JSON object:
{
  "severity_assessment": "low|moderate|high|critical",
  "health_risk": "<2 sentence health risk description>",
  "environmental_impact": "<1 sentence>",
  "recommended_action": "<specific cleanup/containment action>",
  "assign_ngo": <boolean — should an NGO be auto-assigned?>,
  "urgency_hours": <number — hours within which action should start>,
  "estimated_cleanup_days": <number>
}`;
  const text = await safeGenerate(prompt);
  return parseJsonResponse(text);
}

async function computeHealthScore(districtData) {
  const prompt = `
You are a public health AI for N.E.X.U.S., computing sanitation health scores for Northern Ghana.

Compute a 0-100 community health score for ${districtData.district} District:
DATA:
- Registered toilets: ${districtData.toilet_count || 0}
- Average fill level: ${districtData.avg_fill_level || 0}%
- Active alerts: ${districtData.active_alerts || 0}
- Open dump sites: ${districtData.open_dump_sites || 0}
- Flood risk average: ${districtData.flood_risk_avg || 0}
- OD reports (24h): ${districtData.od_reports_24h || 0}
- Estimated population: ${districtData.population_estimate || 'unknown'}

Respond ONLY with a valid JSON object:
{
  "score": <integer 0-100, higher = healthier>,
  "components": {
    "toilet_coverage": <0-100>,
    "fill_levels": <0-100, higher = better managed>,
    "alerts": <0-100, higher = fewer alerts>,
    "dumps": <0-100, higher = fewer dump sites>,
    "flood_risk": <0-100, higher = lower risk>,
    "od_reports": <0-100, higher = fewer OD reports>
  },
  "narrative": "<2-3 sentence plain-language summary of the district's sanitation health status>",
  "priority_issues": ["<issue 1>", "<issue 2>"]
}`;
  const text = await safeGenerate(prompt);
  return parseJsonResponse(text);
}

async function generateNgoAlert(ngo, eventContext) {
  const prompt = `
You are an AI coordinator for N.E.X.U.S., alerting NGOs to sanitation emergencies in Northern Ghana.

Draft an alert message for this NGO:
NGO: ${ngo.name} (${ngo.acronym || ngo.org_type})
- Focus areas: ${Array.isArray(ngo.focus_areas) ? ngo.focus_areas.join(', ') : ngo.focus_areas}
- Service districts: ${Array.isArray(ngo.service_districts) ? ngo.service_districts.join(', ') : ngo.service_districts}
- Contact: ${ngo.contact_person}

EVENT:
${JSON.stringify(eventContext)}

Respond ONLY with a valid JSON object:
{
  "subject": "<email/notification subject line>",
  "message": "<professional alert message 3-5 sentences, address contact person by name>",
  "priority": "low|normal|high|urgent",
  "action_required": "<specific action requested from NGO>",
  "response_deadline_hours": <number>
}`;
  const text = await safeGenerate(prompt);
  return parseJsonResponse(text);
}

async function assessRiskBatch(units, weatherData) {
  const unitSummaries = units.slice(0, 15).map(u =>
    `ID:${u.id} Name:${u.name} District:${u.district} Fill:${u.latest_fill || 'N/A'}% FloodZone:${u.flood_zone_risk} Status:${u.status}`
  ).join('\n');

  const prompt = `
You are a rapid risk assessment AI for N.E.X.U.S. in Northern Ghana.

Weather context: Total precip 24h: ${weatherData?.forecast?.total_precipitation_24h || 0}mm, Season: ${weatherData?.season || 'unknown'}

Assess risk for each unit:
${unitSummaries}

Respond ONLY with a valid JSON array (not wrapped in an object):
[
  {
    "unit_id": "<id>",
    "risk_level": "low|moderate|high|critical",
    "risk_score": <0-100>,
    "action": "<specific action needed or 'monitor'>",
    "requires_alert": <boolean>
  }
]`;
  const text = await safeGenerate(prompt);
  const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  try {
    const parsed = JSON.parse(cleaned);
    return Array.isArray(parsed) ? parsed : parsed.assessments || [];
  } catch {
    const match = cleaned.match(/\[[\s\S]*\]/);
    if (match) return JSON.parse(match[0]);
    return [];
  }
}

async function summarizeNewsForContext(articles) {
  const summaries = articles.slice(0, 10).map((a, i) =>
    `${i+1}. [${a.source_name}] ${a.headline}${a.summary ? ': ' + a.summary.slice(0, 150) : ''}`
  ).join('\n');

  const prompt = `
You are a news analyst for N.E.X.U.S., monitoring flood and sanitation news relevant to Northern Ghana.

Analyze these recent articles:
${summaries}

Respond ONLY with a valid JSON object:
{
  "summary": "<2-3 sentence synthesis of the key sanitation/flood news>",
  "key_themes": ["<theme 1>", "<theme 2>", "<theme 3>"],
  "affected_districts": ["<district names mentioned or inferred>"],
  "flood_risk_level": "low|moderate|high|critical",
  "sanitation_concerns": ["<concern 1>", "<concern 2>"],
  "actionable_insights": "<one sentence recommendation for N.E.X.U.S. operators>"
}`;
  const text = await safeGenerate(prompt);
  return parseJsonResponse(text);
}

async function generateBlogPost(topic, context = {}) {
  const prompt = `
You are a content writer for N.E.X.U.S., Northern Ghana's AI-powered sanitation platform.

Write a compelling, informative blog post about: "${topic}"
Context: District focus: ${context.district || 'Northern Ghana'}, Platform: N.E.X.U.S. sanitation monitoring system

The post should be:
- Practical and relevant to Northern Ghana communities
- Educational about sanitation, hygiene, or flood safety
- Written in clear accessible English
- Use markdown formatting (##, ###, **bold**, bullet points)
- 300-500 words

Respond ONLY with a valid JSON object:
{
  "title": "<engaging post title>",
  "summary": "<2-3 sentence hook/preview for the post>",
  "content": "<full post content in markdown, 300-500 words>",
  "tags": ["<tag1>", "<tag2>", "<tag3>"],
  "suggested_cover_description": "<one sentence description of an ideal cover image>"
}`;
  const text = await safeGenerate(prompt);
  return parseJsonResponse(text);
}

async function assessInfrastructureVulnerability(asset, context = {}) {
  const prompt = `
You are a climate resilience engineer for N.E.X.U.S., assessing sanitation infrastructure vulnerability in Northern Ghana.

Assess the climate vulnerability of this asset:
ASSET:
- Name: ${asset.name || asset.owner_name || 'Unknown'}
- Type: ${asset.unit_type || asset.toilet_type || 'sanitation_unit'}
- District: ${asset.district}
- Community: ${asset.community || 'Unknown'}
- Condition: ${asset.condition || asset.status || 'unknown'}
- Elevation (meters): ${asset.elevation_meters || 'unknown'}
- Flood Zone Risk: ${asset.flood_zone_risk || 'unknown'}
- Fill Level (%): ${context.fill_level || 'unknown'}
- Proximity to water body: ${context.proximity_to_water || 'unknown'}

CLIMATE CONTEXT:
- Recent rainfall (mm): ${context.recent_rainfall_mm || 'unknown'}
- Season: ${context.season || 'wet season'}

Respond ONLY with a valid JSON object:
{
  "vulnerability_score": <integer 0-100, higher = more vulnerable>,
  "factors": {
    "flood_zone": <0-40 score component>,
    "elevation": <0-20 score component>,
    "condition": <0-20 score component>,
    "fill_level": <0-20 score component>,
    "proximity_to_water": <0-10 score component>
  },
  "risk_summary": "<2-sentence explanation of key vulnerability drivers>",
  "recommended_upgrades": [
    "<upgrade 1>",
    "<upgrade 2>",
    "<upgrade 3>"
  ],
  "climate_resilience_rating": "poor|fair|good|excellent"
}`;
  const text = await safeGenerate(prompt);
  return parseJsonResponse(text);
}

const NORTHERN_DISTRICTS = [
  'Tamale Metro','Sagnarigu','Tolon','Kumbungu','Nanton','Savelugu','Karaga',
  'Gushegu','Yendi','Northern','Bolgatanga','Navrongo','Bawku','Wa','Damongo',
  'Bole','Salaga','Nalerigu','Gambaga','Walewale','Savannah','Upper East','Upper West','North East',
];

async function processNewsArticle(article) {
  const prompt = `You are the AI intelligence engine for N.E.X.U.S., a sanitation monitoring platform in Northern Ghana.

Analyze this news article and extract structured information for the NEXUS platform.

Article:
HEADLINE: ${article.headline}
SOURCE: ${article.source_name}
SUMMARY: ${article.summary || '(no summary)'}

Known Northern Ghana districts/regions: ${NORTHERN_DISTRICTS.join(', ')}

Respond ONLY with a valid JSON object:
{
  "sentiment": "positive|negative|neutral",
  "event_type": "flood|cholera_outbreak|sanitation_failure|infrastructure_damage|disease_alert|policy_announcement|community_initiative|general",
  "affected_districts": ["list only Northern Ghana districts/regions mentioned, empty array if none"],
  "nexus_summary": "<1-2 sentence summary focused on WASH/sanitation/flood impact for Northern Ghana field workers>",
  "is_flood_related": true|false,
  "is_sanitation_related": true|false,
  "relevance_score": <0-10, 10 = directly about Northern Ghana WASH crisis>,
  "suggested_sources": ["<any news source URLs or RSS feed URLs mentioned or linked in the article that could be valuable for future crawling — empty array if none>"]
}`;
  try {
    const text = await safeGenerate(prompt);
    return parseJsonResponse(text);
  } catch (err) {
    console.error('[Gemini] processNewsArticle error:', err.message);
    return null;
  }
}

module.exports = {
  safeGenerate,
  processNewsArticle,
  predictOverflowRisk,
  predictFloodRisk,
  generateMaintenancePlan,
  analyzeCommunityReport,
  generateDistrictSummary,
  generateBroadcast,
  answerHygieneQuestion,
  analyzeIllegalDump,
  computeHealthScore,
  generateNgoAlert,
  assessRiskBatch,
  summarizeNewsForContext,
  generateBlogPost,
  assessInfrastructureVulnerability,
  processNewsArticle,
};
