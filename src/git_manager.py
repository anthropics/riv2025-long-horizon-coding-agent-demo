"""Centralized git operations manager for Claude Code.

This module consolidates all git-related operations that were previously scattered
across bedrock_entrypoint.py and session_manager.py.

Key responsibilities:
- Git repository initialization (local mode)
- GitHub repository cloning and setup (GitHub mode)
- Post-commit hook management for automatic pushes
- Commit tracking and deduplication
- Batched notification support
- Token file management for hooks
"""

import builtins
import os
import shutil
import subprocess
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Literal, Optional


# Constants
GIT_USER_NAME = "Claude Code Agent"
GIT_USER_EMAIL = "agent@anthropic.com"
GITHUB_TOKEN_FILE = "/tmp/github_token"
COMMITS_QUEUE_FILE = "/tmp/commits_to_announce.txt"
DEFAULT_NOTIFICATION_INTERVAL = 300  # 5 minutes


@dataclass
class GitHubConfig:
    """Configuration for GitHub mode operations."""

    repo: str  # owner/repo format
    issue_number: int
    token: str
    branch: str = None  # Optional custom branch name (defaults to issue-N)

    @property
    def branch_name(self) -> str:
        # Use custom branch if provided, otherwise default to issue-N
        return self.branch if self.branch else f"issue-{self.issue_number}"

    @property
    def clone_url(self) -> str:
        return f"https://x-access-token:{self.token}@github.com/{self.repo}.git"


