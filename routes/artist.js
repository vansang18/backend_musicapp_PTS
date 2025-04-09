let express = require('express');
let router = express.Router();
let Artist = require('../schemas/artist');
let handle = require('../utils/responseHandler');


router.post('/', async (req, res) => {
  try {
    const artist = new Artist(req.body);
    await artist.save();
    handle.CreateSuccessRes(res, artist, 201);
  } catch (err) {
    handle.CreateErrorRes(res, err.message, 400);
  }
});


router.get('/', async (req, res) => {
  try {
    const artists = await Artist.find();
    handle.CreateSuccessRes(res, artists, 200);
  } catch (err) {
    handle.CreateErrorRes(res, err.message, 500);
  }
});


router.get('/:id', async (req, res) => {
  try {
    const artist = await Artist.findById(req.params.id);
    if (!artist) return handle.CreateErrorRes(res, 'Artist not found', 404);
    handle.CreateSuccessRes(res, artist, 200);
  } catch (err) {
    handle.CreateErrorRes(res, err.message, 500);
  }
});


router.put('/:id', async (req, res) => {
  try {
    const artist = await Artist.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!artist) return handle.CreateErrorRes(res, 'Artist not found', 404);
    handle.CreateSuccessRes(res, artist, 200);
  } catch (err) {
    handle.CreateErrorRes(res, err.message, 400);
  }
});


router.delete('/:id', async (req, res) => {
  try {
    const artist = await Artist.findByIdAndDelete(req.params.id);
    if (!artist) return handle.CreateErrorRes(res, 'Artist not found', 404);
    handle.CreateSuccessRes(res, { message: 'Artist deleted' }, 200);
  } catch (err) {
    handle.CreateErrorRes(res, err.message, 500);
  }
});

module.exports = router;
