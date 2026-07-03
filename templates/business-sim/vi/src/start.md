@section start

<!-- PRD-008 §13 Start Scenario — trạng thái khởi đầu, lời dẫn,
     event đầu tiên, prompt action đầu tiên. -->

## Initial state

<!-- TODO: liệt kê mọi biến public và giá trị khởi đầu. Mỗi dòng:
     <Tên> = <giá trị> -->

Money = 500
Day = 1
Reputation = 50
Stock = 0
Price = 0 (chưa đặt)

## Opening narrative

<!-- TODO: 1–3 câu dựng bối cảnh. Runtime in ra trước prompt action
     đầu tiên. -->

Bạn là chủ mới của một doanh nghiệp nhỏ. Cửa sẽ mở vào ngày mai.
Bạn sẽ làm gì trước?

## First event

<!-- TODO: Pre Event nào chạy vào Day 1? Tham chiếu events.md. -->

Weather Roll (xem events.md).

## First action prompt

<!-- TODO: cho runtime biết những action nào khả dụng ở lượt 1. -->

Buy Stock, Set Price, Start Selling.
