const express = require('express');
const path = require('path');

// Lấy đường dẫn thư mục nhạc từ biến môi trường, nếu không dùng giá trị mặc định
const musicDir = process.env.MUSIC_DIR || "C:/Users/bdtcl/Desktop/JS/music";

// Export middleware sử dụng express.static với thêm caching
module.exports = express.static(musicDir, {
  setHeaders: (res, filePath) => {
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Disposition', 'inline');
  },
  maxAge: '1d' // Cache file trong 1 ngày
});
