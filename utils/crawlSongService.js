const axios = require('axios');
const cheerio = require('cheerio');
const { parseStringPromise } = require('xml2js');
const fs = require('fs');
const mongoose = require('mongoose');

// Kết nối MongoDB (điều chỉnh connection string nếu cần)
mongoose.connect("mongodb://localhost:27017/S5");
mongoose.connection.on('connected', async () => {
  console.log("✅ Đã kết nối MongoDB")
});

// Import model Song (đảm bảo đường dẫn khớp với file của bạn)
let Song = require('../schemas/songs');

/**
 * normalizeKeyword: chuẩn hoá chuỗi (loại bỏ dấu, ký tự đặc biệt, chuyển về chữ thường)
 */
function normalizeKeyword(keyword) {
  if (!keyword || !keyword.trim()) return "";
  return keyword.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .toLowerCase();
}

/**
 * readCookiesFromFile: Đọc file cookie.txt có định dạng:
 *   thời gian: yyyy-MM-dd HH:mm:ss
 *   cookie=key1=value1; key2=value2; ...
 */
function readCookiesFromFile(filePath) {
  const cookies = {};
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('cookie=')) {
        const rawCookie = trimmed.substring('cookie='.length);
        const parts = rawCookie.split(";");
        for (const part of parts) {
          const pair = part.trim().split('=', 2);
          if (pair.length === 2) cookies[pair[0]] = pair[1];
        }
        break; // chỉ lấy dòng đầu tiên chứa cookie
      }
    }
  } catch (error) {
    console.error("❌ Không thể đọc cookie từ file:", error.message);
  }
  return cookies;
}

/**
 * findTrackArray: Hàm đệ quy để tìm mảng các phần tử 'track' từ đối tượng được parse từ XML
 */
function findTrackArray(obj) {
  if (!obj || typeof obj !== 'object') return null;
  if (obj.track) return obj.track;
  for (const key in obj) {
    const res = findTrackArray(obj[key]);
    if (res) return res;
  }
  return null;
}

/**
 * compareSongsFromNCT: Crawl danh sách bài hát từ NCT và trả về dữ liệu cho mỗi bài
 *   - Trả về các trường: title, artist, html_url, mp3_url và status
 *   - Nếu bài đã có trong DB (theo normalized title) thì status = "Skip"
 *   - Nếu chưa có, status = "Add" và cố gắng lấy mp3_url từ API XML
 */
async function compareSongsFromNCT() {
  const resultArray = [];
  try {
    // Lấy danh sách bài hát hiện có từ DB và chuẩn hoá tiêu đề
    const existingSongs = await Song.find({});
    const dbTitles = new Set();
    existingSongs.forEach(song => {
      dbTitles.add(normalizeKeyword(song.title));
    });

    // Crawl playlist của NCT
    const playlistUrl = "https://www.nhaccuatui.com/playlist/top-100-nhac-tre-hay-nhat-various-artists.m3liaiy6vVsF.html";
    const playlistRes = await axios.get(playlistUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
    });
    const $ = cheerio.load(playlistRes.data);
    const items = $('li[itemprop="tracks"]').toArray();

    let counter = 0;
    for (const item of items) {
      if (counter >= 10) break; // Giới hạn 10 bài
      const title = $(item).find('meta[itemprop="name"]').attr('content')?.trim() || '';
      const artist = $(item).find('.name_singer').text().trim() || '';
      const html_url = $(item).find('meta[itemprop="url"]').attr('content')?.trim() || '';
      const normalizedTitle = normalizeKeyword(title);

      const songData = {
        title,
        artist,
        html_url,
        mp3_url: "",
        status: ""
      };

      if (dbTitles.has(normalizedTitle)) {
        songData.status = "Skip";
      } else {
        songData.status = "Add";
        try {
          // Tải trang chi tiết của bài hát
          const detailRes = await axios.get(html_url, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
          });
          const detailHtml = detailRes.data;
          // Dùng RegExp để trích xuất key1 từ HTML
          const regex = /player\.peConfig\.xmlURL\s*=\s*['"]https:\/\/www\.nhaccuatui\.com\/flash\/xml\?html5=true&key1=([a-zA-Z0-9]+)['"]/;
          const match = detailHtml.match(regex);
          let key1 = null;
          if (match && match[1]) {
            key1 = match[1];
          }
          if (key1) {
            const apiUrl = `https://www.nhaccuatui.com/flash/xml?html5=true&key1=${key1}`;
            // Đọc cookie từ file cookie.txt
            const cookies = readCookiesFromFile("cookie.txt");
            const cookieString = Object.entries(cookies)
                                    .map(([k, v]) => `${k}=${v}`)
                                    .join("; ");
            // Gọi API XML để lấy mp3_url
            const xmlRes = await axios.get(apiUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/135.0.0.0 Safari/537.36",
                "Referer": html_url,
                "Accept-Encoding": "gzip, deflate, br, zstd",
                "Cookie": cookieString
              },
              responseType: "text"
            });
            const xml = xmlRes.data;
            const parsedXml = await parseStringPromise(xml);
            const trackList = findTrackArray(parsedXml);
            if (Array.isArray(trackList) && trackList.length > 0) {
              const firstTrack = trackList[0];
              const location = (firstTrack.location && firstTrack.location[0])
                               ? firstTrack.location[0].trim()
                               : "";
              songData.mp3_url = location;
            }
          }
        } catch (err) {
          songData.status = "❌ Error getting mp3";
          songData.error = err.message;
        }
      }
      resultArray.push(songData);
      counter++;
    }
  } catch (err) {
    console.error("❌ Error during crawling:", err.message);
    return { error: err.message };
  }
  return resultArray;
}


module.exports = { compareSongsFromNCT };