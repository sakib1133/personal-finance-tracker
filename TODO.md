# Security Fix TODO

## Phase 1: Safe, isolated code edits (no auth/DB logic changes beyond required)
- [x] TASK 1: Remove JWT fallback secret; fail startup if missing
- [x] TASK 2: Add rate limiting to POST /auth/register only
- [x] TASK 5: Harden service worker caching rules (never cache API/auth/authz responses)

## Phase 2: Findings-only audit (no changes yet)
- [ ] TASK 3: Audit protected routes for missing authenticateToken; list routes only
- [ ] TASK 4: Audit DB queries for missing user ownership filtering; list queries only

## Phase 3: Optional changes (after approval)
- [ ] Apply fixes for any missing authenticateToken routes (from Phase 2)
- [ ] Apply fixes for any vulnerable user-isolation queries (from Phase 2)

## Regression checks
- [ ] Confirm login/register works
- [ ] Confirm expenses/budgets/analytics works
- [ ] Confirm PWA offline page still works
- [ ] Confirm service worker still installs and static assets cache

