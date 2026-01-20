# Parallel Agent Sessions

This document describes the parallel session architecture that enables multiple coding agents to work on different GitHub issues simultaneously.

## Overview

The parallel session system allows up to 4 coding agents to run concurrently, each working on a separate GitHub issue. Each agent operates in complete isolation using git worktrees, and completed work is merged back to main in a controlled, sequential manner.

### Key Features

- **Git Worktree Isolation**: Each agent works in its own git worktree, preventing file conflicts during development
- **Session-Specific Resources**: Token files, commit queues, and ports are isolated per session
- **Sequential Merge Queue**: Completed branches are merged one at a time in completion order
- **Conflict Detection**: Merge conflicts are automatically detected and the queue pauses for manual resolution
- **Automatic Cleanup**: Worktrees and remote branches are cleaned up after successful merges

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     GitHub Actions                               │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ Issue #101  │  │ Issue #102  │  │ Issue #103  │  ...         │
│  │ (approved)  │  │ (approved)  │  │ (approved)  │              │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘              │
│         │                │                │                      │
│         ▼                ▼                ▼                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              issue-poller.yml (every 5 min)             │    │
│  │  - Checks capacity (active sessions < MAX_PARALLEL)     │    │
│  │  - Triggers agent-builder for approved issues           │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AWS Bedrock AgentCore                         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │  Session 0   │  │  Session 1   │  │  Session 2   │           │
│  │  Issue #101  │  │  Issue #102  │  │  Issue #103  │           │
│  │              │  │              │  │              │           │
│  │ Worktree:    │  │ Worktree:    │  │ Worktree:    │           │
│  │ /worktrees/  │  │ /worktrees/  │  │ /worktrees/  │           │
│  │  issue-101/  │  │  issue-102/  │  │  issue-103/  │           │
│  │              │  │              │  │              │           │
│  │ Ports:       │  │ Ports:       │  │ Ports:       │           │
│  │ 8000, 8001   │  │ 8010, 8011   │  │ 8020, 8021   │           │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘           │
│         │                 │                 │                    │
│         ▼                 ▼                 ▼                    │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    Merge Queue                          │    │
│  │  [issue-102] → [issue-101] → [issue-103]               │    │
│  │  (completed    (completed    (completed                │    │
│  │   first)        second)       third)                   │    │
│  └─────────────────────────────────────────────────────────┘    │
│                              │                                   │
│                              ▼                                   │
│                    Sequential Merge to Main                      │
└─────────────────────────────────────────────────────────────────┘
```

## Components

### 1. WorktreeManager (`src/worktree_manager.py`)

Manages git worktrees for session isolation. Each issue gets its own worktree directory with a dedicated branch.

```python
from worktree_manager import WorktreeManager

# Initialize
wt_manager = WorktreeManager(
    base_repo_path=Path("/app/workspace/base-repo"),
    worktrees_dir=Path("/app/workspace/worktrees"),
    session_state_dir=Path("/app/workspace/session-state")
)

# Create a worktree for an issue
worktree_path = wt_manager.create_worktree(
    issue_number=101,
    session_id="session-abc123",
    base_branch="main"
)
# Returns: /app/workspace/worktrees/issue-101

# Check active worktrees
count = wt_manager.get_active_count()  # Returns: 1
worktrees = wt_manager.list_active_worktrees()

# Cleanup after completion
wt_manager.cleanup_worktree(issue_number=101)
```

**Key behaviors:**
- Creates branch `issue-{N}` from the specified base branch
- Tracks worktree metadata in `session-state/worktrees.json`
- Handles existing worktrees by cleaning up and recreating
- Prunes stale worktree references on cleanup

### 2. MergeManager (`src/merge_manager.py`)

Handles sequential merging of completed issue branches back to main.

```python
from merge_manager import MergeManager

# Initialize with callbacks
merge_manager = MergeManager(
    base_repo=Path("/app/workspace/base-repo"),
    github_token="ghp_xxx",
    on_merge_success=lambda result: print(f"Merged #{result.issue_number}"),
    on_merge_conflict=lambda result: notify_maintainers(result)
)

