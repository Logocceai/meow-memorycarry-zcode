# handoff vs compact: which one to use, and when

[中文](handoff-vs-compact.md) | [English](handoff-vs-compact.en.md)

> This is a selection document, not marketing. The conclusions come from real measured sessions between 2026-09-15 and 2026-09-18: 107 `/compact` calls, 7 `/handoff` calls and 10 `/recall` calls, in the same workspace with the same models (`deepseek-v4.1-flash` / `deepseek-flash`).
> Related: [Token savings and tier cost report](token-report.md), [Handoff notes: timing and cautions](handoff-notes.md)

---

## 1. The short version

**If all you want is to keep the current window going — no cross-window memory, no version control, no local memory store, no multi-machine sharing — use ZCode's built-in `/compact`. It is clearly a better fit than `/handoff`.**

The cost differs by two orders of magnitude: `/compact` is one model call, `/handoff` is a multi-step turn (read the memory store, write the snapshot, commit, report). Measured non-cached input: 1,347 tokens vs 252,819 tokens; model time 25s vs 190s.

**Conversely, these four things only `/handoff` can do, and `/compact` can do none of them:**

1. **Cross-window.** `/handoff` produces files that a new window can load with `/recall`; a compact summary lives only in that one session and is invisible from another window.
2. **Version control.** The memory store lives in the repo and travels with git — diffable, revertable, auditable; compact's product sits in the client database, outside any git repository.
3. **Local long-term memory.** The layered files (`project` / `facts` / `decisions` / `lessons`) absorb and merge across windows, so knowledge thickens with use; compact only ever covers the current window and accumulates nothing.
4. **Multi-machine sharing.** The memory store syncs to other machines with the repo; compact's product is not portable.

So the question is not "which is better" but **whether you need those four things**.

---

## 2. How they differ

| | `/compact` (built-in) | `/handoff` (this plugin) |
|---|---|---|
| Trigger | Manual, or automatic at a context threshold | Manual (colloquial phrases work too) |
| Where the output lives | Client session store; the summary hangs in the timeline as a message | Repo file `.zcode/memory/handoffs/<summary>.memo.md` |
| Output structure | Fixed 9 sections (request and intent, technical concepts, files and code, errors and fixes, problem solving, all user messages, pending tasks, current work, next step) | Fixed 6 sections (Summary / Done / Decisions / Pitfalls / Next / Refs) |
| What it drops | Covered messages leave the context; recent messages are kept verbatim | Snapshots cap at 150 lines, dropping detail on purpose, with `Refs` pointers and git as the backstop |
| Parameters | `/compact [instructions]` to steer what to keep | `/handoff sN dM`, speed × depth axes, 9 combinations |
| Cross-window | No | Yes, via `/recall` |
| Version control | No | Yes, with the repo's git |
| Interaction with rewind | Rewind targets before the compact point get downgraded (file-only, or unavailable) | Does not touch the rewind system |

One easily misread point: compaction **does not delete the original text**. The originals stay in the local store under internal row ids — but those ids only serve the client's own rewind and UI, and the summary text contains no reference to where the originals are.

---

## 3. Measured cost

### 3.1 Ground rules

- **One `/compact`** = one model call; one `/handoff` or `/recall` = every model call triggered in that command turn (median 16 and 10 respectively).
- `computed total = input + output` (verified row by row); **cache hits are a subset of input** and are billed far below fresh input, so "non-cached input" gets its own column.
- Each column is an independent median, so "median input + median output" does not equal "median computed total"; single rows do add up exactly.
- Character-based estimates: CJK ×0.7, everything else ×0.25.

### 3.2 Cost of one operation

| Metric | `/compact` (n=107) | `/handoff` (n=7) | `/recall` (n=10) |
|---|---|---|---|
| Model calls (median) | 1 | 16 (3–32) | 10 (5–28) |
| input tokens (median) | 19,139 | 4,266,771 | 535,139 |
| of which cache hits (median) | 17,792 | 4,013,952 | 482,464 |
| **non-cached input (median)** | **1,347** | **252,819** | **52,675** |
| output tokens (median) | 6,056 | 17,179 | 9,784 |
| computed total (median) | 25,949 | 4,298,575 | 544,051 |
| model time (median) | 24.9s | 190s | 122s |
| time range | 11.7–77.3s | 47–401s | 35–365s |

