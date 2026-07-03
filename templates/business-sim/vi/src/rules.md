@section rules

<!-- PRD-008 §8 Rules + PRD-008 §15a.4 Section Schema +
     PRD-010 Rule Language + PRD-009 Formula System +
     PRD-011 Rule Execution Model + PRD-014 Documentation.
     Khai báo block dùng first-class directive (@formula, @rule). -->

## Named formulas

<!-- PRD-009 §14 — Named formula được giải ở Build time.
     PRD-009 §18a — body phải là expression, không phải văn xuôi.
     Dạng phổ biến: dòng đơn, piecewise (When/Then/Otherwise), tham
     chiếu Named Formula khác, bounded expression. -->

<!-- VÍ DỤ — giữ, sửa, hoặc xoá. -->

@formula BaseDemand
Reputation * 0.5 + 10
Purpose:
Số khách nền trước các modifier. Reputation cao hơn đồng nghĩa nhiều
khách hơn, theo tuyến tính.

@formula WeatherModifier
When Weather = Rainy      Then 0.5
When Weather = Heat Wave  Then 1.5
Otherwise                 Then 1.0
Purpose:
Hệ số nhân cầu. Ghép từ biến phân loại Weather.

<!-- TODO: thêm formula game của bạn cần. Ví dụ: SpoilageRate,
     WageCost, EndOfDayBalance. -->

## Action rules

<!-- Theo PRD-008 §15a.4:
       - Guard          → Trigger + Precondition, không có Effect
       - Transformation → Trigger + Precondition + Effect
     Một action hoàn chỉnh thường có một Guard và một Transformation
     cùng Trigger. -->

<!-- VÍ DỤ — giữ, sửa, hoặc xoá. -->

@rule CanBuyStock
Kind: Guard
Trigger:
On Action(Buy Stock)
Precondition:
Money >= Quantity * UnitCost
Purpose:
Chặn Buy Stock khi người chơi không đủ tiền. Ngăn Money âm qua mua
hàng.
Failure:
Từ chối action; ApplyBuyStock không chạy; state không đổi.

@rule ApplyBuyStock
Kind: Transformation
Trigger:
On Action(Buy Stock)
Precondition:
Money >= Quantity * UnitCost
Effect:
Money -= Quantity * UnitCost
Stock += Quantity
Priority:
0
Purpose:
Thực hiện mua hàng nguyên tử: trừ Money, cộng Stock trong một bước
(PRD-011 §9). Nếu Precondition fail khi thực thi (state đổi giữa
guard và simulation), Rule bị bỏ qua toàn bộ và Turn History ghi
SkippedByPrecondition.
Failure:
Nếu Precondition fail khi thực thi, rule bị bỏ qua; state không đổi.

<!-- TODO: thêm cặp CanX / ApplyX cho mỗi action người chơi có thể
     thực hiện. Xem actions.md để biết danh sách action. -->

## Time-based rules

<!-- Trigger Rules chạy ở các Event Phase (PRD-005 §7 / §7a). -->
<!-- Post Event rules chạy sau Simulation, trước Commit. -->

<!-- VÍ DỤ — giữ, sửa, hoặc xoá. -->

@rule ChargeDailyCosts
Kind: Trigger
Trigger:
On Post Event
Effect:
Money -= DailyRent
Priority:
0
Purpose:
Trừ tiền thuê mặt bằng và các chi phí định kỳ khác vào cuối mỗi
ngày, trước khi bộ đếm ngày tăng.

@rule AdvanceDay
Kind: Trigger
Trigger:
On Post Event
Effect:
Day += 1
Priority:
0
Purpose:
Tăng lịch trong game. Chạy sau ChargeDailyCosts.

<!-- TODO: thêm rule cho: hàng hỏng, trả lương, uy tín trôi, sinh
     báo cáo cuối ngày, v.v. -->

## Rule priority

<!-- PRD-010 §10 + PRD-005 §8 + PRD-011 §10. Khi hai Rule chạm cùng
     biến trong cùng pha, Priority cao hơn chạy trước. Cùng Priority:
     phép cộng tính tổng, phép nhân compose, `:=` cần winner tường
     minh.
-->
