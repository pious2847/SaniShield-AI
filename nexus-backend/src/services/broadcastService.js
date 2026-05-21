const Broadcast = require('../models/Broadcast');
const { generateBroadcast, generateNgoAlert } = require('./geminiService');
const { sendBulkSms } = require('./smsService');
const { query } = require('../config/database');

async function resolveRecipients(districts) {
  const districtList = Array.isArray(districts) ? districts : [districts];
  const placeholders = districtList.map((_, i) => `$${i + 1}`).join(',');

  const [gatherers, agents, toiletOwners] = await Promise.all([
    query(
      `SELECT full_name AS name, phone, district, 'gatherer' AS recipient_type
       FROM gatherers WHERE district IN (${placeholders}) AND is_active=true AND phone IS NOT NULL`,
      districtList
    ),
    query(
      `SELECT na.full_name AS name, na.phone, na.district, 'ngo_agent' AS recipient_type, na.id AS ref_id
       FROM ngo_agents na
       JOIN ngos n ON na.ngo_id=n.id
       WHERE na.district IN (${placeholders}) AND na.is_active=true
         AND na.receives_ai_alerts=true AND na.phone IS NOT NULL`,
      districtList
    ),
    query(
      `SELECT owner_name AS name, owner_phone AS phone, district, 'toilet_owner' AS recipient_type
       FROM registered_toilets WHERE district IN (${placeholders}) AND owner_phone IS NOT NULL`,
      districtList
    ),
  ]);

  const seen = new Set();
  const recipients = [];
  for (const r of [...gatherers.rows, ...agents.rows, ...toiletOwners.rows]) {
    const key = r.phone;
    if (!seen.has(key)) {
      seen.add(key);
      recipients.push(r);
    }
  }
  return recipients;
}

async function createAndSend(triggerContext, targetDistricts, io) {
  let aiResult;
  try {
    aiResult = await generateBroadcast(triggerContext, Array.isArray(targetDistricts) ? targetDistricts : [targetDistricts]);
  } catch (err) {
    console.error('[Broadcast] AI generation error:', err.message);
    aiResult = {
      title: `Alert: ${triggerContext.event_type || 'Sanitation Alert'}`,
      message: triggerContext.description || 'Please be advised of a sanitation concern in your area.',
      sms_message: `NEXUS ALERT: ${(triggerContext.description || 'Sanitation concern in your area.').slice(0, 130)}`,
      broadcast_type: 'general_info',
      severity: 'warning',
      ai_context: triggerContext,
    };
  }

  const VALID_TYPES = ['weather_warning','flood_risk','health_advisory','maintenance_notice','evacuation','general_info'];
  const broadcastType = VALID_TYPES.includes(aiResult.broadcast_type) ? aiResult.broadcast_type : 'general_info';

  const broadcast = await Broadcast.create({
    title: aiResult.title,
    message: aiResult.message,
    sms_message: aiResult.sms_message,
    broadcast_type: broadcastType,
    target_districts: targetDistricts,
    severity: aiResult.severity,
    generated_by: 'ai',
    ai_context: aiResult.ai_context,
  });

  const recipients = await resolveRecipients(Array.isArray(targetDistricts) ? targetDistricts : [targetDistricts]);

  for (const r of recipients) {
    await Broadcast.addRecipient({
      broadcast_id: broadcast.id,
      recipient_type: r.recipient_type,
      recipient_ref_id: r.ref_id || null,
      name: r.name,
      phone: r.phone || null,
      district: r.district,
    });
  }

  if (io) {
    const districts = Array.isArray(targetDistricts) ? targetDistricts : [targetDistricts];
    for (const d of districts) {
      io.to(`district:${d}`).emit('broadcast', {
        id: broadcast.id,
        title: broadcast.title,
        message: broadcast.message,
        severity: broadcast.severity,
        broadcast_type: broadcast.broadcast_type,
        created_at: broadcast.created_at,
      });
    }
    io.emit('broadcast', { id: broadcast.id, title: broadcast.title, severity: broadcast.severity });
    await Broadcast.markSocketDelivered(broadcast.id);
  }

  const phoneRecipients = recipients.filter(r => r.phone);
  if (phoneRecipients.length > 0) {
    const smsResults = await sendBulkSms(phoneRecipients, aiResult.sms_message || aiResult.message);
    let sentCount = 0;
    for (let i = 0; i < smsResults.length; i++) {
      if (smsResults[i].success) sentCount++;
    }
    await Broadcast.updateStatus(broadcast.id, 'sent', {
      total_recipients: recipients.length,
      sent_sms: sentCount,
      delivered_socket: recipients.length,
    });
  } else {
    await Broadcast.updateStatus(broadcast.id, 'sent', {
      total_recipients: recipients.length,
      sent_sms: 0,
      delivered_socket: recipients.length,
    });
  }

  return { ...broadcast, recipients_count: recipients.length };
}

async function alertNgos(ngos, eventContext, io) {
  const results = [];
  for (const ngo of ngos) {
    try {
      const alert = await generateNgoAlert(ngo, eventContext);
      results.push({ ngo_id: ngo.id, ngo_name: ngo.name, alert });
      if (io) {
        io.emit('ngo_alert', { ngo_id: ngo.id, ...alert });
      }
    } catch (err) {
      console.error(`[Broadcast] NGO alert error for ${ngo.name}:`, err.message);
    }
  }
  return results;
}

module.exports = { createAndSend, resolveRecipients, alertNgos };