For reference, an **ordinary single turn** in the same store has a median of ≈114k computed tokens, ≈7.2s and 616 output tokens. `/compact` produces about 9.8× the output of an ordinary turn and takes about 3.5× as long; `/handoff` is a multi-call operation whose total is about 38× an ordinary turn.

### 3.3 Static sizes (estimated)

| Item | Value |
|---|---|
| Compaction summarization prompt template | 3,018 characters ≈ 755 tokens |
| Summary text produced by compact | median 6,411 characters ≈ 2,718 tokens (max 19,546) |
| Layered files of this plugin's memory store | 3,902 characters ≈ 1,587 tokens |
| 9 snapshots in the store | 21,851 characters ≈ 8,769 tokens |
| Typical `/recall` read | INDEX 336 tokens + one snapshot 476–1,624 tokens |

The summary text (≈2,718 tokens) is noticeably smaller than the compact call's output (median 6,056 tokens): the difference is the "analyse first, then summarize" section the prompt requires, plus formatting.

### 3.4 Compression ratio: how much context does compact actually save?

Comparing "input of the compact call" (context size before) with "input of the first main turn after it":

| Context before compact | Samples | After / before (median) | Range |
|---|---|---|---|
| < 20k | 59 | 105% | 92–131% |
| 20k–100k | 46 | 97% | 85–130% |
| > 100k | 2 | **29%** | 18–40% |

**With a small context, compaction does not save space — it slightly increases it.** The arithmetic explains it: one session went from 15,686 tokens before to 17,478 after the first turn, a net +1,792; the summary text is about 2,718 tokens, which implies only ≈0.9k of history was covered — there was barely anything to compress. Only when the context genuinely approaches the limit (>100k) does compaction cut it to under a third. (This mechanism is an inference from that arithmetic and from the existence of a preserved recent segment; the context-assembly code was not traced line by line.)

### 3.5 Consecutive compactions and failures

- Gap between adjacent compactions: median **31 seconds**; 69 of 71 gaps were under 180 seconds.
- 3 of 110 compact calls ended in `error`.
- A stressed period logged 24 circuit-breaker events for "context refilled within 3 tool turns after compaction"; these occurred only in that period and were 0 on the other days.

---

## 4. Which one to reach for

| Situation | Choice | Why |
|---|---|---|
| Context near the limit, task continues in this window | `/compact` | You only need to stay alive, not build cross-window assets |
| A deliverable unit is done / end of day / switching windows | `/handoff` | The payoff lands in the next window |
| Moving to another machine | `/handoff` | compact's product is not portable |
| One or two turns left in the task | Neither | A handoff cannot earn back its cost; compaction spends without saving |
| Very long session, task unfinished, must switch windows | `/handoff` first | Get the information out first, then talk about space |
| Water level already too tight to finish a handoff | `/compact`, then `/handoff` | The price: that compaction downgrades later rewind ability, and the covered detail no longer enters context |
| Chit-chat, no decisions, no stopping point | Neither | A snapshot would be pure log-keeping |

Understand the price of combining them: `/compact` → `/handoff` solves "not enough headroom to hand off", but rewind to before the compact point is already downgraded, **and less of the original text is readable when you hand off**.

---

## 5. Strengths

### `/compact`

1. **Zero setup, zero dependencies.** Works in any session — no memory store, no format spec, no habit to build.
2. **Automatic backstop.** Fires at the threshold; when you are too busy coding to watch context, it is the only mechanism working.
3. **Low unit cost.** One call, median 25 seconds, non-cached input around 1.3k tokens.
4. **Fine granularity for a single pass.** The prompt demands full code snippets, function signatures, every user message, errors and fixes, and asks for security constraints to be preserved verbatim — finer than a 150-line snapshot.
5. **Recent messages stay verbatim**, reducing the risk of a fresh statement being distorted by the summary.
6. **You can steer it** by passing instructions.

