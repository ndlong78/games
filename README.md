# 🦋 Bướm Bay Mắt Vui

> Ứng dụng game hỗ trợ tập luyện nhược thị cho trẻ em 4–7 tuổi  
> Chạy hoàn toàn trên trình duyệt — Không cần cài đặt, hoạt động offline

[![Deploy to GitHub Pages](https://img.shields.io/badge/Deploy-GitHub%20Pages-blue?style=flat-square&logo=github)](https://pages.github.com)

---

## ✨ Tính năng

- 🦋 Game bắt bướm 4 cấp độ tăng dần độ khó
- 📷 Kiểm tra che mắt qua webcam
- 🔊 Giọng nói tiếng Việt + âm thanh vui nhộn
- 👨‍👩‍👧 Quản lý nhiều hồ sơ trẻ em
- 🏆 Huy hiệu, streak ngày, nhân vật unlock
- 📊 Báo cáo tiến bộ + xuất PDF cho bác sĩ
- 📱 PWA — cài được về màn hình chính iPhone/iPad
- 🌐 Hoạt động offline sau lần đầu tải

---

## 🚀 Cách chạy local

### Cách 1: Python (đơn giản nhất)
```bash
cd buom-bay-mat-vui
python3 -m http.server 8080
# Mở trình duyệt: http://localhost:8080
```

### Cách 2: VS Code Live Server
1. Cài extension **Live Server** (Ritwick Dey)
2. Click chuột phải vào `index.html` → **Open with Live Server**

### Cách 3: Node.js
```bash
npx serve .
```

> ⚠️ **Lưu ý:** Phải chạy qua server (không mở file trực tiếp) vì cần HTTPS/localhost cho camera và Service Worker.

---

## 📦 Cấu trúc project

```
buom-bay-mat-vui/
├── index.html          # Entry point
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker (offline)
├── css/
│   └── styles.css      # Toàn bộ styles
├── js/
│   ├── main.js         # Khởi tạo & routing
│   ├── utils.js        # Hàm tiện ích
│   ├── audio.js        # Nhạc nền, SFX, giọng nói
│   ├── background.js   # Nền động canvas
│   ├── butterfly.js    # Class Butterfly
│   ├── game.js         # Game loop chính
│   ├── camera.js       # Kiểm tra che mắt
│   ├── profile.js      # Quản lý hồ sơ trẻ
│   ├── gamification.js # Huy hiệu, streak
│   ├── settings.js     # Cài đặt app
│   ├── report.js       # Báo cáo & xuất PDF
│   └── pwa.js          # PWA install
└── assets/
    └── icons/          # PWA icons
```

---

## 🌐 Deploy lên GitHub Pages (miễn phí)

Xem hướng dẫn chi tiết bên dưới.

---

## 🔒 Mật khẩu mặc định

Mật khẩu xem báo cáo: **1234** (có thể đổi trong Cài đặt)

---

## 📱 Cài app về iPhone/iPad

1. Mở Safari → truy cập link GitHub Pages
2. Nhấn nút **Chia sẻ** (⬆️)
3. Chọn **"Thêm vào Màn hình chính"**
4. Nhấn **Thêm** → App xuất hiện như app thật!

---

## 🛠️ Công nghệ sử dụng

- HTML5 Canvas + JavaScript thuần (không framework)
- Web Audio API — âm thanh procedural
- Web Speech API — giọng nói tiếng Việt
- MediaDevices API — webcam
- Service Worker — offline PWA
- Chart.js (lazy-load) — biểu đồ báo cáo
- jsPDF (lazy-load) — xuất PDF
- localStorage — lưu dữ liệu local

---

*Phát triển với ❤️ cho trẻ em Việt Nam*
