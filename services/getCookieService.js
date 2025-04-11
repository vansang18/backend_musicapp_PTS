const puppeteer = require('puppeteer');
const fs = require('fs');

// Danh sách cookie mục tiêu
const TARGET_COOKIES = [
  "NCT_BALLOON_INDEX",
  "_ga",
  "_gid",
  "cto_bundle",
  "NCTNPLS",
  "_ga_CNWMB8R32F",
  "nct_uuid",
  "JSESSIONID"
];

async function fetchCookiesAndSaveToFile() {
  // Mở trình duyệt, chuyển headless thành false để quan sát
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Truy cập trang mục tiêu
    await page.goto("https://www.nhaccuatui.com/bai-hat/mat-ket-noi-duong-domic.uJ8qLJzC9wH5.html", { waitUntil: 'networkidle2' });

    // Chờ 10 giây (sử dụng timeout truyền thống)
    await new Promise(resolve => setTimeout(resolve, 10000));

    // Lấy tất cả cookie
    const allCookies = await page.cookies();

    // Lọc các cookie theo danh sách mục tiêu
    const filteredCookies = allCookies.filter(cookie => TARGET_COOKIES.includes(cookie.name));

    if (filteredCookies.length > 0) {
      // Ghép chuỗi cookie theo định dạng: key1=value1; key2=value2; ...
      const cookieString = filteredCookies.map(cookie => `${cookie.name}=${cookie.value}`).join("; ");

      // Lấy thời gian hiện tại theo định dạng "yyyy-MM-dd HH:mm:ss"
      const now = new Date();
      const currentTime = now.toISOString().replace('T', ' ').substring(0, 19);

      // Ghi nội dung vào file cookie.txt
      const fileContent = `thời gian: ${currentTime}\ncookie=${cookieString}\n`;
      fs.writeFileSync("cookie.txt", fileContent, "utf8");
      console.log("✅ Cookie được lưu:", cookieString);
    } else {
      console.log("⚠️ Không lấy được cookie nào!");
    }
  } catch (error) {
    console.error("❌ Lỗi khi lấy cookie:", error);
  } finally {
    await browser.close();
  }
}

module.exports = { fetchCookiesAndSaveToFile };
