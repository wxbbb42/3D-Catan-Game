# PRD: Core Game Mechanics (Online Catan)

Project: Online Catan  
Module: Game Rules Engine  
Status: Draft  
Owners: Product + Engineering  
Last Updated: 2026-02-03

## 1. Game Setup & Objective

### 1.1 Board Composition
- **19 Hexes Total**: 4 Grain, 4 Wood, 4 Brick, 4 Sheep, 3 Ore, 1 Desert
- **Number Tokens**: Distributed 2-12 (excluding 7); Desert has no token
- **Robber Initial Position**: Desert hex
- **Ports**: 9 ports total (1× 3:1 generic, 2× each resource-specific 2:1)
- **Vertices (Nodes)**: 54 total; where settlements/cities are built
- **Edges**: 72 total; where roads are built

### 1.2 Resource Types
Five resource types: **Wood**, **Brick**, **Grain**, **Sheep**, **Ore**

### 1.3 Initial Setup Phase
1. **Random turn order** or player selection
2. **First round placement**: Each player places 1 settlement + 1 road (ascending order: P1 → P2 → P3 → P4)
3. **Second round placement**: Each player places 1 settlement + 1 road (descending order: P4 → P3 → P2 → P1)
4. **Initial resources**: Each player receives resources from hexes adjacent to their **second** settlement
5. Distance rule applies during setup (settlements must be ≥2 edges apart)

### 1.4 Win Condition
- First player to reach **10 Victory Points (VP)** wins
- VP check happens **immediately** when points are gained (including hidden VP cards)
- VP Sources:
  - Settlement: 1 VP
  - City: 2 VP (net +1 from settlement upgrade)
  - Longest Road: 2 VP (transferable)
  - Largest Army: 2 VP (transferable)
  - Victory Point Dev Cards: 1 VP each (5 in deck)

### 1.5 Player Piece Limits
- **Roads**: 15 per player
- **Settlements**: 5 per player
- **Cities**: 4 per player
- If a player runs out of pieces, they cannot build more until pieces are freed (city upgrade frees a settlement)

### 1.6 Turn Structure
1. **Pre-Roll**: May play Knight or other dev cards (except VP)
2. **Roll Dice**: Mandatory (or play Knight instead to skip roll)
3. **Production/Robber**: Distribute resources OR handle robber (if 7)
4. **Trade**: Domestic & Maritime (multiple trades allowed)
5. **Build/Buy**: Roads, settlements, cities, dev cards (multiple actions allowed)
6. **End Turn**: Explicitly end turn to pass control

## 2. Feature: Resource Production (The Roll)
**Input:** Random integer 2..12 (sum of 2d6)  
**Output:** Distribute resources to all players with settlements/cities on matching hexes.

- Settlement: +1 resource
- City: +2 resources
- Bank Constraint: If the bank is out of a specific resource, **no player receives that resource** for this roll.

### 2.1 The Robber (Roll = 7)
- Trigger: Dice sum is **7**.
- Production: No resources produced.
- **Sequence**:
  1. **Discard Phase** (all players simultaneously):
     - If player hand count > 7, discard **floor(count / 2)** cards.
     - Player selects exact cards to discard.
     - If multiple players must discard, wait for all before proceeding.
  2. **Robber Movement** (active player):
     - Active player must move robber to a **different hex**.
     - Cannot leave robber on current hex.
     - Robbed hex produces **0 resources** while robber is present.
  3. **Steal** (active player):
     - Active player selects **one target** with a settlement/city on the new robber hex.
     - If multiple players have buildings on the hex, active player chooses.
     - If no players have buildings on the hex, no steal occurs.
     - If target has 0 cards, no steal occurs.
     - System randomly transfers **1 resource** from target's hand to active player.

## 3. Feature: Trading
Trading requires a **handshake protocol** to validate offers.

### 3.1 Domestic Trade (Player-to-Player)
- Initiator: **Active player only**.
- Participants: Active player can trade with **any other player** (not just adjacent).
- Non-active players **cannot** trade with each other.
- Offer Structure: {Give: [resources], Receive: [resources]}
  - Example: "Give 1 Wood, 1 Brick for Receive 1 Ore, 1 Grain"
- Counter-party actions: Accept, Reject, Counter-offer.
- **Multi-offer handling**: 
  - Active player can broadcast offer to all players
  - Active player can make sequential offers to different players
  Bank is considered to have **unlimited resources** for maritime trade purposes.
- Standard rate: **4:1** (give 4 identical, get 1 of choice).
- Generic Port (3:1): If player owns a settlement/city on a **3:1 port vertex**.
- Resource Port (2:1): If player owns a settlement/city on a **resource-specific port vertex**.
  - Applies only to that resource (e.g., 2 Brick → 1 Any).
- **Port Adjacency**: A vertex is "on a port" if it's one of the two vertices defining that port edge.
- Multiple trades allowed per turn (e.g., 4 Wood → 1 Ore, then 4 Brick → 1 Grainby each side).
- Trade cancellation: Either party can cancel before final confirmation.

### 3.2 Maritime Trade (Bank/Ports)
- Always available to **active player**.
- Standard rate: **4:1** (give 4 identical, get 1 of choice).
- Generic Port (3:1): If player owns a settlement on a **3:1 port**.
- Resource Port (2:1): If player owns a settlement on a **resource-specific port**.
  - Applies only to that resource (e.g., 2 Brick → 1 Any).

## 4. Feature: Building & Costs
Building consumes resources and updates board state.

| Item | Cost | Requirement | Effect |
|---|---|---|---| (except VP cards).
- **Cannot play** a dev card in the same turn it was purchased.
- Exception: **Victory Point** cards count immediately upon purchase but remain hidden.
- **Deck Composition** (25 cards total):
  - 14× Knight
  - 5× Victory Point
  - 2× Road Building
  - 2× Year of Plenty
  - 2× Monopoly
