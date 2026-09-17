# Handoff Notes: Timing and Cautions

[中文](handoff-notes.md) | [English](handoff-notes.en.md)

> For users: when to hand off deliberately, and what to watch out for.
> For the interaction details of both commands and the tier choices, see the [User guide](user-guide.md) *(Chinese)*.

## Why the handoff decision belongs to you

This plugin is deliberately **explicitly triggered** rather than hook-injected. That is a design choice, not a missing feature:

- **A summary must be distilled before it is stored.** Only someone inside the task can tell which parts of a window are worth carrying and which are process noise.
- **Loading is a deliberate act.** A new window does not always need everything from the previous one; letting you choose which snapshot to load saves tokens and keeps the session on track.

Conversely, **the automatic compaction that kicks in near the context limit is also "summarizing" for you** — it does not know your task and can only apply generic rules; what it drops is its decision, and what gets dropped tends to be exactly the details: file paths, conventions agreed earlier, the original error text. So the question is not whether to compress, but **who does the compressing**.

That leads to a hard constraint: the handoff itself consumes context (reading the memory store, scanning plans, writing the snapshot), so it has to happen **while there is still headroom**. Leave it until the window is nearly full and it may hit automatic compaction halfway through — and compaction will summarize away the very material you were about to capture.

## When to hand off

Four occasions; any one of them is enough:

| Occasion | Notes |
|---|---|
| Context at 70–80% | The primary signal: wrap up the current task and switch windows, do not keep pushing |
| A milestone is done | A feature is finished, a bug is fixed, an approach is settled |
| Right after a pitfall | The error you just solved and its root cause are the most valuable content in a snapshot |
| End of the day | Leave a "where to pick up tomorrow" |

Beyond the percentage, **behavioural signals show up earlier**: re-reading the same file, forgetting a convention agreed earlier, answers turning vague — any one of these means it is time to hand off, even if the headroom still looks fine.

## When not to hand off

- **One or two turns left in the task**: a handoff reads the memory store, scans plans and writes a snapshot; that cost cannot be recovered within a turn or two, so just finish and wrap up.
- **Small talk and one-off questions**: no decisions, no pitfalls, no stopping point — a snapshot would be pure log-keeping. One informative handoff beats ten perfunctory ones.

## Cautions

### Before the handoff

- **`/checkpoint` first, then `/handoff`.** Code progress belongs to git, soft knowledge belongs to the memory store. Reverse the order and you get a mismatch where "memory says it is done but the code was never committed". `/handoff` warns you when it detects uncommitted changes.
- **Leave enough context headroom.** See the first section: the handoff itself consumes context, and doing it when the window is nearly full is where things go wrong.

### During the handoff

- **For a mid-task handoff, `Next` must be actionable.** When the task is unfinished and you switch windows, the snapshot's Next section has to say which file to touch, what to do, and what has not been verified yet. A vague "continue the task" makes the new window start from scratch — the handoff was wasted.
- **Let it record what actually happened.** The memory store's baseline rule is no fabrication: unverified guesses are not written as facts. If you spot something untrue in memory, say so and have it corrected.

### After the handoff

- **Read the report before closing the window.** When `/handoff` finishes it reports the tiers used, which files were created or updated, which old snapshots were archived, plus active tasks and next steps. A quick scan catches two classes of problems: the wrong tier, or a piece of information that never made it in.
- **Make sure it landed in the current repo.** The memory store lives in **the current working repository's** `.zcode/memory/` — change directory and you change the memory store. Hand off in the wrong directory and the memory goes somewhere else.

## Picking it back up

In a new window, type `/recall`. It first lists past snapshots for you to choose from (rather than pushing the newest one at you), then prints a progress summary and next steps; you confirm and carry on.

The typical loop: `/checkpoint` → `/handoff` → close the window → `/recall` in a new one.

## Related docs

- [User guide](user-guide.md) — install, interaction details, tier choices, FAQ, command cheat sheet *(Chinese)*
- [Tier system](../skills/meow-handoff/docs/tier-system.md) — speed and depth axis definitions, the 9-combination matrix, syntax *(Chinese)*
- [Memory format spec](../skills/meow-handoff/docs/format-spec.md) — frontmatter, naming, line limits, lifecycle *(Chinese)*
