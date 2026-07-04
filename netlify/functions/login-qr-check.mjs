import { NeteaseMusicApi, jsonResponse } from './_shared.mjs';

export async function handler(event) {
  const key = event.queryStringParameters?.key || '';

  if (!key) {
    return jsonResponse(400, { code: 400, message: 'Missing key' });
  }

  if (!NeteaseMusicApi?.login_qr_check) {
    return jsonResponse(500, { code: 500, message: 'API not available' });
  }

  try {
    const result = await NeteaseMusicApi.login_qr_check({ key });
    const body = result?.body || {};
    const code = body.code || 800;

    return jsonResponse(200, {
      code,
      message: body.message || '',
      cookie: code === 803 ? (body.cookie || '') : undefined,
    });
  } catch (e) {
    return jsonResponse(500, { code: 500, message: e.message });
  }
}
