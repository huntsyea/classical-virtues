# Issue tracker: BB Tasks

Issues for this repo live in the BB Tasks project **Classical Virtues** (key prefix `CV`), linked to the bb project `proj_uqiums595h`. Use the `bb tasks` CLI for all operations. Every work item, gate and in-flight agent thread is a CV task; do not keep work in other tracking docs.

BB Tasks rather than GitHub Issues: it is Hunter's tracker across projects, tasks dispatch straight to agent threads, and nothing written here is public.

## Conventions

- **Create an issue**: `bb tasks create --project CV --title "..." --description-file <path>`. Write multi-line bodies to a file first (under `$BB_THREAD_STORAGE`), since shell quoting mangles inline markdown. Optional: `--priority urgent|high|medium|low`, `--label <name>` (repeatable), `--due YYYY-MM-DD`.
- **Read an issue**: `bb tasks show CV-<n>`.
- **List issues**: `bb tasks list --project CV`; see `bb tasks list --help` for status and label filters.
- **Make an issue a sub-issue of a parent**: `bb tasks create --project CV --parent CV-<parent> ...`, or `bb tasks move` an existing one. Tasks support one level of sub-tasks.
- **Comment on an issue**: `bb tasks comment CV-<n> --body-file <path>` (or `--body "..."` for one line).
- **Apply / remove labels**: `bb tasks update CV-<n> --add-label "..."` / `--remove-label "..."`. Labels must exist first: `bb tasks label list --project CV`, `bb tasks label create --project CV --name <label>`.
- **Change status**: `bb tasks update CV-<n> --status backlog|todo|in_progress|in_review|done|canceled`.
- **Close**: comment with the outcome, then `bb tasks update CV-<n> --status done` (or `canceled` for wontfix).
- **Link a thread**: `bb tasks attach CV-<n> --thread <thr_id>` for every agent thread working the task; `bb tasks dispatch CV-<n>` starts a new thread from it.

## Pull requests as a triage surface

**PRs as a request surface: no.** PRs on `huntsyea/classical-virtues` are the agents' own work; the CV task they implement links to them.

## When a skill says "publish to the issue tracker"

Create a CV task.

## When a skill says "fetch the relevant ticket"

Run `bb tasks show CV-<n>`.

## Wayfinding operations

Used by `/wayfinder`. The **map** is a single task with **sub-tasks** as tickets.

- **Map**: a task labelled `wayfinder:map`, holding the Destination / Notes / Decisions so far / Not yet specified / Out of scope body.
- **Child ticket**: a sub-task of the map (`--parent CV-<map>`), labelled `wayfinder:<type>` (`research`/`prototype`/`grilling`/`task`). Once claimed, the working thread is attached to it.
- **Blocking**: a `Blocked by: CV-<n>, CV-<n>` line at the top of the description. A ticket is unblocked when every blocker is done.
- **Frontier query**: list the map's open sub-tasks, drop any with an open blocker or an attached working thread; first by key wins.
- **Claim**: `bb tasks attach CV-<n> --thread <your thread id>`, the session's first write.
- **Resolve**: comment the answer, mark the task done, then append a context pointer (gist + key) to the map's Decisions so far.
