# Copyright 2025-present Anthropic PBC.
# Licensed under Apache 2.0

# #!/usr/bin/env python3
"""
Bedrock AgentCore wrapper for long-horizon coding agent.
Uses async background task pattern to keep session alive for hours.

Supports two modes:
1. Legacy mode: Build from PROJECT_NAME environment variable
2. GitHub mode: Build from issue (triggered by GitHub Actions)
"""

from bedrock_agentcore.runtime import BedrockAgentCoreApp, PingStatus
import asyncio
import boto3
import hashlib
import json
import os
import shutil
import subprocess
import threading
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, Iterator, Optional, List

# OpenTelemetry imports for session ID propagation
try:
    from opentelemetry import baggage
    from opentelemetry.context import attach
    OTEL_AVAILABLE = True
except ImportError:
    OTEL_AVAILABLE = False
    print("⚠️ OpenTelemetry not available - session ID propagation disabled")

# Import GitManager for centralized git operations
try:
    import sys
    sys.path.insert(0, '/app/src')
    from git_manager import GitManager, GitHubConfig
    GIT_MANAGER_AVAILABLE = True
except ImportError:
    GIT_MANAGER_AVAILABLE = False
    GitManager = None
    GitHubConfig = None
    print("⚠️ GitManager not available (running locally?)")

# Track uploaded screenshots by content hash (for deduplication)
uploaded_screenshots: set[str] = set()

# Track announced commits (for deduplication)
announced_commits: set[str] = set()

# Track all commits pushed in this session
session_pushed_commits: list[str] = []

# Track commits pending notification (legacy mode only)
legacy_pending_notification: list[str] = []

# File paths for git hook communication
GITHUB_TOKEN_FILE = "/tmp/github_token.txt"
COMMITS_QUEUE_FILE = "/tmp/commits_queue.txt"

# Import GitHub integration (optional - may not be available locally)
try:
    from github_integration import GitHubIssueManager
    GITHUB_INTEGRATION_AVAILABLE = True
except ImportError:
    GITHUB_INTEGRATION_AVAILABLE = False
    print("⚠️ GitHub integration not available (running locally?)")

# Import CloudWatch metrics publisher (optional)
try:
    from src.cloudwatch_metrics import MetricsPublisher
    METRICS_AVAILABLE = True
except ImportError:
    METRICS_AVAILABLE = False
    MetricsPublisher = None
    print("⚠️ CloudWatch metrics not available (running locally?)")

# Fetch secrets from AWS Secrets Manager
def get_secret(secret_name: str) -> Optional[str]:
    """
    Fetch secret from AWS Secrets Manager.

    Args:
        secret_name: Name of the secret

    Returns:
        Secret value or None if failed
    """
    region = os.environ.get("AWS_REGION", "us-west-2")
    client = boto3.client('secretsmanager', region_name=region)

    try:
        response = client.get_secret_value(SecretId=secret_name)
        return response['SecretString']
    except Exception as e:
        print(f"❌ Failed to fetch secret {secret_name}: {e}")
        return None


def get_anthropic_api_key() -> Optional[str]:
    """Fetch Anthropic API key from Secrets Manager."""
    env = os.environ.get("ENVIRONMENT", "reinvent")
    return get_secret(f"claude-code/{env}/anthropic-api-key")


def get_github_token(github_repo: Optional[str] = None) -> Optional[str]:
    """Fetch GitHub token from Secrets Manager.

    Checks for org-specific token first (e.g., github-token-anthropics),
    then falls back to the default github-token secret.

    Args:
        github_repo: GitHub repo in "org/repo" format. If provided, will check
                     for org-specific token first.
    """
    env = os.environ.get("ENVIRONMENT", "reinvent")
    repo = github_repo or os.environ.get("GITHUB_REPOSITORY", "")

    # Try org-specific token first (e.g., claude-code/reinvent/github-token-anthropics)
    if repo and "/" in repo:
        org = repo.split("/")[0]
        token = get_secret(f"claude-code/{env}/github-token-{org}")
        if token:
            print(f"✅ Using org-specific GitHub token for {org}")
            return token

    # Fall back to default token
    return get_secret(f"claude-code/{env}/github-token")


def write_github_token_to_file(github_token: str) -> bool:
    """
    Write GitHub token to a file for the post-commit hook to read.

    Args:
        github_token: The GitHub token to write

    Returns:
        True if successful, False otherwise
    """
    try:
        # Write token with restricted permissions
        with open(GITHUB_TOKEN_FILE, 'w') as f:
            f.write(github_token)
        os.chmod(GITHUB_TOKEN_FILE, 0o600)  # Read/write for owner only
        return True
    except Exception as e:
        print(f"⚠️ Failed to write GitHub token file: {e}")
        return False


def setup_post_commit_hook(build_dir: Path, github_repo: str, branch_name: str) -> bool:
    """
    Set up a git post-commit hook that pushes immediately after each commit.

    This provides event-driven pushes instead of polling, making the workflow
    more predictable and giving immediate visibility into agent work.

    Args:
        build_dir: The git repository directory
        github_repo: The GitHub repository (owner/repo format)
        branch_name: The branch to push to

    Returns:
        True if hook was set up successfully, False otherwise
    """
    hooks_dir = build_dir / ".git" / "hooks"
    hook_path = hooks_dir / "post-commit"

    # Create hooks directory if it doesn't exist
    hooks_dir.mkdir(parents=True, exist_ok=True)

    # Post-commit hook script
    # Uses token from file (refreshed by runtime) to push immediately
    hook_script = f'''#!/bin/bash
# Git post-commit hook - pushes immediately after each commit
# Installed by bedrock_entrypoint.py for event-driven push workflow

BRANCH_NAME="{branch_name}"
GITHUB_REPO="{github_repo}"
TOKEN_FILE="{GITHUB_TOKEN_FILE}"
COMMITS_QUEUE="{COMMITS_QUEUE_FILE}"
HOOK_LOG="/tmp/post_commit_hook.log"

# Log function that writes to both stdout and log file
log() {{
    echo "[post-commit] $1"
    echo "$(date -Iseconds) [post-commit] $1" >> "$HOOK_LOG"
}}

# Get the commit SHA that was just made
COMMIT_SHA=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --format=%s HEAD)

log "New commit: ${{COMMIT_SHA:0:12}} - $COMMIT_MSG"

# Read token from file (refreshed by runtime)
if [ -f "$TOKEN_FILE" ]; then
    GITHUB_TOKEN=$(cat "$TOKEN_FILE")
    log "Token file found"
else
    log "Warning: No token file found at $TOKEN_FILE, skipping push"
    exit 0
fi

# Update remote URL with fresh token
git remote set-url origin "https://x-access-token:${{GITHUB_TOKEN}}@github.com/${{GITHUB_REPO}}.git" 2>/dev/null

# Push to origin
log "Pushing to origin/$BRANCH_NAME..."
if git push -u origin "$BRANCH_NAME" 2>&1; then
    log "✅ Push successful"

    # Write commit SHA to queue file for runtime to announce to GitHub issue
    echo "$COMMIT_SHA" >> "$COMMITS_QUEUE"
else
    log "⚠️ Push failed (will be retried by fallback mechanism)"
fi

# Don't fail the commit if push fails
exit 0
'''

    try:
        # Write the hook script
        hook_path.write_text(hook_script)

        # Make it executable
        os.chmod(hook_path, 0o755)

        print(f"✅ Post-commit hook installed at {hook_path}")
        return True

    except Exception as e:
        print(f"⚠️ Failed to set up post-commit hook: {e}")
        return False


def read_and_clear_commit_queue() -> list[str]:
    """
    Read commit SHAs from the queue file and clear it.

    The post-commit hook writes SHAs to this file after successful pushes.
    The runtime reads them to post announcements to GitHub issues.

    Returns:
        List of commit SHAs that were pushed
    """
    shas = []

    try:
        if os.path.exists(COMMITS_QUEUE_FILE):
            with open(COMMITS_QUEUE_FILE, 'r') as f:
                shas = [line.strip() for line in f if line.strip()]

            # Clear the file
            with open(COMMITS_QUEUE_FILE, 'w') as f:
                f.write('')

    except Exception as e:
        print(f"⚠️ Error reading commit queue: {e}")

    return shas


# Track git directories we've already installed hooks in
_hooked_git_dirs: set[str] = set()


def scan_and_install_hooks(build_dir: Path, github_repo: str, branch_name: str) -> int:
    """
    Scan build directory for any new .git directories and install hooks in them.

    The agent may create nested git repositories (e.g., by running `git init`).
    This function finds any .git directories we haven't processed yet and
    installs the post-commit hook in them.

    Args:
        build_dir: The root build directory to scan
        github_repo: The GitHub repository (owner/repo format)
        branch_name: The branch to push to

    Returns:
        Number of new hooks installed
    """
    global _hooked_git_dirs

    hooks_installed = 0

    try:
        # Find all .git directories under build_dir
        for git_dir in build_dir.rglob(".git"):
            if not git_dir.is_dir():
                continue

            git_dir_str = str(git_dir)

            # Skip if we've already processed this one
            if git_dir_str in _hooked_git_dirs:
                continue

            # Get the repo root (parent of .git)
            repo_root = git_dir.parent

            # Install hook in this repo
            print(f"🔍 Found new git repository at {repo_root}")

            # Set up git config for this repo
            name_result = subprocess.run(
                ["git", "config", "user.name", "Claude Code Agent"],
                cwd=repo_root,
                capture_output=True,
                text=True
            )
            if name_result.returncode != 0:
                print(f"  ⚠️ Failed to set git user.name: {name_result.stderr}")

            email_result = subprocess.run(
                ["git", "config", "user.email", "agent@anthropic.com"],
                cwd=repo_root,
                capture_output=True,
                text=True
            )
            if email_result.returncode != 0:
                print(f"  ⚠️ Failed to set git user.email: {email_result.stderr}")

            # Set up remote if not already configured
            remote_result = subprocess.run(
                ["git", "remote", "get-url", "origin"],
                cwd=repo_root,
                capture_output=True,
                text=True
            )
            if remote_result.returncode != 0:
                # No origin remote, add it
                token = None
                try:
                    with open(GITHUB_TOKEN_FILE, 'r') as f:
                        token = f.read().strip()
                except FileNotFoundError:
                    pass  # Token file doesn't exist yet, which is expected
                except PermissionError as e:
                    print(f"  ⚠️ Permission denied reading token file: {e}")
                except IOError as e:
                    print(f"  ⚠️ Error reading token file: {e}")

                if token:
                    remote_url = f"https://x-access-token:{token}@github.com/{github_repo}.git"
                    subprocess.run(
                        ["git", "remote", "add", "origin", remote_url],
                        cwd=repo_root,
                        capture_output=True
                    )
                    print(f"  Added origin remote for {repo_root}")

            # Install the hook
            if setup_post_commit_hook(repo_root, github_repo, branch_name):
                hooks_installed += 1

            # Mark as processed
            _hooked_git_dirs.add(git_dir_str)

    except Exception as e:
        print(f"⚠️ Error scanning for git repositories: {e}")

    return hooks_installed


# Working directory for GitHub mode builds (legacy)
GITHUB_BUILD_DIR = Path("/app/github-builds")

# Agent runtime directory (ephemeral filesystem in AgentCore)
AGENT_RUNTIME_DIR = Path("/app/workspace/agent-runtime")
AGENT_BRANCH = "agent-runtime"

# Backlog file path (ephemeral - state is recovered from git on session start)
BACKLOG_FILE_PATH = AGENT_RUNTIME_DIR / "human_backlog.json"

# Authorized approvers who can approve issues with 🚀
# Configure via AUTHORIZED_APPROVERS env var (comma-separated GitHub usernames)
_approvers_env = os.environ.get("AUTHORIZED_APPROVERS", "")
AUTHORIZED_APPROVERS = set(a.strip() for a in _approvers_env.split(",") if a.strip())


