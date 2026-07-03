# my-business

Scaffold có chú thích cho một Game Package **mô phỏng kinh doanh**. Mỗi
file là một `@section` placeholder — điền vào các khối `<!-- TODO: ... -->`
để thiết kế game bán hàng, làm giàu, hay chuỗi cung ứng của riêng bạn.

## Cấu trúc

```
src/
  main.md        # entry — nhúng các section theo thứ tự PRD
  metadata.md    # PRD-008 §4 — tên, tác giả, mô tả, runtime, version
  world.md       # PRD-008 §5 — thời gian, bối cảnh, kinh tế, vật lý, văn hoá
  state.md       # PRD-008 §6 — biến và invariant
  entities.md    # PRD-008 §7 — persistent + transient entity
  rules.md       # PRD-008 §8 — formula + Guard/Transformation/Trigger rule
  events.md      # PRD-008 §9 — Pre / Post event
  actions.md     # PRD-008 §10 — action của người chơi và auto-action
  ending.md      # PRD-008 §11 — Win / Lose / Soft / Hard ending
  ui.md          # PRD-008 §12 — nội dung dashboard + báo cáo
  start.md       # PRD-008 §13 — trạng thái khởi đầu và lời dẫn
```

## Cách dùng

```bash
mgr validate       # kiểm tra schema khi bạn sửa
mgr build          # sinh dist/my-business-0.1.0.md
```

Bundle là một Prompt Specification — đưa cho LLM runtime.

## Vì sao cấu trúc này

Template này bám theo `tests/reference-games/lemonade/`. Lemonade là
Reference Game chuẩn của MGR — một business-sim nhỏ viết để kích hoạt
mọi section trong PRD. Mọi directive, mọi block header, mọi citation
trong template này đều theo cùng style.

Để xem một ví dụ hoàn chỉnh chạy được, đọc `tests/reference-games/lemonade/`
từ `metadata.md` đến `start.md`. Để xem ví dụ thứ hai ở thể loại khác, đọc
`tests/reference-games/hangman/`.

## Quy trình

1. Sửa `metadata.md` trước — tiêu đề, mô tả, runtime, version.
2. Sửa `world.md` — chọn thang thời gian (ngày / tuần / tháng) và kinh
   tế (tiền tệ, luật cung).
3. Khai báo biến trong `state.md` (Public / Private / Hidden) và
   invariant.
4. Khai báo entity trong `entities.md`. Phần lớn business-sim cần
   `Player`, `Business`, và `Customer` (Transient).
5. Viết formula trong `rules.md` trước (ví dụ `Demand`, `Spoilage`), rồi
   rule đọc chúng (Guard + Transformation cho mỗi action, cộng Trigger
   cho cuối ngày).
6. Thêm Event trong `events.md` — Pre Event dựng ngày, Post Event phản
   ứng với nó.
7. Liệt kê Action trong `actions.md` — bề mặt người chơi thấy.
8. Định nghĩa ending trong `ending.md` (tối thiểu Win / Lose).
9. Cấu hình UI trong `ui.md` — dashboard hiển thị gì, báo cáo cuối
   ngày có gì.
10. Điền `start.md` — giá trị khởi đầu + lời dẫn.

Chạy `mgr validate` sau mỗi section; pipeline báo block thiếu, khai báo
trùng, directive lạ.

## Đổi tên

Đổi `name` trong `mgr.config.json`. Tên file bundle sẽ thành
`dist/<tên>-<phiên-bản>.md`.
