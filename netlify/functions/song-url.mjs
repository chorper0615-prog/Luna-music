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
      body: JSON.stringify({ status: false, msg: '缺少歌曲ID' }),
    };
  }

  try {
    const apiUrl = `${NETEASE_API}?type=url&id=${id}&server=${vendor}`;
    const resp = await fetch(apiUrl, {
      headers: {
        'User-Agent': UA,
        'Referer': 'https://music.163.com/',
      },
    });

    const data = await resp.json();
    const url = data.url || '';

    if (url) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ status: true, data: url }),
      };
    }

    // 备用方案：直接使用网易云官方接口
    try {
      const fallbackUrl = `https://music.163.com/song/media/outer/url?id=${id}.mp3`;
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ status: true, data: fallbackUrl }),
      };
    } catch (fallbackError) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ status: false, msg: '无法获取播放地址' }),
      };
    }
  } catch (e) {
    console.error('Song URL error:', e.message);

    // 出错时返回备用地址
    try {
      const fallbackUrl = `https://music.163.com/song/media/outer/url?id=${id}.mp3`;
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ status: true, data: fallbackUrl }),
      };
    } catch (fallbackError) {
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ status: false, msg: '无法获取播放地址' }),
      };
    }
  }
}
