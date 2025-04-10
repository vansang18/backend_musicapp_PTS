let express = require('express');
let router = express.Router();
let Song = require('../schemas/songs');
let {CreateErrorRes, CreateSuccessRes} = require('../utils/responseHandler'); 

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
  /* POST add a new song */
router.post('/', async function(req, res, next) {
  try {
    let body = req.body;
    
    // Kiểm tra các trường bắt buộc
    if (!body.id || !body.title || !body.source) {
      throw new Error("Các trường id, title, source và image là bắt buộc.");
    }

    // Kiểm tra xem đã tồn tại bài hát với cùng id hoặc title chưa
    let existingSong = await Song.findOne({
      $or: [
        { id: body.id },
        { title: body.title }
      ]
    });
    
    if (existingSong) {
      // Nếu đã tồn tại, trả về lỗi
      throw new Error("Bài hát có id hoặc title đã tồn tại.");
    }

    // Nếu chưa tồn tại, tạo bài hát mới
    let newSong = new Song({
      id: body.id,
      title: body.title,
      album: body.album || "", 
      artist: body.artist || "", 
      source: body.source,
      image: body.image,
      duration: body.duration || 0,
      favorite: body.favorite || "false",
      counter: body.counter || 0,
      replay: body.replay || 0,
      lyrics: body.lyrics || ""
    });

    // Lưu bài hát vào DB
    await newSong.save();

    // Trả về phản hồi thành công
    CreateSuccessRes(res, newSong, 200);
  } catch (error) {
    // Xử lý lỗi
    next(error);
  }
});

module.exports = router;
