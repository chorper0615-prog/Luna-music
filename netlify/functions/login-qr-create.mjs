import { NeteaseMusicApi, jsonResponse } from './_shared.mjs';

export async function handler(event) {
  const key = event.queryStringParameters?.key || '';

  if (!key) {
    return jsonResponse(400, { code: 400, message: 'Missing key' });
  }

  if (!NeteaseMusicApi?.login_qr_create) {
    return jsonResponse(500, { code: 500, message: 'API not available' });
  }

  try {
    const result = await NeteaseMusicApi.login_qr_create({ key, qrimg: true });
    return jsonResponse(200, { code: 200, data: result?.body?.data || {} });
  } catch (e) {
    return jsonResponse(500, { code: 500, message: e.message });
  }
}
