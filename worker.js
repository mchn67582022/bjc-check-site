export default {
  async fetch(request) {
    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }

    try {
      const data = await request.json();
      const { phone, name } = data;

      // Validate phone number
      if (!phone || !/^1\d{10}$/.test(phone)) {
        return new Response(JSON.stringify({ error: '请输入正确的11位手机号' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        });
      }

      // Forward to Feishu webhook if configured
      const feishuWebhook = typeof FEISHU_WEBHOOK !== 'undefined' ? FEISHU_WEBHOOK : '';
      if (feishuWebhook) {
        const feishuMsg = {
          msg_type: 'interactive',
          card: {
            header: {
              title: { tag: 'plain_text', content: '📱 新用户注册' },
              template: 'green',
            },
            elements: [
              { tag: 'div', text: { tag: 'lark_md', content: `**手机号：**${phone}` } },
              { tag: 'div', text: { tag: 'lark_md', content: `**称呼：**${name || '未填写'}` } },
              { tag: 'div', text: { tag: 'lark_md', content: `**时间：**${new Date().toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}` } },
            ],
          },
        };

        await fetch(feishuWebhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(feishuMsg),
        });
      }

      // Forward to generic webhook if configured
      const webhookUrl = typeof WEBHOOK_URL !== 'undefined' ? WEBHOOK_URL : '';
      if (webhookUrl) {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone, name, time: new Date().toISOString() }),
        });
      }

      return new Response(JSON.stringify({ success: true, message: '注册成功' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: '服务器错误' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
  },
};
