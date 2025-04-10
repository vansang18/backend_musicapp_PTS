var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mongoose = require('mongoose')
let {CreateErrorRes} = require('./utils/responseHandler')
const { buildIndex } = require('./utils/search')
const cron = require('node-cron');
const { scheduledCrawlAndAddSongs } = require('./utils/scheduledCrawlService'); 

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

mongoose.connect("mongodb://localhost:27017/S5");
mongoose.connection.on('connected', async () => {
  console.log("✅ Đã kết nối MongoDB");
  await buildIndex(); // <-- GỌI HÀM TẠO LUNR INDEX Ở ĐÂY
});
// Lên lịch chạy tác vụ crawl tại 12h đêm mỗi ngày (múi giờ Vietnam)
cron.schedule('53 1 * * *', async () => {
  console.log("✦ Scheduled crawl job running at midnight...");
  await scheduledCrawlAndAddSongs();
}, {
  scheduled: true,
  timezone: "Asia/Ho_Chi_Minh"
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);
app.use('/roles', require('./routes/roles'));
app.use('/auth', require('./routes/auth'));
app.use('/products', require('./routes/products'));
app.use('/categories', require('./routes/categories'));
app.use('/songs', require('./routes/songs'));
app.use('/search', require('./routes/searchs'));
app.use('/artist', require('./routes/artist'));
app.use('/playlist', require('./routes/playlist'));

// Thêm middleware phục vụ file tĩnh cho nhạc từ thư mục local
const musicMiddleware = require('./utils/localmusic');
// Nếu bạn muốn phục vụ qua URL /songss, hãy mount ở đó:
app.use('/songss', musicMiddleware);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};
  CreateErrorRes(res,err.message,err.status||500);
});

module.exports = app;
