import { NeteaseMusicApi, jsonResponse, getCookie } from './_shared.mjs';

export async function handler(event) {
  const cookie = getCookie(event);

  if (!cookie || !NeteaseMusicApi?.login_status) {
    return jsonResponse(200, { code: 200, data: { isLoggedIn: false } });
  }

  try {
    const result = await NeteaseMusicApi.login_status({ cookie });
    const body = result?.body?.data || result?.body;
    if (body?.code === 200 && body?.profile) {
      const profile = body.profile;
      return jsonResponse(200, {
        code: 200,
        data: {
          isLoggedIn: true,
          userId: profile.userId,
          nickname: profile.nickname,
          avatarUrl: profile.avatarUrl,
          vipType: profile.vipType,
        },
      });
    }
  } catch (e) {
    console.warn('Login status check failed:', e.message);
  }

  return jsonResponse(200, { code: 200, data: { isLoggedIn: false } });
}