def setup_agent_runtime(
    github_repo: str,
    github_token: str,
    issue_number: int = None
) -> tuple:
    """
    Set up agent-runtime workspace.
    - Each session: Clone repo, checkout agent-runtime branch
    - State is persisted in git, not filesystem (ephemeral in AgentCore)

    Returns:
        Tuple of (workspace_dir, git_manager) where git_manager may be None
    """
    print(f"\n{'='*80}")
    print(f"🔧 Setting up agent-runtime workspace")
    print(f"{'='*80}\n")

    if AGENT_RUNTIME_DIR.exists() and (AGENT_RUNTIME_DIR / ".git").exists():
        # Already cloned - just pull latest
        print(f"📂 Found existing workspace at {AGENT_RUNTIME_DIR}")

        # Update remote URL with fresh token
        push_url = f"https://x-access-token:{github_token}@github.com/{github_repo}.git"
        subprocess.run(
            ["git", "remote", "set-url", "origin", push_url],
            cwd=AGENT_RUNTIME_DIR,
            capture_output=True,
            timeout=30
        )

        # Pull latest changes (with timeout)
        try:
            result = subprocess.run(
                ["git", "pull", "--rebase"],
                cwd=AGENT_RUNTIME_DIR,
                capture_output=True,
                text=True,
                timeout=120
            )
            if result.returncode == 0:
                print(f"✅ Pulled latest changes from {AGENT_BRANCH}")
            else:
                print(f"⚠️ Pull failed (might be ok): {result.stderr}")
        except subprocess.TimeoutExpired:
            print(f"⚠️ Git pull timed out after 120s, continuing with existing code")
    else:
        # First time - clone and create branch
        print(f"📥 Cloning repository to {AGENT_RUNTIME_DIR}")
        AGENT_RUNTIME_DIR.parent.mkdir(parents=True, exist_ok=True)

        clone_url = f"https://x-access-token:{github_token}@github.com/{github_repo}.git"

        # Git operation timeout (5 minutes should be plenty for clone)
        GIT_TIMEOUT = 300

        # Try to clone the agent-runtime branch directly
        try:
            result = subprocess.run(
                ["git", "clone", "-b", AGENT_BRANCH, clone_url, str(AGENT_RUNTIME_DIR)],
                capture_output=True,
                text=True,
                timeout=GIT_TIMEOUT
            )
        except subprocess.TimeoutExpired:
            print(f"❌ Git clone timed out after {GIT_TIMEOUT}s - possible network issue")
            raise RuntimeError(f"Git clone timed out after {GIT_TIMEOUT} seconds")

        if result.returncode != 0:
            # Branch doesn't exist - clone main and create the branch
            print(f"📝 Branch {AGENT_BRANCH} doesn't exist, creating from main...")
            try:
                subprocess.run(
                    ["git", "clone", clone_url, str(AGENT_RUNTIME_DIR)],
                    check=True,
                    timeout=GIT_TIMEOUT
                )
                subprocess.run(
                    ["git", "checkout", "-b", AGENT_BRANCH],
                    cwd=AGENT_RUNTIME_DIR,
                    check=True,
                    timeout=60
                )
                # Push the new branch to origin
                subprocess.run(
                    ["git", "push", "-u", "origin", AGENT_BRANCH],
                    cwd=AGENT_RUNTIME_DIR,
                    capture_output=True,
                    timeout=120
                )
                print(f"✅ Created and pushed {AGENT_BRANCH} branch")
            except subprocess.TimeoutExpired as e:
                print(f"❌ Git operation timed out: {e}")
                raise RuntimeError(f"Git operation timed out during branch setup")
        else:
            print(f"✅ Cloned {AGENT_BRANCH} branch")

        # Configure git user
        subprocess.run(
            ["git", "config", "user.name", "Claude Code Agent"],
            cwd=AGENT_RUNTIME_DIR
        )
        subprocess.run(
            ["git", "config", "user.email", "agent@anthropic.com"],
            cwd=AGENT_RUNTIME_DIR
        )

    # Write token file for post-commit hook to use
    write_github_token_to_file(github_token)

    # Set up post-commit hook for automatic pushing
    setup_post_commit_hook(AGENT_RUNTIME_DIR, github_repo, AGENT_BRANCH)

    # Ensure generated-app directory exists
    generated_app_dir = AGENT_RUNTIME_DIR / "generated-app"
    generated_app_dir.mkdir(exist_ok=True)

    # Set up GitManager for commit tracking if available
    git_manager = None
    if GIT_MANAGER_AVAILABLE and GitManager and GitHubConfig:
        print("🔧 Setting up GitManager for commit tracking")
        github_config = GitHubConfig(
            repo=github_repo,
            issue_number=issue_number or 0,  # 0 for branch-only mode
            token=github_token,
            branch=AGENT_BRANCH,  # Use agent-runtime branch
        )
        git_manager = GitManager(
            work_dir=AGENT_RUNTIME_DIR,
            mode="github",
            github_config=github_config,
        )
        print(f"✅ GitManager configured for {AGENT_BRANCH} branch")

    print(f"✅ Agent runtime workspace ready at {AGENT_RUNTIME_DIR}")
    return AGENT_RUNTIME_DIR, git_manager


def claim_github_issue(
    github_repo: str,
    github_token: str,
    issue_number: int
) -> bool:
    """
    Claim an issue by adding the 'agent-building' label.
    Returns True if successful.
    """
    import requests

    try:
        headers = {
            "Authorization": f"token {github_token}",
            "Accept": "application/vnd.github.v3+json"
        }

        # Add agent-building label
        url = f"https://api.github.com/repos/{github_repo}/issues/{issue_number}/labels"
        response = requests.post(
            url,
            headers=headers,
            json={"labels": ["agent-building"]},
            timeout=30
        )
        response.raise_for_status()
        print(f"✅ Claimed issue #{issue_number} (added agent-building label)")
        return True

    except Exception as e:
        print(f"❌ Failed to claim issue #{issue_number}: {e}")
        return False


def release_github_issue(
    github_repo: str,
    github_token: str,
    issue_number: int,
    mark_complete: bool = True
) -> bool:
    """
    Release an issue by removing the 'agent-building' label and optionally
    adding 'agent-complete' label.
    Called when agent finishes working on an issue.
    Returns True if successful.
    """
    import requests

    try:
        headers = {
            "Authorization": f"token {github_token}",
            "Accept": "application/vnd.github.v3+json"
        }

        # Remove agent-building label
        url = f"https://api.github.com/repos/{github_repo}/issues/{issue_number}/labels/agent-building"
        response = requests.delete(url, headers=headers, timeout=30)

        if response.status_code not in [200, 204, 404]:  # 404 = label already removed
            print(f"⚠️ Failed to remove agent-building label: {response.status_code}")

        # Add agent-complete label if requested
        if mark_complete:
            add_url = f"https://api.github.com/repos/{github_repo}/issues/{issue_number}/labels"
            add_response = requests.post(
                add_url,
                headers=headers,
                json={"labels": ["agent-complete"]},
                timeout=30
            )
            if add_response.status_code in [200, 201]:
                print(f"✅ Marked issue #{issue_number} as complete (added agent-complete label)")
            else:
                print(f"⚠️ Failed to add agent-complete label: {add_response.status_code}")

            # Clear SSM current-issue to prevent health monitor from restarting a completed session
            clear_current_issue_ssm()

        print(f"✅ Released issue #{issue_number}")
        return True

    except Exception as e:
        print(f"⚠️ Failed to release issue #{issue_number}: {e}")
        return False


def sync_github_issues_to_backlog(
    github_repo: str,
    github_token: str,
    backlog_path: Path
) -> List[Dict]:
    """
    Pull approved (🚀) GitHub issues and add to human_backlog.json.
    Returns list of new issues added.
    """
    try:
        from github import Github
    except ImportError:
        print("⚠️ PyGithub not available, skipping issue sync")
        return []

    print(f"🔄 Syncing GitHub issues to backlog...")

    gh = Github(github_token)
    repo = gh.get_repo(github_repo)

    # Load existing backlog
    if backlog_path.exists():
        backlog = json.loads(backlog_path.read_text())
    else:
        backlog = []

    existing_issue_ids = {item.get('github_issue') for item in backlog}
    new_issues = []

    # Query open issues
    for issue in repo.get_issues(state='open'):
        if issue.number in existing_issue_ids:
            continue

        # Skip MVP issues - they are the main build trigger, not backlog items
        issue_labels = [label.name.lower() for label in issue.labels]
        if 'mvp' in issue_labels or issue.title.startswith('[MVP]'):
            continue

        # Skip issues that are already completed or currently being built
        if 'agent-complete' in issue_labels or 'agent-building' in issue_labels:
            continue

        # Check for 🚀 from authorized approvers
        try:
            for reaction in issue.get_reactions():
                if (reaction.content == 'rocket' and
                    reaction.user.login in AUTHORIZED_APPROVERS):

                    # Calculate priority by vote count
                    vote_count = sum(1 for r in issue.get_reactions()
                                    if r.content in ['+1', 'rocket'])

                    backlog_item = {
                        "id": str(int(time.time() * 1000)),
                        "github_issue": issue.number,
                        "type": "feature",
                        "priority": "high" if vote_count > 3 else "medium",
                        "status": "backlog",
                        "description": issue.title,
                        "details": issue.body or "",
                        "vote_count": vote_count,
                        "added": datetime.now(timezone.utc).isoformat(),
                        "completed": False
                    }
                    backlog.append(backlog_item)
                    new_issues.append(backlog_item)
                    print(f"  ✅ Added issue #{issue.number}: {issue.title}")
                    break
        except Exception as e:
            print(f"  ⚠️ Error checking reactions for #{issue.number}: {e}")

    # Sort by vote count (highest first)
    backlog.sort(key=lambda x: x.get('vote_count', 0), reverse=True)

    # Save updated backlog
    backlog_path.write_text(json.dumps(backlog, indent=2))

    print(f"📋 Backlog has {len(backlog)} items ({len(new_issues)} new)")
    return new_issues


def get_next_backlog_item(backlog_path: Path) -> Optional[Dict]:
    """
    Get highest priority incomplete item from backlog.

    Priority order:
    1. In-progress items (resume interrupted work)
    2. Critical priority
    3. High priority (sorted by vote count)
    4. Medium/Low priority
    """
    if not backlog_path.exists():
        return None

    backlog = json.loads(backlog_path.read_text())

    # First: find any in-progress items (resume interrupted work)
    for item in backlog:
        if item.get('status') == 'in progress' and not item.get('completed'):
            print(f"📌 Resuming in-progress: #{item.get('github_issue')} - {item.get('description')}")
            return item

    # Then: by priority order
    priority_order = ['critical', 'high', 'medium', 'low']
    for priority in priority_order:
        for item in backlog:
            if (item.get('priority') == priority and
                item.get('status') == 'backlog' and
                not item.get('completed')):
                print(f"📋 Next from backlog: #{item.get('github_issue')} - {item.get('description')} ({priority})")
                return item

    return None


def update_backlog_item_status(
    backlog_path: Path,
    github_issue: int,
    status: str,
    completed: bool = False
):
    """Update status of a backlog item."""
    if not backlog_path.exists():
        return

    backlog = json.loads(backlog_path.read_text())

    for item in backlog:
        if item.get('github_issue') == github_issue:
            item['status'] = status
            item['completed'] = completed
            if completed:
                item['completedDate'] = datetime.now(timezone.utc).isoformat()
            break

    backlog_path.write_text(json.dumps(backlog, indent=2))
    print(f"📝 Updated issue #{github_issue} status to '{status}'")


def trigger_session_restart(
    github_repo: str,
    github_token: str,
    issue_number: int
) -> bool:
    """
    Trigger agent-builder.yml workflow to restart the session.

    Called when the current session is about to timeout (7 hours).
    The new session will resume from where this one left off using git state.

    Args:
        github_repo: Repository in 'owner/repo' format
        github_token: GitHub token with workflow dispatch permissions
        issue_number: Current issue number being worked on

    Returns:
        True if workflow was triggered successfully, False otherwise
    """
    try:
        from github import Github

        gh = Github(github_token)
        repo = gh.get_repo(github_repo)

        # Trigger agent-builder workflow with resume flag
        workflow = repo.get_workflow("agent-builder.yml")
        workflow.create_dispatch(
            ref="main",
            inputs={
                "issue_number": str(issue_number),
                "resume_session": "true"
            }
        )
        print(f"🔄 Triggered session restart for issue #{issue_number}")
        return True
    except Exception as e:
        print(f"⚠️ Failed to trigger session restart: {e}")
        return False


def write_agent_state(
    workspace_dir: Path,
    session_id: str,
    current_issue: Optional[int] = None,
    backlog_item_id: Optional[str] = None,
    status: str = "running",
    restart_count: int = 0
):
    """Write agent state for session recovery (committed to git)."""
    state_path = workspace_dir / "agent_state.json"

    # Get last commit SHA
    last_commit = None
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=workspace_dir,
            capture_output=True,
            text=True
        )
        if result.returncode == 0:
            last_commit = result.stdout.strip()
    except Exception:
        pass

    state = {
        "session_id": session_id,
        "current_issue": current_issue,
        "backlog_item_id": backlog_item_id,
        "status": status,
        "last_heartbeat": datetime.now(timezone.utc).isoformat(),
        "restart_count": restart_count,
        "working_directory": str(workspace_dir),
        "last_commit": last_commit
    }

    state_path.write_text(json.dumps(state, indent=2))


