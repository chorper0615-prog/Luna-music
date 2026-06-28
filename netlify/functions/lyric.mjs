const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';
const NETEASE_API = 'https://api.injahow.cn/meting';

export async function handler(event) {
  const id = event.queryStringParameters?.id || '';
  const vendor = event.queryStringParameters?.vendor || 'netease';

  if (!id) {
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ status: false }),
    };
  }

  try {
    const apiUrl = `${NETEASE_API}?type=lrc&id=${id}&server=${vendor}`;
    const resp = await fetch(apiUrl, {
      headers: {
        'User-Agent': UA,
        'Referer': 'https://music.163.com/',
      },
    });

    const data = await resp.json();
    const lrc = data.lrc || '';

    if (lrc) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ status: true, data: lrc }),
      };
    }

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ status: false }),
    };
  } catch (e) {
    console.error('Lyric error:', e.message);
    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ status: false }),
    };
  }
}
