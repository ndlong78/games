# Regression Checklist — Bướm Bay Mắt Vui

## 1. Khởi động & điều hướng
- Mở app lần đầu: loading screen hiển thị và chuyển sang màn chọn hồ sơ.
- Tạo hồ sơ mới thành công.
- Chọn hồ sơ → vào menu chính.
- Mở Cài đặt rồi quay lại không lỗi màn hình trắng.
- Bấm vào profile card trên GitHub Pages sau deploy mới → không bị nền trắng.

## 2. Đổi PIN báo cáo
- Vào Cài đặt → Đổi mật khẩu.
- Nhập PIN mới 4 chữ số và xác nhận đúng → lưu thành công.
- Nhập PIN không đủ 4 số → bị chặn.
- Nhập 2 PIN không khớp → bị chặn.
- Mở báo cáo bằng PIN mới → vào được.

## 3. Camera / che mắt
- Cho phép camera → preview mở bình thường.
- Bấm "Con đã che mắt — Bắt đầu" → vào game.
- Bấm bỏ qua 1 lần → chỉ hiện cảnh báo.
- Bấm bỏ qua lần 2 → vào game.
- Nếu từ chối camera → vẫn có thể xác nhận thủ công hoặc bỏ qua.

## 4. Gameplay
- Bướm xuất hiện và bay bình thường.
- Giữ đúng trên bướm đủ lâu → catch thành công.
- Thả tay giữa chừng → tiến độ bắt reset.
- Để bướm thoát → bị tính miss.
- Combo tăng khi bắt liên tiếp và reset sau miss.
- Hoàn thành màn → hiện kết quả và số sao hợp lý.

## 5. Scoring
- Chơi rất tốt, ít miss, accuracy ổn → 3 sao.
- Chơi trung bình → 2 sao.
- Chơi nhiều miss / accuracy thấp → 1 sao.
- Màn kết thúc phải hiển thị đúng:
  - số bướm bắt được
  - số bướm bỏ lỡ
  - tỷ lệ bắt
  - combo tối đa

## 6. Badge / gamification
- Lần đầu bắt bướm → badge đầu tiên có thể mở.
- Nếu trong một màn bắt >= 5 bướm trong 10 giây → badge tốc độ có thể mở.
- Mở màn huy hiệu không lỗi.

## 7. Báo cáo
- Mở báo cáo bằng PIN đúng.
- Tab Tổng quan hiển thị số lần chơi, tổng sao, độ chính xác.
- Tab Che mắt hiển thị đúng các nhóm:
  - confirmed/manual
  - skipped
  - camera_error
- Tab Lịch sử hiển thị bảng không vỡ layout.

## 8. Backup / Restore
- Backup tạo file JSON bình thường.
- Restore từ file backup chuẩn → dữ liệu quay lại đúng.
- Restore file JSON lỗi / chỉnh tay sai định dạng → app báo lỗi, không crash.

## 9. GitHub Pages / cache / deploy
- Sau deploy mới, mở app từ domain GitHub Pages → không bị trắng màn hình.
- Sau refresh thường → app vẫn vào được màn profile.
- Sau hard reload → app vẫn vào được.
- Nếu đã từng cài về Home Screen, thử mở lại bản web trong Safari để chắc không bị xung đột cache.

## 10. PWA / offline
- Banner cài app vẫn hiển thị khi trình duyệt hỗ trợ.
- Sau khi mở báo cáo/PDF online ít nhất 1 lần, kiểm tra lại luồng đó khi mạng chập chờn.

## 11. Responsive
- Test trên mobile portrait.
- Test trên tablet / iPad.
- Test landscape để chắc HUD và menu không chồng lấp.
