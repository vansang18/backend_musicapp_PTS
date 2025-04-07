const lunr = require('lunr');
const Song = require('../schemas/songs');

let lunrIndex = null;
let songList = [];

function removeVietnameseTones(str) {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase();
}

// Hàm tạo chỉ mục lunr khi khởi động
async function buildIndex() {
  try {
    const songs = await Song.find({}, { _id: 0, __v: 0 });
    songList = songs; // Dùng để trả kết quả theo id gốc

    lunrIndex = lunr(function () {
      this.ref('id');
      this.field('title');
      this.field('artist');
      this.field('lyrics');

      songs.forEach(song => {
        const normalized = {
          ...song._doc,
          title: removeVietnameseTones(song.title || ""),
          artist: removeVietnameseTones(song.artist || ""),
          lyrics: removeVietnameseTones(song.lyrics || "")
        };
        this.add(normalized);
      });
    });

    console.log('✅ Lunr index đã sẵn sàng.');
  } catch (err) {
    console.error('❌ Lỗi tạo lunr index:', err);
  }
}

// Hàm tìm kiếm
function search(keyword) {
  if (!lunrIndex) return [];

  const normalizedKeyword = removeVietnameseTones(keyword);
  const results = lunrIndex.search(normalizedKeyword);
  return results.map(r => songList.find(s => s.id === r.ref));
}

module.exports = { buildIndex, search };
