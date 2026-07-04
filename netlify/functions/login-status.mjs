import { NeteaseMusicApi, jsonResponse, getCookie } from './_shared.mjs';

export async function handler(event) {
  const cookie = getCookie(event);

  if (!cookie) {
    return jsonResponse(200, { code: 200, data: { isLoggedIn: false } });
  }

  try {
    if (!NeteaseMusicApi?.login_status) {
      throw new Error('Login status API not available');
    }

    const result = await NeteaseMusicApi.login_status({ cookie });
    const data = result?.body?.data || result?.body || {};

    if (data.code === 200 && data.profile) {
      return jsonResponse(200, {
        code: 200,
        data: {
          isLoggedIn: true,
          userId: data.profile.userId,
          nickname: data.profile.nickname,
          avatarUrl: data.profile.avatarUrl,
          vipType: data.profile.vipType,
        },
      });
    }
  } catch (e) {
    console.warn('Login status check failed:', e.message);
  }

  return jsonResponse(200, { code: 200, data: { isLoggedIn: false } });
}
