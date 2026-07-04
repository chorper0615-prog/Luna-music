import { jsonResponse, getCookie, buildCookieHeaders } from './_shared.mjs';

export async function handler(event) {
  const cookie = getCookie(event);

  if (!cookie) {
    return jsonResponse(200, { code: 200, data: { isLoggedIn: false } });
  }

  try {
    const resp = await fetch('https://music.163.com/api/w/nuser/account/get', {
      headers: buildCookieHeaders(cookie),
    });
    const data = await resp.json();
    if (data.code === 200 && data.account && data.profile) {
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
