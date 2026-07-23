# Requirements Document

## Introduction

This feature adds actionable options buy/sell signals with integrated position sizing and risk management to the TradeMind AI platform. Currently, the Quant Signal Engine surfaces BUY/SELL/HOLD signals for the underlying index (NIFTY, BANKNIFTY). Traders, however, execute their positions through options contracts (CE/PE). This feature bridges that gap: given the underlying's technical signal and the live options chain data, the system recommends a specific CE or PE contract, calculates how many lots the trader can afford, and expresses stop-loss and profit targets in rupees — not just index points.

The feature is intraday-only and initially supports NIFTY (lot size 75) and BANKNIFTY (lot size 30).

---

## Glossary

- **Options_Signal_Engine**: The new server-side module that derives options contract recommendations from the existing QuantSignal and live options chain data.
- **OptionsSignal**: The structured output of the Options_Signal_Engine, containing the recommended contract, position sizing, and risk/reward in rupees.
- **CE**: Call option contract. Profits when the underlying rises.
- **PE**: Put option contract. Profits when the underlying falls.
- **ATM**: At-the-money. The strike price closest to the current spot price.
- **OTM**: Out-of-the-money. One strike away from ATM in the direction of the trade.
- **Lot_Size**: The fixed number of units in one options lot. NIFTY = 75 units; BANKNIFTY = 30 units.
- **Trade_Amount**: The capital in Indian Rupees (₹) the user intends to deploy for one trade, entered by the user in the UI.
- **Premium**: The current Last Traded Price (LTP) of an options contract.
- **Lot_Cost**: The total cost of buying one lot: Premium × Lot_Size.
- **Position_Size**: The number of lots the user can purchase with their Trade_Amount: floor(Trade_Amount / Lot_Cost).
- **Stop_Loss_Points**: The premium drop from entry at which the trade is exited (options contract level, not index level).
- **Stop_Loss_Rupees**: Stop_Loss_Points × Lot_Size × Position_Size.
- **Target_Rupees**: (Target_Premium − Entry_Premium) × Lot_Size × Position_Size.
- **PCR**: Put-Call Ratio. Total PE OI divided by total CE OI. Values above 1.2 indicate bullish bias; below 0.8 indicate bearish bias.
- **Max_Pain**: The strike price at which option writers face minimum total loss at expiry.
- **Options_Signal_Panel**: The new React component that renders OptionsSignal data in the UI.
- **QuantSignal**: The existing signal type from MarketDataService that carries action, confidence, entry, stopLoss, and targets for the underlying.

---

## Requirements

### Requirement 1: Options Contract Selection

**User Story:** As an intraday options trader, I want the system to recommend a specific CE or PE contract (strike + type), so that I know exactly which instrument to trade.

#### Acceptance Criteria

1. WHEN the underlying QuantSignal action is BUY, THE Options_Signal_Engine SHALL recommend a CE contract for the same symbol.
2. WHEN the underlying QuantSignal action is SELL, THE Options_Signal_Engine SHALL recommend a PE contract for the same symbol.
3. WHEN the underlying QuantSignal action is HOLD, THE Options_Signal_Engine SHALL not emit an OptionsSignal and the UI SHALL display a "No active signal" placeholder.
4. WHEN PCR is greater than or equal to 1.2 and the QuantSignal action is BUY, THE Options_Signal_Engine SHALL prefer the ATM CE strike; otherwise THE Options_Signal_Engine SHALL prefer the first OTM CE strike.
5. WHEN PCR is less than or equal to 0.8 and the QuantSignal action is SELL, THE Options_Signal_Engine SHALL prefer the ATM PE strike; otherwise THE Options_Signal_Engine SHALL prefer the first OTM PE strike.
6. THE Options_Signal_Engine SHALL express the recommended contract as a symbol string in the format "{INDEX}{STRIKE}{CE|PE}" (e.g., "NIFTY24500CE", "BANKNIFTY54000PE").
7. WHEN the recommended strike's LTP is zero or unavailable in the options chain data, THE Options_Signal_Engine SHALL fall back to the ATM strike of the same type (CE or PE).

---

### Requirement 2: Entry Price from Options Chain

**User Story:** As an intraday options trader, I want the system to set the entry price at the current contract LTP, so that my position cost reflects the real market premium.

#### Acceptance Criteria

1. WHEN an OptionsSignal is generated, THE Options_Signal_Engine SHALL set the entry premium to the ceLtp of the recommended CE strike, or the peLtp of the recommended PE strike, sourced from the live options chain data.
2. WHEN the live options LTP is unavailable for the recommended strike, THE Options_Signal_Engine SHALL use the adjacent ATM strike's LTP as a fallback and mark the signal with a `fallback: true` flag.
3. THE Options_Signal_Engine SHALL round all premium values to two decimal places.

