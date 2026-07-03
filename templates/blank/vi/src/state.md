@section state

<!-- PRD-006 State System + PRD-008 §6 State Schema +
     PRD-008 §15a.1 Section Schema + PRD-014 Documentation.
     Khai báo block dùng first-class directive (@variable). -->

## Variables

<!-- Mỗi biến được khai báo một lần với @variable <Tên> và một block
     Visibility. Dùng Public nếu người chơi thấy được, Private nếu chỉ
     hiện trong báo cáo, Hidden nếu không bao giờ rời khỏi runtime. -->

<!-- VÍ DỤ — giữ, sửa, hoặc xoá tuỳ ý. -->

@variable Score
Visibility: Public
Purpose:
Điểm chạy của người chơi. Tăng khi thắng vòng và reset khi game kết
thúc.

<!-- TODO: khai báo phần còn lại của biến ở đây. Mỗi @variable cho một
     khái niệm. Ví dụ:
       @variable Health  Visibility: Public
       @variable Turn    Visibility: Public
       @variable Secret  Visibility: Hidden
-->

## Invariants

<!-- PRD-006 §14 State Invariants — liệt kê mọi luật khoảng / giá trị
     mà runtime phải tôn trọng ở mỗi State Commit. Mỗi dòng một
     invariant, văn xuôi đơn giản. -->

<!-- VÍ DỤ -->

Score >= 0

<!-- TODO: thêm invariant cho các biến khác. Ví dụ:
       Health trong khoảng 0 và 100
       Turn >= 1
-->
