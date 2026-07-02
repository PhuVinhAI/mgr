@section start

<!-- PRD-008 §13 Start Scenario — initial State, opening narrative, first
     action. -->

## Initial state

Money = 20 cents
Day = 1
Reputation = 50
Price = 0 (unset)
Weather = to be rolled by first Weather event
Customers = 0
Lemons = 0
Sugar = 0
Ice = 0

## Opening narrative

It is the first morning of summer. Twenty dollars sits in your apron
pocket. The street outside is empty; your stand has no cups, no lemons,
no ice. What will you do first?

## First event

Weather roll for Day 1 (see events.md). Result becomes the public
Weather variable and drives that day's TodayTemperature and TodayDemand.

## First action prompt

Runtime asks the player to choose an action. Available: Buy Lemons,
Buy Sugar, Buy Ice, Set Price, Start Selling.

<!-- Start Selling with zero inventory is technically legal but will sell
     zero cups. That is intentional — it lets the game teach the ingredient
     rule by consequence. -->
