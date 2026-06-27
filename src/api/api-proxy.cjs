"use strict";
const http = require("http");
const PORT = 3001;
const COLORS = ["#ff6b6b","#ff8f5a","#ffb347","#ffd166","#7bdff2","#6c8cff","#9d7bff","#ff7eb6","#5eead4","#34d399"];
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36";
const CLOUD_API = "http://localhost:3000";

function sJSON(res, status, data) {
  res.writeHead(status, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
  res.end(JSON.stringify(data));
}

function parseURL(urlStr) {
  const u = new URL(urlStr.startsWith("http") ? urlStr : "http://localhost" + urlStr);
  const params = {};
  for (const [k, v] of u.searchParams) params[k] = v;
  return { path: u.pathname, params };
}

async function neteaseSearch(keyword, page, limit) {
  try {
    var url = "https://music.163.com/api/search/get/web?csrf_token=&s=" + encodeURIComponent(keyword) + "&type=1&limit=" + limit + "&offset=" + (page * limit);
    var resp = await fetch(url, { headers: { "User-Agent": UA, "Referer": "https://music.163.com/" } });
    var data = await resp.json();
    if (data.code !== 200 || !data.result || !data.result.songs) return { total: 0, songs: [] };
    var songs = data.result.songs.map(function(item, i) {
      var name = item.name || "";
      return {
        songId: item.id, name: name,
        artist: (item.artists || []).map(function(a) { return a.name; }).filter(Boolean).join(" / ") || "未知",
        album: (item.album && item.album.name) || "",
        cover: (item.album && item.album.picUrl) || "",
        duration: Math.floor((item.duration || 0) / 1000),
        vendor: "netease", color: COLORS[i % COLORS.length]
      };
    });
    var songsWithoutCover = songs.filter(function(s) { return !s.cover; });
    if (songsWithoutCover.length > 0) {
      try {
        var ids = songsWithoutCover.map(function(s) { return s.songId; });
        var detResp = await fetch("https://music.163.com/api/song/detail?ids=[" + ids.join(",") + "]", {
          headers: { "User-Agent": UA, "Referer": "https://music.163.com/" }
        });
        var detData = await detResp.json();
        if (detData.songs) {
          var coverMap = {};
          detData.songs.forEach(function(s) { if (s.album && s.album.picUrl) coverMap[s.id] = s.album.picUrl; });
          songs.forEach(function(s) { if (coverMap[s.songId]) s.cover = coverMap[s.songId]; });
        }
      } catch(e) {}
    }
    songs.forEach(function(s) { if (!s.cover) s.cover = "https://picsum.photos/seed/" + encodeURIComponent(s.name) + "/300/300"; });
    return { total: data.result.songCount || songs.length, songs: songs };
  } catch (e) { console.error("Search error:", e.message); return { total: 0, songs: [] }; }
}

// Returns the RAW audio URL. Frontend wraps it in /api/proxy-audio?url=
async function getRawAudioUrl(songId) {
  try {
    var resp = await fetch(CLOUD_API + "/song/url?id=" + songId + "&br=128000", { signal: AbortSignal.timeout(10000) });
    var data = await resp.json();
    if (data.code === 200 && data.data && data.data[0] && data.data[0].url) return data.data[0].url;
    return null;
  } catch (e) { console.warn("CloudApi error:", e.message); return null; }
}

async function fetchAndStreamAudio(url, req, res) {
  try {
    const decodedUrl = decodeURIComponent(url);
    const rangeHeader = req.headers["range"];

    const fetchHeaders = {
      "User-Agent": UA,
      "Referer": "https://music.163.com/",
    };
    if (rangeHeader) {
      fetchHeaders["Range"] = rangeHeader;
    }

    var audioResp = await fetch(decodedUrl, {
      headers: fetchHeaders,
      signal: AbortSignal.timeout(30000)
    });

    if (!audioResp.ok && audioResp.status !== 206) {
      sJSON(res, 502, { error: "Audio fetch failed: " + audioResp.status });
      return;
    }

    var ct = audioResp.headers.get("content-type") || "audio/mpeg";
    const contentLength = audioResp.headers.get("content-length");
    const contentRange = audioResp.headers.get("content-range");
    const acceptRanges = audioResp.headers.get("accept-ranges");

    const responseHeaders = {
      "Content-Type": ct.split(";")[0],
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Range, Content-Type",
      "Access-Control-Expose-Headers": "Content-Length, Content-Range, Accept-Ranges",
    };

    if (acceptRanges) {
      responseHeaders["Accept-Ranges"] = acceptRanges;
    } else {
      responseHeaders["Accept-Ranges"] = "bytes";
    }

    if (contentRange) {
      responseHeaders["Content-Range"] = contentRange;
    }
    if (contentLength) {
      responseHeaders["Content-Length"] = contentLength;
    }

    const statusCode = audioResp.status === 206 ? 206 : 200;
    res.writeHead(statusCode, responseHeaders);

    if (audioResp.body) {
      const reader = audioResp.body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              break;
            }
            if (!res.write(Buffer.from(value))) {
              await new Promise(resolve => res.once('drain', resolve));
            }
          }
        } catch (e) {
          try { res.end(); } catch (_) {}
        }
      };
      pump();
    } else {
      var buffer = Buffer.from(await audioResp.arrayBuffer());
      if (!responseHeaders["Content-Length"]) {
        responseHeaders["Content-Length"] = buffer.length;
      }
      res.end(buffer);
    }
  } catch (e) {
    sJSON(res, 502, { error: "Audio proxy error: " + e.message });
  }
}

const server = http.createServer(async function(req, res) {
  if (req.method === "OPTIONS") { sJSON(res, 200, {}); return; }
  try {
    var parsed = parseURL(req.url);
    var p = parsed.path;
    var q = parsed.params;

    if (p === "/api/search" && q.keyword) {
      sJSON(res, 200, await neteaseSearch(q.keyword, parseInt(q.page || "0"), parseInt(q.limit || "20")));
    }
    else if (p === "/api/url" && q.id) {
      var rawUrl = await getRawAudioUrl(q.id);
      if (rawUrl) sJSON(res, 200, { status: true, data: rawUrl });
      else sJSON(res, 200, { status: false, msg: "无法获取歌曲播放地址" });
    }
    else if (p === "/api/proxy-audio" && q.url) {
      await fetchAndStreamAudio(q.url, req, res);
    }
    else if (p === "/api/lyric" && q.id) {
      try {
        var lyrResp = await fetch(CLOUD_API + "/lyric?id=" + q.id, { signal: AbortSignal.timeout(5000) });
        var lyrData = await lyrResp.json();
        if (lyrData.code === 200 && lyrData.lrc && lyrData.lrc.lyric) {
          sJSON(res, 200, { status: true, data: lyrData.lrc.lyric });
        } else { sJSON(res, 200, { status: false }); }
      } catch(e) { sJSON(res, 200, { status: false }); }
    }
    else if (p === "/api/health") { sJSON(res, 200, { status: "ok", ts: Date.now() }); }
    else { sJSON(res, 404, { error: "Not found" }); }
  } catch (err) {
    console.error("Proxy Error:", err);
    sJSON(res, 500, { error: err.message });
  }
});

server.listen(PORT, function() { console.log("Proxy on http://localhost:" + PORT); });