# Queue completed issues for merge
merge_manager.queue_for_merge(issue_number=101)
merge_manager.queue_for_merge(issue_number=102)

# Process the queue
results = merge_manager.process_queue()
for result in results:
    if result.success:
        print(f"Issue #{result.issue_number} merged: {result.commit_sha}")
    else:
        print(f"Issue #{result.issue_number} failed: {result.error_message}")
        print(f"Conflicting files: {result.conflict_files}")
```

**Merge strategy:**
1. Fetch latest from origin
2. Checkout main and pull latest
3. Attempt merge with `--no-ff` (preserves merge commit history)
4. If successful, push to origin and delete remote branch
5. If conflict detected, abort merge and pause queue

### 3. Session Configuration (`src/config.py`)

Provides configuration constants and helpers for parallel sessions.

```python
# Environment variables
PARALLEL_MODE_ENABLED = os.getenv("PARALLEL_MODE", "false").lower() == "true"
MAX_PARALLEL_SESSIONS = int(os.getenv("MAX_PARALLEL_SESSIONS", "4"))

# Port allocation (10 ports per session slot)
def get_session_ports(session_slot: int) -> tuple[int, int]:
    """Get frontend and backend ports for a session slot."""
    base_frontend = 8000 + (session_slot * PORT_OFFSET_PER_SESSION)
    base_backend = base_frontend + 1
    return (base_frontend, base_backend)

# Session-specific file paths
def get_session_token_file(session_id: str) -> str:
    return f"/tmp/github_token_{session_id}"

def get_session_commits_queue(session_id: str) -> str:
    return f"/tmp/commits_queue_{session_id}.txt"
```

### 4. GitManager Session Support (`src/git_manager.py`)

The GitManager now supports session-specific token and queue files.

```python
from git_manager import GitManager, GitHubConfig

# Create session-aware GitManager
git_manager = GitManager(
    work_dir=Path("/app/workspace/worktrees/issue-101"),
    mode="github",
    github_config=GitHubConfig(
        repo_name="owner/repo",
        token="ghp_xxx",
        branch="issue-101"
    ),
    session_id="session-abc123"  # NEW: Session isolation
)
```

When `session_id` is provided:
- Token file: `/tmp/github_token_session-abc123`
- Commits queue: `/tmp/commits_queue_session-abc123.txt`
- Post-commit hooks detect session from environment

### 5. GitHub Integration (`src/github_integration.py`)

New labels and methods for parallel mode:

```python
# New labels
LABEL_MERGE_PENDING = "merge-pending"
LABEL_MERGE_CONFLICT = "merge-conflict"
LABEL_QUEUED = "queued"

# Parallel mode methods
issue_manager = GitHubIssueManager(token, repo, parallel_mode=True, max_parallel_sessions=4)

# Check capacity
active = issue_manager.get_active_session_count()
available = issue_manager.get_available_slots()

# Get issues ready to build
issues = issue_manager.get_buildable_issues_for_parallel()

# Update issue status
issue_manager.mark_issue_merge_pending(101)
issue_manager.mark_issue_merge_conflict(101, ["file1.py", "file2.py"])
issue_manager.mark_issue_merged(101)
```

### 6. GitHub Actions Workflows

#### issue-poller.yml

Polls for approved issues every 5 minutes and triggers builds:

```yaml
inputs:
  parallel_mode:
    description: 'Enable parallel session mode'
    type: boolean
    default: false

env:
  PARALLEL_MODE: ${{ github.event.inputs.parallel_mode || vars.PARALLEL_MODE || 'false' }}
  MAX_PARALLEL_SESSIONS: ${{ vars.MAX_PARALLEL_SESSIONS || '4' }}