- When deck is empty, no more dev cards can be purchased.

### 5.1 Card Types
- **Knight (Soldier)** (14 cards)
  - Action: Move robber + steal (same as rolling 7, but no discard phase).
  - Can be played **before** rolling dice to avoid rolling.
  - Stat: +1 to "Knights Played" count (Largest Army tracking).
- **Road Building** (2 cards)
  - Action: Place up to 2 roads immediately, no resource cost.
  - Roads still must follow normal placement rules (connectivity).
  - Can place 0, 1, or 2 roads (player choice).
- **Year of Plenty** (2 cards)
  - Action: Take any 2 resources from bank (can be same or different types).
- **Monopoly** (2 cards)
  - Action: Name 1 resource type; **all other players** give **all cards** of that type to active player.
  - If a player has 0 cards of that type, they give nothing.
- **Victory Point** (5 cards)
  - Action: Hidden from other players; counted toward VP total immediately.
  - Must be revealed when player reaches 10 VP to claim victory.
  - Cannot be stolen or lost
- **Knight (Soldier)**
  - Action: Move robber + steal (same as rolling 7).
  - Stat: +1 to Army Size (Largest Army tracking).
- **Road Building**
  - Action: Place 2 roads immediately, no resource cost.
- **Year of Plenty**
  - Action: Take any 2 resources from bank.
- **MoGame State Machine
Explicit state transitions for implementation clarity:

```
SETUP → PLACE_INITIAL_SETTLEMENT → PLACE_INITIAL_ROAD → (repeat for all players, then reverse) → GAME_START

Turn Loop:
TURN_START → PRE_ROLL (optional dev card play)
           → ROLL_DICE
           → [if 7] DISCARD_PHASE → MOVE_ROBBER → STEAL
           → [if not 7] DISTRIBUTE_RESOURCES
           → MAIN_PHASE (trade, build, play dev cards - repeatable)
           → [check VP >= 10] GAME_OVER
           → TURN_END → (next player) TURN_START
```

**State Constraints**:
- `DISCARD_PHASE`: All players with >7 cards must discard before state progresses
- `MOVE_ROBBER`: Active player must complete robber movement before continuing
- `STEAL`: Automatically attempted if valid targets exist
- `MAIN_PHASE`: Player can perform multiple actions; explicitly ends turn to progress

## 9. Edge Case Clarifications

### 9.1 Building Constraints
- **Road Connectivity**: During normal play, roads must connect to existing owned road/settlement/city.
  - Exception: During initial setup, first road must connect to just-placed settlement.
- **Settlement Connectivity**: Must connect to an owned road (except during initial setup).
- **Piece Exhaustion**: If a player has no roads left, `Road Building` dev card cannot be used.
- **City Upgrade**: Returns settlement piece to player's supply (can be reused).

### 9.2 Resource Bank Limits
- **Production Block**: If bank runs out of a specific resource during a roll, **no one** receives that resource.
- **Maritime Trade**: Bank is treated as unlimited for maritime trade purposes.
- **Year of Plenty**: If bank is empty, player cannot select that resource.

### 9.3 Robber Special Cases
- **Desert Initial**: Robber starts on desert hex.
- **No Valid Targets**: If robber is moved to a hex with no settlements/cities, no steal occurs.
- **Empty Hand**: If all potential targets have 0 resources, no steal occurs.
- **Must Move**: Player cannot choose to leave robber in place; must move to different hex.

### 9.4 Longest Road Recalculation Triggers
- When any player builds a road → recalculate all players
- When any player builds a settlement/city on an opponent's road chain → recalculate owner's road
- **Tie Rule**: If multiple players tie for longest road length, current holder keeps it (or no one gets it if no one currently has it)

### 9.5 Victory Conditions
- **Immediate Check**: VP checked immediately when any VP-generating event occurs (building, dev card play, special award transfer)
- **Hidden VP**: Player can reach 10 VP during another player's turn (e.g., via Monopoly card giving them resources)
- **Reveal Timing**: Player must reveal hidden VP cards when claiming victory

## 10. Open Questions
- Timer values for each phase (seconds).
- Trade UI flow for counter-offers (single-threaded vs. multi-threaded).
- Whether to support any house rules or variants in v1.
- Reconnection strategy: resume from current state or forfeit turn?ealed to opponents.

## 6. Feature: Special Awards (Global State)
Awards can switch owners dynamically.

### 6.1 Longest Road (2 VP)
- Criteria: Continuous chain of **≥ 5** roads not interrupted by opponent settlement.
- Transfer Rule:
  - Must **exceed** current owner length (ties do not transfer).
  - If current owner length is reduced, re-evaluate all players.

### 6.2 Largest Army (2 VP)
- Criteria: Played **≥ 3 Knight** cards.
- Transfer Rule:
  - First to 3 gets it.
  - Another player must **exceed** (not tie) current record to steal.

## 7. Edge Cases (Online Play)
- Disconnection during trade: **Auto-cancel offer**.
- Timer Expiry:
  - Dice phase: Auto-roll after X seconds.
  - Discard phase (roll 7): Auto-discard random cards on timeout.
  - Turn: Auto-end turn on timeout.
- Road Interruption:
  - If a settlement breaks a chain, recompute longest continuous segment.
  - Example: chain length 5 broken at node 3 becomes two segments of length 2.

## 8. Open Questions
- Timer values for each phase (seconds).
- Trade UI flow for counter-offers (single-threaded vs. multi-threaded).
- Whether to support any house rules or variants in v1.
