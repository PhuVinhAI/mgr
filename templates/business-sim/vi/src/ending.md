@section ending

<!-- PRD-008 §11 Victory & Failure.
     Định nghĩa cách game kết thúc. Runtime KHÔNG tự kết thúc game
     trừ khi Package định nghĩa. -->

## Win

<!-- TODO: mô tả điều kiện thắng. Ví dụ:
       Cuối Day 30:
       Money >= 2000 AND Reputation >= 70 → Người chơi thắng.
     Nhiều bậc thắng (C / B / A / S) là phổ biến trong business-sim.
-->

## Lose

<!-- TODO: mô tả điều kiện thua. Ví dụ:
       Tại bất kỳ State Commit:
       Money < 0 → Người chơi thua. Game kết thúc ngay.
-->

## Soft ending

<!-- TODO: tuỳ chọn. Kết thúc trung tính cho ván sống sót nhưng
     dưới ngưỡng. Ví dụ:
       Cuối Day 30:
       0 <= Money < WinThreshold → Kết thúc trung tính.
-->

## Hard ending

<!-- TODO: tuỳ chọn. Kết thúc bắt buộc cho hết giờ hoặc sự kiện
     thảm hoạ. Để trống nếu game không có.
-->

<!-- Giữ section này kể cả khi chỉ có Win — validator kỳ vọng file
     tồn tại. -->
