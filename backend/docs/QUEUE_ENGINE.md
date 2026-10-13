# Queue and wait-time engine

This MVP uses a simple **multi-server queue** model suitable for live demos.

## Assumptions

1. **Service types** (`bank`, `nadra`, `university`, `hospital`) each have one logical queue document (`Queue`) with `openCounters`.
2. **Branches** filter waiting tokens for position recalculation on branch-scoped staff actions; counter counts are per service type in this MVP.
3. **Service time** for estimates defaults to **5 minutes** per customer (`DEFAULT_SERVICE_MIN`). Completed tokens update a rolling **actual** average on the `Queue` document.
4. **Estimated wait** for a waiting token at position `P` (1-based):
   - `customersAhead = P - 1`
   - If `openCounters === 0`: `estimatedWaitTime = -1` (displayed as “paused — no counters open”).
   - Else: `ceil(customersAhead / openCounters) * DEFAULT_SERVICE_MIN` minutes.
5. **Serving** tokens are excluded from the waiting list; positions are recomputed after call-next, complete, skip, cancel, counter changes, and new arrivals.
6. **Simulated** customers are tokens with `isSimulated: true` and token numbers containing `-SIM-`; reset removes only those records.

Implementation: `backend/services/queueEngine.js`.
