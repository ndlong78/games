# Đánh giá mã nguồn game bắt bướm (GitHub Pages)

## Tổng quan nhanh

- Kiến trúc module JS thuần, tách file theo domain rõ ràng (`game`, `profile`, `report`, `settings`, `pwa`).
- Trải nghiệm người dùng tốt cho trẻ em: flow profile → menu → camera → game → complete.
- Có PWA/offline bằng Service Worker và có cơ chế báo cáo/backup local.

## Điểm mạnh

1. **Tổ chức code dễ đọc**
   - Mỗi module đóng gói theo IIFE, tránh rò rỉ biến global.
2. **UX khá đầy đủ cho MVP**
   - Nhiều trạng thái màn hình, HUD, pause, report, settings.
3. **Tối ưu mobile canvas cơ bản**
   - Có xử lý `devicePixelRatio`, touch/mouse, chống context menu/gesture.
4. **Có tư duy sản phẩm rõ**
   - Hồ sơ trẻ em, streak, badge, biểu đồ tiến bộ, export PDF.

## Rủi ro và vấn đề cần ưu tiên

### P0 (nên xử lý trước)

1. **XSS qua `innerHTML` từ dữ liệu người dùng**
   - `profile.name` và nhiều chuỗi hiển thị được render trực tiếp bằng `innerHTML` trong `profile.js`, `report.js`, `settings.js`.
   - Nếu dữ liệu localStorage bị chèn payload HTML/JS, có thể thực thi script.

2. **Bảo mật PIN báo cáo quá yếu**
   - Mật khẩu mặc định `1234`, lưu plaintext trong localStorage.
   - Không có giới hạn số lần thử PIN.

3. **`localStorage.clear()` xóa toàn bộ domain storage**
   - Trong settings, thao tác “Xóa tất cả” có thể xóa dữ liệu app khác dùng cùng origin/path.

### P1 (quan trọng)

4. **Không có cơ chế migration dữ liệu localStorage**
   - Khi đổi schema session/profile, dễ vỡ dữ liệu cũ.

5. **Service Worker cache-first cho mọi GET**
   - Dễ giữ tài nguyên cũ lâu; thiếu chiến lược stale-while-revalidate cho font/script bên thứ ba.

6. **Ràng buộc dữ liệu đầu vào còn mỏng**
   - Tên bé chỉ kiểm tra rỗng, chưa lọc ký tự/độ dài hợp lý theo chuẩn, chưa escape output.

### P2 (nên làm để mở rộng)

7. **Không có test tự động** (unit/integration/e2e).
8. **Khó quan sát lỗi runtime** vì chưa có logging chuẩn và error boundary cho các tác vụ async.
9. **Một số biến cấu hình/constant hardcode phân tán** (level config, text message).

## Khuyến nghị kỹ thuật ngắn hạn

1. Thay mọi chỗ render dữ liệu động sang `textContent` hoặc escape HTML tập trung (`sanitize/escape` helper).
2. Đổi cơ chế PIN:
   - không dùng mặc định 1234,
   - thêm lockout (vd 30s sau 5 lần sai),
   - cân nhắc hash PIN (dù local-only) để giảm rủi ro lộ trực tiếp.
3. Thay `localStorage.clear()` bằng xóa theo prefix key `bbmv_*`.
4. Thêm lớp validate model khi đọc localStorage (zod nhẹ hoặc validator tự viết).
5. Bổ sung smoke test tối thiểu:
   - tạo profile,
   - start game,
   - lưu session,
   - mở report đúng/sai PIN.

## Kết luận

- Đây là codebase **MVP rất tốt** cho GitHub Pages: nhiều tính năng và UX thân thiện.
- Để sẵn sàng dùng thực tế ổn định hơn, nên ưu tiên fix nhóm **P0 bảo mật và dữ liệu** trước, sau đó thêm test tự động.