```

In parallel mode:
- Checks how many sessions are currently active (have `agent-building` label)
- Calculates available slots
- Triggers multiple `agent-builder` workflows concurrently

In sequential mode (default):
- Only triggers if no session is active
- Single build at a time

#### agent-builder.yml

Builds and runs the coding agent:

```yaml
inputs:
  parallel_mode:
    description: 'Run in parallel mode with worktree isolation'
    type: boolean
    default: false
  session_slot:
    description: 'Session slot (0-3) for port allocation'
    type: string
    default: '0'

concurrency:
  # In parallel mode, each issue gets its own concurrency group
  group: ${{ inputs.parallel_mode == 'true' && format('agent-issue-{0}', inputs.issue_number) || 'agent-builder-sequential' }}
```

## Merge Conflict Handling

### Detection

When a merge conflict occurs:

1. The `MergeManager.process_queue()` attempts to merge each branch
2. If `git merge` returns a non-zero exit code, it checks for conflict markers
3. Conflicting files are identified using `git diff --name-only --diff-filter=U`
4. The merge is aborted with `git merge --abort`

### Queue Behavior

On conflict detection:
1. The merge queue **pauses** - no further merges are attempted
2. The `on_merge_conflict` callback is invoked
3. The conflicting entry remains at the front of the queue
4. The pause reason is persisted in `merge_queue.json`

```json
{
  "queue": [
    {
      "issue_number": 104,
      "branch_name": "issue-104",
      "merge_attempts": 1,
      "last_error": "Merge conflict detected"
    }
  ],
  "paused": true,
  "pause_reason": "Merge conflict on issue #104: Merge conflict detected"
}
```

### Resolution

To resolve a conflict:

1. **Manual resolution**: A maintainer manually merges the branch, resolving conflicts
2. **Resume queue**: Call `merge_manager.resume_queue()` to continue processing
3. **Skip issue**: Remove the entry from the queue and handle separately

### GitHub Labels

Issues are labeled to reflect their merge status:
- `merge-pending`: Issue is in the merge queue
- `merge-conflict`: Merge failed due to conflicts (requires manual intervention)
- `agent-complete`: Successfully merged to main

## Testing

### Test Environment Setup

Tests were performed using a dedicated test repository:

```bash
# Clone the test repo
git clone https://github.com/jeffreyzeng10/parallel-agent-test.git /tmp/worktree-test/base-repo

# Create required directories
mkdir -p /tmp/worktree-test/worktrees
mkdir -p /tmp/worktree-test/session-state
```

### Test Cases

#### 1. Basic Worktree Creation and Cleanup

```python
wt_manager = WorktreeManager(base_repo, worktrees_dir, session_state_dir)

# Create worktrees for multiple issues
wt1 = wt_manager.create_worktree(issue_number=1, session_id="session-1")
wt2 = wt_manager.create_worktree(issue_number=2, session_id="session-2")

assert wt_manager.get_active_count() == 2

# Cleanup
wt_manager.cleanup_worktree(1)
wt_manager.cleanup_worktree(2)

assert wt_manager.get_active_count() == 0
```

**Result**: Worktrees created in `/tmp/worktree-test/worktrees/issue-{N}` with proper branch isolation.

#### 2. Successful Sequential Merges

```python
# Queue multiple issues
merge_manager.queue_for_merge(issue_number=1)
merge_manager.queue_for_merge(issue_number=2)

# Process queue
results = merge_manager.process_queue()

assert len(results) == 2
assert all(r.success for r in results)
assert merge_manager.get_queue_length() == 0
```

**Result**: Both branches merged with proper merge commits, remote branches deleted.

#### 3. Conflict Detection

Two branches modifying the same file:

```python
# Issue 3: Modify feature1.txt
(wt3 / "feature1.txt").write_text("Modified by issue 3")
git_commit_and_push(wt3, "issue-3")

# Issue 4: Also modify feature1.txt (conflict)
(wt4 / "feature1.txt").write_text("Modified by issue 4")
git_commit_and_push(wt4, "issue-4")

# Queue and process
merge_manager.queue_for_merge(3)
merge_manager.queue_for_merge(4)
results = merge_manager.process_queue()

# Issue 3 merges successfully
assert results[0].success == True

