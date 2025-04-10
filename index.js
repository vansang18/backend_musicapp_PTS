/***********************
 *  index.js
 *  (Ví dụ gom tất cả vào 1 file)
 ***********************/
const puppeteer = require('puppeteer');
const cheerio = require('cheerio');
const axios = require('axios');
const nodeCron = require('node-cron');
const xml2js = require('xml2js');
const fs = require('fs');
const path = require('path');

/*******************************************************
 *  1. getCookieService: Lấy cookie bằng Puppeteer
 *******************************************************/
async function fetchCookiesAndSaveToFile() {
  const browser = await puppeteer.launch({ headless: false }); 
  const page = await browser.newPage();

  try {
    // 1) Đi đến trang bất kỳ của NCT để đăng nhập/accept cookie if needed
    await page.goto('https://www.nhaccuatui.com/bai-hat/mat-ket-noi-duong-domic.uJ8qLJzC9wH5.html');

    // 2) Chờ 10s (hoặc tuỳ chỉnh)
    await page.waitForTimeout(10_000);

    // 3) Lấy danh sách cookie hiện tại
    const allCookies = await page.cookies();

    // 4) Chọn những cookie bạn cần; 
    //    Ở ví dụ Java, bạn liệt kê: NCT_BALLOON_INDEX, _ga, _gid, ...
    //    Mình sẽ lấy hết cho đơn giản.
    const cookieMap = {};
    allCookies.forEach((ck) => {
      cookieMap[ck.name] = ck.value;
    });

    // 5) Ghi cookie ra file "cookie.txt"
    if (Object.keys(cookieMap).length > 0) {
      // Tạo chuỗi cookie kiểu "key1=val1; key2=val2; ..."
      let cookieString = '';
      for (let [k, v] of Object.entries(cookieMap)) {
        cookieString += `${k}=${v}; `;
      }
      // Xoá dấu "; " cuối
      cookieString = cookieString.trim().replace(/;$/, '');

      fs.writeFileSync('cookie.txt', `cookie=${cookieString}\n`, 'utf8');
      console.log('✅ Đã lưu cookie vào file cookie.txt:', cookieString);
    } else {
      console.log('⚠️ Không lấy được cookie nào!');
    }
  } catch (error) {
    console.error('❌ Lỗi khi lấy cookie:', error);
  } finally {
    await browser.close();
  }
}

/*******************************************************
 *  2. songsCrawlService: Crawl playlist NCT, parse XML
 *******************************************************/
// Giả lập DB: Lưu title đã có vào set
// (Bạn có thể thay bằng MongoDB, MySQL... tuỳ ý)
const existingTitles = new Set();

// Hàm chuẩn hoá, loại bỏ dấu, ký tự đặc biệt (tương tự Normalizer Java)
function normalizeKeyword(str) {
  if (!str) return '';
  // Bỏ dấu tiếng Việt
  const strNoAccent = str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  // Bỏ ký tự đặc biệt, hạ về lower
  return strNoAccent.replace(/[^\w\s]/gi, '').toLowerCase();
}

// Đọc cookie từ cookie.txt
function readCookiesFromFile() {
  try {
    const content = fs.readFileSync('cookie.txt', 'utf8');
    // Tìm dòng cookie=...
    const match = content.match(/cookie=(.+)/);
    if (!match) return {};
    const cookieLine = match[1].trim(); // key1=val1; key2=val2; ...
    
    const cookies = {};
    cookieLine.split(';').forEach(item => {
      const pair = item.split('=', 2).map(p => p.trim());
      if (pair.length === 2) {
        cookies[pair[0]] = pair[1];
      }
    });
    return cookies;
  } catch (error) {
    console.error('Không thể đọc cookie từ file:', error);
    return {};
  }
}

/**
 * Hàm chính để cào Top 100 bài hát từ NCT, 
 * sau đó parse key1, gọi XML, lấy link .mp3
 * 
 * @return {Promise<Array>} Mảng chứa info bài hát (title, artist, mp3_url, html_url, status...)
 */