def read_agent_state(workspace_dir: Path) -> Optional[Dict]:
    """Read agent state from workspace."""
    state_path = workspace_dir / "agent_state.json"

    if not state_path.exists():
        return None

    try:
        return json.loads(state_path.read_text())
    except Exception as e:
        print(f"⚠️ Failed to read agent state: {e}")
        return None


def store_session_state_ssm(issue_number: int, session_id: Optional[str] = None) -> bool:
    """
    Store current session state in SSM Parameter Store.

    This allows GitHub Actions (which can't access the container filesystem) to know
    which issue and session to resume if the session dies and needs restart.

    Args:
        issue_number: The issue number currently being worked on
        session_id: Optional AgentCore session ID

    Returns:
        True if successful, False otherwise
    """
    try:
        ssm = boto3.client('ssm', region_name=os.environ.get("AWS_REGION", "us-west-2"))

        # Store current issue
        ssm.put_parameter(
            Name='/claude-code/current-issue',
            Value=str(issue_number),
            Type='String',
            Overwrite=True
        )
        print(f"📝 Stored current issue #{issue_number} in SSM")

        # Store session ID if provided
        if session_id:
            ssm.put_parameter(
                Name='/claude-code/session-id',
                Value=session_id,
                Type='String',
                Overwrite=True
            )
            print(f"📝 Stored session ID {session_id[:20]}... in SSM")

        return True
    except Exception as e:
        print(f"⚠️ Failed to store session state in SSM: {e}")
        return False


def clear_session_state_ssm() -> bool:
    """
    Clear the current session state from SSM Parameter Store.

    Call this when an issue is completed to avoid restarting a completed session.

    Returns:
        True if successful, False otherwise
    """
    try:
        ssm = boto3.client('ssm', region_name=os.environ.get("AWS_REGION", "us-west-2"))

        # Clear current issue
        try:
            ssm.delete_parameter(Name='/claude-code/current-issue')
            print(f"🗑️ Cleared current issue from SSM")
        except ssm.exceptions.ParameterNotFound:
            pass  # Parameter doesn't exist, that's fine

        # Clear session ID
        try:
            ssm.delete_parameter(Name='/claude-code/session-id')
            print(f"🗑️ Cleared session ID from SSM")
        except ssm.exceptions.ParameterNotFound:
            pass  # Parameter doesn't exist, that's fine

        return True
    except Exception as e:
        print(f"⚠️ Failed to clear session state from SSM: {e}")
        return False


# Backward compatibility alias
def clear_current_issue_ssm() -> bool:
    """Alias for clear_session_state_ssm for backward compatibility."""
    return clear_session_state_ssm()


def get_announced_commits_from_github(
    github_repo: str,
    issue_number: int,
    github_token: str
) -> set[str]:
    """
    Query GitHub issue comments to find commits already announced.

    This is used on session resume to avoid re-announcing commits that were
    already posted before the session died. GitHub is the source of truth.

    Args:
        github_repo: Repository in format "owner/repo"
        issue_number: The issue number to check
        github_token: GitHub API token

    Returns:
        Set of commit SHAs (full 40-char) that were previously posted
    """
    import re
    import requests

    announced = set()
    try:
        headers = {
            "Authorization": f"token {github_token}",
            "Accept": "application/vnd.github.v3+json"
        }

        # Get all comments on the issue (paginated)
        page = 1
        while True:
            url = f"https://api.github.com/repos/{github_repo}/issues/{issue_number}/comments"
            response = requests.get(
                url,
                headers=headers,
                params={"page": page, "per_page": 100},
                timeout=30
            )
            response.raise_for_status()
            comments = response.json()

            if not comments:
                break

            # Parse commit SHAs from "Commits Pushed" comments
            # Format: [`abc1234`](https://github.com/.../commit/abc1234567890...)
            sha_pattern = r'\[`([a-f0-9]{7})`\]\(https://github\.com/[^/]+/[^/]+/commit/([a-f0-9]{40})\)'

            for comment in comments:
                body = comment.get('body', '')
                # Check for commit announcement patterns
                if '**Commits Pushed**' in body or '**Session Complete**' in body or '🔨' in body:
                    matches = re.findall(sha_pattern, body)
                    for short_sha, full_sha in matches:
                        announced.add(full_sha)

            page += 1

        print(f"📋 Found {len(announced)} previously announced commits on issue #{issue_number}")

    except Exception as e:
        print(f"⚠️ Failed to query announced commits from GitHub: {e}")

    return announced


def get_uploaded_screenshots_from_github(
    github_repo: str,
    issue_number: int,
    github_token: str
) -> set[str]:
    """
    Query GitHub issue comments to find screenshot content hashes already posted.

    This is used on session resume to avoid re-posting screenshots that were
    already uploaded before the session died.

    Args:
        github_repo: Repository in format "owner/repo"
        issue_number: The issue number to check
        github_token: GitHub API token

    Returns:
        Set of screenshot content hashes that were previously uploaded
    """
    import re
    import requests

    uploaded = set()
    try:
        headers = {
            "Authorization": f"token {github_token}",
            "Accept": "application/vnd.github.v3+json"
        }

        # Get all comments on the issue (paginated)
        page = 1
        while True:
            url = f"https://api.github.com/repos/{github_repo}/issues/{issue_number}/comments"
            response = requests.get(
                url,
                headers=headers,
                params={"page": page, "per_page": 100},
                timeout=30
            )
            response.raise_for_status()
            comments = response.json()

            if not comments:
                break

            # Parse screenshot URLs from Agent Screenshots comments
            # URL format: /screenshots/{timestamp}_{hash}_{name}.png
            # Extract the hash portion (8 chars after timestamp)
            screenshot_pattern = r'/screenshots/\d+_([a-f0-9]{8})_[^"]+\.png'

            for comment in comments:
                body = comment.get('body', '')
                if '**Agent Screenshots**' in body or '📸' in body:
                    matches = re.findall(screenshot_pattern, body)
                    for content_hash in matches:
                        uploaded.add(content_hash)

            page += 1

        print(f"📷 Found {len(uploaded)} previously uploaded screenshot hashes on issue #{issue_number}")

    except Exception as e:
        print(f"⚠️ Failed to query uploaded screenshots from GitHub: {e}")

    return uploaded


def push_github_changes(
    build_dir: Path,
    github_repo: str,
    issue_number: int,
    github_token: str
) -> bool:
    """
    Push changes to GitHub and return success status.
    """
    branch_name = f"issue-{issue_number}"

    print(f"\n{'='*80}")
    print(f"📤 Pushing changes to GitHub branch: {branch_name}")
    print(f"{'='*80}\n")

    try:
        # Stage all changes
        subprocess.run(["git", "add", "-A"], cwd=build_dir, check=True)

        # Check if there are changes to commit
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=build_dir,
            capture_output=True,
            text=True
        )

        if not result.stdout.strip():
            print("⚠️ No changes to commit")
            return True

        # Commit changes
        subprocess.run(
            ["git", "commit", "-m", f"feat: Implement feature from issue #{issue_number}\n\n🤖 Generated with Claude Code Agent"],
            cwd=build_dir,
            check=True
        )

        # Get the commit SHA for tracking
        sha_result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=build_dir,
            capture_output=True,
            text=True
        )
        commit_sha = sha_result.stdout.strip() if sha_result.returncode == 0 else "unknown"
        print(f"✅ Changes committed (SHA: {commit_sha[:12]}...)")

        # Update origin URL with current token and push to origin
        push_url = f"https://x-access-token:{github_token}@github.com/{github_repo}.git"
        subprocess.run(
            ["git", "remote", "set-url", "origin", push_url],
            cwd=build_dir,
            capture_output=True
        )

        result = subprocess.run(
            ["git", "push", "-u", "origin", branch_name],
            cwd=build_dir,
            capture_output=True,
            text=True
        )

        if result.returncode == 0:
            print(f"✅ Pushed to branch: {branch_name} (SHA: {commit_sha[:12]}...)")

            # Verify push by checking remote
            verify_result = subprocess.run(
                ["git", "ls-remote", "origin", f"refs/heads/{branch_name}"],
                cwd=build_dir,
                capture_output=True,
                text=True
            )
            if verify_result.returncode == 0 and verify_result.stdout.strip():
                remote_sha = verify_result.stdout.strip().split()[0]
                print(f"📡 Remote verified: {remote_sha[:12]}...")
            return True
        else:
            print(f"❌ Push FAILED to {branch_name}")
            print(f"   stderr: {result.stderr}")
            print(f"   stdout: {result.stdout}")
            return False

    except subprocess.CalledProcessError as e:
        print(f"❌ Git operation failed: {e}")
        return False


def create_wip_commit(
    build_dir: Path,
    issue_number: int,
    restart_count: int,
    session_id: str,
    github_repo: str,
    github_token: str,
    branch_name: str
) -> bool:
    """
    Create a WIP (work-in-progress) commit before session timeout.
    This ensures all current work is saved so the next session can resume.

    Returns True if WIP commit was created and pushed successfully.
    """
    try:
        # Check if there are any uncommitted changes
        status_result = subprocess.run(
            ["git", "status", "--porcelain"],
            cwd=build_dir,
            capture_output=True,
            text=True
        )

        if status_result.returncode != 0:
            print(f"⚠️ Could not check git status: {status_result.stderr}")
            return False

        uncommitted_changes = status_result.stdout.strip()
        if not uncommitted_changes:
            print("📝 No uncommitted changes - skipping WIP commit")
            return True  # Nothing to commit, but that's OK

        # Stage all changes
        add_result = subprocess.run(
            ["git", "add", "-A"],
            cwd=build_dir,
            capture_output=True,
            text=True
        )

        if add_result.returncode != 0:
            print(f"⚠️ Could not stage changes: {add_result.stderr}")
            return False

        # Create the WIP commit message
        wip_message = f"""wip: Session timeout approaching (issue #{issue_number})

Automatic work-in-progress commit before session timeout.
Restart count: {restart_count}
Session ID: {session_id}

Resume by checking:
- claude-progress.txt for current status
- tests.json for test progress
- git log for recent changes

🤖 Generated with Claude Code Agent"""

        # Commit with the WIP message
        commit_result = subprocess.run(
            ["git", "commit", "-m", wip_message],
            cwd=build_dir,
            capture_output=True,
            text=True
        )

        if commit_result.returncode != 0:
            print(f"⚠️ Could not create WIP commit: {commit_result.stderr}")
            return False

        print(f"📝 Created WIP commit for issue #{issue_number}")

        # Push the WIP commit immediately
        push_url = f"https://x-access-token:{github_token}@github.com/{github_repo}.git"
        subprocess.run(
            ["git", "remote", "set-url", "origin", push_url],
            cwd=build_dir,
            capture_output=True
        )

        push_result = subprocess.run(
            ["git", "push", "-u", "origin", branch_name],
            cwd=build_dir,
            capture_output=True,
            text=True
        )

        if push_result.returncode != 0:
            print(f"⚠️ Could not push WIP commit: {push_result.stderr}")
            return False

        print(f"✅ WIP commit pushed to {branch_name}")
        return True

    except Exception as e:
        print(f"⚠️ Error creating WIP commit: {e}")
        return False


