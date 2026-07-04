import { jsonResponse, buildHeaders } from './_shared.mjs';

export async function handler() {
  try {
    const resp = await fetch('https://music.163.com/api/login/qrcode/unikey', {
      method: 'POST',
      headers: {
        ...buildHeaders(),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'type=1',
    });
    const data = await resp.json();
    if (data.code === 200 && data.unikey) {
      return jsonResponse(200, { code: 200, data: { unikey: data.unikey } });
    }
    return jsonResponse(500, { code: 500, message: '获取二维码Key失败', raw: data });
  } catch (e) {
    return jsonResponse(500, { code: 500, message: e.message });
  }
}
