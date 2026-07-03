@section actions

<!-- PRD-008 §10 Actions + PRD-008 §15a.6 Section Schema +
     PRD-012 Action Resolution + PRD-014 Documentation.
     Khai báo block dùng first-class directive (@action). -->

## Player actions

<!-- Effect nằm trong Rule Transformation (xem rules.md). Action chỉ
     khai báo Intent, Parameters, Preconditions, và các block tài
     liệu. -->

<!-- VÍ DỤ — giữ, sửa, hoặc xoá. -->

@action Buy Stock
Intent:
buy stock
purchase stock
restock
nhập hàng
Parameters:
Quantity: Integer
Preconditions:
Quantity >= 1 AND Money >= Quantity * UnitCost
Purpose:
Cho phép người chơi đổi Money lấy Stock. UnitCost là Named Formula
hoặc hằng số.
Failure:
Từ chối khi không đủ tiền; state không đổi; phản hồi giải thích
thiếu tiền.

@action Set Price
Intent:
set price
change price
adjust price
đặt giá
Parameters:
Price: Integer
Preconditions:
Price >= 0
Purpose:
Cho phép người chơi chọn giá bán đơn vị. Điều khiển cầu.
Failure:
Từ chối giá âm; state không đổi.

@action Start Selling
Intent:
start selling
open shop
open
sell
mở cửa
bán hàng
Preconditions:
Price >= 0
Purpose:
Chuyển từ setup sang pha bán. Runtime sau đó lặp một Transformation
Rule "Sell One" (xem rules.md) cho đến khi nguyên liệu hoặc cầu cạn.
Failure:
Từ chối khi Price chưa đặt; phản hồi nhắc người chơi đặt giá trước.

<!-- TODO: thêm action. Ví dụ: Hire Staff, Fire Staff, Adjust
     Quality, Take Loan, Pay Down Debt. -->

## Auto actions

<!-- PRD-012 §10 — Runtime tự phát khi Simulation Phase kết thúc. -->

@auto-action End Day
Fires When:
Stock = 0 OR Customers = 0 OR Day >= MaxDay
Purpose:
Đóng ngày khi doanh nghiệp không thể bán thêm, hoặc khi lịch đến
MaxDay. Kích hoạt Post Event rules (thuê, lương, festival check) và
tăng bộ đếm ngày.
