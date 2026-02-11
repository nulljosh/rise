# Tweet Ideas for Implementation

## Prediction Market Trading Agent
**Source:** https://x.com/argona0x/status/2021232172753936470

**Concept:**
Autonomous agent that trades on prediction markets (Polymarket, Kalshi, Metaculus) using edge detection and Kelly criterion position sizing.

**Features:**
- Real-time terminal dashboard
- Starting balance: $50
- Edge detection (find mispriced markets)
- Fractional Kelly betting strategy
- Live metrics: balance, P&L, win rate, API costs, runway
- Activity log stream
- Survival mode (track runway days based on API costs)

**Tech Stack:**
- Python
- Rich/Textual (terminal UI)
- Polymarket/Kalshi APIs
- SQLite (trade history)
- Kelly criterion math

**MVP:**
- Connect to Polymarket
- Simple odds comparison edge detector
- Manual bet approval
- Basic dashboard with balance/P&L

**Status:**  Implemented (SurvivalMode.jsx)

**Implementation Notes:**
- Added as new mode in Bread app (toggle button in header)
- Uses existing Polymarket integration from Bread
- Kelly criterion position sizing (fractional 25%, capped at 10%)
- Edge detection: finds markets with >90% probability
- Auto-trades every 10 seconds when agent is running
- Live metrics: balance, P&L, win rate, runway days
- Activity log with timestamps
- Trade history with win/loss tracking
- Simulated execution (50% win rate for demo)

**Next Steps:**
- Connect to real Polymarket API for actual trading (requires API key)
- Add Kalshi + Metaculus integrations
- Improve edge detection algorithm
- Add manual bet approval mode
- SQLite trade history persistence