async function compareSongsFromNCT() {
  const result = [];
  try {
    // 1) URL playlist
    const playlistUrl = 'https://www.nhaccuatui.com/playlist/top-100-nhac-tre-hay-nhat-various-artists.m3liaiy6vVsF.html';

    // 2) Dùng axios lấy HTML
    const resp = await axios.get(playlistUrl, { 
      headers: { 'User-Agent': 'Mozilla/5.0' } 
    });
    const $ = cheerio.load(resp.data);

    // 3) Lấy danh sách bài hát 
    //    (Trong Java: doc.select("li[itemprop=tracks]"))
    const items = $('li[itemprop="tracks"]');

    // 4) Lấy danh sách title đã có trong "DB" (existingTitles)
    //    (Tuỳ bạn thay bằng songsRepository.findAll() ... sau đó normal hóa)
    //    Ở đây mình chỉ minh hoạ

    // 5) Lặp qua từng item, lấy dữ liệu
    let counter = 0;
    items.each((i, el) => {
      if (counter >= 30) return; // Giới hạn 30 bài

      const title = $(el).find('meta[itemprop="name"]').attr('content')?.trim() || 'No title';
      const artist = $(el).find('.name_singer').text().trim() || 'No artist';
      const url = $(el).find('meta[itemprop="url"]').attr('content')?.trim() || '';

      const normalizedTitle = normalizeKeyword(title);
      const songData = {
        title,
        artist,
        html_url: url,
        status: 'Skip', // mặc định
        mp3_url: '',
        error: ''
      };

      // Kiểm tra trùng 
      if (existingTitles.has(normalizedTitle)) {
        songData.status = 'Skip (duplicate)';
      } else {
        // Thử crawl trang chi tiết
        songData.status = 'Add';
        existingTitles.add(normalizedTitle); // Coi như đánh dấu đã có

        // Lấy key1 từ HTML chi tiết
        // -> https://www.nhaccuatui.com/flash/xml?html5=true&key1=...
        // 
        // Java: Pattern regex = "player.peConfig.xmlURL='https://www.nhaccuatui.com/flash/xml?html5=true&key1=(...)'"
      }
      result.push(songData);
      counter++;
    });

    // 6) Giờ ta loop tiếp để lấy .mp3_url (nếu status=Add)
    for (let s of result) {
      if (s.status !== 'Add') continue;
      try {
        // Lấy HTML của trang bài hát
        const songPageResp = await axios.get(s.html_url, { 
          headers: { 'User-Agent': 'Mozilla/5.0' }
        });
        const htmlSong = songPageResp.data;

        // Regex tìm key1
        const regexKey1 = /player\.peConfig\.xmlURL\s*=\s*['"]https:\/\/www\.nhaccuatui\.com\/flash\/xml\?html5=true&key1=([a-zA-Z0-9]+)['"]/;
        const match = htmlSong.match(regexKey1);
        if (!match) {
          s.status = '❌ Error get key1';
          continue;
        }
        const key1 = match[1];

        // Lấy cookie từ file
        const cookies = readCookiesFromFile();
        // Kết nối tới XML
        const xmlUrl = `https://www.nhaccuatui.com/flash/xml?html5=true&key1=${key1}`;
        const xmlResp = await axios.get(xmlUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Referer': s.html_url,
            'Accept-Encoding': 'gzip, deflate, br, zstd',
            'Cookie': Object.entries(cookies).map(([k, v]) => `${k}=${v}`).join('; '),
          },
          responseType: 'text'
        });
        const xmlData = xmlResp.data;

        // Parse XML lấy location
        const parsedXml = await xml2js.parseStringPromise(xmlData);
        // Cấu trúc XML: <track><location>...</location></track>
        // Tuỳ theo NCT, ta duyệt. Giả sử trackList = parsedXml.audio.track
        const trackList = parsedXml?.music?.track || parsedXml?.audio?.track || [];
        if (trackList.length > 0) {
          const firstTrack = trackList[0];
          // location có thể là mảng, tuỳ XML
          s.mp3_url = firstTrack.location?.[0] || '';
        }
      } catch (error) {
        s.status = '❌ Error get mp3';
        s.error = error.message;
      }
    }

  } catch (e) {
    console.error('❌ Lỗi khi crawl playlist:', e);
  }
  return result;
}

