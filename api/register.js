export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  try {
    const { phone, name, userAgent } = req.body || {};
    
    // Validate phone
    if (!phone || !/^1\d{10}$/.test(phone)) {
      return res.status(400).json({ ok: false, error: 'Invalid phone number' });
    }

    const record = {
      phone,
      name: name || '未填写',
      userAgent: userAgent || '',
      ip: req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || 'unknown',
      timestamp: new Date().toISOString(),
      source: 'bjc-check-site'
    };

    // Forward to webhook if configured
    const webhookUrl = process.env.WEBHOOK_URL;
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(record)
        });
      } catch (e) {
        console.error('Webhook failed:', e.message);
      }
    }

    // Forward to Feishu Bitable if configured
    const feishuWebhook = process.env.FEISHU_WEBHOOK;
    if (feishuWebhook) {
      try {
        await fetch(feishuWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            msg_type: 'interactive',
            card: {
              header: {
                title: { tag: 'plain_text', content: '🆕 新用户注册 - 保健品自查' },
                template: 'green'
              },
              elements: [
                { tag: 'div', text: { tag: 'lark_md', content: `**手机号：**${record.phone}` } },
                { tag: 'div', text: { tag: 'lark_md', content: `**称呼：**${record.name}` } },
                { tag: 'div', text: { tag: 'lark_md', content: `**时间：**${record.timestamp}` } },
                { tag: 'div', text: { tag: 'lark_md', content: `**IP：**${record.ip}` } }
              ]
            }
          })
        });
      } catch (e) {
        console.error('Feishu webhook failed:', e.message);
      }
    }

    // Log for Vercel dashboard
    console.log('REGISTER:', JSON.stringify(record));

    return res.status(200).json({ ok: true, message: '注册成功' });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ ok: false, error: 'Internal error' });
  }
}
