@section actions

<!-- PRD-008 §10 Actions + PRD-008 §15a.6 Section Schema +
     PRD-012 Action Resolution + PRD-014 Documentation Schema.
     Block declarations use first-class directives. -->

## Actions

<!-- Effects live in Rule Transformations (see rules.md). Actions declare
     only Intent, Parameters, Preconditions, and documentation blocks. -->

@action Buy Lemons
Intent:
buy lemons
purchase lemons
grab lemons
Parameters:
Quantity: Integer
Preconditions:
Quantity >= 1 AND Money >= Quantity * 5
Purpose:
Let the player convert Money into Lemons inventory. Each lemon costs 5
cents; the action rejects when the player cannot afford the total.
Failure:
Reject the action; state does not change; response tells the player
they need more Money or a smaller Quantity.

@action Buy Sugar
Intent:
buy sugar
purchase sugar
grab sugar
Parameters:
Quantity: Integer
Preconditions:
Quantity >= 1 AND Money >= Quantity * 3
Purpose:
Let the player convert Money into Sugar inventory at 3 cents per unit.
Failure:
Reject the action; state does not change; response explains the funds
shortfall.

@action Buy Ice
Intent:
buy ice
purchase ice
grab ice
Parameters:
Quantity: Integer
Preconditions:
Quantity >= 1 AND Money >= Quantity * 2
Purpose:
Let the player convert Money into Ice inventory at 2 cents per unit.
Ice melts overnight; buying too much on Day N wastes stock by Day N+1.
Failure:
Reject the action; state does not change; response tells the player
the transaction was not completed.

@action Set Price
Intent:
set price
change price
price
Parameters:
Price: Integer
Preconditions:
Price >= 0
Purpose:
Let the player choose the per-cup price for the current day. Price
drives the demand curve in CustomersToday (see rules.md).
Failure:
Reject negative prices; state does not change.

@action Start Selling
Intent:
start selling
open shop
sell
open
Preconditions:
Price >= 0
Purpose:
Move from setup into the selling phase for the day. Runtime then
iterates SellOneCup until an ingredient runs out or Customers reaches
zero.
Failure:
Reject when Price has not been set for the day; response reminds the
player to set a price first.

<!-- PRD-012 §10 Auto Action — Runtime emits automatically when the
     Simulation Phase for the day completes. -->

@auto-action End Day
Fires When:
Customers = 0 OR Lemons < 1 OR Sugar < 1 OR Ice < IcePerCup
Purpose:
Close the day once the stand can no longer sell — either demand is
satisfied or an ingredient ran out. Triggers Overnight rule which
advances Day and clears Ice.
