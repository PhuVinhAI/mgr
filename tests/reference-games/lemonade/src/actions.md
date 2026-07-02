@section actions

<!-- PRD-008 §10 Actions + PRD-008 §15a.6 Section Schema +
     PRD-012 Action Resolution. -->

## Actions

<!-- Effects live in Rule Transformations (see rules.md). Actions declare
     only Intent, Parameters, and Preconditions per §15a.6. -->

Action Buy Lemons

Intent:
buy lemons
purchase lemons
grab lemons

Parameters:
Quantity: Integer

Preconditions:
Quantity >= 1 AND Money >= Quantity * 5

Action Buy Sugar

Intent:
buy sugar
purchase sugar
grab sugar

Parameters:
Quantity: Integer

Preconditions:
Quantity >= 1 AND Money >= Quantity * 3

Action Buy Ice

Intent:
buy ice
purchase ice
grab ice

Parameters:
Quantity: Integer

Preconditions:
Quantity >= 1 AND Money >= Quantity * 2

Action Set Price

Intent:
set price
change price
price

Parameters:
Price: Integer

Preconditions:
Price >= 0

Action Start Selling

Intent:
start selling
open shop
sell
open

Preconditions:
Price >= 0

Auto Action End Day

<!-- PRD-012 §10 Auto Action — Runtime emits automatically when the
     Simulation Phase for the day completes. -->

Fires When:
Customers = 0 OR Lemons < 1 OR Sugar < 1 OR Ice < IcePerCup
