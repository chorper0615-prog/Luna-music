import { NeteaseMusicApi, jsonResponse, getCookie } from './_shared.mjs';

export async function handler(event) {
  const cookie = getCookie(event);

  try {
    if (cookie && NeteaseMusicApi?.logout) {
      try {
        await NeteaseMusicApi.logout({ cookie });
      } catch (e) {
        console.warn('Logout API error:', e.message);
      }
    }
  } catch (e) {
    console.warn('Logout error:', e.message);
  }

  return jsonResponse(200, { code: 200, message: 'Logged out' });
}
