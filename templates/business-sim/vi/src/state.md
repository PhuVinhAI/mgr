@section state

<!-- PRD-006 State System + PRD-008 §6 State Schema +
     PRD-008 §15a.1 Section Schema + PRD-014 Documentation.
     Khai báo block dùng first-class directive (@variable). -->

## Public variables

<!-- Public: hiển thị trên dashboard. Mỗi biến là một khái niệm.
     Giá trị Visibility: Public | Private | Hidden.
       - Public  → người chơi luôn thấy
       - Private → chỉ hiện trong báo cáo cuối ngày
       - Hidden  → không bao giờ rời khỏi runtime
     Xem PRD-006 §16 về hợp đồng visibility. -->

<!-- VÍ DỤ — giữ, sửa, hoặc xoá tuỳ ý. -->

@variable Money
Visibility: Public
Purpose:
Tiền mặt hiện có, đơn vị tiền tệ nguyên. Game kết thúc nếu giá trị
này âm, trừ khi luật của bạn quy định khác.

@variable Day
Visibility: Public
Purpose:
Ngày hiện tại, bắt đầu từ 1. Dùng cho các Event theo thời gian
(thuê, lương, hết hạn).

@variable Reputation
Visibility: Public
Purpose:
Cách khách hàng nhìn nhận cửa hàng. Điều khiển cầu, hồ sơ ứng viên,
và một số Event. Khoảng điển hình 0–100.

@variable Price
Visibility: Public
Purpose:
Giá bán đơn vị hiện tại. Người chơi thay đổi qua action Set Price.

<!-- TODO: khai báo thêm biến public cho game của bạn.
     Ví dụ: Stock, StaffCount, Customers, CashFlow. -->

## Private variables

<!-- Private: chỉ hiện trong báo cáo (cuối ngày, cuối tháng). -->

@variable DailyRevenue
Visibility: Private
Purpose:
Doanh thu hôm nay. Hiện trong báo cáo cuối ngày để người chơi đối
chiếu mà không cần thấy từng giao dịch.

<!-- TODO: thêm private variable khác. Ví dụ: CustomersServed,
     SpoilageToday. -->

## Hidden variables

<!-- Hidden: không bao giờ hiển thị. Dùng cho trạng thái mà runtime
     theo dõi nhưng người chơi không được thấy (tránh gian lận, tránh
     spoil thiết kế). -->

@variable SupplyShortageChance
Visibility: Hidden
Purpose:
Cung hôm nay có bị hạn chế hay không. Được set bởi một Pre Event và
đọc bởi một Transformation Rule (xem ví dụ trong rules.md).

<!-- TODO: thêm hidden variable khác. Ví dụ: Weather, SpoilageRate,
     FestivalChance. -->

## Invariants

<!-- PRD-006 §14 State Invariants. Mỗi dòng một invariant, văn xuôi
     đơn giản. Runtime phải tôn trọng chúng ở mỗi State Commit. -->

<!-- VÍ DỤ -->

Money >= 0
Day >= 1
Reputation trong khoảng 0 và 100
Price >= 0

<!-- TODO: thêm invariant cho mỗi biến bạn khai báo. -->
