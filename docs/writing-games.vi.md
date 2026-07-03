# Viết game bằng MGR

> Hướng dẫn thực hành để viết Game Package theo hướng Prompt Programming.

Hướng dẫn này giả định bạn đã biết MGR là gì (một compiler Markdown →
Prompt Specification). Nếu cần phần giới thiệu tổng quan trước, đọc
[`README.md`](../README.md). Để xem đặc tả chính thức, xem
`docs/001-prd.md` đến `docs/014-prd.md`. Tài liệu này nằm giữa hai
thứ đó: đủ cấu trúc để thiết kế một game, đủ ví dụ để sao chép.

---

## Mục lục

1. [Mô hình tư duy](#1-mô-hình-tư-duy)
2. [Bắt đầu nhanh](#2-bắt-đầu-nhanh)
3. [Cấu trúc project](#3-cấu-trúc-project)
4. [Tham chiếu Directive](#4-tham-chiếu-directive)
5. [File section](#5-file-section)
6. [Biến và visibility](#6-biến-và-visibility)
7. [Entity](#7-entity)
8. [Rule](#8-rule)
9. [Event](#9-event)
10. [Action](#10-action)
11. [Formula](#11-formula)
12. [Ending](#12-ending)
13. [Cấu hình UI](#13-cấu-hình-ui)
14. [Kịch bản khởi đầu](#14-kịch-bản-khởi-đầu)
15. [Quy ước đặt tên](#15-quy-ước-đặt-tên)
16. [Validation và lỗi thường gặp](#16-validation-và-lỗi-thường-gặp)
17. [Quy trình viết đề xuất](#17-quy-trình-viết-đề-xuất)
18. [Reference game và template](#18-reference-game-và-template)

---

## 1. Mô hình tư duy

MGR nhận một thư mục file Markdown và sinh ra một **Prompt
Specification** duy nhất — một file `.md` lớn mà LLM đọc để chơi game.
Ba điều cần nhớ:

```
Markdown sources       Game Package     ← bạn viết phần này
        │
        ▼
   MGR compiler         (mgr build)
        │
        ▼
Prompt Specification   dist/foo-0.1.0.md  ← một artifact duy nhất
        │
        ▼
   LLM đóng vai Runtime, đọc spec, chơi game
```

- **Bạn viết Markdown.** Không DSL, không JSON cho gameplay. Section,
  biến, rule, event, action, formula được khai báo qua các directive
  như `@rule Buy Stock` và `Purpose: …`.
- **LLM là runtime.** Nó thực thi rule, thay đổi state, render
  dashboard. Bạn không bao giờ viết code engine.
- **Compiler là deterministic.** Cùng source → cùng output. Hai bản
  build của một project không đổi cho ra bundle giống hệt nhau từng
  byte.

Mỗi Game Package đều theo cùng một khung xương (PRD-008 §3). Khối
**metadata** định danh package. **world** mô tả bối cảnh. **state**
khai báo biến và invariant. **entity** đặt tên cho các tác nhân.
**rule** tự động hoá thay đổi state. **event** thêm yếu tố ngẫu
nhiên và phản ứng. **action** là bề mặt người chơi. **ending** khai
báo thắng/thua. **UI** cấu hình những gì dashboard hiển thị.
**start** khai báo giá trị khởi đầu và lượt mở đầu.

Khung xương nhất quán vì LLM-runtime có một vòng đời lượt cố định
(PRD-004, PRD-005): *Input → Validation → Pre Event → Simulation →
Post Event → State Commit → Response*. Các section của bạn cắm vào
đúng vị trí trong vòng đời đó.

---

## 2. Bắt đầu nhanh

```bash
# Tạo khung project mới
mkdir my-game && cd my-game
mgr init --template blank --lang vi

# Sửa các file placeholder trong src/, sau đó:
mgr validate       # kiểm tra schema + ngữ nghĩa
mgr build          # sinh dist/my-game-0.1.0.md
```

`mgr init` hiện có hai template:

- `blank` — khung tối thiểu (metadata, world, state, start). Dùng cho
  mọi game không thuộc thể loại cụ thể nào.
- `business-sim` — khung 11 section đầy đủ, bám theo Reference Game
  Lemonade chuẩn. Dùng cho game bán hàng / tycoon / chuỗi cung ứng.

Cả hai có bản tiếng Anh và tiếng Việt. Thêm `--lang vi` để dùng bản
tiếng Việt. Ngôn ngữ chỉ ảnh hưởng đến prompt và comment inline trong
scaffold; hành vi compiler là giống nhau.

`mgr build` sinh ra một file. Tên file mặc định là
`dist/<tên>-<phiên-bản>.md` — ghi đè bằng trường `out` trong
`mgr.config.json`. Cùng đầu vào, cùng đầu ra, mỗi lần build.

`mgr validate` rất nhanh — chạy nó sau mỗi lần sửa quan trọng. Nó bắt
80% lỗi bạn sẽ mắc (thiếu block, sai visibility, gõ nhầm tên
directive, vòng import, v.v.).

---

## 3. Cấu trúc project

```
my-game/
  mgr.config.json     # metadata package (name, version, entry, dirs)
  src/
    main.md           # entry — nhúng mọi file section khác
    metadata.md       # @section metadata — tên, tác giả, runtime, …
    world.md          # @section world — bối cảnh và luật thế giới
    state.md          # @section state — biến và invariant
    entities.md       # @section entities — tác nhân (tuỳ chọn)
    rules.md          # @section rules — tự động hoá (tuỳ chọn)
    events.md         # @section events — trigger pre/post event (tuỳ chọn)
    actions.md        # @section actions — lựa chọn người chơi (tuỳ chọn)
    ending.md         # @section ending — điều kiện thắng/thua
    ui.md             # @section ui — cấu hình dashboard
    start.md          # @section start — state khởi đầu và mở đầu
    hidden.md         # @section hidden-state — biến hidden (tuỳ chọn)
  dist/               # thư mục output — một .md cho mỗi build
```

`mgr.config.json`:

```json
{
  "name": "my-game",
  "version": "0.1.0",
  "entry": "main.md",
  "srcDir": "src",
  "outDir": "dist"
}
```

`entry` là file đầu tiên compiler đọc. Theo quy ước nó nhúng mọi
section khác theo thứ tự khai báo. `out` là tuỳ chọn — nếu bỏ qua,
bundle sẽ nằm ở `dist/<tên>-<phiên-bản>.md`. Thêm
`"runtime": "1.x"` nếu muốn ghim vào một Runtime major.

File nằm ngoài `srcDir` sẽ bị reject khi build. File được `@import`
tham chiếu sẽ được phân giải tương đối với file hiện tại, hoặc neo về
`srcDir` nếu đường dẫn bắt đầu bằng `/`.

---

## 4. Tham chiếu Directive

Mọi khối cấu trúc trong game của bạn bắt đầu bằng một directive. Phần
lớn là "first-class" — header directive theo sau bởi các dòng
`Block: value`. Một vài dạng "legacy prose" cũ vẫn hoạt động để tương
thích ngược, nhưng bạn nên viết dạng first-class.

### `@import <đường-dẫn>`

Nhúng một file Markdown khác vào file hiện tại. Đường dẫn tương đối
với file hiện tại, trừ khi bắt đầu bằng `/` thì neo về `srcDir`.

```markdown
@import state.md
@import /world.md          # tương đương srcDir/world.md
```

### `@section <id>`

Mở một section có tên. id sẽ được emit thành heading H2 trong
bundle. Section id phải duy nhất trong toàn project (PRD-008 §10,
validation §DUPLICATE_SECTION).

```markdown
@section rules
```

Các directive first-class bên dưới được đặt *bên trong* section mà
chúng thuộc về.

### `@variable <Tên>`

Khai báo một biến state. Dạng block:

```markdown
@variable Money
Visibility: Public
Purpose:
Tiền mặt hiện có. Game kết thúc nếu giá trị này âm.
```

Bắt buộc: tên trên dòng directive.
Block tuỳ chọn: `Visibility`, `Purpose`. Xem
[§6 Biến và visibility](#6-biến-và-visibility).

### `@entity <Tên>`

Khai báo một tác nhân có tên (Player, Business, NPC, Item, …). Dạng
block:

```markdown
@entity Player
Kind: Persistent
Attributes:
Money, Reputation
Behaviour:
Sở hữu Business và quyết định action mỗi lượt.
Relationships:
Sở hữu một Business; thuê Staff.
```

Bắt buộc: tên trên dòng directive, block `Kind:`.
Tuỳ chọn: `Attributes`, `Behaviour`, `Relationships`, `Lifetime` (chỉ
cho Transient), `Purpose`. Xem [§7 Entity](#7-entity).

### `@rule <Tên>`

Khai báo một đơn vị tự động hoá. Dạng block:

```markdown
@rule CanBuyStock
Kind: Guard
Trigger:
On Action(Buy Stock)
Precondition:
Money >= Quantity * UnitCost
Purpose:
Chặn Buy Stock khi người chơi không đủ tiền.
Failure:
Từ chối action; ApplyBuyStock không chạy.
```

Bắt buộc: tên, `Kind:`, `Trigger:`.
Điều kiện: `Precondition:`, `Effect:`, `Priority:`.
Tài liệu: `Purpose:`, `Failure:` (khuyến nghị cho Guard và
Transformation theo PRD-014). Xem [§8 Rule](#8-rule).

### `@formula <Tên>`

Khai báo một biểu thức có tên. Body là một biểu thức đơn, piecewise
(`When/Then/Otherwise`), hoặc tham chiếu đến Named Formula khác.
Dạng block:

```markdown
@formula BaseDemand
Reputation * 0.5 + 10
Purpose:
Số khách nền trước các modifier.
```

Bắt buộc: tên, dòng (các dòng) body.
Khuyến nghị: `Purpose:` (PRD-014). Xem [§11 Formula](#11-formula).

### `@event <Tên>`

Khai báo một sự kiện theo lịch hoặc được kích hoạt. Dạng block:

```markdown
@event Weather Roll
Phase: Pre
Trigger:
Start of Day.
Effect:
Weather := Weighted(Sunny: 60, Rainy: 30, Heat Wave: 10)
Purpose:
Gieo thời tiết hôm nay trước khi Simulation đọc cầu.
```

Bắt buộc: tên, `Phase:`, `Trigger:`.
Điều kiện: `Effect:`, `Precondition:`.
Khuyến nghị: `Purpose:`. Xem [§9 Event](#9-event).

### `@action <Tên>`

Khai báo một lựa chọn của người chơi. Dạng block:

```markdown
@action Buy Stock
Intent:
buy stock
purchase stock
restock
Parameters:
Quantity: Integer
Preconditions:
Quantity >= 1 AND Money >= Quantity * UnitCost
Purpose:
Cho phép người chơi đổi Money lấy Stock.
Failure:
Từ chối khi không đủ tiền; state không đổi.
```

Bắt buộc: tên, `Intent:` (một hoặc nhiều cụm).
Điều kiện: `Parameters:`, `Preconditions:`.
Khuyến nghị: `Purpose:`, `Failure:`. Xem
[§10 Action](#10-action).

### `@auto-action <Tên>`

Khai báo action do runtime phát ra (ví dụ cuối ngày). Dạng block:

```markdown
@auto-action End Day
Fires When:
Stock = 0 OR Customers = 0 OR Day >= MaxDay
Purpose:
Đóng ngày khi doanh nghiệp không thể bán thêm.
```

Bắt buộc: tên, `Fires When:`.
Khuyến nghị: `Purpose:`. Xem [§10 Action](#10-action).

### `<!-- PRD-NNN §X.Y -->`

Không phải directive — là comment HTML Markdown. Các reference game
chèn citation PRD ngay trên dòng nơi quyết định thiết kế được đưa
ra (xem [§15 Quy ước đặt tên](#15-quy-ước-đặt-tên)). Compiler bỏ
qua comment; con người và reviewer được lợi.

---

## 5. File section

Game Package là một thư mục các file section. Mỗi file khai báo một
`@section` và chứa các block thuộc section đó. Các file section bám
theo cấu trúc của Reference Game Lemonade chuẩn (PRD-008 §3).

### `main.md`

File entry. Nhúng mọi section khác theo thứ tự khai báo. Hầu hết
project giữ thứ tự:

```
metadata → world → state → entities → rules → events → actions → ending → ui → start
```

Biến Hidden có thể nằm trong file riêng được nhúng từ `state.md`
(xem `hidden.md` của Lemonade). State-contract, UI-contract và
output-contract mỗi cái nằm file riêng trong Lemonade; với game đơn
giản hơn có thể gộp vào `state.md`, `ui.md` và `start.md`.

### `metadata.md`

Các block bắt buộc (PRD-008 §4):

- `Name:` — tên package
- `Author:` — tác giả / tổ chức
- `Description:` — một đoạn văn, thể loại và mục tiêu người chơi
- `Runtime:` — Runtime major (`1.x` là an toàn hiện tại)
- `Package:` — semver

### `world.md`

Các block tuỳ chọn (PRD-008 §5):

- `Time:` — thời gian trôi như thế nào (lượt = ngày, lượt = hành
  động, …)
- `Setting:` — game diễn ra ở đâu
- `Economy:` — luật tiền / cung / cầu
- `Physics:` — luật vật lý (hỏng, mục rữa, tầm bắn)
- `Culture:` — luật xã hội, phe phái, phong tục

Bỏ qua block nào nếu không áp dụng.

### `state.md`

Hai phần:

1. **Biến** — mỗi khai báo `@variable` cho một khái niệm. Visibility
   là bắt buộc. Xem [§6](#6-biến-và-visibility).
2. **Invariant** — mỗi dòng một ràng buộc, văn xuôi đơn giản, các ràng
   buộc runtime phải giữ ở mỗi State Commit (PRD-006 §14).

Có thể nhúng `hidden.md` riêng để tách các khai báo Hidden.

### `entities.md` (tuỳ chọn)

Entity Persistent (Player, Business, Staff, Customer) và Transient
(entity chỉ tồn tại trong một pha). Xem [§7 Entity](#7-entity).

### `rules.md` (tuỳ chọn)

Mọi tự động hoá. Tổ chức thành các phần con:

- **Named formula** (mỗi `@formula` cho một đại lượng dẫn xuất)
- **Action rule** (Guard và Transformation cho mỗi `@action`)
- **Time-based rule** (Trigger Rule cho cuối ngày, trôi thời gian, …)

Xem [§8 Rule](#8-rule).

### `events.md` (tuỳ chọn)

Hai phần con, một cho mỗi pha:

- **Pre Event** — chạy trước Simulation (dựng môi trường)
- **Post Event** — chạy sau Simulation (phản ứng với kết quả)

Xem [§9 Event](#9-event).

### `actions.md` (tuỳ chọn)

Hai phần con:

- **Player action** — mỗi `@action` cho một lựa chọn
- **Auto action** — khai báo `@auto-action` cho trigger do runtime
  phát ra

Xem [§10 Action](#10-action).

### `ending.md`

Định nghĩa cách game kết thúc. PRD-008 §11 yêu cầu runtime **không**
được kết thúc game trừ khi package của bạn định nghĩa một ending. Các
phần:

- **Win** — điều kiện thắng chính
- **Lose** — điều kiện thua chính
- **Soft ending** — tuỳ chọn kết thúc trung tính (ví dụ sống sót
  nhưng không đạt mục tiêu)
- **Hard ending** — tuỳ chọn kết thúc bắt buộc (ví dụ hết giờ, sự
  kiện thảm hoạ)

Xem [§12 Ending](#12-ending).

### `ui.md`

Nội dung game-cụ thể cho dashboard. LLM-runtime sở hữu layout
(PRD-007). Việc của bạn là liệt kê biến và báo cáo nào nên hiện.
Các phần:

- **Dashboard content** — biến public trên view chính
- **End-of-day summary content** — báo cáo theo lượt hiển thị gì
  (đây là nơi biến Private hiện ra)
- **Suppressed content** — biến Hidden mà runtime không bao giờ được
  render

Xem [§13 Cấu hình UI](#13-cấu-hình-ui).

### `start.md`

Mở đầu game. Các phần:

- **Initial state** — giá trị của mọi biến public ở lượt 1
- **Opening narrative** — 1–3 câu runtime in ra đầu tiên
- **First event** — Pre Event nào chạy ở lượt 1
- **First action prompt** — những action nào khả dụng ở lượt 1

Xem [§14 Kịch bản khởi đầu](#14-kịch-bản-khởi-đầu).

---

## 6. Biến và visibility

Mọi khái niệm trong game có giá trị là một `@variable`. Ba loại
visibility (PRD-006 §16, PRD-003 §9a):

| Visibility | Nơi hiện ra                                                |
|------------|------------------------------------------------------------|
| `Public`   | Luôn hiển thị. Render trên dashboard, trong báo cáo.       |
| `Private`  | Chỉ hiện trong báo cáo (cuối ngày, cuối tháng).           |
| `Hidden`   | Không bao giờ hiện. Dùng cho state người chơi không thấy. |

### Pattern thường gặp

```markdown
@variable Money
Visibility: Public
Purpose:
Tiền mặt hiện có, đơn vị tiền tệ nguyên. Game kết thúc nếu giá
trị này âm.

@variable DailyRevenue
Visibility: Private
Purpose:
Doanh thu hôm nay. Chỉ hiện trong báo cáo cuối ngày.

@variable SupplyShortageChance
Visibility: Hidden
Purpose:
Cung hôm nay có bị hạn chế hay không. Được set bởi Pre Event và
đọc bởi một Transformation Rule.
```

### Lỗi thường gặp

- **Quên `Visibility:`** — validator cảnh báo và mặc định `Public`.
  Luôn khai báo tường minh.
- **Đặt biến Hidden lên dashboard** — runtime buộc phải ẩn chúng,
  nhưng thiết kế phòng thủ: đừng viết block UI liệt kê biến Hidden.
- **Dùng một biến cho hai khái niệm** — khai báo mỗi khái niệm
  riêng. Nếu `Reputation` và `CustomerSatisfaction` khác nhau trong
  game của bạn, khai báo cả hai.

---

## 7. Entity

Entity là các tác nhân có tên mà runtime theo dõi. Hai loại
(PRD-006 §5a, PRD-008 §7):

| Kind        | Vòng đời                                   | Khi nào dùng                              |
|-------------|--------------------------------------------|-------------------------------------------|
| `Persistent`| Sống xuyên suốt các lượt, nằm trong snapshot | Player, Business, Staff, Customer, Item  |
| `Transient` | Chỉ tồn tại trong một pha                  | State mỗi lần lặp trong Simulation        |

### Persistent entity

```markdown
@entity Player
Kind: Persistent
Attributes:
Money, Reputation
Behaviour:
Sở hữu Business và quyết định action mỗi lượt.
Relationships:
Sở hữu một Business; thuê Staff.
```

- `Attributes` — danh sách biến phân cách bằng dấu phẩy "sống trên"
  entity này. Dùng để tài liệu hoá; runtime không tự động enforce
  ownership.
- `Behaviour` — ngôn ngữ tự nhiên. Cho runtime và bất kỳ ai đọc biết
  entity làm gì.
- `Relationships` — ngôn ngữ tự nhiên, tương tự.
- `Purpose` — khuyến nghị cho audit tài liệu.

### Transient entity

```markdown
@entity Sale
Kind: Transient
Lifetime: Simulation Phase
Attributes:
Revenue, CostOfGoods
Behaviour:
Khởi tạo một lần cho mỗi Customer được phục vụ trong Simulation, sau
đó bị huỷ khi pha kết thúc.
```

`Lifetime:` bắt buộc cho Transient entity. Runtime không bao giờ
được đưa Transient entity vào Turn History hoặc snapshot.

### Khi nào khai báo cái gì

Hầu hết game khai báo `Player`, một hoặc nhiều tác nhân cốt lõi
(`Business`, `Stand`, `Crew`), và một Transient cho đơn vị mô phỏng
mỗi lần lặp (`Cup`, `Sale`, `Hit`, `Shot`). Nếu game không có
entity nào sống xuyên suốt các lượt (ví dụ câu đố một hành động),
bạn có thể bỏ qua toàn bộ `entities.md`.

---

## 8. Rule

Rule là trái tim của game. Chúng là cách state thay đổi. Ba loại
(PRD-008 §15a.4, PRD-010, PRD-011):

| Kind             | Trigger | Precondition | Effect  | Dùng để                                   |
|------------------|---------|--------------|---------|-------------------------------------------|
| `Guard`          | ✓       | ✓            | ✗       | Chặn action khi điều kiện không thoả    |
| `Transformation` | ✓       | ✓            | ✓       | Áp dụng hiệu ứng của action              |
| `Trigger`        | ✓       | tuỳ chọn     | ✓       | Tự động chạy trên một pha/event          |

### Pattern cặp

Với mỗi `@action`, bạn thường viết một `Guard` và một `Transformation`
cùng `Trigger:`. Guard từ chối; Transformation áp dụng (PRD-011 §9).
Chúng chạy nguyên tử: nếu Precondition fail khi thực thi (state đổi
giữa guard và simulation), Transformation bị bỏ qua toàn bộ.

```markdown
@rule CanBuyStock
Kind: Guard
Trigger:
On Action(Buy Stock)
Precondition:
Money >= Quantity * UnitCost
Purpose:
Chặn Buy Stock khi người chơi không đủ tiền.
Failure:
Từ chối action; ApplyBuyStock không chạy.

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
Thực hiện mua hàng nguyên tử.
Failure:
Nếu Precondition fail khi thực thi, rule bị bỏ qua; state không
đổi.
```

### Trigger

Trigger Rule chạy ở các Event Phase (PRD-005 §7, §7a). Chúng chạy
sau Simulation, trước Commit, hoặc trước Simulation, tuỳ phase.

```markdown
@rule ChargeDailyCosts
Kind: Trigger
Trigger:
On Post Event
Effect:
Money -= DailyRent
Priority:
0
Purpose:
Trừ tiền thuê mặt bằng cuối mỗi ngày.

@rule RollCustomers
Kind: Trigger
Trigger:
On Pre Event
Effect:
Customers := Max(0, Round(CustomersToday))
Priority:
5
Purpose:
Tính số khách hôm nay trước khi Simulation đọc.
```

### Priority và xung đột

Khi hai Rule chạm cùng biến trong cùng pha, `Priority:` cao hơn
chạy trước (PRD-010 §10, PRD-011 §10). Cùng Priority:

- phép cộng (`+=`, `-=`): tính tổng
- phép nhân (`*=`, `/=`): compose
- phép gán (`:=`): cần winner tường minh — khai báo thứ tự trong
  phần `## Rule priority` ở cuối section

### Tài liệu

Mỗi Rule nên khai báo `Purpose:` và `Failure:` (PRD-014). Block
Purpose là thứ LLM đọc để hiểu *tại sao* rule tồn tại. Block Failure
cho nó biết phải làm gì khi Precondition fail (từ chối? bỏ qua?
kể?).

---

## 9. Event

Event là các mảnh narrative theo lịch hoặc được kích hoạt. Chúng
chạy trong hai phase tách biệt (PRD-005 §7, §7a):

- **Pre Event** — chạy trước Simulation. Dựng môi trường của lượt
  (thời tiết, cung, điều kiện thị trường, roll hidden).
- **Post Event** — chạy sau Simulation, trước Commit. Phản ứng với
  chuyện vừa xảy ra (thưởng festival, khiếu nại khách, kiểm toán).

```markdown
@event Weather Roll
Phase: Pre
Trigger:
Start of Day.
Effect:
Weather := Weighted(Sunny: 60, Rainy: 30, Heat Wave: 10)
Purpose:
Gieo thời tiết hôm nay trước khi Simulation đọc cầu.

@event Festival
Phase: Post
Trigger:
Customers = 0 AND Reputation >= 40
Effect:
Reputation += Clamp(5, 0, 100 - Reputation)
Purpose:
Thưởng ngày bán hết hàng. Chỉ kích hoạt khi Reputation đã ở 40+
để người chơi đầu game không cảm thấy bị phạt tuỳ tiện.
```

### Thứ tự Event

Trong mỗi phase, event chạy theo thứ tự khai báo trừ khi `Priority:`
được đặt. Ghi lại thứ tự trong block `## Event ordering` ở cuối
`events.md` để runtime và reviewer thấy ý đồ của bạn (Lemonade làm
thế; compiler không enforce).

### Khi nào dùng Event vs Rule

- Dùng **Event** khi trigger là "đầu ngày", "cuối ngày", hoặc hệ
  quả driven-by-state.
- Dùng **Rule với Trigger** khi bạn cần `Precondition`, `Effect`, và
  `Priority` cùng nhau thành một đơn vị (Pre Event setup, Post Event
  reaction).
- Dùng **Rule với Transformation** khi trigger là một `@action`.

---

## 10. Action

Action là bề mặt người chơi. Chúng chỉ khai báo *người chơi định
làm gì*, không phải chuyện gì xảy ra. Hiệu ứng nằm trong Rule.

```markdown
@action Buy Stock
Intent:
buy stock
purchase stock
restock
Parameters:
Quantity: Integer
Preconditions:
Quantity >= 1 AND Money >= Quantity * UnitCost
Purpose:
Cho phép người chơi đổi Money lấy Stock.
Failure:
Từ chối khi không đủ tiền; state không đổi.
```

- `Intent:` — một hoặc nhiều cụm ngôn ngữ tự nhiên. Runtime đối
  chiếu input người chơi với intent.
- `Parameters:` — danh sách tham số có kiểu. Dùng dạng `Tên: Kiểu`.
- `Preconditions:` — boolean guard. Cùng cú pháp expression như body
  `@formula`.
- `Purpose:` — bắt buộc cho tài liệu (PRD-014).
- `Failure:` — khuyến nghị. Runtime kể gì khi action bị từ chối.

### Auto action

Một số action do runtime phát ra, không phải người chơi. Khai báo
chúng bằng `@auto-action` và điều kiện `Fires When:`:

```markdown
@auto-action End Day
Fires When:
Stock = 0 OR Customers = 0 OR Day >= MaxDay
Purpose:
Đóng ngày khi doanh nghiệp không thể bán thêm.
```

Runtime kích hoạt Auto-Action đã đặt tên khi điều kiện trở thành
true. Auto-Action thường dùng để kết thúc lượt, kết thúc game, hoặc
chuyển phase.

---

## 11. Formula

Formula là các biểu thức tái sử dụng. Chúng được giải ở Build time
(PRD-009 §14). Body phải là expression — không bao giờ là văn xuôi
(PRD-009 §18a).

### Một dòng

```markdown
@formula BaseDemand
Reputation * 0.5 + 10
Purpose:
Số khách nền trước các modifier.
```

### Piecewise

```markdown
@formula WeatherModifier
When Weather = Rainy      Then 0.5
When Weather = Heat Wave  Then 1.5
Otherwise                 Then 1.0
Purpose:
Hệ số nhân cầu.
```

### Tham chiếu

Body của formula có thể chỉ là tên formula khác:

```markdown
@formula CustomersToday
BaseDemand * WeatherModifier - Price * 0.05
Purpose:
Số khách cuối cùng trong ngày.
```

### Hàm thường dùng

`Max(a, b)`, `Min(a, b)`, `Clamp(x, lo, hi)`, `Round(x)`,
`Floor(x)`, `Ceil(x)`, `Abs(x)`, `Weighted(...)`, `Uniform(lo, hi)`,
`Round(...)`. Xem PRD-009 để có danh sách chuẩn và `gaps.md` trong
reference game để biết những thứ đang được thiết kế (ví dụ String
containment trong Hangman GAP-010).

---

## 12. Ending

Runtime **không** được kết thúc game trừ khi package của bạn định
nghĩa một ending (PRD-008 §11). Bốn phần, đều tuỳ chọn nhưng nên
định nghĩa tối thiểu Win và Lose:

```markdown
## Win

Cuối Day 30:
Money >= 2000 AND Reputation >= 70 → Người chơi thắng.

## Lose

Tại bất kỳ State Commit:
Money < 0 → Người chơi thua. Game kết thúc ngay.

## Soft ending

Cuối Day 30:
0 <= Money < WinThreshold → Kết thúc trung tính.

## Hard ending

Không có cho game này.
```

Pattern thường gặp:

- **Win cuối ngày cuối** — hầu hết tycoon, sim, RPG.
- **Lose theo điều kiện** — phá sản, chết, hết giờ.
- **Soft ending** — sống sót nhưng dưới ngưỡng (tycoon thường có bậc
  C/B/A/S).
- **Hard ending** — kết thúc bắt buộc (chiến tranh, tuyệt chủng,
  thảm hoạ).

---

## 13. Cấu hình UI

Bạn khai báo *nội dung*; LLM-runtime sở hữu *layout* (PRD-007,
PRD-008 §12). Ba phần con:

```markdown
## Dashboard content

Day (of MaxDay)
Money
Reputation
Stock
Price (if set)

## End-of-day summary content

Khách được phục vụ
Đơn vị đã bán
Doanh thu
Chi phí (thuê, lương, hỏng)
Thay đổi uy tín
Event(s) đã kích hoạt

## Suppressed content

Weather, SupplyShortageChance, và mọi Hidden variable khác từ
state.md KHÔNG ĐƯỢC xuất hiện trên bất kỳ bề mặt UI nào.
```

### Mẹo

- **Dashboard** liệt kê biến public theo thứ tự bạn muốn hiển thị.
  Runtime render chúng.
- **Summary** liệt kê các trường báo cáo theo lượt. Đây là nơi biến
  Private hiện ra.
- **Suppressed** liệt kê mọi biến Hidden và khẳng định nó không bao
  giờ được render. Runtime enforce chuyện này, nhưng khẳng định giúp
  reviewer phát hiện rò rỉ.

---

## 14. Kịch bản khởi đầu

Người chơi thấy gì ở lượt 1. Bốn phần:

```markdown
## Initial state

Money = 500
Day = 1
Reputation = 50
Stock = 0
Price = 0 (chưa đặt)

## Opening narrative

Bạn là chủ mới của một doanh nghiệp nhỏ. Cửa sẽ mở vào ngày mai.
Bạn sẽ làm gì trước?

## First event

Weather Roll (xem events.md).

## First action prompt

Buy Stock, Set Price, Start Selling.
```

`Initial state` liệt kê mọi biến public và giá trị khởi đầu.
`Opening narrative` là 1–3 câu. `First event` đặt tên Pre Event chạy
ở lượt 1 (hoặc "Không"). `First action prompt` liệt kê những action
người chơi có thể chọn đầu tiên.

---

## 15. Quy ước đặt tên

Tên theo Title-Case, một dấu cách giữa các từ (PRD-008 §15a, validation
`DIRECTIVE_SYNTAX_DECLARATION_INVALID_NAME`):

- **Một từ**: `Money`, `Day`, `Cup`
- **Nhiều từ, một dấu cách**: `Buy Stock`, `Sell One Cup`,
  `Auto Action End Day`, `Weather Roll`, `Heat Wave`

Bị cấm:

- Nhiều dấu cách (`Buy  Stock`)
- Khoảng trắng đầu/cuối
- Toàn chữ thường (`moneystock`)
- Snake-case hoặc kebab-case (`Buy_Stock`, `Buy-Stock`)
- Toàn chữ số hoặc bắt đầu bằng chữ số (`3Day`)

Section id thì thân thiện với kebab: `intro`, `rules`,
`state-contract`, `output-contract`. id có thể chứa chữ, số, dấu
gạch ngang, gạch dưới, dấu chấm.

---

## 16. Validation và lỗi thường gặp

Chạy `mgr validate` sau mỗi lần sửa quan trọng. Compiler phát ra lỗi
có cấu trúc với file, dòng, directive và gợi ý (PRD-001 §13,
`src/errors/`). Mã lỗi bạn sẽ gặp nhiều nhất:

| Mã lỗi                                  | Nguyên nhân                                         | Cách sửa                                          |
|-----------------------------------------|-----------------------------------------------------|---------------------------------------------------|
| `DIRECTIVE_SYNTAX_DECLARATION_INVALID_NAME` | Sai định dạng tên                              | Dùng Title-Case, một dấu cách                     |
| `SECTION_SCHEMA_MISSING_BLOCK`          | Block bắt buộc bị thiếu trên một declaration        | Thêm block mà validator chỉ ra                    |
| `SECTION_SCHEMA_FORBIDDEN_BLOCK`        | Block hiện diện trên kind cấm nó                   | Bỏ `Effect:` khỏi Guard, v.v.                     |
| `SECTION_SCHEMA_MISSING_KIND`           | Block `Kind:` bị thiếu                              | Thêm `Kind: Guard / Transformation / Trigger`     |
| `SECTION_SCHEMA_DUPLICATE_BLOCK`        | Cùng block khai báo hai lần trên một declaration    | Gộp hai block lại                                 |
| `SECTION_SCHEMA_UNKNOWN_BLOCK`          | Tên block không có trong schema                     | Kiểm tra chính tả hoặc chuyển vào `Behaviour:`    |
| `DOCUMENTATION_PURPOSE_MISSING`         | Declaration không có block `Purpose:`                | Thêm 1–3 câu giải thích ý đồ                      |
| `DOCUMENTATION_BLOCK_EMPTY`             | Block khai báo nhưng rỗng                          | Điền nội dung hoặc xoá heading                    |
| `UNKNOWN_DIRECTIVE`                     | Tên directive không có trong registry               | Kiểm tra chính tả; compiler gợi ý did-you-mean   |
| `IMPORT_NOT_FOUND`                      | Không tìm thấy đích `@import`                       | Kiểm tra đường dẫn; nhớ tiền tố `/` neo về srcDir |
| `IMPORT_OUTSIDE_SRC`                    | `@import` phân giải ra ngoài srcDir                 | Dùng đường dẫn tương đối hoặc `/`                 |
| `DUPLICATE_SECTION`                     | Hai `@section` cùng id                              | Đổi tên một cái                                   |
| `DEPENDENCY_CYCLE`                      | Vòng `@import`                                      | Phá vòng                                          |
| `FORMULA_BODY_INVALID`                  | Body formula giống văn xuôi                         | Dùng dòng đơn, piecewise, hoặc tham chiếu formula |

Lỗi được bản địa hoá sang tiếng Anh và tiếng Việt qua `--lang`.
Ngôn ngữ mặc định theo `MGR_LANG` → `LANG` → `en`.

---

## 17. Quy trình viết đề xuất

Bạn có thể viết section theo bất kỳ thứ tự nào, nhưng chuỗi sau đây
cho ra ít vòng sửa nhất:

1. **`metadata.md`** — tên, tác giả, mô tả, runtime, version. Khoá
   các trường này sớm; chúng hiện trong mọi build artifact.
2. **`world.md`** — chọn thang thời gian (lượt = ngày / hành động /
   tuần) và kinh tế (tiền tệ, luật cung).
3. **`state.md`** — khai báo biến (Public / Private / Hidden) và
   invariant. Cố gắng đừng thêm biến sau.
4. **`entities.md`** — khai báo tác nhân persistent và mọi đơn vị
   per-iteration transient.
5. **`start.md`** — đặt giá trị khởi đầu và viết lời dẫn. Giờ game
   đã có lượt 0.
6. **`actions.md` + `rules.md` cùng nhau** — với mỗi player action,
   viết `CanX` Guard và `ApplyX` Transformation cùng nhau. Thêm
   formula mà nó phụ thuộc trước.
7. **`events.md`** — Pre Event dựng mỗi lượt, Post Event phản ứng với
   kết quả.
8. **`ending.md`** — tối thiểu Win và Lose. Thêm Soft / Hard nếu game
   hỗ trợ.
9. **`ui.md`** — dashboard hiện gì, summary hiện gì, gì phải ẩn.

Chạy `mgr validate` sau mỗi section. Compiler bắt lỗi schema, block
thiếu, và lỗi chính tả. Bạn có thể chạy trên project chưa hoàn
chỉnh; bundler chỉ phàn nàn nếu không có gì để bundle.

Khi đã có bundle build được, bài test thật là đọc nó. Chạy
`mgr build` và lướt `dist/<tên>-<phiên-bản>.md`. Nếu section nào
mơ hồ, viết lại source. Bundle là thứ LLM đọc — nó chính là giao
diện người dùng của game.

---

## 18. Reference game và template

Ba nơi để sao chép từ:

- **`templates/blank/`** — khung tối thiểu. Dùng để bắt đầu một
  game không thuộc thể loại cụ thể nào.
- **`templates/business-sim/`** — khung 11 section đầy đủ cho game
  bán hàng / tycoon / chuỗi cung ứng, với các khai báo mẫu
  `@variable`, `@rule`, `@event`.
- **`tests/reference-games/lemonade/`** — ví dụ hoạt động chuẩn. Mô
  phỏng bán nước chanh 20 ngày, kích hoạt mọi section PRD. Đọc
  `lemonade/gaps.md` trước — nó liệt kê các câu hỏi mở mà game này
  phơi bày về runtime.
- **`tests/reference-games/hangman/`** — ví dụ hoạt động thứ hai ở
  thể loại khác (đoán chữ). Dùng để xem game có biến String và toán
  tử `in` được viết như thế nào.

Compiler không enforce thể loại game cụ thể nào. Các `section` là
quy ước; layout Lemonade chuẩn là đề xuất, không phải yêu cầu. Nếu
game của bạn cần section `combat.md` hoặc `dialogue.md`, cứ khai báo
và nhúng từ `main.md` — compiler sẽ bundle nó ở chỗ nó rơi vào.

Để tham chiếu schema chính thức, xem PRD-008 §15a (Section Schema).
Để biết yêu cầu tài liệu (Purpose, Failure), xem PRD-014.

---

*Chúc viết vui. Đừng để sữa hỏng.*