### `/handoff`

1. **Cross-window and cross-machine.** The product is a readable file that travels with git.
2. **Selected for the task, not for the transcript.** Done / Decisions / Pitfalls / Next are organised around what the next task needs.
3. **Accumulates.** Layered files absorb and merge across windows, so knowledge thickens.
4. **Revertable and auditable.** `git log`, `git revert`, archiving via `git mv`.
5. **Proactive timing plus a self-check.** It can run while headroom is comfortable rather than under pressure.
6. **A backstop for what it drops.** Snapshots drop detail, but `Refs` points back to files and commits so the detail can be recovered.

---

## 6. Weaknesses

### `/compact`

1. **Task-agnostic.** It does not know what you are doing; a generic template decides what gets dropped.
2. **Worthless outside this session**, and not a searchable memory.
3. **Downgrades rewind.** Rewind targets before the compact point degrade to file-only, or unavailable — files may come back, conversation content may not.
4. **Degrades under pressure.** With a very large history the prompt itself gets too long, and the implementation drops older rounds to retry.
5. **Can spend without saving.** With a small context it leaves the next turn at about 105% of the previous size — roughly 26k computed tokens spent for no space saved; consecutive compactions (median gap 31 seconds) are a net loss.
6. **After the breaker trips it stops helping**, and the context pressure is back on you.
7. **Not portable, not versioned.**

### `/handoff`

1. **Timing is a human judgement.** Get it wrong and the cost is wasted.
2. **Two orders of magnitude more expensive per operation.** Median non-cached input ≈252.8k tokens and median model time 190 seconds (94% of its input is cache hits).
3. **Needs headroom to run.** It consumes context itself; start it too close to the limit and it may hit automatic compaction halfway through.
4. **No automatic trigger.** A new window that never runs `/recall` means the handoff never happened.
5. **Depends on the model following the skill.** Tiers, line limits and naming rules all rely on the model executing them.
6. **Dropping is mandatory.** The 150-line cap means full code snippets and verbatim user messages cannot survive — in that respect it is worse than a compact summary.
7. **Needs long-term upkeep.** Layered files rely on `tidy` for de-duplication, archiving and index rebuilding.

---

## 7. Method, sources and limitations

### Sources

| Data | Source |
|---|---|
| Compact call tokens / time, compression ratio, gaps between compactions | This machine's ZCode session store: model usage table filtered by `query_source='compact'`, plus the message table |
| Size of the summary text | Messages in the session store marked as Compact summary |
| Cost of `/handoff` and `/recall` turns | Same store, attributed precisely along the user input → message → model call chain |
| Cross-window savings, tier costs | The 10 isolated experiments in [token-report.md](token-report.md) |
| Compaction prompt template, rewind downgrade strategies | Client runtime bundle `resources/glm/zcode.cjs` |
| Failure counts | The client's daily log files |

### Limitations

1. **Skewed sample period.** All 107 compact calls happened on 2026-09-15, during memory experiments; the 7 measured `/handoff` calls are concentrated on 09-16 and 09-17. Same models, same workspace, so they are reasonably comparable — but neither represents long-term everyday use.
2. **`/handoff` n is small (7) and the variance is large.** The same operation ranged from 3 to 32 calls and from 47 to 401 seconds, depending on how long the session was and how big the store is. Read the median as an indication, not a constant.
3. **The attribution window includes tool loops**, so it is not "pure command overhead".
4. **The two sides are measured at different precision.** Compact is a single call and isolates cleanly; handoff is a multi-step operation that can only be attributed as a whole turn.
5. **The estimate coefficients are empirical** (CJK ×0.7, other ×0.25); a real tokenizer changes absolute values but not the comparisons.
6. **Unverified items**: how many recent messages are preserved verbatim; the >100k ratio bucket has only 2 samples; the full trigger conditions for each rewind downgrade tier.
