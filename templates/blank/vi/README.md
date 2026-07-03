# my-game

Scaffold Game Package MGR trống. Mọi thứ trong đây là placeholder — sửa
hoặc xoá các khối `<!-- TODO: ... -->` để dựng game của riêng bạn.

## Bạn nhận được gì

```
src/
  main.md        # entry — nhúng các section bên dưới
  metadata.md    # PRD-008 §4 — tên, tác giả, mô tả, runtime, version
  world.md       # PRD-008 §5 — thời gian, bối cảnh, kinh tế, vật lý, văn hoá
  state.md       # PRD-008 §6 — biến và invariant
  start.md       # PRD-008 §13 — trạng thái khởi đầu và lời dẫn
```

Các dòng `@import` bị comment trong `main.md` là các section tuỳ chọn. Bỏ
comment (và tạo file tương ứng) khi game của bạn cần đến chúng:

| Section         | File             | Khi nào cần                                              |
|-----------------|------------------|-----------------------------------------------------------|
| `entities`      | `entities.md`    | Game có các actor được đặt tên (Player, NPC, Item, …)     |
| `rules`         | `rules.md`       | Game có logic tự động trên Action / Event                |
| `events`        | `events.md`      | Có thứ gì đó xảy ra ngẫu nhiên hoặc theo lịch           |
| `actions`       | `actions.md`     | Người chơi có lựa chọn không chỉ là input tự do          |
| `ending`        | `ending.md`      | Game có điều kiện Thắng / Thua / Kết thúc mềm           |
| `ui`            | `ui.md`          | Bạn muốn tuỳ biến thứ hiện trên dashboard                |

## Cách dùng

```bash
mgr validate       # kiểm tra schema khi bạn sửa
mgr build          # sinh dist/my-game-0.1.0.md
```

File `.md` bundle là một Prompt Specification — đưa cho LLM runtime để
chơi.

## Học qua ví dụ

Game Package MGR chuẩn là `tests/reference-games/lemonade/`. Đọc
`gaps.md` trước, sau đó đọc các file `src/*.md` theo thứ tự khai báo.
Mọi directive trong template này đều bám theo style đó.

Một ví dụ thứ hai nhỏ hơn nhưng chạy được là
`tests/reference-games/hangman/`.

## Đổi tên

Đổi `name` trong `mgr.config.json`. Tên file bundle sẽ thành
`dist/<tên>-<phiên-bản>.md`.
