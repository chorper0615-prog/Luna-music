import { jsonResponse, buildHeaders } from './_shared.mjs';

export async function handler(event) {
  const key = event.queryStringParameters?.key || '';

  if (!key) {
    return jsonResponse(400, { code: 400, message: 'Missing key' });
  }

  try {
    const resp = await fetch(`https://music.163.com/api/login/qrcode/client/login?key=${key}&type=1`, {
      headers: buildHeaders(),
    });
    const data = await resp.json();
    const code = data.code || 800;
    let message = '';
    let cookie = '';

    if (code === 800) message = '二维码已过期';
    else if (code === 801) message = '等待扫码';
    else if (code === 802) message = '已扫码，请在手机上确认';
    else if (code === 803) {
      message = '登录成功';
      
      // 方式1：使用 getSetCookie() 获取所有 Set-Cookie headers（Node.js 18+）
      if (typeof resp.headers.getSetCookie === 'function') {
        const setCookies = resp.headers.getSetCookie();
        if (setCookies && setCookies.length > 0) {
          cookie = setCookies.map(c => c.split(';')[0]).join('; ');
        }
      }
      
      // 方式2：从单个 set-cookie header 获取（多个cookie可能用逗号分隔）
      if (!cookie) {
        const setCookie = resp.headers.get('set-cookie') || '';
        if (setCookie) {
          const cookies = setCookie.split(/,(?=\s*[a-zA-Z_])/);
          cookie = cookies.map(c => c.split(';')[0]).join('; ');
        }
      }
      
      // 方式3：从 body 中获取（某些API版本会在body中返回cookie）
      if (!cookie && data.cookie) {
        cookie = data.cookie;
      }
      
      console.log('Login successful, cookie length:', cookie.length);
    }

    return jsonResponse(200, { code, message, cookie });
  } catch (e) {
    console.error('QR check error:', e);
    return jsonResponse(500, { code: 500, message: e.message });
  }
}
