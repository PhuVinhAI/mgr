@section actions

<!-- PRD-008 §10 Actions + PRD-008 §15a.6 Section Schema +
     PRD-012 Action Resolution + PRD-014 Documentation.
     Block declarations use first-class directives (@action). -->

## Player actions

<!-- Effects live in Rule Transformations (see rules.md). Actions
     declare only Intent, Parameters, Preconditions, and
     documentation blocks. -->

<!-- EXAMPLE — keep, edit, or delete. -->

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
Let the player convert Money into Stock inventory. UnitCost is a
Named Formula or constant.
Failure:
Reject when funds are insufficient; state does not change; response
explains the funds shortfall.

@action Set Price
Intent:
set price
change price
adjust price
Parameters:
Price: Integer
Preconditions:
Price >= 0
Purpose:
Let the player choose the per-unit selling price. Drives demand.
Failure:
Reject negative prices; state does not change.

@action Start Selling
Intent:
start selling
open shop
open
sell
Preconditions:
Price >= 0
Purpose:
Move from setup into the selling phase. The runtime then iterates a
"Sell One" Transformation Rule (see rules.md) until an ingredient or
demand runs out.
Failure:
Reject when Price has not been set; response reminds the player to
set a price first.

<!-- TODO: add more actions. Examples: Hire Staff, Fire Staff,
     Adjust Quality, Take Loan, Pay Down Debt. -->

## Auto actions

<!-- PRD-012 §10 — Runtime emits automatically when a Simulation
     Phase completes. -->

@auto-action End Day
Fires When:
Stock = 0 OR Customers = 0 OR Day >= MaxDay
Purpose:
Close the day once the business can no longer sell, or when the
calendar reaches MaxDay. Triggers the Post Event rules (rent,
salary, festival check) and the day counter advance.
