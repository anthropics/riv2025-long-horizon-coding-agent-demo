# Long-running conventions for this project

## Always start here
Before doing anything else, read `PROGRESS.md`. It is your handoff note from the previous session. Then run `git log --oneline -10` to see what was just committed.

## One feature at a time
Work on exactly one item from `PROGRESS.md` per session. Finish it (tests passing, screenshot verified) before starting another. If the user gives you a new task mid-session, add it to `PROGRESS.md` and finish the current item first.

## Proof before passing
A test is only "passing" after you have:
1. Run it against the live app (Playwright screenshot or equivalent)
2. Opened the resulting screenshot or console log with the Read tool
3. Confirmed it shows what it should

The `verify-gate` hook will deny writes to `test-results.json` until you have opened evidence. Do not try to work around it.

## Keep `PROGRESS.md` current
After each completed item, update `PROGRESS.md`: check off what's done, add what you learned, note what's next. Future sessions read this file cold.

## Commit often
The `Stop` hook commits at session end, but also commit yourself at meaningful checkpoints with descriptive messages.

## If you're told to stop
`OPERATOR STEERING:` messages come from a human via the steer hook. Treat them as higher priority than your current plan.
