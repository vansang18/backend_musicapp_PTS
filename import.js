const mongoose = require('mongoose');
const fs = require('fs');
const Song = require('./schemas/songs');

mongoose.connect('mongodb://localhost:27017/S5')
  .then(async () => {
    const data = JSON.parse(fs.readFileSync('songs.json'));
    await Song.insertMany(data.songs); // chỉ chèn mảng `songs` bên trong
    console.log('✅ Import thành công!');
    mongoose.disconnect();
  })
  .catch(err => console.error('❌ Lỗi:', err));
