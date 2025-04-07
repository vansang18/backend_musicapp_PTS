let express = require('express');
let router = express.Router();
let Song = require('../schemas/songs');

// Lấy tất cả bài hát
router.get('/', async (req, res) => {
    try {
      const songs = await Song.find();
      res.json(songs);
    } catch (err) {
      res.status(500).json({ error: 'Lỗi khi lấy danh sách bài hát' });
    }
  });

// Lấy một bài hát theo ID
router.get('/:id', async (req, res) => {
    try {
      const song = await Song.findOne({ id: req.params.id });
      if (!song) {
        return res.status(404).json({ message: 'Không tìm thấy bài hát' });
      }
      res.json(song);
    } catch (err) {
      res.status(500).json({ error: 'Lỗi khi tìm bài hát' });
    }
  });

module.exports = router;
