"""Sequential merge manager for parallel agent sessions.

This module handles merging completed issue branches back to main in a
sequential, controlled manner. When multiple agents work in parallel,
their branches are queued and merged one at a time in completion order.

Key features:
- Sequential merge queue processing
- Conflict detection and notification
- Branch cleanup after successful merge
- Integration with GitHub labels for status tracking
"""

import builtins
import json
import subprocess
import time
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional, Callable


@dataclass
class MergeQueueEntry:
    """Entry in the merge queue."""

    issue_number: int
    branch_name: str
    completed_at: datetime = field(default_factory=datetime.now)
    merge_attempts: int = 0
    last_error: Optional[str] = None

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "issue_number": self.issue_number,
            "branch_name": self.branch_name,
            "completed_at": self.completed_at.isoformat(),
            "merge_attempts": self.merge_attempts,
            "last_error": self.last_error,
        }

    @classmethod
    def from_dict(cls, data: dict) -> "MergeQueueEntry":
        """Create from dictionary."""
        return cls(
            issue_number=data["issue_number"],
            branch_name=data["branch_name"],
            completed_at=datetime.fromisoformat(data["completed_at"]),
            merge_attempts=data.get("merge_attempts", 0),
            last_error=data.get("last_error"),
        )


@dataclass
class MergeResult:
    """Result of a merge operation."""

    success: bool
    issue_number: int
    branch_name: str
    commit_sha: Optional[str] = None
    error_message: Optional[str] = None
    conflict_files: list[str] = field(default_factory=list)