/*******************************************************
 *  Hàm tải file .mp3 về máy (tương tự FileUtils Java)
 *******************************************************/
async function downloadMp3File(mp3Url) {
  try {
    // Lấy tên file (phần sau dấu "/")
    const fileName = path.basename(mp3Url.split('?')[0]); 
    // Tạo thư mục download
    const downloadFolder = path.join(__dirname, 'music'); 
    if (!fs.existsSync(downloadFolder)) {
      fs.mkdirSync(downloadFolder, { recursive: true });
    }
    const filePath = path.join(downloadFolder, fileName);

    const response = await axios.get(mp3Url, {
      responseType: 'stream'
    });
    // Ghi stream
    const writer = fs.createWriteStream(filePath);
    response.data.pipe(writer);

    await new Promise((resolve, reject) => {
      writer.on('finish', resolve);
      writer.on('error', reject);
    });

    console.log('Đã tải:', filePath);
    return fileName;
  } catch (error) {
    console.error('Lỗi tải file:', mp3Url, error);
    return null;
  }
}

/*******************************************************
 *  3. scheduledCrawlService: Lập lịch tự động
 *******************************************************/

// Giả lập hàm addSong (thay cho songsService.addSong)
async function addSong(title, artist, sourceUrl) {
  // Ở đây chỉ log. 
  // Thực tế, bạn có thể lưu vào DB Mongoose, MySQL, ...
  console.log('=== LƯU BÀI HÁT MỚI ===');
  console.log('Title:', title);
  console.log('Artist:', artist);
  console.log('Source URL:', sourceUrl);
  console.log('========================');
}

/**
 * Hàm chính: autoCrawlAndAddSongs
 * Tương tự @Scheduled(cron="...") 22:49 hằng ngày
 */
async function autoCrawlAndAddSongs() {
  try {
    console.log('\n=== BẮT ĐẦU QUY TRÌNH CRAWL ===');
    // (1) Lấy cookie
    await fetchCookiesAndSaveToFile();

    // (2) Lấy danh sách bài hát
    const crawledSongs = await compareSongsFromNCT();

    // (3) Duyệt qua kết quả, bài nào "Add" thì tải mp3 & gọi addSong
    for (let s of crawledSongs) {
      if (s.status === 'Add') {
        const mp3Url = s.mp3_url;
        if (!mp3Url) {
          console.log(`❌ Không tìm thấy mp3_url cho bài: ${s.title}`);
          continue;
        }
        // Tải file mp3
        const fileName = await downloadMp3File(mp3Url);
        if (!fileName) {
          console.log(`❌ Lỗi tải file mp3 cho bài: ${s.title}`);
          continue;
        }
        // Sinh ra 1 đường link ảo. Tuỳ cách triển khai server
        const sourceUrl = `http://localhost:3000/music/${fileName}`;

        // Gọi hàm "addSong" để lưu DB
        await addSong(s.title, s.artist, sourceUrl);

        console.log(`✅ Đã thêm bài hát: ${s.title} - ${sourceUrl}`);
      } else {
        console.log(`- Bỏ qua: ${s.title} [${s.status}]`);
      }
    }
    console.log('=== HOÀN TẤT QUY TRÌNH CRAWL ===\n');
  } catch (error) {
    console.error('❌ Lỗi autoCrawlAndAddSongs:', error);
  }
}

// Ở Java bạn dùng @Scheduled(cron="0 49 22 * * ?") -> 22:49
// Node-cron cũng dùng cú pháp tương tự, 
// "0 0 * * *" = 00:00 hằng ngày (VD)
nodeCron.schedule('0 0 * * *', () => {
  autoCrawlAndAddSongs();
});

// Chạy ngay 1 lần khi khởi động (nếu muốn)
autoCrawlAndAddSongs();
