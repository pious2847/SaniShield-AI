const { query } = require('../config/database');

class Broadcast {
  static async create(data) {
    const { rows } = await query(
      `INSERT INTO broadcasts
        (title, message, sms_message, broadcast_type, target_districts, target_communities,
         target_audience, severity, generated_by, created_by, ai_context)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [
        data.title, data.message, data.sms_message||null, data.broadcast_type,
        data.target_districts||null, data.target_communities||null,
        data.target_audience||['all'], data.severity||'info',
        data.generated_by||'ai', data.created_by||null,
        data.ai_context ? JSON.stringify(data.ai_context) : null,
      ]
    );
    return rows[0];
  }

  static async findById(id) {
    const { rows } = await query('SELECT * FROM broadcasts WHERE id=$1', [id]);
    return rows[0]||null;
  }

  static async findAll({ status, broadcast_type, limit=50 } = {}) {
    const conds=[]; const params=[];
    if (status) { conds.push(`status=$${params.length+1}`); params.push(status); }
    if (broadcast_type) { conds.push(`broadcast_type=$${params.length+1}`); params.push(broadcast_type); }
    params.push(limit);
    const where = conds.length ? `WHERE ${conds.join(' AND ')}` : '';
    const { rows } = await query(`SELECT * FROM broadcasts ${where} ORDER BY created_at DESC LIMIT $${params.length}`, params);
    return rows;
  }

  static async updateStatus(id, status, counters={}) {
    const { rows } = await query(
      `UPDATE broadcasts SET status=$1, sent_at=CASE WHEN $1='sent' THEN NOW() ELSE sent_at END,
       total_recipients=COALESCE($2, total_recipients),
       sent_sms=COALESCE($3, sent_sms),
       delivered_socket=COALESCE($4, delivered_socket)
       WHERE id=$5 RETURNING *`,
      [status, counters.total_recipients||null, counters.sent_sms||null, counters.delivered_socket||null, id]
    );
    return rows[0];
  }

  static async addRecipient(data) {
    const { rows } = await query(
      `INSERT INTO broadcast_recipients
        (broadcast_id, recipient_type, recipient_ref_id, name, phone, district, community)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
      [data.broadcast_id, data.recipient_type, data.recipient_ref_id||null,
       data.name, data.phone||null, data.district||null, data.community||null]
    );
    return rows[0];
  }

  static async markSmsSent(recipientId, status='sent') {
    await query(
      `UPDATE broadcast_recipients SET sms_status=$1, sent_at=NOW() WHERE id=$2`,
      [status, recipientId]
    );
  }

  static async markSocketDelivered(broadcastId) {
    await query(
      `UPDATE broadcast_recipients SET socket_delivered=true WHERE broadcast_id=$1`,
      [broadcastId]
    );
  }

  static async getRecipients(broadcastId) {
    const { rows } = await query(
      `SELECT * FROM broadcast_recipients WHERE broadcast_id=$1 ORDER BY created_at`,
      [broadcastId]
    );
    return rows;
  }

  static async recent(hours=24) {
    const { rows } = await query(
      `SELECT * FROM broadcasts WHERE created_at >= NOW() - ($1||' hours')::INTERVAL ORDER BY created_at DESC`,
      [hours]
    );
    return rows;
  }
}

module.exports = Broadcast;
