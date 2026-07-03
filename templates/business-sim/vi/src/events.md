@section events

<!-- PRD-008 §9 Events + PRD-008 §15a.5 Section Schema +
     PRD-005 v1.1 §7 Pre Event / §7a Post Event +
     PRD-014 Documentation.
     Khai báo block dùng first-class directive (@event). -->

## Pre Events

<!-- Pre Events chạy trước Simulation. Chúng thiết lập trạng thái đầu
     ngày (thời tiết, cung, điều kiện thị trường). -->

<!-- VÍ DỤ — giữ, sửa, hoặc xoá. -->

@event Weather Roll
Phase: Pre
Trigger:
Start of Day.
Effect:
Weather := Weighted(Sunny: 60, Rainy: 30, Heat Wave: 10)
Purpose:
Gieo thời tiết hôm nay trước khi Simulation đọc cầu. Tuỳ chỉnh
phân phối để khớp khí hậu trong game của bạn.

@event Supply Shortage
Phase: Pre
Trigger:
Day >= 5 AND Uniform(1, 100) <= 15
Effect:
SupplyShortageChance := 1
Purpose:
Từ ngày 5 trở đi, 15% cơ hội cung hôm nay bị hạn chế. Một
Transformation Rule đọc cờ này (xem rules.md).

<!-- TODO: thêm Pre Event phù hợp game. Ví dụ:
     - Festival (tăng cầu)
     - Inspection (kiểm tra giấy phép)
     - Customer Complaint ngẫu nhiên
-->

## Post Events

<!-- Post Events chạy sau Simulation, trước Commit. Dùng cho hệ quả,
     phần thưởng, và dẫn truyện. -->

@event Festival
Phase: Post
Trigger:
Customers = 0 AND Reputation >= 40
Effect:
Reputation += Clamp(5, 0, 100 - Reputation)
Purpose:
Thưởng cho một ngày bán hết hàng. Chỉ kích hoạt khi Reputation đã ở
mức 40+ để người chơi đầu game không cảm thấy bị phạt tuỳ tiện.

<!-- TODO: thêm Post Event. Ví dụ:
     - News Article (tăng/giảm uy tín)
     - Tax Audit
-->

## Event ordering

<!-- PRD-005 v1.1 §15 — Pre và Post dùng hàng đợi riêng. Liệt kê
     thứ tự game của bạn kỳ vọng; runtime chạy theo thứ tự khai báo
     trừ khi Priority được đặt. -->

Pre Event Queue:
1. Weather Roll
2. Supply Shortage check

Simulation runs.

Post Event Queue:
1. Festival check
2. Daily Costs (trả qua Rule)

Commit.