---

### Requirement 3: Position Sizing

**User Story:** As a trader, I want to input my trade amount and see exactly how many lots I can buy, so that I can size my position correctly without manual calculation.

#### Acceptance Criteria

1. THE Options_Signal_Panel SHALL provide a numeric input field labelled "Trade Amount (₹)" that accepts a positive integer representing the capital available for the trade.
2. WHEN the user enters a Trade_Amount, THE Options_Signal_Panel SHALL display the calculated Position_Size as the number of lots the user can purchase: floor(Trade_Amount / Lot_Cost).
3. WHEN the Trade_Amount is less than one Lot_Cost, THE Options_Signal_Panel SHALL display "0 lots — insufficient capital" and SHALL NOT display stop-loss or target values in rupees.
4. WHEN the Position_Size is zero due to insufficient capital, THE Options_Signal_Panel SHALL display the Lot_Cost of one lot so the user knows the minimum required capital.
5. THE Options_Signal_Panel SHALL use a Lot_Size of 75 for NIFTY and 30 for BANKNIFTY in all calculations.
6. WHEN the user changes the Trade_Amount, THE Options_Signal_Panel SHALL update Position_Size, Stop_Loss_Rupees, and all Target_Rupees values in real time without a page reload.

---

### Requirement 4: Stop Loss Calculation

**User Story:** As a trader, I want to see stop loss expressed in both premium points and rupees, so that I can understand my maximum loss in real money terms.

#### Acceptance Criteria

1. WHEN an OptionsSignal is generated, THE Options_Signal_Engine SHALL calculate Stop_Loss_Points as 25% of the entry premium, rounded to two decimal places.
2. THE Options_Signal_Engine SHALL set the stop-loss premium as entry_premium − Stop_Loss_Points for CE contracts and entry_premium − Stop_Loss_Points for PE contracts.
3. THE Options_Signal_Panel SHALL display Stop_Loss_Points as "SL: −{value} pts".
4. WHEN Position_Size is greater than zero, THE Options_Signal_Panel SHALL display Stop_Loss_Rupees as "Max Loss: −₹{value}" where Stop_Loss_Rupees = Stop_Loss_Points × Lot_Size × Position_Size.
5. IF the entry premium is less than or equal to 10 rupees, THEN THE Options_Signal_Engine SHALL use a fixed Stop_Loss_Points of 3 instead of the 25% calculation, to avoid unrealistically small stop levels on cheap contracts.

---

### Requirement 5: Profit Target Calculation

**User Story:** As a trader, I want to see profit targets in rupees for each target level, so that I can set exit orders with a clear rupee P&L expectation.

#### Acceptance Criteria

1. THE Options_Signal_Engine SHALL derive three target premiums for the options contract using the same risk-reward ratios applied in the underlying QuantSignal: Target1 = entry + (Stop_Loss_Points × 1.2), Target2 = entry + (Stop_Loss_Points × 2.0), Target3 = entry + (Stop_Loss_Points × 3.0).
2. WHEN Position_Size is greater than zero, THE Options_Signal_Panel SHALL display Target1_Rupees, Target2_Rupees, and Target3_Rupees where each value equals (TargetN_Premium − entry_premium) × Lot_Size × Position_Size.
3. THE Options_Signal_Panel SHALL label the three targets as "T1", "T2", and "T3" respectively.
4. THE Options_Signal_Panel SHALL display each target premium alongside its rupee value in the format "T1: {premium} pts (+₹{rupees})".
5. IF Position_Size is zero, THEN THE Options_Signal_Panel SHALL display target premiums in points only, without rupee values.

---

### Requirement 6: Signal Confidence and Options Chain Confirmation

**User Story:** As a trader, I want the options signal to incorporate options chain context (OI, PCR, max pain), so that the recommendation is validated against market maker positioning.

#### Acceptance Criteria

1. THE Options_Signal_Engine SHALL incorporate the underlying QuantSignal's confidence score as the base confidence for the OptionsSignal.
2. WHEN PCR is greater than or equal to 1.2 and the QuantSignal action is BUY, THE Options_Signal_Engine SHALL increase confidence by 5 percentage points (capped at 95).
3. WHEN PCR is less than or equal to 0.8 and the QuantSignal action is SELL, THE Options_Signal_Engine SHALL increase confidence by 5 percentage points (capped at 95).
4. WHEN the spot price is between Max_Pain − (strikeStep × 1.5) and Max_Pain + (strikeStep × 1.5), THE Options_Signal_Engine SHALL decrease confidence by 5 percentage points to reflect uncertainty near max pain.
5. THE Options_Signal_Engine SHALL include a human-readable `reasoning` array in the OptionsSignal listing the PCR interpretation, max pain proximity, and the dominant technical reason from the underlying QuantSignal.

