const axios = require('axios');

const hasCredentials = () =>
  process.env.HUBTEL_CLIENT_ID &&
  process.env.HUBTEL_CLIENT_SECRET &&
  process.env.HUBTEL_SENDER_ID;

async function sendSms(phone, message) {
  if (!phone) return { success: false, error: 'No phone number' };

  const normalised = phone.replace(/\s+/g, '').replace(/^\+/, '');

  if (!hasCredentials()) {
    console.log(`[SMS-STUB] To: ${normalised} | Msg: ${message.slice(0, 80)}...`);
    return { success: true, messageId: `stub-${Date.now()}`, provider: 'stub' };
  }

  try {
    const response = await axios.get('https://smsc.hubtel.com/v1/messages/send', {
      params: {
        clientsecret: process.env.HUBTEL_CLIENT_SECRET,
        clientid: process.env.HUBTEL_CLIENT_ID,
        from: process.env.HUBTEL_SENDER_ID,
        to: normalised,
        content: message,
      },
      timeout: 10000,
    });
    return {
      success: response.data?.['status'] === 0 || response.status === 200,
      messageId: response.data?.['messageId'] || null,
      provider: 'hubtel',
    };
  } catch (err) {
    console.error('[SMS] Send error:', err.message);
    return { success: false, error: err.message, provider: 'hubtel' };
  }
}

async function sendBulkSms(recipients, message) {
  const results = [];
  for (const r of recipients) {
    if (!r.phone) { results.push({ name: r.name, success: false, error: 'no phone' }); continue; }
    const result = await sendSms(r.phone, message);
    results.push({ name: r.name, phone: r.phone, ...result });
    if (hasCredentials()) await new Promise(res => setTimeout(res, 150));
  }
  return results;
}

module.exports = { sendSms, sendBulkSms };
