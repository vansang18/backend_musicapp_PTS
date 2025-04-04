var express = require('express');
var router = express.Router();
let multer = require('multer')
let path = require('path');
let { CreateSuccessRes, CreateErrorRes } = require('../utils/responseHandler');

let avatarDir = path.join(__dirname, '../avatars')
let urlavatar = `http://localhost:4000/avatars/`

let storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, avatarDir),
  filename: (req, file, cb) => cb(null,
      (new Date(Date.now())).getTime() + '-' + file.originalname
  )
})
//upload
let upload = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
      if (!file.mimetype.match(/image/)) {
          cb(new Error("tao chi nhan anh? thoi"))
      }
      cb(null, true)
  }, limits: {
      fileSize: 10 * 1024 * 1024
  }
})

router.post('/upload_avatar', upload.single('avatar'), function (req, res, next) {
  try {
      if (!req.file) {
          throw new Error("k co file")
      } else {
          let URL = path.join(urlavatar, req.file.filename);
          CreateSuccessRes(res, {
              url: URL
          }, 200);
      }
  } catch (error) {
      next(error)
  }
})

router.get('/avatars/:filename', function (req, res, next) {
  let pathFile = path.join(avatarDir, req.params.filename);
  res.sendFile(pathFile)
})

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
