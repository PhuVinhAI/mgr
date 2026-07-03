@section entities

<!-- PRD-008 §7 Entity Definition + PRD-006 §5a Transient Entity +
     PRD-008 §15a.2 Section Schema + PRD-014 Documentation.
     Khai báo block dùng first-class directive (@entity). -->

## Persistent entities

<!-- Persistent entity sống trong snapshot và tồn tại xuyên suốt các
     lượt. Phần lớn business-sim cần: Player, Business, Staff,
     Customer. -->

<!-- VÍ DỤ — giữ, sửa, hoặc xoá. -->

@entity Player
Kind: Persistent
Attributes:
Money, Reputation
Behaviour:
Sở hữu Business và quyết định action mỗi lượt.
Relationships:
Sở hữu một Business; thuê Staff.

@entity Business
Kind: Persistent
Attributes:
Stock, Price, DailyRevenue
Behaviour:
Bán hàng cho Customer, trả thuê mặt bằng và lương cuối ngày.
Relationships:
Thuộc về Player.

<!-- TODO: khai báo các persistent entity khác mà game cần.
     Ví dụ: Staff (với thuộc tính Wage), Customer (với Demand).
-->

## Transient entities

<!-- Transient entity chỉ tồn tại trong một pha — không vào snapshot,
     không xuất hiện trong Turn History (PRD-006 §5a). Dùng cho trạng
     thái trong Simulation Phase. -->

@entity Sale
Kind: Transient
Lifetime: Simulation Phase
Attributes:
Revenue, CostOfGoods
Behaviour:
Khởi tạo một lần cho mỗi Customer được phục vụ trong Simulation, sau
đó bị huỷ khi pha kết thúc.

<!-- TODO: khai báo transient entity khác. Ví dụ:
     - Transaction (mỗi giao dịch)
     - SpoilageEvent (mỗi đơn vị hỏng)
-->

<!-- Giữ section này kể cả khi trống — nhiều validator kỳ vọng nó tồn
     tại. -->