class MergeManager:
    """Handles sequential merging of completed issue branches.

    When agents complete their work in parallel, their branches are
    queued for merging. This manager processes the queue sequentially,
    attempting to merge each branch into main. If a conflict is detected,
    the queue pauses and maintainers are notified.

    Merge strategy:
    1. Fetch latest main
    2. Checkout main locally
    3. Attempt merge (no fast-forward to preserve history)
    4. If successful, push to origin
    5. If conflict, pause queue and notify
    """

    def __init__(
        self,
        base_repo: Path,
        github_token: str,
        queue_file: Optional[Path] = None,
        on_merge_success: Optional[Callable[[MergeResult], None]] = None,
        on_merge_conflict: Optional[Callable[[MergeResult], None]] = None,
    ):
        """Initialize MergeManager.

        Args:
            base_repo: Path to the base repository (not a worktree)
            github_token: GitHub access token for pushing
            queue_file: Path to persist the merge queue (optional)
            on_merge_success: Callback when merge succeeds
            on_merge_conflict: Callback when merge has conflict
        """
        self.base_repo = Path(base_repo)
        self.github_token = github_token
        self._queue_file = queue_file or (
            self.base_repo.parent / "session-state" / "merge_queue.json"
        )
        self.on_merge_success = on_merge_success
        self.on_merge_conflict = on_merge_conflict

        # Ensure queue file directory exists
        self._queue_file.parent.mkdir(parents=True, exist_ok=True)

        # In-memory queue (loaded from file)
        self._queue: list[MergeQueueEntry] = self._load_queue()

        # Track if queue is paused due to conflict
        self._paused = False
        self._pause_reason: Optional[str] = None

    # =========================================================================
    # Queue Management
    # =========================================================================

    def queue_for_merge(self, issue_number: int, branch_name: Optional[str] = None) -> None:
        """Add completed issue to merge queue.

        Args:
            issue_number: GitHub issue number
            branch_name: Branch name (defaults to issue-{N})
        """
        branch = branch_name or f"issue-{issue_number}"

        # Check if already in queue
        for entry in self._queue:
            if entry.issue_number == issue_number:
                builtins.print(
                    f"⚠️ Issue #{issue_number} already in merge queue"
                )
                return

        entry = MergeQueueEntry(
            issue_number=issue_number,
            branch_name=branch,
        )
        self._queue.append(entry)
        self._save_queue()

        builtins.print(
            f"📋 Issue #{issue_number} ({branch}) added to merge queue"
        )
        builtins.print(f"   Queue position: {len(self._queue)}")

    def get_queue_position(self, issue_number: int) -> int:
        """Get position of an issue in the merge queue.

        Args:
            issue_number: GitHub issue number

        Returns:
            Queue position (1-indexed), or 0 if not in queue
        """
        for i, entry in enumerate(self._queue):
            if entry.issue_number == issue_number:
                return i + 1
        return 0

    def get_queue_length(self) -> int:
        """Get number of items in merge queue."""
        return len(self._queue)

    def is_paused(self) -> bool:
        """Check if merge queue is paused."""
        return self._paused

    def get_pause_reason(self) -> Optional[str]:
        """Get reason for queue pause."""
        return self._pause_reason

    def resume_queue(self) -> bool:
        """Resume the merge queue after conflict resolution.

        Returns:
            True if queue was resumed, False if not paused
        """
        if not self._paused:
            return False

        self._paused = False
        self._pause_reason = None
        builtins.print("▶️ Merge queue resumed")
        return True

    # =========================================================================
    # Merge Operations
    # =========================================================================

    def process_queue(self, max_merges: int = 10) -> list[MergeResult]:
        """Process merge queue sequentially.

        Attempts to merge branches in queue order. Stops on first conflict.

        Args:
            max_merges: Maximum number of merges to process in one call

        Returns:
            List of MergeResults for processed items
        """
        if self._paused:
            builtins.print(
                f"⏸️ Merge queue is paused: {self._pause_reason}"
            )
            return []

        if not self._queue:
            builtins.print("📭 Merge queue is empty")
            return []

        results = []
        processed = 0

        while self._queue and processed < max_merges and not self._paused:
            entry = self._queue[0]
            builtins.print(
                f"\n🔀 Processing merge for issue #{entry.issue_number} ({entry.branch_name})..."
            )

            result = self._attempt_merge(entry)
            results.append(result)

            if result.success:
                # Remove from queue
                self._queue.pop(0)
                self._save_queue()

                builtins.print(
                    f"✅ Merged issue #{entry.issue_number} successfully"
                )

                # Cleanup remote branch
                self._delete_remote_branch(entry.branch_name)

                # Callback
                if self.on_merge_success:
                    self.on_merge_success(result)
            else:
                # Increment attempt count
                entry.merge_attempts += 1
                entry.last_error = result.error_message
                self._save_queue()

                # Pause queue on conflict
                self._paused = True
                self._pause_reason = (
                    f"Merge conflict on issue #{entry.issue_number}: "
                    f"{result.error_message}"
                )

                builtins.print(
                    f"❌ Merge failed for issue #{entry.issue_number}"
                )
                builtins.print(f"   Error: {result.error_message}")
                if result.conflict_files:
                    builtins.print(f"   Conflicting files: {', '.join(result.conflict_files)}")

                # Callback
                if self.on_merge_conflict:
                    self.on_merge_conflict(result)

            processed += 1

        return results

    def _attempt_merge(self, entry: MergeQueueEntry) -> MergeResult:
        """Attempt to merge a branch into main.

        Args:
            entry: MergeQueueEntry to merge

        Returns:
            MergeResult with success status and details
        """
        branch = entry.branch_name

        try:
            # Update remote URL with token
            self._update_remote_url()

            # Fetch latest
            builtins.print("   Fetching latest from origin...")
            result = subprocess.run(
                ["git", "fetch", "origin"],
                cwd=self.base_repo,
                capture_output=True,
                text=True,
            )
            if result.returncode != 0:
                return MergeResult(
                    success=False,
                    issue_number=entry.issue_number,
                    branch_name=branch,
                    error_message=f"Failed to fetch: {result.stderr}",
                )

            # Checkout main
            builtins.print("   Checking out main...")
            subprocess.run(
                ["git", "checkout", "main"],
                cwd=self.base_repo,
                capture_output=True,
            )

            # Pull latest main
            subprocess.run(
                ["git", "pull", "origin", "main"],
                cwd=self.base_repo,
                capture_output=True,
            )

            # Check if branch exists
            branch_check = subprocess.run(
                ["git", "rev-parse", "--verify", f"origin/{branch}"],
                cwd=self.base_repo,
                capture_output=True,
            )
            if branch_check.returncode != 0:
                return MergeResult(
                    success=False,
                    issue_number=entry.issue_number,
                    branch_name=branch,
                    error_message=f"Branch origin/{branch} does not exist",
                )

            # Attempt merge
            builtins.print(f"   Merging origin/{branch} into main...")
            merge_result = subprocess.run(
                [
                    "git", "merge", f"origin/{branch}",
                    "--no-ff",  # Create merge commit even if fast-forward possible
                    "-m", f"Merge issue #{entry.issue_number} ({branch})",
                ],
                cwd=self.base_repo,
                capture_output=True,
                text=True,
            )

            if merge_result.returncode != 0:
                # Check for conflicts
                conflict_files = self._get_conflict_files()
                if conflict_files:
                    # Abort the merge
                    subprocess.run(
                        ["git", "merge", "--abort"],
                        cwd=self.base_repo,
                        capture_output=True,
                    )
                    return MergeResult(
                        success=False,
                        issue_number=entry.issue_number,
                        branch_name=branch,
                        error_message="Merge conflict detected",
                        conflict_files=conflict_files,
                    )
                else:
                    return MergeResult(
                        success=False,
                        issue_number=entry.issue_number,
                        branch_name=branch,
                        error_message=f"Merge failed: {merge_result.stderr}",
                    )

            # Get merge commit SHA
            sha_result = subprocess.run(
                ["git", "rev-parse", "HEAD"],
                cwd=self.base_repo,
                capture_output=True,
                text=True,
            )
            commit_sha = sha_result.stdout.strip() if sha_result.returncode == 0 else None

            # Push to origin
            builtins.print("   Pushing to origin/main...")
            push_result = subprocess.run(
                ["git", "push", "origin", "main"],
                cwd=self.base_repo,
                capture_output=True,
                text=True,
            )

            if push_result.returncode != 0:
                # Push failed - might need to pull and retry
                return MergeResult(
                    success=False,
                    issue_number=entry.issue_number,
                    branch_name=branch,
                    error_message=f"Push failed: {push_result.stderr}",
                )

            return MergeResult(
                success=True,
                issue_number=entry.issue_number,
                branch_name=branch,
                commit_sha=commit_sha,
            )

        except Exception as e:
            return MergeResult(
                success=False,
                issue_number=entry.issue_number,
                branch_name=branch,
                error_message=f"Exception during merge: {str(e)}",
            )

    def _get_conflict_files(self) -> list[str]:
        """Get list of files with merge conflicts.

        Returns:
            List of conflicting file paths
        """
        result = subprocess.run(
            ["git", "diff", "--name-only", "--diff-filter=U"],
            cwd=self.base_repo,
            capture_output=True,
            text=True,
        )
        if result.returncode == 0 and result.stdout.strip():
            return result.stdout.strip().split("\n")
        return []

    def _delete_remote_branch(self, branch: str) -> bool:
        """Delete branch from remote after successful merge.

        Args:
            branch: Branch name to delete

        Returns:
            True if deletion succeeded
        """
        try:
            builtins.print(f"   Cleaning up remote branch: {branch}")
            result = subprocess.run(
                ["git", "push", "origin", "--delete", branch],
                cwd=self.base_repo,
                capture_output=True,
                text=True,
            )
            return result.returncode == 0
        except Exception:
            return False

    def _update_remote_url(self) -> None:
        """Update remote URL with fresh token."""
        # Get current remote URL to extract repo name
        result = subprocess.run(
            ["git", "remote", "get-url", "origin"],
            cwd=self.base_repo,
            capture_output=True,
            text=True,
        )
        if result.returncode == 0:
            # Extract repo from URL
            url = result.stdout.strip()
            # Handle various URL formats
            if "github.com" in url:
                # Extract owner/repo from URL
                parts = url.split("github.com")[-1]
                parts = parts.lstrip("/").lstrip(":")
                repo = parts.replace(".git", "")

                # Set URL with token
                new_url = f"https://x-access-token:{self.github_token}@github.com/{repo}.git"
                subprocess.run(
                    ["git", "remote", "set-url", "origin", new_url],
                    cwd=self.base_repo,
                    capture_output=True,
                )

    # =========================================================================
    # Persistence
    # =========================================================================

    def _load_queue(self) -> list[MergeQueueEntry]:
        """Load queue from file.

        Returns:
            List of MergeQueueEntry
        """
        if not self._queue_file.exists():
            return []

        try:
            data = json.loads(self._queue_file.read_text())
            entries = [MergeQueueEntry.from_dict(e) for e in data.get("queue", [])]

            # Restore pause state
            self._paused = data.get("paused", False)
            self._pause_reason = data.get("pause_reason")

            return entries
        except (json.JSONDecodeError, KeyError) as e:
            builtins.print(f"⚠️ Error loading merge queue: {e}")
            return []

    def _save_queue(self) -> None:
        """Save queue to file."""
        data = {
            "queue": [e.to_dict() for e in self._queue],
            "paused": self._paused,
            "pause_reason": self._pause_reason,
            "updated_at": datetime.now().isoformat(),
        }

        # Write atomically
        tmp_file = self._queue_file.with_suffix(".tmp")
        tmp_file.write_text(json.dumps(data, indent=2))
        tmp_file.rename(self._queue_file)
