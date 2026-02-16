# Rise $1T Implementation Notes

## Changes Made

### 1. FIB_LEVELS Extension
- Already extended to $10T (lines 103-112)

### 2. Milestone State Management
- Adding pausedAtMilestone, currentMilestone, nextMilestone state

### 3. Milestone Detection
- Detect when balance reaches currentMilestone
- Pause simulation
- Show continue UI

### 4. Careful Trading Near Milestones
- Reduce position size by 30% when within 5% of milestone
- Tighter stop loss (1.5% vs 1.7%)

### 5. Continue Handler
- User clicks to advance to next fib level
- Updates currentMilestone
- Resumes simulation

### 6. Show/Hide Graph Toggle
- Default: Hide graph
- Show big $ value instead
- Toggle button to show chart

### 7. Position Sizing for $1T+
- Extend scaling beyond $1T
- $1T-$2T: 40%
- $2T-$5T: 38%
- $5T+: 35%
