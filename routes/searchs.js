const express = require('express');
const router = express.Router();
const { search } = require('../utils/search');

// GET /search/:key
router.get('/:key', (req, res) => {
  const keyword = req.params.key;

  if (!keyword || keyword.trim() === '') {
    return res.status(400).json({ error: 'Thiếu từ khoá tìm kiếm' });
  }

  const results = search(keyword.trim());
  res.json(results);
});

module.exports = router;
