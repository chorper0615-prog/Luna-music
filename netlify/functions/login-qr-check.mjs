import { NeteaseMusicApi, jsonResponse } from './_shared.mjs';

export async function handler(event) {
  const key = event.queryStringParameters?.key || '';

  if (!key) {
    return jsonResponse(400, { code: 400, message: 'Missing key' });
  }

  try {
    if (!NeteaseMusicApi?.login_qr_check) {
      throw new Error('QR check API not available');
    }

    const result = await NeteaseMusicApi.login_qr_check({ key });
    const data = result?.body || {};
    const code = data.code || 800;
    const message = data.message || (code === 803 ? '登录成功' : '');
    const cookie = data.cookie || '';

    return jsonResponse(200, { code, message, cookie });
  } catch (e) {
    return jsonResponse(500, { code: 500, message: e.message });
  }
}