class GitManager:
    """Centralized git operations manager.

    Handles:
    - Git initialization (local and cloned repos)
    - User configuration
    - Post-commit hook management
    - Commit tracking and deduplication
    - Push operations
    - Batched notification support

    Mode-aware: Configured at creation for "local" or "github" mode.
    """

    def __init__(
        self,
        work_dir: Path,
        mode: Literal["local", "github"] = "local",
        github_config: Optional[GitHubConfig] = None,
    ):
        """Initialize GitManager.

        Args:
            work_dir: Working directory for git operations
            mode: "local" for standalone sessions, "github" for GitHub issue builds
            github_config: Required for github mode, contains repo/token info
        """
        self.work_dir = Path(work_dir)
        self.mode = mode
        self.github_config = github_config

        # Validate github mode has config
        if mode == "github" and github_config is None:
            raise ValueError("github_config is required for github mode")

        # Commit tracking (replaces module-level globals)
        self._announced_commits: set[str] = set()
        self._session_commits: list[str] = []
        self._hooked_git_dirs: set[str] = set()

        # Batched notification tracking
        self._pending_notification_commits: list[str] = []
        self._last_notification_time: float = time.time()

    # =========================================================================
    # Core Git Operations
    # =========================================================================

    def configure_git_user(self, repo_path: Optional[Path] = None) -> None:
        """Configure git user.name and user.email.

        Single source of truth for git user configuration.

        Args:
            repo_path: Path to git repo (defaults to work_dir)
        """
        path = repo_path or self.work_dir

        subprocess.run(
            ["git", "config", "user.name", GIT_USER_NAME],
            cwd=path,
            capture_output=True,
        )
        subprocess.run(
            ["git", "config", "user.email", GIT_USER_EMAIL],
            cwd=path,
            capture_output=True,
        )

    def is_inside_git_repo(self, path: Optional[Path] = None) -> bool:
        """Check if path is inside an existing git repository.

        Args:
            path: Path to check (defaults to work_dir)

        Returns:
            True if inside a git repo, False otherwise
        """
        check_path = path or self.work_dir

        result = subprocess.run(
            ["git", "rev-parse", "--is-inside-work-tree"],
            cwd=check_path,
            capture_output=True,
            text=True,
        )

        return result.returncode == 0 and result.stdout.strip() == "true"

    def initialize_repo(self) -> None:
        """Initialize git repository for local mode.

        If already inside a git repo (e.g., GitHub mode), skips git init
        to avoid creating a nested repo. Still does initial commit for
        template files.
        """
        if self.is_inside_git_repo():
            builtins.print("📁 Already inside a git repository - skipping git init")
            # Still add and commit template files to the existing repo
            subprocess.run(["git", "add", "."], cwd=self.work_dir)
            subprocess.run(
                ["git", "commit", "-m", "Add generated code template", "--allow-empty"],
                cwd=self.work_dir,
            )
        else:
            builtins.print("🔧 Initializing git repository")
            subprocess.run(["git", "init"], cwd=self.work_dir)
            subprocess.run(["git", "add", "."], cwd=self.work_dir)
            subprocess.run(
                ["git", "commit", "-m", "Initial template from frontend-scaffold-template"],
                cwd=self.work_dir,
            )

        # Configure git user
        self.configure_git_user()

        # Set correct npm registry
        builtins.print("📦 Setting the correct npm registry")
        subprocess.run(
            ["npm", "config", "set", "registry", "https://registry.npmjs.org"],
            cwd=self.work_dir,
        )

    def clone_repo(self, dest: Path) -> bool:
        """Clone GitHub repository to destination.

        Args:
            dest: Destination path for clone

        Returns:
            True if clone succeeded, False otherwise
        """
        if self.github_config is None:
            raise ValueError("clone_repo requires github_config")

        # Clean up any previous clone
        if dest.exists():
            shutil.rmtree(dest)
        dest.mkdir(parents=True, exist_ok=True)

        builtins.print(f"📥 Cloning {self.github_config.repo}...")

        result = subprocess.run(
            ["git", "clone", self.github_config.clone_url, str(dest)],
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            builtins.print(f"❌ Clone failed: {result.stderr}")
            return False

        builtins.print("✅ Repository cloned")
        return True

    def create_branch(self, branch_name: str) -> None:
        """Create and checkout a new branch.

        Args:
            branch_name: Name of the branch to create
        """
        subprocess.run(
            ["git", "checkout", "-b", branch_name],
            cwd=self.work_dir,
        )
        builtins.print(f"✅ Created branch: {branch_name}")

    # =========================================================================
    # GitHub Mode Setup
    # =========================================================================

    def setup_for_github_issue(self) -> Path:
        """Full setup for GitHub issue mode.

        Performs:
        1. Clone repository
        2. Configure git user
        3. Create feature branch
        4. Install post-commit hook

        Returns:
            Path to the cloned repository (work_dir)
        """
        if self.github_config is None:
            raise ValueError("setup_for_github_issue requires github_config")

        # Clone the repo
        if not self.clone_repo(self.work_dir):
            raise RuntimeError(f"Failed to clone repository: {self.github_config.repo}")

        # Configure git user
        self.configure_git_user()

        # Create feature branch
        self.create_branch(self.github_config.branch_name)

        # Write token file for hooks
        self.refresh_token_file()

        # Install post-commit hook
        self.install_post_commit_hook()

        # Track this git dir as hooked
        self._hooked_git_dirs.add(str(self.work_dir / ".git"))

        return self.work_dir

    # =========================================================================
    # Hook Management
    # =========================================================================

    def refresh_token_file(self) -> bool:
        """Write GitHub token to file for post-commit hook to read.

        Returns:
            True if successful, False otherwise
        """
        if self.github_config is None:
            return False

        try:
            with open(GITHUB_TOKEN_FILE, "w") as f:
                f.write(self.github_config.token)
            os.chmod(GITHUB_TOKEN_FILE, 0o600)  # Read/write for owner only
            return True
        except Exception as e:
            builtins.print(f"⚠️ Failed to write GitHub token file: {e}")
            return False

    def install_post_commit_hook(self, repo_path: Optional[Path] = None) -> bool:
        """Install post-commit hook for automatic pushing.

        The hook pushes immediately after each commit and writes the SHA
        to a queue file for the runtime to announce to GitHub issues.

        Args:
            repo_path: Path to git repo (defaults to work_dir)

        Returns:
            True if hook was installed successfully, False otherwise
        """
        if self.github_config is None:
            return False

        path = repo_path or self.work_dir
        hooks_dir = path / ".git" / "hooks"
        hook_path = hooks_dir / "post-commit"

        # Create hooks directory if needed
        hooks_dir.mkdir(parents=True, exist_ok=True)

        # Post-commit hook script
        hook_script = f'''#!/bin/bash
# Git post-commit hook - pushes immediately after each commit
# Installed by GitManager for event-driven push workflow

BRANCH_NAME="{self.github_config.branch_name}"
GITHUB_REPO="{self.github_config.repo}"
TOKEN_FILE="{GITHUB_TOKEN_FILE}"
COMMITS_QUEUE="{COMMITS_QUEUE_FILE}"

# Get the commit SHA that was just made
COMMIT_SHA=$(git rev-parse HEAD)
COMMIT_MSG=$(git log -1 --format=%s HEAD)

echo "[post-commit] New commit: ${{COMMIT_SHA:0:12}} - $COMMIT_MSG"

# Read token from file (refreshed by runtime)
if [ -f "$TOKEN_FILE" ]; then
    GITHUB_TOKEN=$(cat "$TOKEN_FILE")
else
    echo "[post-commit] Warning: No token file found at $TOKEN_FILE, skipping push"
    exit 0
fi

# Update remote URL with fresh token
git remote set-url origin "https://x-access-token:${{GITHUB_TOKEN}}@github.com/${{GITHUB_REPO}}.git" 2>/dev/null

# Push to origin
echo "[post-commit] Pushing to origin/$BRANCH_NAME..."
if git push -u origin "$BRANCH_NAME" 2>&1; then
    echo "[post-commit] ✅ Push successful"

    # Write commit SHA to queue file for runtime to announce to GitHub issue
    echo "$COMMIT_SHA" >> "$COMMITS_QUEUE"
else
    echo "[post-commit] ⚠️ Push failed (will be retried by fallback mechanism)"
fi

# Don't fail the commit if push fails
exit 0
'''

        try:
            hook_path.write_text(hook_script)
            os.chmod(hook_path, 0o755)
            builtins.print(f"✅ Post-commit hook installed at {hook_path}")
            return True
        except Exception as e:
            builtins.print(f"⚠️ Failed to set up post-commit hook: {e}")
            return False

    def scan_and_install_hooks(self) -> int:
        """Scan for nested git repos and install hooks in them.

        The agent may create nested git repositories (e.g., by running `git init`).
        This finds any .git directories we haven't processed yet and installs
        the post-commit hook in them.

        Returns:
            Number of new hooks installed
        """
        if self.github_config is None:
            return 0

        hooks_installed = 0

        try:
            for git_dir in self.work_dir.rglob(".git"):
                if not git_dir.is_dir():
                    continue

                git_dir_str = str(git_dir)

                # Skip if already processed
                if git_dir_str in self._hooked_git_dirs:
                    continue

                repo_root = git_dir.parent
                builtins.print(f"🔍 Found new git repository at {repo_root}")

                # Configure git user
                self.configure_git_user(repo_root)

                # Set up remote if not already configured
                remote_result = subprocess.run(
                    ["git", "remote", "get-url", "origin"],
                    cwd=repo_root,
                    capture_output=True,
                    text=True,
                )
                if remote_result.returncode != 0:
                    # No origin remote, add it
                    remote_url = f"https://x-access-token:{self.github_config.token}@github.com/{self.github_config.repo}.git"
                    subprocess.run(
                        ["git", "remote", "add", "origin", remote_url],
                        cwd=repo_root,
                        capture_output=True,
                    )
                    builtins.print(f"  Added origin remote for {repo_root}")

                # Install hook
                if self.install_post_commit_hook(repo_root):
                    hooks_installed += 1

                # Mark as processed
                self._hooked_git_dirs.add(git_dir_str)

        except Exception as e:
            builtins.print(f"⚠️ Error scanning for git repositories: {e}")

        return hooks_installed

    # =========================================================================
    # Commit Operations
    # =========================================================================

    def read_commit_queue(self) -> list[str]:
        """Read and clear commit queue file.

        The post-commit hook writes SHAs to this file after successful pushes.

        Returns:
            List of commit SHAs that were pushed
        """
        shas = []

        try:
            if os.path.exists(COMMITS_QUEUE_FILE):
                with open(COMMITS_QUEUE_FILE, "r") as f:
                    shas = [line.strip() for line in f if line.strip()]

                # Clear the file
                with open(COMMITS_QUEUE_FILE, "w") as f:
                    f.write("")

        except Exception as e:
            builtins.print(f"⚠️ Error reading commit queue: {e}")

        return shas

    def push_pending_commits(self) -> tuple[bool, int, list[str]]:
        """Push any pending commits to GitHub.

        This is a fallback mechanism in case the post-commit hook fails.

        Returns:
            Tuple of (success, commit_count, list_of_shas)
        """
        if self.github_config is None:
            return False, 0, []

        branch_name = self.github_config.branch_name

        try:
            # Log HEAD SHA for tracking
            head_result = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                cwd=self.work_dir,
                capture_output=True,
                text=True,
            )
            head_sha = head_result.stdout.strip() if head_result.returncode == 0 else "unknown"
            builtins.print(f"📊 Push check: HEAD is {head_sha[:12]}...")

            # Update origin URL with current token
            push_url = f"https://x-access-token:{self.github_config.token}@github.com/{self.github_config.repo}.git"
            subprocess.run(
                ["git", "remote", "set-url", "origin", push_url],
                cwd=self.work_dir,
                capture_output=True,
            )

            # Fetch to update local view of remote refs
            subprocess.run(
                ["git", "fetch", "origin"],
                cwd=self.work_dir,
                capture_output=True,
            )

            # Check for unpushed commits
            result = subprocess.run(
                ["git", "rev-list", f"origin/{branch_name}..HEAD", "--count"],
                cwd=self.work_dir,
                capture_output=True,
                text=True,
            )

            # Handle case where remote branch doesn't exist yet
            if result.returncode != 0:
                result = subprocess.run(
                    ["git", "rev-list", "origin/main..HEAD", "--count"],
                    cwd=self.work_dir,
                    capture_output=True,
                    text=True,
                )
                if result.returncode != 0 or not result.stdout.strip():
                    return True, 0, []
                commit_count = int(result.stdout.strip())
                if commit_count == 0:
                    return True, 0, []
                builtins.print(f"📤 Remote branch doesn't exist yet, will push {commit_count} new commit(s)")
            else:
                commit_count = int(result.stdout.strip())
                if commit_count == 0:
                    return True, 0, []

            # Get SHAs of commits being pushed
            sha_result = subprocess.run(
                ["git", "log", "--format=%H", "-n", str(commit_count)],
                cwd=self.work_dir,
                capture_output=True,
                text=True,
            )
            pushed_shas = sha_result.stdout.strip().split("\n") if sha_result.returncode == 0 else []

            # Push to origin
            result = subprocess.run(
                ["git", "push", "-u", "origin", branch_name],
                cwd=self.work_dir,
                capture_output=True,
                text=True,
            )

            if result.returncode == 0:
                builtins.print(f"✅ Push succeeded: {commit_count} commit(s) to {branch_name}")
                return True, commit_count, pushed_shas
            else:
                builtins.print(f"❌ Push FAILED to {branch_name}")
                builtins.print(f"   stderr: {result.stderr}")
                return False, 0, []

        except Exception as e:
            builtins.print(f"⚠️ Error pushing commits: {e}")
            return False, 0, []

    # =========================================================================
    # Commit Tracking
    # =========================================================================

    def track_commits(self, shas: list[str]) -> list[str]:
        """Track pushed commits and return truly new ones.

        Args:
            shas: List of commit SHAs to track

        Returns:
            List of SHAs that were not previously tracked
        """
        new_shas = [sha for sha in shas if sha not in self._announced_commits]

        # Add to tracking sets
        self._announced_commits.update(new_shas)
        self._session_commits.extend(new_shas)

        return new_shas

    def get_session_commits(self) -> list[str]:
        """Get all commits pushed during this session.

        Used for final summary at session end.

        Returns:
            List of all session commit SHAs
        """
        return self._session_commits.copy()

    def is_commit_announced(self, sha: str) -> bool:
        """Check if a commit has already been announced.

        Args:
            sha: Commit SHA to check

        Returns:
            True if already announced
        """
        return sha in self._announced_commits

    # =========================================================================
    # Batched Notification Support
    # =========================================================================

    def queue_for_notification(self, shas: list[str]) -> None:
        """Queue commits for batched notification.

        Args:
            shas: Commit SHAs to queue
        """
        self._pending_notification_commits.extend(shas)

    def get_pending_notifications(self) -> list[str]:
        """Get commits pending notification and clear the queue.

        Returns:
            List of commit SHAs pending notification
        """
        pending = self._pending_notification_commits.copy()
        self._pending_notification_commits.clear()
        return pending

    def should_send_notification(self, interval: int = DEFAULT_NOTIFICATION_INTERVAL) -> bool:
        """Check if enough time has passed to send a notification batch.

        Args:
            interval: Minimum seconds between notifications

        Returns:
            True if a notification should be sent
        """
        if not self._pending_notification_commits:
            return False

        return (time.time() - self._last_notification_time) >= interval

    def mark_notification_sent(self) -> None:
        """Mark that a notification batch was just sent."""
        self._last_notification_time = time.time()

    def has_pending_notifications(self) -> bool:
        """Check if there are commits pending notification.

        Returns:
            True if there are pending notifications
        """
        return len(self._pending_notification_commits) > 0

    def reset_session(self) -> None:
        """Reset all commit tracking for a new issue.

        Called when transitioning between issues to ensure commits
        from the previous issue don't affect tracking for the new one.
        """
        self._announced_commits.clear()
        self._session_commits.clear()
        self._pending_notification_commits.clear()
        self._hooked_git_dirs.clear()
        self._last_notification_time = time.time()