def push_pending_commits(
    build_dir: Path,
    github_repo: str,
    github_token: str,
    branch_name: str
) -> tuple[bool, int, list[str]]:
    """
    Push any pending commits to GitHub. Returns (success, commit_count, list_of_shas).
    Unlike push_github_changes(), this doesn't create new commits - just pushes existing ones.
    """

    try:
        # Log HEAD SHA for tracking
        head_result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            cwd=build_dir,
            capture_output=True,
            text=True
        )
        head_sha = head_result.stdout.strip() if head_result.returncode == 0 else "unknown"
        print(f"📊 Push check: HEAD is {head_sha[:12]}...")

        # Update origin URL with current token (ensures fresh auth AND proper ref updates)
        push_url = f"https://x-access-token:{github_token}@github.com/{github_repo}.git"
        subprocess.run(
            ["git", "remote", "set-url", "origin", push_url],
            cwd=build_dir,
            capture_output=True
        )

        # Fetch to update our local view of remote refs
        fetch_result = subprocess.run(
            ["git", "fetch", "origin"],
            cwd=build_dir,
            capture_output=True,
            text=True
        )
        if fetch_result.returncode != 0:
            print(f"⚠️ Fetch warning: {fetch_result.stderr}")

        # Check if there are unpushed commits
        result = subprocess.run(
            ["git", "rev-list", f"origin/{branch_name}..HEAD", "--count"],
            cwd=build_dir,
            capture_output=True,
            text=True
        )

        # Handle case where remote branch doesn't exist yet
        if result.returncode != 0:
            # Count only commits that are new compared to origin/main (the base branch)
            result = subprocess.run(
                ["git", "rev-list", "origin/main..HEAD", "--count"],
                cwd=build_dir,
                capture_output=True,
                text=True
            )
            if result.returncode != 0 or not result.stdout.strip():
                return True, 0, []  # No commits yet
            commit_count = int(result.stdout.strip())
            if commit_count == 0:
                return True, 0, []
            print(f"📤 Remote branch doesn't exist yet, will push {commit_count} new commit(s)")
        else:
            commit_count = int(result.stdout.strip())
            if commit_count == 0:
                return True, 0, []  # Nothing to push

        # Log commits being pushed
        log_result = subprocess.run(
            ["git", "log", "--oneline", "-n", str(commit_count)],
            cwd=build_dir,
            capture_output=True,
            text=True
        )
        if log_result.returncode == 0 and log_result.stdout.strip():
            print(f"📤 Commits to push:\n{log_result.stdout.strip()}")

        # Get SHAs of commits being pushed
        sha_result = subprocess.run(
            ["git", "log", "--format=%H", "-n", str(commit_count)],
            cwd=build_dir,
            capture_output=True,
            text=True
        )
        pushed_shas = sha_result.stdout.strip().split('\n') if sha_result.returncode == 0 else []

        # Push to origin (not URL) so refs update correctly
        result = subprocess.run(
            ["git", "push", "-u", "origin", branch_name],
            cwd=build_dir,
            capture_output=True,
            text=True
        )

        if result.returncode == 0:
            print(f"✅ Push succeeded: {commit_count} commit(s) to {branch_name}, HEAD={head_sha[:12]}")

            # Verify by checking remote ref
            verify_result = subprocess.run(
                ["git", "ls-remote", "origin", f"refs/heads/{branch_name}"],
                cwd=build_dir,
                capture_output=True,
                text=True
            )
            if verify_result.returncode == 0 and verify_result.stdout.strip():
                remote_sha = verify_result.stdout.strip().split()[0]
                print(f"📡 Remote verified: {remote_sha[:12]}...")
            else:
                print(f"⚠️ Could not verify remote ref")

            return True, commit_count, pushed_shas
        else:
            print(f"❌ Push FAILED to {branch_name}")
            print(f"   stderr: {result.stderr}")
            print(f"   stdout: {result.stdout}")
            return False, 0, []

    except Exception as e:
        print(f"⚠️ Error pushing commits: {e}")
        return False, 0, []


def get_file_hash(file_path: Path) -> str:
    """Get SHA256 hash of file contents for deduplication."""
    hasher = hashlib.sha256()
    with open(file_path, 'rb') as f:
        for chunk in iter(lambda: f.read(8192), b''):
            hasher.update(chunk)
    return hasher.hexdigest()[:8]  # 8-char hash for filename


def upload_screenshots_to_s3(
    build_dir: Path,
    issue_number: int,
    session_id: str,
    bucket_name: str,
    cloudfront_domain: str
) -> List[dict]:
    """
    Find and upload new screenshots to S3.
    Only uploads actual screenshots (from test directories), not documentation images.
    Returns list of uploaded screenshot metadata with CloudFront URLs.
    """
    global uploaded_screenshots
    s3 = boto3.client('s3')
    uploaded = []

    # Only scan specific directories where actual screenshots are saved
    # This excludes documentation PNGs and other assets in the repo
    screenshot_dirs = [
        build_dir / "generated-app" / "screenshots",
        build_dir / "generated-app" / "test-results",
        build_dir / "generated-app" / "playwright-report",
        build_dir / "screenshots",
        build_dir / "test-results",
    ]

    # Collect PNG files from screenshot directories only
    png_files = []
    for screenshot_dir in screenshot_dirs:
        if screenshot_dir.exists():
            png_files.extend(screenshot_dir.glob("**/*.png"))

    for png_file in png_files:
        content_hash = get_file_hash(png_file)

        # Skip if already uploaded (deduplication)
        if content_hash in uploaded_screenshots:
            continue

        timestamp = int(time.time())
        s3_key = f"issue-{issue_number}/{session_id}/screenshots/{timestamp}_{content_hash}_{png_file.name}"

        try:
            # Upload to S3
            s3.upload_file(
                str(png_file),
                bucket_name,
                s3_key,
                ExtraArgs={
                    'ContentType': 'image/png',
                    'Metadata': {
                        'issue_number': str(issue_number),
                        'session_id': session_id,
                        'original_name': png_file.name,
                        'content_hash': content_hash,
                    }
                }
            )

            # Use CloudFront URL for serving
            cdn_url = f"https://{cloudfront_domain}/{s3_key}"
            uploaded_screenshots.add(content_hash)

            uploaded.append({
                'filename': png_file.name,
                'timestamp': timestamp,
                'content_hash': content_hash,
                'url': cdn_url,
                's3_key': s3_key,
            })

            print(f"📸 Uploaded screenshot: {png_file.name}")

        except Exception as e:
            print(f"⚠️ Failed to upload {png_file.name}: {e}")

    return uploaded


def post_session_info_to_issue(
    session_id: str,
    agent_runtime_arn: str,
    github_repo: str,
    issue_number: int,
    github_token: str,
    branch: str = None
) -> bool:
    """Post session ID to GitHub issue for tracking and manual termination."""
    try:
        from github import Github

        gh = Github(github_token)
        repo = gh.get_repo(github_repo)
        issue = repo.get_issue(issue_number)

        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S UTC")
        branch_info = f"| **Branch** | `{branch}` |\n" if branch else ""
        comment = f"""🤖 **Agent Session Started**

| Field | Value |
|-------|-------|
| **Session ID** | `{session_id}` |
| **Runtime ARN** | `{agent_runtime_arn}` |
{branch_info}| **Started** | {timestamp} |

Commits will be pushed to branch `{branch or 'issue-' + str(issue_number)}`.

<details>
<summary>🛑 To stop this agent session</summary>

**Recommended:** Close this issue. A GitHub Action will automatically stop the session.

If the GitHub Action fails to stop the session:
```bash
AWS_PROFILE=<your-profile> AWS_REGION=us-west-2 agentcore stop-session --session-id "{session_id}"
```

</details>
"""
        issue.create_comment(comment)
        print(f"📝 Posted session info to issue #{issue_number}")
        return True

    except Exception as e:
        print(f"⚠️ Failed to post session info to issue: {e}")
        return False


def post_screenshots_to_issue(
    screenshots: List[dict],
    github_repo: str,
    issue_number: int,
    github_token: str
) -> bool:
    """Post new screenshots as a comment on the GitHub issue."""
    if not screenshots:
        return True

    try:
        from github import Github

        gh = Github(github_token)
        repo = gh.get_repo(github_repo)
        issue = repo.get_issue(issue_number)

        # Build comment with embedded images
        timestamp = datetime.utcnow().strftime("%H:%M:%S UTC")
        comment = f"📸 **Agent Screenshots** ({timestamp})\n\n"

        for ss in screenshots:
            comment += f"**{ss['filename']}**\n"
            comment += f"![{ss['filename']}]({ss['url']})\n\n"

        issue.create_comment(comment)
        print(f"📝 Posted {len(screenshots)} screenshot(s) to issue #{issue_number}")
        return True

    except Exception as e:
        print(f"⚠️ Failed to post screenshots to issue: {e}")
        return False


def post_commits_to_issue(
    shas: list[str],
    branch_name: str,
    github_repo: str,
    issue_number: int,
    github_token: str,
    build_dir: Optional[Path] = None,
    is_final_summary: bool = False
) -> bool:
    """Post pushed commits as a comment on the GitHub issue for tracking.

    Args:
        shas: List of commit SHAs to post
        branch_name: Git branch name
        github_repo: GitHub repo in owner/repo format
        issue_number: GitHub issue number
        github_token: GitHub API token
        build_dir: Optional path to git repo for fetching commit messages
        is_final_summary: If True, skip deduplication (for posting final session summary)
    """
    global announced_commits

    if not shas:
        return True

    # For final summary, post all commits; otherwise filter duplicates
    if is_final_summary:
        new_shas = shas
    else:
        new_shas = [sha for sha in shas if sha not in announced_commits]

        if not new_shas:
            print(f"ℹ️ All {len(shas)} commit(s) already announced, skipping")
            return True

        if len(new_shas) < len(shas):
            print(f"ℹ️ Filtering {len(shas) - len(new_shas)} already-announced commit(s)")

    try:
        from github import Github

        gh = Github(github_token)
        repo = gh.get_repo(github_repo)
        issue = repo.get_issue(issue_number)

        timestamp = datetime.now(timezone.utc).strftime("%H:%M:%S UTC")

        # Get commit messages for context
        commit_lines = []
        for sha in new_shas:
            # Try to get the commit message
            if build_dir:
                msg_result = subprocess.run(
                    ["git", "log", "--format=%s", "-n", "1", sha],
                    cwd=build_dir,
                    capture_output=True,
                    text=True
                )
                msg = msg_result.stdout.strip() if msg_result.returncode == 0 else ""
            else:
                msg = ""

            short_sha = sha[:7]
            commit_url = f"https://github.com/{github_repo}/commit/{sha}"
            if msg:
                commit_lines.append(f"- [`{short_sha}`]({commit_url}) {msg}")
            else:
                commit_lines.append(f"- [`{short_sha}`]({commit_url})")

        branch_url = f"https://github.com/{github_repo}/tree/{branch_name}"

        if is_final_summary:
            comment = f"""📦 **Session Complete - All Commits** ({timestamp})

Branch: [`{branch_name}`]({branch_url})

**{len(new_shas)} commit(s) pushed:**

{chr(10).join(commit_lines)}
"""
        else:
            comment = f"""📦 **Commits Pushed** ({timestamp})

Branch: [`{branch_name}`]({branch_url})

{chr(10).join(commit_lines)}
"""
        issue.create_comment(comment)

        # Mark commits as announced AFTER successful post
        announced_commits.update(new_shas)

        print(f"📝 Posted {len(new_shas)} commit(s) to issue #{issue_number}")
        return True

    except Exception as e:
        print(f"⚠️ Failed to post commits to issue: {e}")
        return False


# Initialize AgentCore app
app = BedrockAgentCoreApp()


@app.ping
def custom_ping_status():
    """Report HEALTHY_BUSY when agent is actively processing.

    This ensures AgentCore knows the session is busy and won't terminate
    due to the 15-minute idle timeout while the agent is running.
    """
    if agent_process and agent_process.poll() is None:
        return PingStatus.HEALTHY_BUSY
    return PingStatus.HEALTHY


# Global state for background agent
agent_process = None
session_start_time = None
generation_dir = None


