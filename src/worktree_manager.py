"""Git worktree manager for parallel agent sessions.

This module enables multiple agent sessions to run in parallel by providing
isolated git worktrees for each issue. Each worktree has its own working
directory and branch, allowing independent development without conflicts.

Key features:
- Create/cleanup worktrees for parallel sessions
- Track active worktrees and their associated sessions
- Session-to-worktree mapping for coordination
- Automatic cleanup of stale worktrees
"""

import builtins
import json
import os
import subprocess
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Optional


@dataclass
class WorktreeInfo:
    """Information about an active worktree."""

    issue_number: int
    session_id: str
    worktree_path: Path
    branch_name: str
    created_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "issue_number": self.issue_number,
            "session_id": self.session_id,
            "worktree_path": str(self.worktree_path),
            "branch_name": self.branch_name,
            "created_at": self.created_at.isoformat(),
        }

    @classmethod
    def from_dict(cls, data: dict) -> "WorktreeInfo":
        """Create from dictionary."""
        return cls(
            issue_number=data["issue_number"],
            session_id=data["session_id"],
            worktree_path=Path(data["worktree_path"]),
            branch_name=data["branch_name"],
            created_at=datetime.fromisoformat(data["created_at"]),
        )


class WorktreeManager:
    """Manages git worktrees for parallel agent sessions.

    Provides isolated working directories for multiple agents to work on
    different issues simultaneously without git conflicts.

    Directory structure:
        /app/workspace/
        ├── base-repo/              # Main clone with shared .git objects
        ├── worktrees/
        │   ├── issue-123/          # Worktree for issue 123
        │   └── issue-456/          # Worktree for issue 456
        └── session-state/
            ├── worktrees.json      # Worktree tracking state
            └── issue-123-session.txt  # Session ID for issue 123
    """

    def __init__(
        self,
        base_repo_path: Path,
        worktrees_dir: Optional[Path] = None,
        session_state_dir: Optional[Path] = None,
    ):
        """Initialize WorktreeManager.

        Args:
            base_repo_path: Path to the base repository clone
            worktrees_dir: Directory for worktrees (default: sibling to base_repo)
            session_state_dir: Directory for session state files (default: sibling to base_repo)
        """
        self.base_repo = Path(base_repo_path)
        self.worktrees_dir = worktrees_dir or (self.base_repo.parent / "worktrees")
        self.session_state_dir = session_state_dir or (
            self.base_repo.parent / "session-state"
        )

        # Ensure directories exist
        self.worktrees_dir.mkdir(parents=True, exist_ok=True)
        self.session_state_dir.mkdir(parents=True, exist_ok=True)

        # State file for tracking worktrees
        self._state_file = self.session_state_dir / "worktrees.json"

    # =========================================================================
    # Worktree Creation and Cleanup
    # =========================================================================

    def create_worktree(
        self,
        issue_number: int,
        session_id: str,
        base_branch: str = "main",
    ) -> Path:
        """Create isolated worktree for an issue.

        Creates a new worktree with a dedicated branch for the issue.
        If the branch already exists (e.g., from a previous session),
        it will be checked out; otherwise a new branch is created.

        Args:
            issue_number: GitHub issue number
            session_id: Unique session identifier
            base_branch: Branch to base the new branch on (default: main)

        Returns:
            Path to the created worktree

        Raises:
            RuntimeError: If worktree creation fails
        """
        worktree_path = self.get_worktree_path(issue_number)
        branch_name = f"issue-{issue_number}"

        builtins.print(f"🌳 Creating worktree for issue #{issue_number}...")

        # Check if worktree already exists
        if worktree_path.exists():
            builtins.print(
                f"  ⚠️ Worktree already exists at {worktree_path}, cleaning up..."
            )
            self.cleanup_worktree(issue_number)

        # Ensure we have latest from origin
        self._fetch_origin()

        # Check if branch already exists on remote or locally
        branch_exists = self._branch_exists(branch_name)

        if branch_exists:
            # Checkout existing branch into worktree
            builtins.print(f"  📥 Checking out existing branch: {branch_name}")
            result = subprocess.run(
                [
                    "git",
                    "worktree",
                    "add",
                    str(worktree_path),
                    branch_name,
                ],
                cwd=self.base_repo,
                capture_output=True,
                text=True,
            )
        else:
            # Create new branch from base
            builtins.print(
                f"  🌿 Creating new branch: {branch_name} from {base_branch}"
            )

            # Check if origin exists
            has_origin = self._has_remote("origin")

            if has_origin:
                # Use origin/base_branch as starting point
                start_point = f"origin/{base_branch}"
            else:
                # Local only - use local base_branch or HEAD
                start_point = base_branch

            result = subprocess.run(
                [
                    "git",
                    "worktree",
                    "add",
                    "-b",
                    branch_name,
                    str(worktree_path),
                    start_point,
                ],
                cwd=self.base_repo,
                capture_output=True,
                text=True,
            )

        if result.returncode != 0:
            error_msg = result.stderr or result.stdout
            raise RuntimeError(f"Failed to create worktree: {error_msg}")

        # Configure git user in the worktree
        self._configure_worktree_git(worktree_path)

        # Write session mapping
        self._write_session_mapping(issue_number, session_id)

        # Track worktree state
        info = WorktreeInfo(
            issue_number=issue_number,
            session_id=session_id,
            worktree_path=worktree_path,
            branch_name=branch_name,
        )
        self._save_worktree_info(info)

        builtins.print(f"  ✅ Worktree created at {worktree_path}")
        return worktree_path

    def cleanup_worktree(self, issue_number: int, prune: bool = True) -> bool:
        """Remove worktree after completion or failure.

        Args:
            issue_number: Issue number of worktree to remove
            prune: Whether to prune stale worktree references

        Returns:
            True if cleanup succeeded, False otherwise
        """
        worktree_path = self.get_worktree_path(issue_number)

        builtins.print(f"🧹 Cleaning up worktree for issue #{issue_number}...")

        try:
            if worktree_path.exists():
                # Remove worktree (--force handles uncommitted changes)
                result = subprocess.run(
                    ["git", "worktree", "remove", str(worktree_path), "--force"],
                    cwd=self.base_repo,
                    capture_output=True,
                    text=True,
                )

                if result.returncode != 0:
                    builtins.print(
                        f"  ⚠️ git worktree remove failed: {result.stderr}"
                    )
                    # Fallback: manually remove directory
                    import shutil

                    shutil.rmtree(worktree_path, ignore_errors=True)

            if prune:
                # Prune stale worktree references
                subprocess.run(
                    ["git", "worktree", "prune"],
                    cwd=self.base_repo,
                    capture_output=True,
                )

            # Remove session mapping
            self._remove_session_mapping(issue_number)

            # Remove from state tracking
            self._remove_worktree_info(issue_number)

            builtins.print(f"  ✅ Worktree cleaned up")
            return True

        except Exception as e:
            builtins.print(f"  ❌ Cleanup failed: {e}")
            return False

    def cleanup_stale_worktrees(self, max_age_hours: int = 24) -> int:
        """Clean up worktrees older than max_age_hours.

        Args:
            max_age_hours: Maximum age in hours before cleanup

        Returns:
            Number of worktrees cleaned up
        """
        cleaned = 0
        now = datetime.now()

        for info in self.list_active_worktrees():
            age_hours = (now - info.created_at).total_seconds() / 3600
            if age_hours > max_age_hours:
                builtins.print(
                    f"  🕐 Worktree for issue #{info.issue_number} is {age_hours:.1f}h old, cleaning..."
                )
                if self.cleanup_worktree(info.issue_number):
                    cleaned += 1

        return cleaned

    # =========================================================================
    # Worktree Information
    # =========================================================================

    def get_worktree_path(self, issue_number: int) -> Path:
        """Get path for issue's worktree.

        Args:
            issue_number: GitHub issue number

        Returns:
            Path where the worktree is/would be located
        """
        return self.worktrees_dir / f"issue-{issue_number}"

    def worktree_exists(self, issue_number: int) -> bool:
        """Check if worktree exists for an issue.

        Args:
            issue_number: GitHub issue number

        Returns:
            True if worktree exists
        """
        return self.get_worktree_path(issue_number).exists()

    def list_active_worktrees(self) -> list[WorktreeInfo]:
        """List all active worktrees with metadata.

        Returns:
            List of WorktreeInfo for all tracked worktrees
        """
        return self._load_all_worktree_info()

    def get_worktree_info(self, issue_number: int) -> Optional[WorktreeInfo]:
        """Get info for a specific worktree.

        Args:
            issue_number: GitHub issue number

        Returns:
            WorktreeInfo if found, None otherwise
        """
        worktrees = self._load_all_worktree_info()
        for info in worktrees:
            if info.issue_number == issue_number:
                return info
        return None

    def get_active_count(self) -> int:
        """Get count of active worktrees.

        Returns:
            Number of active worktrees
        """
        return len(self.list_active_worktrees())

    def get_session_for_issue(self, issue_number: int) -> Optional[str]:
        """Get session ID for an issue.

        Args:
            issue_number: GitHub issue number

        Returns:
            Session ID if found, None otherwise
        """
        mapping_file = self.session_state_dir / f"issue-{issue_number}-session.txt"
        if mapping_file.exists():
            return mapping_file.read_text().strip()
        return None

    # =========================================================================
    # Git Operations
    # =========================================================================

    def _fetch_origin(self) -> None:
        """Fetch latest from origin (if it exists)."""
        if self._has_remote("origin"):
            subprocess.run(
                ["git", "fetch", "origin"],
                cwd=self.base_repo,
                capture_output=True,
            )

    def _has_remote(self, remote_name: str) -> bool:
        """Check if a remote exists.

        Args:
            remote_name: Name of the remote (e.g., 'origin')

        Returns:
            True if remote exists
        """
        result = subprocess.run(
            ["git", "remote", "get-url", remote_name],
            cwd=self.base_repo,
            capture_output=True,
        )
        return result.returncode == 0

    def _branch_exists(self, branch_name: str) -> bool:
        """Check if branch exists locally or on remote.

        Args:
            branch_name: Name of branch to check

        Returns:
            True if branch exists
        """
        # Check remote
        result = subprocess.run(
            ["git", "ls-remote", "--heads", "origin", branch_name],
            cwd=self.base_repo,
            capture_output=True,
            text=True,
        )
        if result.returncode == 0 and branch_name in result.stdout:
            return True

        # Check local
        result = subprocess.run(
            ["git", "branch", "--list", branch_name],
            cwd=self.base_repo,
            capture_output=True,
            text=True,
        )
        return result.returncode == 0 and branch_name in result.stdout

    def _configure_worktree_git(self, worktree_path: Path) -> None:
        """Configure git user in worktree.

        Args:
            worktree_path: Path to the worktree
        """
        subprocess.run(
            ["git", "config", "user.name", "Claude Code Agent"],
            cwd=worktree_path,
            capture_output=True,
        )
        subprocess.run(
            ["git", "config", "user.email", "agent@anthropic.com"],
            cwd=worktree_path,
            capture_output=True,
        )

    # =========================================================================
    # Session Mapping
    # =========================================================================

    def _write_session_mapping(self, issue_number: int, session_id: str) -> None:
        """Write session ID mapping for an issue.

        Args:
            issue_number: GitHub issue number
            session_id: Session identifier
        """
        mapping_file = self.session_state_dir / f"issue-{issue_number}-session.txt"
        mapping_file.write_text(session_id)

    def _remove_session_mapping(self, issue_number: int) -> None:
        """Remove session mapping file.

        Args:
            issue_number: GitHub issue number
        """
        mapping_file = self.session_state_dir / f"issue-{issue_number}-session.txt"
        if mapping_file.exists():
            mapping_file.unlink()

    # =========================================================================
    # State Persistence
    # =========================================================================

    def _save_worktree_info(self, info: WorktreeInfo) -> None:
        """Save worktree info to state file.

        Args:
            info: WorktreeInfo to save
        """
        worktrees = self._load_all_worktree_info()

        # Remove existing entry for same issue
        worktrees = [w for w in worktrees if w.issue_number != info.issue_number]

        # Add new entry
        worktrees.append(info)

        # Save
        self._save_all_worktree_info(worktrees)

    def _remove_worktree_info(self, issue_number: int) -> None:
        """Remove worktree info from state file.

        Args:
            issue_number: Issue number to remove
        """
        worktrees = self._load_all_worktree_info()
        worktrees = [w for w in worktrees if w.issue_number != issue_number]
        self._save_all_worktree_info(worktrees)

    def _load_all_worktree_info(self) -> list[WorktreeInfo]:
        """Load all worktree info from state file.

        Returns:
            List of WorktreeInfo
        """
        if not self._state_file.exists():
            return []

        try:
            data = json.loads(self._state_file.read_text())
            return [WorktreeInfo.from_dict(w) for w in data.get("worktrees", [])]
        except (json.JSONDecodeError, KeyError) as e:
            builtins.print(f"⚠️ Error loading worktree state: {e}")
            return []

    def _save_all_worktree_info(self, worktrees: list[WorktreeInfo]) -> None:
        """Save all worktree info to state file.

        Args:
            worktrees: List of WorktreeInfo to save
        """
        data = {"worktrees": [w.to_dict() for w in worktrees]}

        # Write atomically
        tmp_file = self._state_file.with_suffix(".tmp")
        tmp_file.write_text(json.dumps(data, indent=2))
        tmp_file.rename(self._state_file)