# Issue 4 has conflict
assert results[1].success == False
assert results[1].error_message == "Merge conflict detected"
assert "feature1.txt" in results[1].conflict_files

# Queue is paused
assert merge_manager.is_paused() == True
```

**Result**: First branch merged, second detected conflict on `feature1.txt`, queue paused.

#### 4. Full Parallel Session Flow

Simulated 3 agents working simultaneously:

```python
# Phase 1: Create worktrees (simulating agent startup)
wt5 = wt_manager.create_worktree(5, "agent-session-1")
wt6 = wt_manager.create_worktree(6, "agent-session-2")
wt7 = wt_manager.create_worktree(7, "agent-session-3")

# Phase 2: Each agent creates different files (no conflicts)
(wt5 / "new_module.py").write_text("# Module from issue 5")
(wt6 / "CONTRIBUTING.md").write_text("# Contributing guide from issue 6")
(wt7 / "config.json").write_text('{"from": "issue 7"}')

# Commit and push each
for wt, issue in [(wt5, 5), (wt6, 6), (wt7, 7)]:
    git_commit_and_push(wt, f"issue-{issue}")

# Phase 3: Queue in completion order (6 finished first, then 5, then 7)
merge_manager.queue_for_merge(6)
merge_manager.queue_for_merge(5)
merge_manager.queue_for_merge(7)

# Phase 4: Process queue
results = merge_manager.process_queue()

assert len(results) == 3
assert all(r.success for r in results)

# All files now in main
main_files = list_files_in_main()
assert "new_module.py" in main_files
assert "CONTRIBUTING.md" in main_files
assert "config.json" in main_files
```

**Result**: All three branches merged successfully in queue order (6 → 5 → 7).

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PARALLEL_MODE` | `false` | Enable parallel session mode |
| `MAX_PARALLEL_SESSIONS` | `4` | Maximum concurrent sessions |
| `WORKSPACE_PATH` | `/app/workspace` | Base workspace directory |

### GitHub Repository Variables

Set these in your repository settings (Settings → Secrets and variables → Actions → Variables):

| Variable | Description |
|----------|-------------|
| `PARALLEL_MODE` | `true` to enable parallel mode |
| `MAX_PARALLEL_SESSIONS` | Maximum concurrent sessions (1-4) |
| `AUTHORIZED_APPROVERS` | Comma-separated list of GitHub usernames who can approve issues |

## Limitations and Considerations

1. **Shared Container Resources**: All sessions run in the same container, sharing CPU and memory. Monitor resource usage when running at full capacity.

2. **Merge Order**: Branches are merged in completion order, not issue number order. The first agent to complete gets merged first.

3. **Conflict Resolution**: When a conflict occurs, the queue pauses entirely. Manual intervention is required to resolve and resume.

4. **Port Allocation**: Each session slot uses 10 ports (slot 0: 8000-8009, slot 1: 8010-8019, etc.). Ensure no port conflicts with other services.

5. **State Persistence**: Worktree and merge queue state is stored in JSON files. These should be backed up or stored in a shared volume for resilience.

## Troubleshooting

### Worktree Already Exists

If you see "Worktree already exists" warnings:
```
⚠️ Worktree already exists at /app/workspace/worktrees/issue-101, cleaning up...
```

This is normal - the WorktreeManager automatically cleans up and recreates the worktree.

### Merge Queue Stuck

If the merge queue is paused:
```python
if merge_manager.is_paused():
    print(f"Paused: {merge_manager.get_pause_reason()}")

    # After manually resolving the conflict:
    merge_manager.resume_queue()
```

### Session Port Conflicts

If you see port binding errors, check that:
1. The session slot is unique (0-3)
2. No other services are using ports in the range 8000-8039
3. Previous sessions were properly cleaned up

## Future Enhancements

- **Automatic conflict resolution**: Use AI to attempt automatic resolution of simple conflicts
- **Priority queue**: Allow high-priority issues to jump the merge queue
- **Cross-session communication**: Enable agents to coordinate on related issues
- **Distributed sessions**: Run sessions across multiple containers/machines
