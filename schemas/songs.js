let mongoose = require('mongoose');

let songSchema = new mongoose.Schema({
    id: { type: String, required: true },
    title: { type: String, required: true },
    album: { type: String },
    artist: { type: String },
    source: { type: String, required: true },
    image: { type: String, required: true },
    duration: { type: Number },
    favorite: { type: String, default: "false" },
    counter: { type: Number, default: 0 },
    replay: { type: Number, default: 0 }
});

const Song = mongoose.model('Song', songSchema);

module.exports = Song;
