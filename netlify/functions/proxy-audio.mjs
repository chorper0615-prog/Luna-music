const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36';

function getAudioContentType(url) {
  const lowerUrl = url.toLowerCase();
  if (lowerUrl.includes('.mp3')) return 'audio/mpeg';
  if (lowerUrl.includes('.wav')) return 'audio/wav';
  if (lowerUrl.includes('.ogg') || lowerUrl.includes('.oga')) return 'audio/ogg';
  if (lowerUrl.includes('.m4a') || lowerUrl.includes('.aac')) return 'audio/aac';
  if (lowerUrl.includes('.flac')) return 'audio/flac';
  if (lowerUrl.includes('.webm')) return 'audio/webm';
  return 'audio/mpeg';
}

export async function handler(event) {
  const audioUrl = event.queryStringParameters?.url || '';

  if (!audioUrl) {
    return {
      statusCode: 400,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Missing url parameter' }),
    };
  }

  try {
    const decodedUrl = decodeURIComponent(audioUrl);
    const rangeHeader = event.headers['range'];

    const fetchHeaders = {
      'User-Agent': UA,
      'Referer': 'https://music.163.com/',
    };
    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    const audioResp = await fetch(decodedUrl, {
      headers: fetchHeaders,
    });

    if (!audioResp.ok && audioResp.status !== 206) {
      return {
        statusCode: 502,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({ error: 'Audio fetch failed: ' + audioResp.status }),
      };
    }

    const ct = getAudioContentType(decodedUrl);
    const contentLength = audioResp.headers.get('content-length');
    const contentRange = audioResp.headers.get('content-range');

    const headers = {
      'Content-Type': ct,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges',
      'Accept-Ranges': 'bytes',
    };
    if (contentRange) headers['Content-Range'] = contentRange;
    if (contentLength) headers['Content-Length'] = contentLength;

    const arrayBuffer = await audioResp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return {
      statusCode: audioResp.status === 206 ? 206 : 200,
      headers,
      body: buffer.toString('base64'),
      isBase64Encoded: true,
    };
  } catch (e) {
    console.error('Proxy audio error:', e.message);
    return {
      statusCode: 502,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({ error: 'Audio proxy error: ' + e.message }),
    };
  }
}