def run_agent_background(
    build_dir: Optional[Path] = None,
    is_enhancement: bool = False,
    feature_request_path: Optional[Path] = None
):
    """
    Run claude_code.py in background thread.
    This allows the handler to return while agent continues running.

    Args:
        build_dir: Working directory for GitHub mode (None for legacy mode)
        is_enhancement: True if enhancing existing code, False for full build
        feature_request_path: Path to FEATURE_REQUEST.md for GitHub mode
    """
    global agent_process, generation_dir

    # Fetch API key from Secrets Manager
    api_key = get_anthropic_api_key()
    if not api_key:
        print("❌ Cannot start agent without API key")
        return

    model = os.environ.get("DEFAULT_MODEL", "claude-opus-4-5-20251101")

    # Determine working directory and command based on mode
    if build_dir is not None:
        # GitHub mode - work in the cloned repo directory
        cwd = str(build_dir)

        if is_enhancement and feature_request_path:
            # Enhancement mode - enhance existing generated-app/
            cmd = [
                "python", "/app/claude_code.py",
                "--enhance-feature", str(feature_request_path),
                "--existing-codebase", str(build_dir / "generated-app"),
                "--model", model,
                "--skip-git-init"  # Don't create nested .git - use cloned repo's git
            ]
        else:
            # Full build mode - build from scratch using BUILD_PLAN
            # Use PROJECT_NAME env var if set, otherwise default to canopy
            project_name = os.environ.get("PROJECT_NAME", "canopy")
            cmd = [
                "python", "/app/claude_code.py",
                "--project", project_name,
                "--model", model,
                "--output-dir", str(build_dir / "generated-app"),
                "--skip-git-init"  # Don't create nested .git - use cloned repo's git
            ]
            print(f"📦 Using project: {project_name}")

        print(f"🔧 GitHub mode: {'enhancement' if is_enhancement else 'full build'}")
    else:
        # Legacy mode
        cwd = "/app"
        project = os.environ.get("PROJECT_NAME", "canopy")

        cmd = [
            "python", "claude_code.py",
            "--project", project,
            "--model", model
        ]

        # Check if resuming
        resume_session_id = os.environ.get('RESUME_SESSION_ID')
        if resume_session_id:
            cmd.extend(["--resume", resume_session_id])
            print(f"🔄 Resuming session: {resume_session_id}")

    print(f"📝 Background command: {' '.join(cmd)}")
    print(f"📁 Working directory: {cwd}")

    # Set up environment with API key
    env = os.environ.copy()
    env['ANTHROPIC_API_KEY'] = api_key

    # Start agent subprocess - don't capture output so it goes to CloudWatch
    agent_process = subprocess.Popen(
        cmd,
        cwd=cwd,
        env=env
    )

    print(f"✅ Agent started in background (PID: {agent_process.pid})")
    print(f"📝 Agent output will appear in CloudWatch logs")

    # Wait for agent to complete (will run for hours)
    agent_process.wait()

    print(f"🏁 Agent completed with exit code: {agent_process.returncode}")


