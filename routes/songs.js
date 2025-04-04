let express = require('express');
let router = express.Router();
let Song = require('../schemas/songs');

// Lấy tất cả bài hát
router.get('/', async (req, res) => {
    try {
        const songs = await Song.find({}, 'title artist source image');
        res.json(songs);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching songs', error: err });
    }
});

// Lấy một bài hát theo ID
router.get('/:id', async (req, res) => {
    try {
        const song = await Song.findOne({ id: req.params.id }, 'title artist source image');
        if (song) {
            res.json(song);
        } else {
            res.status(404).json({ message: 'Song not found' });
        }
    } catch (err) {
        res.status(500).json({ message: 'Error fetching song', error: err });
    }
});

module.exports = router;
