import { NeteaseMusicApi, jsonResponse } from './_shared.mjs';

export async function handler() {
  if (!NeteaseMusicApi?.login_qr_key) {
    return jsonResponse(500, { code: 500, message: 'API not available' });
  }

  try {
    const result = await NeteaseMusicApi.login_qr_key({});
    return jsonResponse(200, { code: 200, data: result?.body?.data || {} });
  } catch (e) {
    return jsonResponse(500, { code: 500, message: e.message });
  }
}