@app.entrypoint
async def handler(payload: Dict[str, Any], context: Any) -> Iterator[Dict[str, Any]]:
    """
    AgentCore entrypoint using async generator pattern.

    Supports two modes:
    1. GitHub mode (build-from-issue): Triggered by GitHub Actions when admin approves
    2. Legacy mode: Uses PROJECT_NAME environment variable

    Yields status updates to keep session alive while agent runs for hours.
    """
    global session_start_time, agent_process, announced_commits, uploaded_screenshots, session_pushed_commits

    print("\n" + "="*80)
    print("🚀 Bedrock AgentCore Handler Invoked")
    print("="*80)
    print(f"Payload: {payload}")
    print(f"Session ID: {context.session_id}")
    print("="*80 + "\n")

    # Propagate session ID to OpenTelemetry for trace correlation
    if OTEL_AVAILABLE and context.session_id:
        try:
            ctx = baggage.set_baggage("session.id", context.session_id)
            attach(ctx)
            print(f"✅ Session ID propagated to OpenTelemetry: {context.session_id}")
        except Exception as e:
            print(f"⚠️ Failed to propagate session ID to OpenTelemetry: {e}")

    # Initialize session start time
    if session_start_time is None:
        session_start_time = time.time()

    session_duration = float(os.environ.get("SESSION_DURATION_HOURS", "7.0")) * 3600

    # Check for GitHub mode (build-from-issue)
    mode = payload.get('mode')
    issue_number = payload.get('issue_number')
    github_repo = payload.get('github_repo', os.environ.get('GITHUB_REPO'))
    resume_session = payload.get('resume_session', False)

    # Set ISSUE_NUMBER in environment for subprocess to access (for CloudWatch log filtering)
    if issue_number:
        os.environ['ISSUE_NUMBER'] = str(issue_number)

    # Variables for GitHub mode
    build_dir = None
    is_enhancement = False
    feature_request_path = None
    github_token = None
    git_manager = None  # GitManager instance for commit tracking
    target_branch = None  # Branch to push to (set based on mode)
    restart_count = 0  # Track restart count for resumed sessions

    # Handle resume mode - read state from previous session
    if resume_session:
        print(f"\n{'='*80}")
        print(f"🔄 RESUME MODE: Continuing from previous session")
        print(f"{'='*80}\n")

        # Read saved state from workspace (cloned from git)
        saved_state = read_agent_state(AGENT_RUNTIME_DIR)
        if saved_state:
            restart_count = saved_state.get('restart_count', 0)
            previous_issue = saved_state.get('current_issue')
            previous_status = saved_state.get('status')
            last_commit = saved_state.get('last_commit')

            print(f"📋 Previous state:")
            print(f"   Issue: #{previous_issue}")
            print(f"   Status: {previous_status}")
            print(f"   Restart count: {restart_count}")
            print(f"   Last commit: {last_commit[:12] if last_commit else 'N/A'}...")

            # Use the issue from saved state if not provided in payload
            if not issue_number and previous_issue:
                issue_number = previous_issue
                os.environ['ISSUE_NUMBER'] = str(issue_number)
                print(f"   Using issue #{issue_number} from saved state")

            yield {
                "event": "session_resumed",
                "restart_count": restart_count,
                "previous_issue": previous_issue,
                "last_commit": last_commit,
                "message": f"Resuming session (restart #{restart_count})"
            }
        else:
            print("⚠️ Resume requested but no saved state found - starting fresh")

    if mode == "build-from-issue" and issue_number and github_repo:
        # Use agent-runtime branch for build-from-issue mode
        target_branch = AGENT_BRANCH
        # GitHub mode: Build feature from issue using persistent agent-runtime branch
        print(f"📋 GitHub Mode: Building issue #{issue_number} from {github_repo}")
        print(f"🔧 Using persistent agent-runtime branch (not issue-* branches)")

        github_token = get_github_token(github_repo)
        if not github_token:
            yield {"event": "error", "message": "GitHub token not found in Secrets Manager"}
            return

        issue_title = payload.get('issue_title', f'Issue #{issue_number}')
        issue_body = payload.get('issue_body', '')

        try:
            # Set up the agent-runtime workspace
            # This must happen BEFORE backlog sync so the directory exists
            build_dir, git_manager = setup_agent_runtime(
                github_repo=github_repo,
                github_token=github_token,
                issue_number=issue_number
            )

            # Store current issue and session ID in SSM for health monitor to read
            # (GitHub Actions can't access the container, so we use SSM)
            store_session_state_ssm(issue_number, session_id=context.session_id)

            # On resume: Query GitHub for already-announced commits/screenshots
            # This prevents duplicate announcements after session restart
            if resume_session and issue_number:
                print(f"🔍 Querying GitHub for previously announced commits/screenshots...")
                previously_announced = get_announced_commits_from_github(
                    github_repo=github_repo,
                    issue_number=issue_number,
                    github_token=github_token
                )
                announced_commits.update(previously_announced)

                previously_uploaded = get_uploaded_screenshots_from_github(
                    github_repo=github_repo,
                    issue_number=issue_number,
                    github_token=github_token
                )
                uploaded_screenshots.update(previously_uploaded)

                print(f"   ✅ Restored {len(previously_announced)} announced commits")
                print(f"   ✅ Restored {len(previously_uploaded)} uploaded screenshots")

                yield {
                    "event": "dedup_state_restored",
                    "announced_commits": len(previously_announced),
                    "uploaded_screenshots": len(previously_uploaded),
                    "message": "Restored deduplication state from GitHub"
                }

            # Sync GitHub issues to backlog file (after directory exists)
            try:
                new_backlog_items = sync_github_issues_to_backlog(
                    github_repo=github_repo,
                    github_token=github_token,
                    backlog_path=BACKLOG_FILE_PATH
                )
                if new_backlog_items:
                    yield {
                        "event": "backlog_synced",
                        "new_issues": len(new_backlog_items),
                        "message": f"Synced {len(new_backlog_items)} issue(s) to backlog at startup"
                    }
            except Exception as e:
                print(f"⚠️ Failed to sync backlog at startup: {e}")

            # Check if this is an enhancement (generated-app already exists)
            is_enhancement = (build_dir / "generated-app" / "package.json").exists()

            # Write FEATURE_REQUEST.md for the agent
            feature_request = f"""# Feature Request: Issue #{issue_number}

## Title
{issue_title}

## Description
{issue_body}

## Branch
All work should be committed to the `{AGENT_BRANCH}` branch.
Commits should reference this issue: `Ref: #{issue_number}`

## Mode
{"Enhancement" if is_enhancement else "Full Build"} - {"Modify existing app in generated-app/" if is_enhancement else "Create new app in generated-app/"}
"""
            feature_request_path = build_dir / "FEATURE_REQUEST.md"
            feature_request_path.write_text(feature_request)

            # Write agent state (include restart_count if resuming)
            write_agent_state(
                workspace_dir=build_dir,
                session_id=context.session_id,
                current_issue=issue_number,
                status="running",
                restart_count=restart_count
            )

            # Update backlog status to "in progress"
            update_backlog_item_status(BACKLOG_FILE_PATH, issue_number, "in progress")

            yield {
                "event": "setup_complete",
                "issue_number": issue_number,
                "mode": "enhancement" if is_enhancement else "full_build",
                "build_dir": str(build_dir),
                "branch": AGENT_BRANCH
            }

            # Post session info to GitHub issue for tracking
            agent_runtime_arn = os.environ.get(
                "AGENT_RUNTIME_ARN",
                "arn:aws:bedrock-agentcore:us-west-2:128673662201:runtime/antodo_agent-0UyfaL5NVq"
            )

            # If resuming, post a resume notification instead of new session info
            if resume_session and restart_count > 0:
                try:
                    from github import Github
                    gh = Github(github_token)
                    repo = gh.get_repo(github_repo)
                    issue = repo.get_issue(issue_number)
                    issue.create_comment(f"""🔄 **Session Resumed** (Restart #{restart_count})

The previous session timed out after 7 hours. A new session has been started to continue the work.

| **New Session ID** | `{context.session_id}` |
|-------------------|------------------------|
| **Restart Count** | {restart_count} |
| **Branch** | `{AGENT_BRANCH}` |

Progress will continue from where the previous session left off.""")
                    print(f"📝 Posted resume notification to issue #{issue_number}")
                except Exception as e:
                    print(f"⚠️ Failed to post resume notification: {e}")
            else:
                post_session_info_to_issue(
                    session_id=context.session_id,
                    agent_runtime_arn=agent_runtime_arn,
                    github_repo=github_repo,
                    issue_number=issue_number,
                    github_token=github_token,
                    branch=AGENT_BRANCH  # Add branch info to the comment
                )

        except Exception as e:
            print(f"❌ Failed to set up agent runtime: {e}")
            yield {"event": "error", "message": f"Setup failed: {str(e)}"}
            return

        project = AGENT_BRANCH  # Use agent-runtime as project name
        github_mode = True

    elif issue_number and github_repo and GITHUB_INTEGRATION_AVAILABLE:
        # Legacy GitHub mode using GitHubIssueManager
        print(f"📋 Legacy GitHub Mode: Building issue #{issue_number}")
        target_branch = f"issue-{issue_number}"  # Legacy mode uses issue-N branches

        github_token = get_github_token(github_repo)
        if not github_token:
            yield {"event": "error", "message": "GitHub token not found in Secrets Manager"}
            return

        github_mgr = GitHubIssueManager(github_repo, github_token)
        issue = github_mgr.get_issue(issue_number)
        print(f"📝 Issue: {issue.title}")

        github_mgr.mark_issue_building(issue_number, context.session_id)

        feature_prompt = github_mgr.generate_feature_prompt(issue, "/app/src")
        prompts_dir = Path(f"/app/prompts/issue_{issue_number}")
        prompts_dir.mkdir(parents=True, exist_ok=True)
        (prompts_dir / "FEATURE_REQUEST.md").write_text(feature_prompt)

        project = f"issue_{issue_number}"
        github_mode = True

    else:
        # Legacy mode: Build from PROJECT_NAME
        project = os.environ.get("PROJECT_NAME", "canopy")
        print(f"📋 Legacy Mode: Building project {project}")
        github_mode = False

    # Register async background task with AgentCore
    task_id = app.add_async_task(f"building_{project}")
    print(f"📋 Registered async task: {task_id}")

    # Start agent in background thread
    if agent_process is None or agent_process.poll() is not None:
        thread = threading.Thread(
            target=run_agent_background,
            args=(build_dir, is_enhancement, feature_request_path),
            daemon=True
        )
        thread.start()
        print("🧵 Background thread started")

        # Give agent time to start
        await asyncio.sleep(5)

    # Stream status updates to keep session alive
    # Yield every 30 seconds with progress updates
    check_interval = 30
    max_duration = session_duration  # 7 hours in seconds

    # Configurable fallback push interval via PUSH_INTERVAL_SECONDS env var
    # Default is 30 minutes (1800s) since post-commit hook handles immediate pushes
    # Set to 0 to disable periodic pushing entirely (only push at end)
    # This serves as a fallback in case the post-commit hook fails
    push_interval = int(os.environ.get("PUSH_INTERVAL_SECONDS", "1800"))
    last_push_time = time.time()

    # Token refresh interval (10 minutes) to keep the post-commit hook working
    token_refresh_interval = 600  # 10 minutes
    last_token_refresh_time = time.time()

    # Commit queue check interval - how often to check for commits pushed by the hook
    # and announce them to the GitHub issue
    commit_queue_check_interval = 30  # Check every 30 seconds
    last_commit_queue_check_time = time.time()

    # Batched notification interval - how often to post commit summaries to GitHub issue
    # Default is 5 minutes (300s). Set to 0 to disable batched notifications.
    notification_interval = int(os.environ.get("COMMIT_NOTIFICATION_INTERVAL_SECONDS", "300"))
    last_notification_time = time.time()

    # Screenshot sync configuration
    # Set SCREENSHOT_INTERVAL_SECONDS to 0 to disable screenshot sync
    screenshot_interval = int(os.environ.get("SCREENSHOT_INTERVAL_SECONDS", "300"))
    screenshot_bucket = os.environ.get("SCREENSHOT_BUCKET", "claude-code-reinvent-screenshots")
    cloudfront_domain = os.environ.get("SCREENSHOT_CDN_DOMAIN", "")
    last_screenshot_time = time.time()

    # Backlog sync configuration
    # Set BACKLOG_SYNC_INTERVAL_SECONDS to 0 to disable periodic syncing
    # Default is 5 minutes (300s) - syncs GitHub issues to human_backlog.json
    backlog_sync_interval = int(os.environ.get("BACKLOG_SYNC_INTERVAL_SECONDS", "300"))
    last_backlog_sync_time = time.time()

    # Health check logging - periodic status report
    health_check_interval = 3600  # Log health status every hour
    last_health_check_time = time.time()
    total_commits_notified = 0
    total_screenshots_uploaded = 0

    # CloudWatch heartbeat interval - publish SessionHeartbeat metric for GHA health monitor
    # GHA checks this metric to detect dead sessions and trigger restarts
    heartbeat_interval = int(os.environ.get("HEARTBEAT_INTERVAL_SECONDS", "60"))  # Every 60 seconds
    last_heartbeat_time = time.time()

    # Log push configuration at startup for debugging
    print(f"\n{'='*80}")
    print(f"📤 Git Push Configuration")
    print(f"{'='*80}")
    print(f"  Mode: Post-commit hook (event-driven) + fallback polling")
    print(f"  Hook: Pushes immediately after each commit")
    print(f"  Token refresh: Every {token_refresh_interval}s")
    print(f"  Commit queue check: Every {commit_queue_check_interval}s")
    print(f"  Fallback push interval: {push_interval}s ({push_interval // 60} min)")
    print(f"  Batched notification interval: {notification_interval}s ({notification_interval // 60} min)")
    if push_interval == 0:
        print(f"  ⚠️  Fallback push disabled (only push at end)")
    if notification_interval == 0:
        print(f"  ⚠️  Batched notifications disabled (only final summary)")
    if git_manager:
        print(f"  ✅ Using GitManager for commit tracking")
    else:
        print(f"  ⚠️  Using legacy commit tracking (globals)")
    print(f"{'='*80}\n")

    # Log screenshot configuration at startup for debugging
    print(f"\n{'='*80}")
    print(f"📸 Screenshot Upload Configuration")
    print(f"{'='*80}")
    print(f"  Interval: {screenshot_interval}s")
    print(f"  Bucket: {screenshot_bucket}")
    print(f"  CDN Domain: {cloudfront_domain if cloudfront_domain else '❌ NOT SET'}")

    if screenshot_interval > 0 and not cloudfront_domain:
        print(f"\n⚠️  WARNING: Screenshot upload is DISABLED")
        print(f"  Reason: SCREENSHOT_CDN_DOMAIN environment variable is not set")
        print(f"  Impact: Screenshots will be generated but NOT uploaded to S3 or GitHub")
        print(f"  Fix: Run 'make update-runtime-env' to configure the runtime")
    elif screenshot_interval <= 0:
        print(f"\nℹ️  Screenshot upload disabled (SCREENSHOT_INTERVAL_SECONDS={screenshot_interval})")
    else:
        print(f"\n✅ Screenshot upload enabled")

    print(f"{'='*80}\n")

    # Initialize CloudWatch metrics publisher
    metrics_publisher = None
    if METRICS_AVAILABLE and MetricsPublisher:
        metrics_publisher = MetricsPublisher(
            issue_number=issue_number,
            session_id=context.session_id,
        )
        # Publish session start metric
        mode = "enhancement" if is_enhancement else "full_build"
        metrics_publisher.publish_session_started(mode=mode)
        print(f"📊 CloudWatch metrics enabled (namespace: ClaudeCodeAgent)")

    # Track cumulative commits for metrics
    total_commits_pushed = 0

    elapsed = 0
    task_completed = False  # Track if async task has been completed
    wip_commit_created = False  # Track if WIP commit was made before timeout
    try:
      while elapsed < max_duration:
        current_elapsed = time.time() - session_start_time
        remaining = max_duration - current_elapsed

        # Check if agent has signaled completion by entering pause state
        # This is the primary way the agent signals it's done with an issue
        try:
            agent_desired_state = _read_agent_desired_state()
        except Exception as e:
            print(f"⚠️ Error reading agent state: {e}")
            agent_desired_state = None
        if agent_desired_state == "pause" and agent_process and agent_process.poll() is None:
            # Agent is paused but process still running - handle issue transition
            print(f"\n{'='*80}")
            print(f"⏸️  Agent signaled completion (entered pause state)")
            print(f"{'='*80}\n")

            # Push any pending commits
            if github_mode and build_dir and github_token:
                if git_manager:
                    success, count, shas = git_manager.push_pending_commits()
                    # Track these commits so they appear in get_session_commits()
                    if success and shas:
                        git_manager.track_commits(shas)
                else:
                    success, count, shas = push_pending_commits(
                        build_dir=build_dir,
                        github_repo=github_repo,
                        github_token=github_token,
                        branch_name=target_branch
                    )
                    # Track in legacy set
                    if success and shas:
                        session_pushed_commits.extend(shas)
                if success and count > 0:
                    print(f"📤 Pushed {count} pending commit(s)")

            # Release the current issue (mark complete)
            if github_mode and github_token and issue_number:
                # Post commits to the issue before marking complete
                all_session_commits = git_manager.get_session_commits() if git_manager else session_pushed_commits
                if all_session_commits:
                    post_commits_to_issue(
                        shas=all_session_commits,
                        branch_name=target_branch,
                        github_repo=github_repo,
                        issue_number=issue_number,
                        github_token=github_token,
                        build_dir=build_dir,
                        is_final_summary=True
                    )

                release_github_issue(github_repo, github_token, issue_number, mark_complete=True)
                update_backlog_item_status(BACKLOG_FILE_PATH, issue_number, "done", completed=True)

                yield {
                    "event": "issue_completed",
                    "status": "Agent completed issue",
                    "issue_number": issue_number,
                    "elapsed_hours": current_elapsed / 3600,
                }

            # Check for next issue
            if github_mode and github_token:
                print(f"\n🔄 Checking backlog for more approved issues...")

                next_issue = None
                backlog_item = get_next_backlog_item(BACKLOG_FILE_PATH)
                if backlog_item and backlog_item.get("github_issue"):
                    next_issue = {
                        "number": backlog_item["github_issue"],
                        "title": backlog_item.get("description", f"Issue #{backlog_item['github_issue']}"),
                        "body": backlog_item.get("details", "")
                    }
                    print(f"📋 Found next issue from backlog: #{next_issue['number']}")

                if next_issue:
                    # Claim the new issue
                    if claim_github_issue(github_repo, github_token, next_issue["number"]):
                        # Update variables for new issue
                        issue_number = next_issue["number"]
                        issue_title = next_issue["title"]
                        issue_body = next_issue["body"]
                        os.environ['ISSUE_NUMBER'] = str(issue_number)

                        print(f"📋 Starting next issue #{issue_number}: {issue_title}")

                        yield {
                            "event": "next_issue_found",
                            "issue_number": issue_number,
                            "issue_title": issue_title,
                        }

                        # Write new FEATURE_REQUEST.md
                        is_enhancement = (build_dir / "generated-app" / "package.json").exists()
                        feature_request = f"""# Feature Request: Issue #{issue_number}

## Title
{issue_title}

## Description
{issue_body}

## Branch
All work should be committed to the `{AGENT_BRANCH}` branch.
Commits should reference this issue: `Ref: #{issue_number}`

## Mode
{"Enhancement" if is_enhancement else "Full Build"} - {"Modify existing app in generated-app/" if is_enhancement else "Create new app in generated-app/"}
"""
                        feature_request_path = build_dir / "FEATURE_REQUEST.md"
                        feature_request_path.write_text(feature_request)

                        # Update backlog status
                        update_backlog_item_status(BACKLOG_FILE_PATH, issue_number, "in progress")

                        # Store new issue/session in SSM for health monitor
                        store_session_state_ssm(issue_number, session_id=context.session_id)

                        # Post session info to the new issue
                        agent_runtime_arn = os.environ.get(
                            "AGENT_RUNTIME_ARN",
                            "arn:aws:bedrock-agentcore:us-west-2:128673662201:runtime/antodo_agent-0UyfaL5NVq"
                        )
                        post_session_info_to_issue(
                            github_repo=github_repo,
                            issue_number=issue_number,
                            session_id=context.session_id,
                            agent_runtime_arn=agent_runtime_arn,
                            github_token=github_token,
                            branch=AGENT_BRANCH
                        )

                        # Reset commit tracking for new issue
                        if git_manager:
                            git_manager.reset_session()
                        else:
                            announced_commits.clear()
                            session_pushed_commits.clear()
                            legacy_pending_notification.clear()

                        # Resume the agent by setting state back to continuous
                        _set_agent_desired_state("continuous", f"Starting work on issue #{issue_number}")

                        # Continue the loop - agent will pick up new state and resume
                        continue
                    else:
                        print(f"⚠️ Failed to claim issue #{next_issue['number']}")
                else:
                    print(f"📭 No more approved issues in queue")
                    # No more issues - let the agent stay paused, we're done
                    yield {
                        "event": "session_idle",
                        "status": "All issues completed",
                        "elapsed_hours": current_elapsed / 3600
                    }
                    break

        # Check if agent process has exited (fallback - shouldn't normally happen)
        if agent_process and agent_process.poll() is not None:
            # Agent finished
            app.complete_async_task(task_id)
            task_completed = True

            # If GitHub mode, push any remaining commits to GitHub
            if github_mode and agent_process.returncode == 0 and build_dir and github_token:
                # Final push to ensure any remaining commits are pushed
                if git_manager:
                    success, count, shas = git_manager.push_pending_commits()
                else:
                    success, count, shas = push_pending_commits(
                        build_dir=build_dir,
                        github_repo=github_repo,
                        github_token=github_token,
                        branch_name=target_branch
                    )

                if success:
                    # Track any new commits from final push
                    if count > 0:
                        if git_manager:
                            new_shas = git_manager.track_commits(shas)
                        else:
                            new_shas = [sha for sha in shas if sha not in announced_commits]
                            if new_shas:
                                announced_commits.update(new_shas)
                                session_pushed_commits.extend(new_shas)
                        if new_shas:
                            print(f"📤 Final push: {len(new_shas)} commit(s) pushed")

                    # Get all session commits for final summary
                    all_session_commits = git_manager.get_session_commits() if git_manager else session_pushed_commits

                    # Post ONE summary comment with ALL commits from this session
                    if all_session_commits:
                        post_commits_to_issue(
                            shas=all_session_commits,
                            branch_name=target_branch,
                            github_repo=github_repo,
                            issue_number=issue_number,
                            github_token=github_token,
                            build_dir=build_dir,
                            is_final_summary=True
                        )

                    yield {
                        "event": "final_push",
                        "branch": target_branch,
                        "commits_pushed": len(all_session_commits),
                        "shas": all_session_commits,
                        "message": f"Final push complete ({len(all_session_commits)} total commits)" if all_session_commits else "No commits to push"
                    }
                else:
                    yield {
                        "event": "push_failed",
                        "branch": target_branch,
                        "message": "Failed to push final commits to GitHub - see logs for details"
                    }

            elif github_mode and agent_process.returncode == 0:
                # Legacy GitHub mode - push from current directory
                print(f"\n{'='*80}")
                print(f"📤 Pushing commits to GitHub ({target_branch})")
                print(f"{'='*80}\n")

                try:
                    os.system("git config user.name 'Claude Code Agent'")
                    os.system("git config user.email 'agent@anthropic.com'")

                    gh_token = get_github_token(github_repo)
                    os.system(f"git remote add origin https://x-access-token:{gh_token}@github.com/{github_repo}.git || true")
                    push_result = os.system(f"git push -u origin {target_branch}")

                    if push_result == 0:
                        yield {
                            "event": "pushed",
                            "branch": target_branch,
                            "message": "Code pushed to GitHub"
                        }
                except Exception as e:
                    print(f"❌ Error pushing to GitHub: {e}")

            # Publish session completed metric
            if metrics_publisher:
                metrics_publisher.publish_session_completed(
                    exit_code=agent_process.returncode,
                    duration_seconds=current_elapsed,
                )

            yield {
                "event": "issue_completed",
                "status": "Agent completed issue",
                "issue_number": issue_number,
                "exit_code": agent_process.returncode,
                "elapsed_hours": current_elapsed / 3600,
                "github_mode": github_mode
            }

            # Release the current issue (remove agent-building, add agent-complete)
            if github_mode and github_token and issue_number:
                release_github_issue(github_repo, github_token, issue_number, mark_complete=True)
                # Update backlog status to complete
                update_backlog_item_status(BACKLOG_FILE_PATH, issue_number, "done", completed=True)

            # Poll for next issue from backlog (single source of truth)
            # Note: human_backlog.json is populated by sync_github_issues_to_backlog() at startup and periodically
            if github_mode and github_token:
                print(f"\n{'='*80}")
                print(f"🔄 Checking backlog for more approved issues...")
                print(f"{'='*80}\n")

                # Use backlog as the single source of truth for next issue
                # GitHub issues are synced TO backlog, we read FROM backlog only
                next_issue = None
                backlog_item = get_next_backlog_item(BACKLOG_FILE_PATH)
                if backlog_item and backlog_item.get("github_issue"):
                    next_issue = {
                        "number": backlog_item["github_issue"],
                        "title": backlog_item.get("description", f"Issue #{backlog_item['github_issue']}"),
                        "body": backlog_item.get("details", "")
                    }
                    print(f"📋 Found issue from backlog: #{next_issue['number']}")

                if next_issue:
                    # Claim the new issue
                    if claim_github_issue(github_repo, github_token, next_issue["number"]):
                        # Update variables for new issue
                        issue_number = next_issue["number"]
                        issue_title = next_issue["title"]
                        issue_body = next_issue["body"]
                        os.environ['ISSUE_NUMBER'] = str(issue_number)

                        print(f"📋 Starting next issue #{issue_number}: {issue_title}")

                        yield {
                            "event": "next_issue_found",
                            "issue_number": issue_number,
                            "issue_title": issue_title,
                            "message": f"Starting work on issue #{issue_number}"
                        }

                        # Write new FEATURE_REQUEST.md
                        is_enhancement = (build_dir / "generated-app" / "package.json").exists()
                        feature_request = f"""# Feature Request: Issue #{issue_number}

## Title
{issue_title}

## Description
{issue_body}

## Branch
All work should be committed to the `{AGENT_BRANCH}` branch.
Commits should reference this issue: `Ref: #{issue_number}`

## Mode
{"Enhancement" if is_enhancement else "Full Build"} - {"Modify existing app in generated-app/" if is_enhancement else "Create new app in generated-app/"}
"""
                        feature_request_path = build_dir / "FEATURE_REQUEST.md"
                        feature_request_path.write_text(feature_request)

                        # Update agent state
                        write_agent_state(
                            workspace_dir=build_dir,
                            session_id=context.session_id,
                            current_issue=issue_number,
                            status="running"
                        )

                        # Update backlog status to "in progress"
                        update_backlog_item_status(BACKLOG_FILE_PATH, issue_number, "in progress")

                        # Store new issue/session in SSM for health monitor
                        store_session_state_ssm(issue_number, session_id=context.session_id)

                        # Post session info to the new issue
                        agent_runtime_arn = os.environ.get(
                            "AGENT_RUNTIME_ARN",
                            "arn:aws:bedrock-agentcore:us-west-2:128673662201:runtime/antodo_agent-0UyfaL5NVq"
                        )
                        post_session_info_to_issue(
                            github_repo=github_repo,
                            issue_number=issue_number,
                            session_id=context.session_id,
                            agent_runtime_arn=agent_runtime_arn,
                            github_token=github_token,
                            branch=AGENT_BRANCH
                        )

                        # Agent process exited unexpectedly - can't re-launch
                        # Normal flow should use pause state detection, not process exit
                        print(f"⚠️ Agent process exited, but pause state detection should be used for issue transitions")
                        print(f"📋 Issue #{issue_number} claimed but agent not re-launched")
                        print(f"🔄 Exiting main loop - agent process is no longer running")
                        break
                    else:
                        print(f"⚠️ Failed to claim issue #{next_issue['number']}, will retry later")
                else:
                    print(f"📭 No more approved issues in queue")

            # No more issues or not in GitHub mode - exit
            yield {
                "event": "session_idle",
                "status": "No more issues to process",
                "elapsed_hours": current_elapsed / 3600
            }
            break

        # Yield status update
        yield {
            "event": "progress",
            "status": "running",
            "elapsed_hours": round(current_elapsed / 3600, 2),
            "remaining_hours": round(remaining / 3600, 2),
            "message": f"Agent building {project}..."
        }

        # Log structured metrics for CloudWatch dashboard
        progress_log = {
            "type": "PROGRESS_METRIC",
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "session_id": context.session_id,
            "issue_number": issue_number,
            "elapsed_hours": round(current_elapsed / 3600, 2),
            "remaining_hours": round(remaining / 3600, 2),
        }
        print(json.dumps(progress_log))

        # Periodic health check - log reporting status every hour
        current_time = time.time()
        if current_time - last_health_check_time >= health_check_interval:
            pending_count = len(legacy_pending_notification) if not git_manager else 0
            health_log = {
                "type": "HEALTH_CHECK",
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "session_id": context.session_id,
                "issue_number": issue_number,
                "elapsed_hours": round(current_elapsed / 3600, 2),
                "total_commits_pushed": total_commits_pushed,
                "total_commits_notified": total_commits_notified,
                "total_screenshots_uploaded": total_screenshots_uploaded,
                "pending_notifications": pending_count,
                "git_manager_active": git_manager is not None,
                "screenshot_cdn_configured": bool(cloudfront_domain),
            }
            print(json.dumps(health_log))
            print(f"\n📊 HEALTH CHECK - Session running {round(current_elapsed / 3600, 1)}h")
            print(f"   Commits: {total_commits_pushed} pushed, {total_commits_notified} notified to issue")
            print(f"   Screenshots: {total_screenshots_uploaded} uploaded")
            print(f"   Pending notifications: {pending_count}")
            print(f"   GitManager: {'active' if git_manager else 'legacy mode'}")
            print(f"   Screenshot CDN: {'configured' if cloudfront_domain else 'NOT SET'}\n")
            last_health_check_time = current_time

        # Read and log token stats from agent subprocess
        token_stats = {}
        try:
            token_file = Path("/tmp/token_stats.json")
            if token_file.exists():
                token_stats = json.loads(token_file.read_text())
                token_log = {
                    "type": "TOKEN_METRIC",
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "session_id": context.session_id,
                    "issue_number": issue_number,
                    **token_stats
                }
                print(json.dumps(token_log))
        except Exception:
            pass  # Non-critical

        # Publish CloudWatch custom metrics
        if metrics_publisher:
            try:
                metrics_publisher.publish_progress(
                    elapsed_hours=current_elapsed / 3600,
                    remaining_hours=remaining / 3600,
                    cost_usd=token_stats.get("total_cost_usd", 0.0),
                    api_calls=token_stats.get("api_calls", 0),
                    input_tokens=token_stats.get("input_tokens", 0),
                    output_tokens=token_stats.get("output_tokens", 0),
                )
            except Exception as e:
                print(f"⚠️ CloudWatch publish_progress error: {e}")

        # Refresh GitHub token file for post-commit hook
        if github_mode and github_token:
            current_time = time.time()
            if current_time - last_token_refresh_time >= token_refresh_interval:
                # Get fresh token and write to file
                try:
                    fresh_token = get_github_token(github_repo)
                except Exception as e:
                    print(f"⚠️ get_github_token error: {e}")
                    fresh_token = None
                if fresh_token:
                    if git_manager:
                        # Update GitManager's config with fresh token
                        git_manager.github_config.token = fresh_token
                        git_manager.refresh_token_file()
                    else:
                        write_github_token_to_file(fresh_token)
                    github_token = fresh_token  # Update local reference
                    print(f"🔄 Refreshed GitHub token for post-commit hook")
                last_token_refresh_time = current_time

        # Scan for new git repositories and install hooks
        # The agent may create nested git repos (e.g., `git init` in subdirectory)
        # We need to install our post-commit hook in any new repos we find
        if github_mode and build_dir and github_token:
            current_time = time.time()
            if current_time - last_commit_queue_check_time >= commit_queue_check_interval:
                try:
                    if git_manager:
                        new_hooks = git_manager.scan_and_install_hooks()
                    else:
                        new_hooks = scan_and_install_hooks(build_dir, github_repo, target_branch)
                    if new_hooks > 0:
                        print(f"🔧 Installed post-commit hooks in {new_hooks} new git repo(s)")
                except Exception as e:
                    print(f"⚠️ scan_and_install_hooks error: {e}")

        # Process commit queue from post-commit hook
        # The hook writes SHAs to a file after successful pushes
        if github_mode and build_dir and github_token:
            current_time = time.time()
            if current_time - last_commit_queue_check_time >= commit_queue_check_interval:
                # Use GitManager if available, otherwise fall back to legacy
                if git_manager:
                    queued_shas = git_manager.read_commit_queue()
                else:
                    queued_shas = read_and_clear_commit_queue()

                if queued_shas:
                    # Track commits using GitManager or legacy globals
                    if git_manager:
                        new_shas = git_manager.track_commits(queued_shas)
                        # Queue for batched notification
                        if new_shas:
                            git_manager.queue_for_notification(new_shas)
                    else:
                        # Legacy: filter out duplicates using globals
                        new_shas = [sha for sha in queued_shas if sha not in announced_commits]
                        if new_shas:
                            announced_commits.update(new_shas)
                            session_pushed_commits.extend(new_shas)
                            legacy_pending_notification.extend(new_shas)  # Queue for notification

                    if new_shas:
                        # Track total commits for metrics
                        total_commits_pushed += len(new_shas)

                        # Publish CloudWatch metrics for commits
                        if metrics_publisher:
                            metrics_publisher.publish_commits_pushed(len(new_shas))

                        print(f"📤 Tracked {len(new_shas)} commit(s) via post-commit hook")

                        yield {
                            "event": "commits_pushed",
                            "count": len(new_shas),
                            "shas": new_shas,
                            "branch": target_branch,
                            "source": "post-commit-hook"
                        }

                last_commit_queue_check_time = current_time

        # Send batched notification to GitHub issue (every N minutes)
        if github_mode and github_token and notification_interval > 0:
            current_time = time.time()
            should_notify = False
            pending_shas = []

            if git_manager:
                should_notify = git_manager.should_send_notification(notification_interval)
                if should_notify:
                    pending_shas = git_manager.get_pending_notifications()
            else:
                # Legacy: check time since last notification and use legacy_pending_notification
                should_notify = (current_time - last_notification_time) >= notification_interval
                if should_notify and legacy_pending_notification:
                    pending_shas = legacy_pending_notification.copy()

            if should_notify and pending_shas:
                # Post batched notification to GitHub issue
                try:
                    success = post_commits_to_issue(
                        shas=pending_shas,
                        branch_name=target_branch,
                        github_repo=github_repo,
                        issue_number=issue_number,
                        github_token=github_token,
                        build_dir=build_dir,
                        is_final_summary=False
                    )
                    if success:
                        if git_manager:
                            git_manager.mark_notification_sent()
                        else:
                            # Legacy: clear the pending notification list
                            legacy_pending_notification.clear()
                        total_commits_notified += len(pending_shas)
                        last_notification_time = current_time
                        print(f"📝 Posted {len(pending_shas)} commit(s) to GitHub issue #{issue_number}")
                except Exception as e:
                    print(f"⚠️ post_commits_to_issue error: {e}")

        # Fallback: Periodically push any unpushed commits to GitHub
        # This catches commits that the post-commit hook might have missed
        # Default interval is 30 minutes (much longer than before since hook handles most pushes)
        if github_mode and build_dir and github_token and push_interval > 0:
            current_time = time.time()
            if current_time - last_push_time >= push_interval:
                # Use GitManager if available, otherwise fall back to legacy
                if git_manager:
                    success, count, shas = git_manager.push_pending_commits()
                else:
                    success, count, shas = push_pending_commits(
                        build_dir=build_dir,
                        github_repo=github_repo,
                        github_token=github_token,
                        branch_name=target_branch
                    )

                if success and count > 0:
                    # Track commits using GitManager or legacy globals
                    if git_manager:
                        new_shas = git_manager.track_commits(shas)
                        if new_shas:
                            git_manager.queue_for_notification(new_shas)
                    else:
                        # Legacy: filter out duplicates
                        new_shas = [sha for sha in shas if sha not in announced_commits]
                        if new_shas:
                            announced_commits.update(new_shas)
                            session_pushed_commits.extend(new_shas)
                            legacy_pending_notification.extend(new_shas)  # Queue for notification

                    if new_shas:
                        # Track total commits for metrics
                        total_commits_pushed += len(new_shas)

                        # Publish CloudWatch metrics for commits
                        if metrics_publisher:
                            metrics_publisher.publish_commits_pushed(len(new_shas))

                        print(f"📤 Fallback push: {len(new_shas)} commit(s) pushed")

                        yield {
                            "event": "commits_pushed",
                            "count": len(new_shas),
                            "shas": new_shas,
                            "branch": target_branch,
                            "source": "fallback"
                        }
                elif not success:
                    # Publish push failure metric
                    if metrics_publisher:
                        metrics_publisher.publish_push_failed()
                    yield {
                        "event": "push_failed",
                        "branch": target_branch,
                        "message": "Periodic push failed - see logs for details"
                    }
                last_push_time = current_time

        # Periodically sync screenshots to S3 and post to GitHub issue (if enabled)
        # Wrapped in try/except to never crash the agent
        if github_mode and build_dir and github_token and screenshot_interval > 0 and cloudfront_domain:
            current_time = time.time()
            if current_time - last_screenshot_time >= screenshot_interval:
                try:
                    # Upload new screenshots to S3
                    new_screenshots = upload_screenshots_to_s3(
                        build_dir=build_dir,
                        issue_number=issue_number,
                        session_id=context.session_id,
                        bucket_name=screenshot_bucket,
                        cloudfront_domain=cloudfront_domain
                    )

                    # Post to GitHub issue (non-blocking - failures logged but ignored)
                    if new_screenshots:
                        try:
                            post_screenshots_to_issue(
                                screenshots=new_screenshots,
                                github_repo=github_repo,
                                issue_number=issue_number,
                                github_token=github_token
                            )
                            total_screenshots_uploaded += len(new_screenshots)
                        except Exception as gh_err:
                            print(f"⚠️ Failed to post screenshots to GitHub (continuing): {gh_err}")

                        # Publish CloudWatch metrics for screenshots
                        if metrics_publisher:
                            metrics_publisher.publish_screenshots_uploaded(len(new_screenshots))

                        yield {
                            "event": "screenshots_uploaded",
                            "count": len(new_screenshots),
                            "issue_number": issue_number
                        }

                except Exception as e:
                    # Log error but never crash the agent
                    print(f"⚠️ Screenshot sync error (continuing): {e}")

                last_screenshot_time = current_time

        # Log why screenshot upload was skipped (if applicable)
        elif github_mode and build_dir and screenshot_interval > 0:
            # Only log once at startup, not every iteration
            if not hasattr(upload_screenshots_to_s3, '_skip_logged'):
                missing_reasons = []
                if not cloudfront_domain:
                    missing_reasons.append("SCREENSHOT_CDN_DOMAIN not configured")
                if not github_token:
                    missing_reasons.append("GitHub token not available")

                if missing_reasons:
                    print(f"⏭️  Skipping screenshot upload: {', '.join(missing_reasons)}")
                    print(f"   Fix: Run 'make update-runtime-env' to configure the runtime")

                upload_screenshots_to_s3._skip_logged = True

        # Periodically sync GitHub issues to backlog file
        if github_mode and github_token and backlog_sync_interval > 0:
            current_time = time.time()
            if current_time - last_backlog_sync_time >= backlog_sync_interval:
                try:
                    new_issues = sync_github_issues_to_backlog(
                        github_repo=github_repo,
                        github_token=github_token,
                        backlog_path=BACKLOG_FILE_PATH
                    )
                    if new_issues:
                        print(f"🔄 Periodic backlog sync: {len(new_issues)} new issue(s) added")
                        yield {
                            "event": "backlog_synced",
                            "new_issues": len(new_issues),
                            "message": f"Synced {len(new_issues)} new issue(s) to backlog"
                        }
                except Exception as e:
                    print(f"⚠️ Periodic backlog sync failed: {e}")
                last_backlog_sync_time = current_time

        # Publish CloudWatch heartbeat metric for GHA health monitor
        # This allows GHA to detect dead sessions and trigger restarts
        if metrics_publisher and heartbeat_interval > 0:
            current_time = time.time()
            time_since_last = current_time - last_heartbeat_time
            if time_since_last >= heartbeat_interval:
                try:
                    success = metrics_publisher.publish_session_heartbeat()
                    if success:
                        print(f"💓 Published heartbeat to CloudWatch (namespace=ClaudeCodeAgent, metric=SessionHeartbeat, issue={issue_number})")
                    else:
                        print(f"⚠️ Heartbeat publish returned False (metrics disabled or no client)")
                except Exception as e:
                    print(f"⚠️ Failed to publish heartbeat: {e}")
                last_heartbeat_time = current_time
            # Debug: log when we're waiting for next heartbeat
            elif time_since_last >= heartbeat_interval - 10:  # Within 10s of next heartbeat
                print(f"⏳ Heartbeat in {heartbeat_interval - time_since_last:.0f}s")

        # Check if approaching session limit
        if remaining < 300:  # 5 minutes
            print(f"⚠️ Approaching session limit: {remaining/60:.1f} minutes remaining")
            yield {
                "event": "warning",
                "status": "approaching_limit",
                "remaining_minutes": round(remaining / 60, 1),
                "message": "Session rotation needed soon"
            }

            # Create WIP commit when 2 minutes remaining (once only)
            if remaining < 120 and not wip_commit_created and github_mode and build_dir and github_token:
                print(f"📝 Creating WIP commit before session timeout...")
                wip_commit_created = create_wip_commit(
                    build_dir=build_dir,
                    issue_number=issue_number,
                    restart_count=restart_count,
                    session_id=context.session_id,
                    github_repo=github_repo,
                    github_token=github_token,
                    branch_name=target_branch
                )
                if wip_commit_created:
                    yield {
                        "event": "wip_commit",
                        "status": "created",
                        "issue_number": issue_number,
                        "message": "WIP commit created before session timeout"
                    }

        if current_elapsed >= max_duration:
            # Time limit reached - signal agent to pause and trigger restart
            print("⏰ SESSION TIME LIMIT REACHED")
            _signal_agent_pause()

            # Actually terminate the subprocess - don't just signal it
            if agent_process and agent_process.poll() is None:
                print("🛑 Terminating agent subprocess...")
                agent_process.terminate()
                try:
                    # Give it 10 seconds to clean up
                    agent_process.wait(timeout=10)
                    print(f"✅ Agent terminated gracefully (exit code: {agent_process.returncode})")
                except subprocess.TimeoutExpired:
                    print("⚠️ Agent didn't respond to SIGTERM, sending SIGKILL...")
                    agent_process.kill()
                    agent_process.wait(timeout=5)
                    print(f"💀 Agent killed (exit code: {agent_process.returncode})")

            # Read current state to get restart count
            current_state = read_agent_state(build_dir or AGENT_RUNTIME_DIR)
            current_restart_count = current_state.get('restart_count', 0) if current_state else 0

            # Write state for the new session to resume from
            if build_dir or AGENT_RUNTIME_DIR.exists():
                write_agent_state(
                    workspace_dir=build_dir or AGENT_RUNTIME_DIR,
                    session_id=context.session_id,
                    current_issue=issue_number,
                    status="needs_restart",
                    restart_count=current_restart_count + 1
                )
                print(f"📝 Wrote restart state (restart #{current_restart_count + 1})")

            # Remove agent-building label before triggering restart
            # This allows the poller to pick up the issue if direct restart fails
            if github_mode and github_token and issue_number and github_repo:
                try:
                    import requests
                    headers = {
                        "Authorization": f"token {github_token}",
                        "Accept": "application/vnd.github.v3+json"
                    }
                    url = f"https://api.github.com/repos/{github_repo}/issues/{issue_number}/labels/agent-building"
                    requests.delete(url, headers=headers, timeout=30)
                    print(f"🏷️ Removed agent-building label from issue #{issue_number}")
                except Exception as e:
                    print(f"⚠️ Failed to remove agent-building label: {e}")

            # Trigger restart workflow BEFORE dying
            restart_triggered = False
            if github_mode and github_token and issue_number and github_repo:
                restart_triggered = trigger_session_restart(
                    github_repo=github_repo,
                    github_token=github_token,
                    issue_number=issue_number
                )

            # Complete the async task
            app.complete_async_task(task_id)
            task_completed = True

            yield {
                "event": "rotation_needed",
                "status": "paused",
                "elapsed_hours": current_elapsed / 3600,
                "restart_triggered": restart_triggered,
                "restart_count": current_restart_count + 1,
                "message": "Session limit reached, restart triggered" if restart_triggered else "Session limit reached, agent paused for rotation"
            }
            break

        # Wait before next update
        await asyncio.sleep(check_interval)
        elapsed += check_interval
    finally:
        # Ensure async task is always marked complete, even on exceptions
        if not task_completed:
            try:
                app.complete_async_task(task_id)
                print("🔄 Async task completed in finally block")
            except Exception as e:
                print(f"⚠️ Failed to complete async task in finally: {e}")


