import { jsonResponse, buildHeaders } from './_shared.mjs';

export async function handler(event) {
  const key = event.queryStringParameters?.key || '';

  if (!key) {
    return jsonResponse(400, { code: 400, message: 'Missing key' });
  }

  try {
    const qrUrl = `https://music.163.com/login?codekey=${key}`;
    return jsonResponse(200, {
      code: 200,
      data: {
        qrurl: qrUrl,
        qrimg: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(qrUrl)}`,
      },
    });
  } catch (e) {
    return jsonResponse(500, { code: 500, message: e.message });
  }
}