---

### Requirement 7: API Endpoint for Options Signals

**User Story:** As a frontend consumer, I want a dedicated API endpoint to fetch the latest OptionsSignal for a given symbol and trade amount, so that the UI can retrieve and display signal data independently.

#### Acceptance Criteria

1. THE Server SHALL expose a GET endpoint at `/api/options-signal/:symbol` that returns the current OptionsSignal for NIFTY or BANKNIFTY.
2. WHEN the symbol is not NIFTY or BANKNIFTY, THE Server SHALL return HTTP 400 with an error message: "Options signals are supported for NIFTY and BANKNIFTY only."
3. WHEN no QuantSignal exists for the requested symbol (e.g., insufficient candle data), THE Server SHALL return an OptionsSignal with action "HOLD" and a message indicating no active signal.
4. THE Server SHALL include `updatedAt` (IST timestamp) and `refreshIntervalSeconds` (30) in the OptionsSignal response.
5. THE Server SHALL return all fields necessary for position sizing — specifically `entryPremium`, `stopLossPremium`, `stopLossPoints`, `target1Premium`, `target2Premium`, `target3Premium`, `lotSize`, and `contractSymbol` — so the frontend can compute rupee values from any user-supplied Trade_Amount without a second API call.

---

### Requirement 8: Options Signal UI Panel

**User Story:** As a trader, I want to see options signals in a dedicated UI panel integrated with the existing Options Dashboard, so that I have a single place for options analysis and trade planning.

#### Acceptance Criteria

1. THE Options_Signal_Panel SHALL be rendered within the existing `OptionsDashboard` component, positioned above the OI heatmap.
2. THE Options_Signal_Panel SHALL display: contract symbol, signal action badge (BUY CE / SELL PE), confidence percentage, entry premium, stop-loss in points, stop-loss in rupees (when Position_Size > 0), and T1/T2/T3 targets.
3. WHEN the signal action is BUY CE, THE Options_Signal_Panel SHALL render the action badge with emerald/green styling; WHEN the action is SELL PE, THE Options_Signal_Panel SHALL render the badge with rose/red styling.
4. THE Options_Signal_Panel SHALL include the symbol selector (NIFTY / BANKNIFTY toggle) and Trade Amount input in the same header row, maintaining visual consistency with the existing OptionsDashboard header.
5. WHEN the options data is loading, THE Options_Signal_Panel SHALL display a loading skeleton consistent with the existing dashboard loading states.
6. THE Options_Signal_Panel SHALL display the reasoning array from the OptionsSignal as bullet points below the price levels, consistent with the existing SignalCard component in Dashboard.tsx.
7. WHEN the Trade_Amount field is empty or zero, THE Options_Signal_Panel SHALL display premium-point values only and hide all rupee-denominated fields.

---

### Requirement 9: Symbol and Lot Size Support

**User Story:** As a trader, I want accurate lot sizes used in all calculations for NIFTY and BANKNIFTY, so that position sizing and P&L figures are correct.

#### Acceptance Criteria

1. THE Options_Signal_Engine SHALL use a Lot_Size of 75 for all NIFTY options signal calculations.
2. THE Options_Signal_Engine SHALL use a Lot_Size of 30 for all BANKNIFTY options signal calculations.
3. WHEN a new symbol is added to the system in the future, THE Options_Signal_Engine SHALL read lot size from a configuration map rather than hardcoded values, to allow extension without code changes.
4. THE Options_Signal_Panel SHALL display the lot size prominently next to the contract symbol (e.g., "NIFTY24500CE · 75 units/lot").

---

### Requirement 10: Data Freshness and Refresh Behaviour

**User Story:** As a trader, I want the options signal to refresh automatically with the same cadence as market data, so that I am always acting on current information.

#### Acceptance Criteria

1. THE Options_Signal_Engine SHALL recompute the OptionsSignal every time the underlying QuantSignal is refreshed (currently once per minute).
2. THE Options_Signal_Panel SHALL refresh displayed signal data every 60 seconds automatically, matching the existing OptionsDashboard refresh cadence.
3. WHEN a refresh is in progress, THE Options_Signal_Panel SHALL display a spinning refresh indicator in the header without hiding the previously loaded signal data.
4. THE Options_Signal_Panel SHALL display `updatedAt` in IST format (e.g., "Updated 14:35:22 IST") below the contract symbol.
5. IF the options chain data fetch fails during a refresh, THEN THE Options_Signal_Engine SHALL retain the last valid OptionsSignal and mark it as stale with a `stale: true` flag, and THE Options_Signal_Panel SHALL display a "Data may be stale" amber warning banner.
