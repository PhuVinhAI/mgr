@section ui

<!-- PRD-008 §12 UI Configuration — Game chỉ chỉ định nội dung.
     Layout đến từ PRD-007 UI Contract; đừng nhân đôi layout ở đây.
-->

## Dashboard content

<!-- TODO: liệt kê các biến nên xuất hiện trên dashboard chính của
     người chơi, theo thứ tự bạn muốn hiển thị. -->

Day (of MaxDay)
Money
Reputation
Stock
Price (nếu đã đặt)

## End-of-day summary content

<!-- TODO: liệt kê các trường trong báo cáo cuối ngày. Đưa Private
     variables vào đây — đây là chỗ chúng hiện ra với người chơi. -->

Khách được phục vụ
Đơn vị đã bán
Doanh thu
Chi phí (thuê, lương, hỏng)
Thay đổi uy tín
Event(s) đã kích hoạt

## Suppressed content

<!-- TODO: liệt kê mọi Hidden variable và khẳng định rằng runtime
     không bao giờ được render chúng trên bất kỳ bề mặt UI nào. -->

Weather, SupplyShortageChance, và mọi Hidden variable khác từ
state.md KHÔNG ĐƯỢC xuất hiện trên bất kỳ bề mặt UI nào.
