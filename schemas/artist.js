let mongoose = require('mongoose');
let artistSchema = new mongoose.Schema({
  name: { type: String, required: true },
  genre: String,
  bio: String,
  image: String, 
}, {
  timestamps: true
});

module.exports = mongoose.model('Artist', artistSchema);