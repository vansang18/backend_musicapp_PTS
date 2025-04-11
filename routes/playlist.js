let express = require('express');
let router = express.Router();
let mongoose = require('mongoose');
let { check_authentication } = require('../utils/check_auth');
let {CreateErrorRes,
    CreateSuccessRes} = require('../utils/responseHandler');
let Playlist = require('../schemas/playlist');

// Tạo playlist
router.post('/', check_authentication, async (req, res) => {
    try {
        const { title, description, isPublic } = req.body;
        const newPlaylist = new Playlist({
            title,
            description,
            createdBy: req.user._id,
            isPublic: isPublic || false
        });
        await newPlaylist.save();
        CreateSuccessRes(res, newPlaylist, 201);
    } catch (err) {
        CreateErrorRes(res, err.message, 500);
    }
});

// Lấy tất cả playlist của user
router.get('/', check_authentication, async (req, res) => {
    try {
        const playlists = await Playlist.find({ createdBy: req.user._id }).populate('songs');
        CreateSuccessRes(res, playlists, 200);
    } catch (err) {
        CreateErrorRes(res, err.message, 500);
    }
});

// Lấy 1 playlist
router.get('/:id', check_authentication, async (req, res) => {
    try {
        const playlist = await Playlist.findById(req.params.id).populate('songs');
        if (!playlist || !playlist.createdBy.equals(req.user._id))
            return CreateErrorRes(res, 'Playlist không tồn tại hoặc không thuộc quyền của bạn', 404);

        CreateSuccessRes(res, playlist, 200);
    } catch (err) {
        CreateErrorRes(res, err.message, 500);
    }
});

// Thêm bài hát vào playlist
router.post('/:id/songs', check_authentication, async (req, res) => {
    try {
        const { songId } = req.body;
        const playlist = await Playlist.findById(req.params.id);
        if (!playlist || !playlist.createdBy.equals(req.user._id))
            return CreateErrorRes(res, 'Không thể thêm bài hát', 403);

        if (!playlist.songs.includes(songId)) {
            playlist.songs.push(songId);
            await playlist.save();
        }

        CreateSuccessRes(res, playlist, 200);
    } catch (err) {
        CreateErrorRes(res, err.message, 500);
    }
});

// Xoá bài hát khỏi playlist
router.delete('/:id/songs/:songId', check_authentication, async (req, res) => {
    try {
        const { id, songId } = req.params;
        const playlist = await Playlist.findById(id);
        if (!playlist || !playlist.createdBy.equals(req.user._id))
            return CreateErrorRes(res, 'Không thể xoá bài hát', 403);

        playlist.songs = playlist.songs.filter(s => s.toString() !== songId);
        await playlist.save();

        CreateSuccessRes(res, playlist, 200);
    } catch (err) {
        CreateErrorRes(res, err.message, 500);
    }
});

// Cập nhật playlist
router.put('/:id', check_authentication, async (req, res) => {
    try {
        const { title, description, isPublic } = req.body;
        const playlist = await Playlist.findById(req.params.id);

        if (!playlist || !playlist.createdBy.equals(req.user._id))
            return CreateErrorRes(res, 'Không thể cập nhật playlist', 403);

        if (title) playlist.title = title;
        if (description !== undefined) playlist.description = description;
        if (isPublic !== undefined) playlist.isPublic = isPublic;

        await playlist.save();
        CreateSuccessRes(res, playlist, 200);
    } catch (err) {
        CreateErrorRes(res, err.message, 500);
    }
});

// Xoá playlist
router.delete('/:id', check_authentication, async (req, res) => {
    try {
        const playlist = await Playlist.findById(req.params.id);
        if (!playlist || !playlist.createdBy.equals(req.user._id))
            return CreateErrorRes(res, 'Không thể xoá playlist', 403);

        await Playlist.findByIdAndDelete(req.params.id);
        CreateSuccessRes(res, { message: 'Đã xoá playlist' }, 200);
    } catch (err) {
        CreateErrorRes(res, err.message, 500);
    }
});

module.exports = router;
