# meow-memorycarry-zcode

[中文](README.md) | [English](README.en.md)

Let an AI coding agent **summarize and carry away** what a session learned, and reload it in a new window to continue the next task. A ZCode plugin: pure Markdown skills, zero runtime dependencies.

- Inspired by: [dsh-meow-memory](https://github.com/Phant0Meow/dsh-meow-memory)'s layered memory and dream-consolidation ideas
- License: MIT

## The problem it solves

Switching windows means losing context. When a session nears its context limit, or a task wraps up and you want a fresh window, everything valuable (decisions, lessons, where you stopped) is stranded in the old one. This plugin provides two commands:

| Command | When | What it does |
|---|---|---|
| `/handoff` | End of a session | Summarizes the window into a handoff snapshot; two axes: speed `s1` fast / `s2` balanced / `s3` quality (default `s2`), depth `d1` lean / `d2` balanced / `d3` deep (default: AI recommends from context size) |
| `/recall` | Start of a new window | Lists past snapshots by time → you pick one → prints a progress summary and next steps |

Both are **explicitly triggered** (no hook auto-injection): a memory summary only works when it is distilled first, and loading it stays a deliberate, cheap-in-tokens act by the user.

## Measured results

Ten isolated experiments (10/10 succeeded), comparing "recall with memory" against "re-explore the project without memory":

| Scenario | output tokens | wall clock |
|---|---|---|
| Short context: without → with memory | 6,330 → 1,718 (**-72.9%**) | 52.6s → 32.1s |
| Long context: without → with memory | 10,609 → 2,676 (**-74.8%**) | 87.2s → 39.1s |

Tier cost: on short material, `s1` finishes 31.1% faster than `s3` (104.4s vs 151.5s).

Full data, method and caveats → [Token savings and tier cost report](docs/token-report.md) *(Chinese)*

## Install

### Option 1 — Let an AI install it (recommended)

Send this line to the AI in ZCode:

```text
Install this plugin into the current repo: https://github.com/Logocceai/meow-memorycarry-zcode
Follow INSTALL-FOR-AI.md in that repo.
```

The AI runs `scripts/install.ps1` from the repo root, copying the skills and commands into `<repo>/.zcode/`. Open a new window and `/handoff` and `/recall` are ready (colloquial triggers like "wrap this up" work too).

### Option 2 — Run the script yourself

```powershell
# Install into the current repo (run from the repo root)
powershell -ExecutionPolicy Bypass -File scripts/install.ps1

# User-level install: available in every repo
powershell -ExecutionPolicy Bypass -File scripts/install.ps1 -Target $env:USERPROFILE
```

The script is idempotent — run it again to overwrite with the latest.

### Option 3 — Plugin marketplace / offline zip

| Route | How |
|---|---|
| Marketplace | ZCode → Settings → Plugin Management → Discover → `+` Add marketplace → paste `https://github.com/Logocceai/meow-memorycarry-zcode` → Get |
| Offline zip | Download the zip attached to the Release, unzip, then add the unzipped folder as a marketplace |

Marketplace installs need a ZCode restart. Why they are not the first choice — see below.

### Current limitations of the ZCode plugin system

- **Marketplace installs require access to GitHub**: with no network, or with a missing marketplace source, updates fail (ZCode's own message: the plugin still works, but cannot be updated for now).
- **The plugin cache directory is an undocumented internal format**: install and update only work by clicking through the UI — no script or CLI can drive them, so automated repo-level or user-level installs have to go through this repo's `scripts/install.ps1` (Option 1 / 2).

AI agents installing this plugin: read [INSTALL-FOR-AI.md](INSTALL-FOR-AI.md).

## Usage

```text
End of session: /handoff        # all defaults: speed s2 + AI-recommended depth
                /handoff s1     # fastest compression (depth still the AI's call)
                /handoff s1d3   # shorthand: fastest + absorb everything
                /handoff d3     # depth only; speed defaults to s2
                /handoff tidy   # tidy the memory store, add nothing new
New window:     /recall         # list snapshots, pick by number
                /recall latest  # load the newest one directly
```

Typical loop: `/checkpoint` (commit code) → `/handoff` (carry the memory away) → close the window → new window `/recall` (pick it back up).

## Memory store

Lives at `<repo>/.zcode/memory/`, committed with the repo, so it syncs across machines and can be rolled back:

```
.zcode/memory/
├── INDEX.md      # single entry point, ≤80 lines: active tasks, next steps, recent snapshots
├── project.md    # project goal and in-flight tasks
├── facts.md      # atomic facts: paths, commands, versions, environment
├── decisions.md  # settled decisions + rationale (append-only)
├── lessons.md    # pitfalls and how they were fixed
├── handoffs/     # handoff snapshots: <summary>.memo.md, fixed six-section layout
└── archive/      # absorbed snapshots older than 14 days, moved with git mv, never deleted
```

Guardrails: one fact per line with a date, hard line limits, an `active → absorbed → archived` lifecycle, and cleanup via `git mv` so history survives.

## Docs

- [User guide](docs/user-guide.md) — install, interaction details of both commands, tier choices, FAQ, command cheat sheet *(Chinese)*
- [Token savings and tier cost report](docs/token-report.md) — data, method and caveats from ten isolated experiments *(Chinese)*
- [Tier system](skills/meow-handoff/docs/tier-system.md) — speed and depth axis definitions, the 9-combination matrix, syntax and extension rules *(Chinese)*
- [Memory format spec](skills/meow-handoff/docs/format-spec.md) — frontmatter, naming, line limits, lifecycle, how tiers relate to format *(Chinese)*
- [Releasing](docs/releasing.md) — for maintainers: packaging, verification, export to the standalone repo *(Chinese)*

## Project layout

```
.zcode-plugin/plugin.json   # plugin manifest
marketplace.json            # marketplace index (this repo is a single-plugin marketplace)
skills/meow-handoff/        # handoff skill (self-contained: SKILL.md + docs/format-spec.md + templates/)
skills/meow-recall/         # recall skill (also sets the session title after loading)
commands/                   # /handoff and /recall command entry points
scripts/install.ps1         # installer
scripts/package.mjs         # packaging script (builds the release zip)
scripts/check-packages.mjs  # release package verifier
docs/user-guide.md          # user guide
docs/token-report.md        # token savings and tier cost report
docs/releasing.md           # release process
```

## Roadmap

- [ ] codex support: skills under `~/.agents/skills/` (open standard read by ZCode/Codex), optional SessionStart/Stop hooks
- [ ] dsh support: an AGENTS.md conventions snippet, complementary to dsh-meow-memory (which handles injection and retrieval; this plugin handles the handoff file format)
- [ ] global user-level memory layer (preferences across projects)