def _find_agent_state_file() -> Optional[Path]:
    """Find the agent_state.json file in the workspace.

    The agent (claude_code.py) writes state to the --output-dir which is
    typically generated-app/. Check there first, then fallback to parent.
    """
    # Primary location: generated-app/ subdirectory (where claude_code.py writes)
    generated_app_state = AGENT_RUNTIME_DIR / "generated-app" / "agent_state.json"
    if generated_app_state.exists():
        return generated_app_state

    # Fallback: AGENT_RUNTIME_DIR itself (legacy location)
    state_file = AGENT_RUNTIME_DIR / "agent_state.json"
    if state_file.exists():
        return state_file

    return None


def _read_agent_desired_state() -> Optional[str]:
    """Read the agent's desired_state from agent_state.json.

    Returns:
        The desired_state ('pause', 'continuous', etc.) or None if not found.
    """
    state_file = _find_agent_state_file()
    if not state_file:
        return None

    try:
        state = json.loads(state_file.read_text())
        return state.get('desired_state')
    except Exception as e:
        print(f"⚠️ Failed to read agent state: {e}")
        return None


def _set_agent_desired_state(desired_state: str, note: str = "") -> bool:
    """Set the agent's desired_state in agent_state.json.

    Args:
        desired_state: The new desired state ('pause', 'continuous', etc.)
        note: Optional note explaining the state change

    Returns:
        True if successful, False otherwise.
    """
    state_file = _find_agent_state_file()
    if not state_file:
        print("⚠️ Could not find agent_state.json to update state")
        return False

    try:
        state = json.loads(state_file.read_text())
        state['desired_state'] = desired_state
        state['note'] = note or f"State set to {desired_state} by bedrock_entrypoint"
        state['timestamp'] = datetime.utcnow().isoformat() + 'Z'
        state['setBy'] = 'agentcore_wrapper'

        # Write atomically
        temp_file = state_file.with_suffix('.json.tmp')
        temp_file.write_text(json.dumps(state, indent=2))
        temp_file.replace(state_file)

        print(f"✅ Set agent desired_state to '{desired_state}'")
        return True
    except Exception as e:
        print(f"⚠️ Failed to update agent state: {e}")
        return False


def _signal_agent_pause():
    """Signal the agent to pause by writing to agent_state.json."""
    _set_agent_desired_state("pause", "Session time limit reached, rotating to fresh session")


if __name__ == "__main__":
    app.run()
