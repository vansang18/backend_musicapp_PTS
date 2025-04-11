// utils/scheduledCrawlService.js
const path = require('path');
const fs = require('fs');
const axios = require('axios');
const mongoose = require('mongoose');

const { fetchCookiesAndSaveToFile } = require('./getCookieService');
const { compareSongsFromNCT } = require('./crawlSongService');
const Song = require('../schemas/songs'); // Đảm bảo đường dẫn tới schema Song chính xác

// Hàm chuẩn hoá chuỗi (normalizeKeyword)
function normalizeKeyword(keyword) {
  if (!keyword || !keyword.trim()) return "";
  return keyword.normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9\s]/g, '')
    .toLowerCase();
}

// Hàm kiểm tra trùng lặp trong DB theo tiêu đề normalized
async function checkSongExists(title) {
  const normalizedTitle = normalizeKeyword(title);
  const songs = await Song.find({});
  return songs.some(song => normalizeKeyword(song.title) === normalizedTitle);
}

// Hàm downloadMp3File: Tải file mp3 từ mp3Url về thư mục "C:\Users\bdtcl\Desktop\JS\music"
async function downloadMp3File(mp3Url) {
  try {
    const fileName = path.basename(mp3Url.split('?')[0]);
    const downloadFolder = "C:\\Users\\bdtcl\\Desktop\\JS\\music";
    if (!fs.existsSync(downloadFolder)) {
      fs.mkdirSync(downloadFolder, { recursive: true });
    }
    const filePath = path.join(downloadFolder, fileName);
    const response = await axios.get(mp3Url, { responseType: 'stream' });
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);
    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });
    console.log("Đã tải về:", filePath);
    return fileName;
  } catch (error) {
    console.error("Lỗi tải file mp3:", error.message);
    return null;
  }
}

// Hàm crawl và lưu bài hát vào DB
async function scheduledCrawlAndAddSongs() {
  try {
    // (1) Cập nhật cookie
    await fetchCookiesAndSaveToFile();

    // (2) Crawl bài hát từ NCT (giới hạn 10 bài)
    const crawledSongs = await compareSongsFromNCT();
    console.log("Crawled Songs:", crawledSongs);

    // (3) Xử lý từng bài: nếu status là "Add" thì tải file và lưu vào DB
    for (const songData of crawledSongs) {
      if (songData.status && songData.status.toLowerCase() === 'add') {
        const title = songData.title;
        const artist = songData.artist;
        const mp3Url = songData.mp3_url;

        let fileName = "";
        if (mp3Url) {
          fileName = await downloadMp3File(mp3Url);
          if (!fileName) {
            console.log(`Không tải được file mp3 cho bài: ${title}`);
            continue;
          }
        } else {
          console.log(`Không có mp3_url cho bài: ${title}`);
          continue;
        }

        const sourceUrl = "http://10.0.2.2:3000/songss/" + fileName;

        // Kiểm tra trùng lặp bằng cách so sánh normalized title
        const exists = await checkSongExists(title);
        if (exists) {
          console.log(`Skip (already exists): ${title}`);
          continue;
        }

        const newSong = new Song({
          id: new mongoose.Types.ObjectId().toString(),
          title: title,
          album: "",
          artist: artist,
          source: sourceUrl,
          image: "https://via.placeholder.com/150",
          duration: 0,
          favorite: "false",
          counter: 0,
          replay: 0,
          lyrics: ""
        });

        await newSong.save();
        console.log(`Added song: ${title} - ${sourceUrl}`);
      }
    }
    console.log("Completed crawling & saving songs");
  } catch (err) {
    console.error("Error in scheduledCrawlAndAddSongs:", err);
  }
}

// Chỉ xuất hàm crawl, không tự chạy nó
module.exports = { scheduledCrawlAndAddSongs };