def ensure_base_repo_cloned(
    github_repo: str,
    github_token: str,
    base_repo_path: Path,
) -> Path:
    """Ensure base repository is cloned for worktree operations.

    Clones the repository if not already present, or fetches latest if it exists.

    Args:
        github_repo: Repository in owner/repo format
        github_token: GitHub access token
        base_repo_path: Path where repo should be cloned

    Returns:
        Path to the base repository

    Raises:
        RuntimeError: If clone fails
    """
    base_repo_path = Path(base_repo_path)
    base_repo_path.parent.mkdir(parents=True, exist_ok=True)

    if (base_repo_path / ".git").exists():
        builtins.print(f"📁 Base repo exists, fetching latest...")

        # Update remote URL with fresh token
        clone_url = f"https://x-access-token:{github_token}@github.com/{github_repo}.git"
        subprocess.run(
            ["git", "remote", "set-url", "origin", clone_url],
            cwd=base_repo_path,
            capture_output=True,
        )

        # Fetch latest
        subprocess.run(
            ["git", "fetch", "origin"],
            cwd=base_repo_path,
            capture_output=True,
        )

        builtins.print(f"  ✅ Base repo updated")
    else:
        builtins.print(f"📥 Cloning base repo: {github_repo}...")

        clone_url = f"https://x-access-token:{github_token}@github.com/{github_repo}.git"
        result = subprocess.run(
            ["git", "clone", clone_url, str(base_repo_path)],
            capture_output=True,
            text=True,
        )

        if result.returncode != 0:
            raise RuntimeError(f"Failed to clone repository: {result.stderr}")

        builtins.print(f"  ✅ Base repo cloned")

    return base_repo_path
