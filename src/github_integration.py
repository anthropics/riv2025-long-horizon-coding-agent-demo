"""
GitHub Integration for Issue-Driven Agent Workflow.

Handles:
- Issue selection based on staff approval (🚀) and visitor votes (👍)
- Issue lifecycle management (building, complete, failed)
- Priority calculation
- Content moderation
"""

import os
from datetime import datetime
from typing import Optional, List, Dict, Any
from dataclasses import dataclass

from github import Github, GithubException
from github.Issue import Issue


# Staff who can approve builds with 🚀 reaction
# Configure via AUTHORIZED_APPROVERS env var (comma-separated GitHub usernames)
_approvers_env = os.environ.get("AUTHORIZED_APPROVERS", "")
AUTHORIZED_APPROVERS = set(a.strip() for a in _approvers_env.split(",") if a.strip())

# Issue labels for lifecycle tracking
LABEL_BUILDING = "agent-building"
LABEL_COMPLETE = "agent-complete"
LABEL_DEPLOYED = "deployed"
LABEL_FAILED = "tests-failed"
LABEL_REBUILDING = "rebuilding"


@dataclass
class BuildableIssue:
    """Represents an issue approved for building"""
    number: int
    title: str
    body: str
    labels: List[str]
    thumbs_up_count: int
    has_staff_approval: bool
    approved_by: List[str]
    created_at: datetime

    def to_dict(self) -> Dict[str, Any]:
        return {
            "number": self.number,
            "title": self.title,
            "body": self.body,
            "labels": self.labels,
            "votes": self.thumbs_up_count,
            "approved": self.has_staff_approval,
            "approved_by": self.approved_by,
            "created": self.created_at.isoformat()
        }


class GitHubIssueManager:
    """Manages GitHub issue selection and lifecycle for agent builds"""

    def __init__(self, repo_name: str, github_token: str):
        """
        Initialize GitHub integration.

        Args:
            repo_name: Full repo name (e.g., "anthropic/coding-agent-demo")
            github_token: GitHub PAT with repo permissions
        """
        self.github = Github(github_token)
        self.repo = self.github.get_repo(repo_name)
        self.repo_name = repo_name

    def get_buildable_issues(self) -> List[BuildableIssue]:
        """
        Fetch all issues that are buildable (open, approved, not in-progress).

        Returns:
            List of BuildableIssue sorted by votes desc, then created asc
        """
        buildable = []

        # Fetch open issues (limit to feature-request label if exists)
        for issue in self.repo.get_issues(state='open'):
            # Skip if already being built
            if self._has_label(issue, LABEL_BUILDING):
                continue

            # Skip if already completed
            if self._has_label(issue, LABEL_COMPLETE):
                continue

            # Check for staff approval (🚀 rocket or 🎉 hooray)
            approvers = self._get_staff_approvers(issue)
            if not approvers:
                continue  # Only build approved issues

            # Count visitor votes (👍)
            thumbs_up = self._count_thumbs_up(issue)

            buildable.append(BuildableIssue(
                number=issue.number,
                title=issue.title,
                body=issue.body or "",
                labels=[label.name for label in issue.labels],
                thumbs_up_count=thumbs_up,
                has_staff_approval=True,
                approved_by=approvers,
                created_at=issue.created_at
            ))

        # Sort by votes (high to low), then by age (old to new)
        buildable.sort(key=lambda i: (-i.thumbs_up_count, i.created_at))

        return buildable

    def get_next_buildable_issue(self) -> Optional[BuildableIssue]:
        """
        Select the next issue to build (highest priority approved issue).

        Returns:
            BuildableIssue or None if no buildable issues
        """
        buildable = self.get_buildable_issues()
        return buildable[0] if buildable else None

    def get_issue(self, issue_number: int) -> Issue:
        """
        Fetch a specific issue by number.

        Args:
            issue_number: GitHub issue number

        Returns:
            Issue object
        """
        return self.repo.get_issue(issue_number)

    def mark_issue_building(
        self,
        issue_number: int,
        session_id: str,
        is_rebase: bool = False
    ) -> None:
        """
        Mark an issue as being built by adding label and comment.

        Args:
            issue_number: GitHub issue number
            session_id: AgentCore session ID
            is_rebase: Whether this is a rebuild after conflict
        """
        issue = self.repo.get_issue(issue_number)

        # Remove rebuilding label if this is a rebase
        if is_rebase:
            try:
                issue.remove_from_labels(LABEL_REBUILDING)
            except Exception:
                pass  # Label may not exist, which is fine

        # Add building label
        issue.add_to_labels(LABEL_BUILDING)

        # Add comment with session info
        timestamp = datetime.utcnow().isoformat() + 'Z'
        rebase_note = "\n*Rebuilding on latest main after merge conflict.*" if is_rebase else ""

        comment = f"""🤖 **Agent Started Building**

Session ID: `{session_id}`
Started: {timestamp}{rebase_note}

Follow progress in [CloudWatch Logs](https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#gen-ai-observability/agent-core).

Commits will be pushed to branch `issue-{issue_number}`.
"""
        issue.create_comment(comment)

    def mark_issue_complete(
        self,
        issue_number: int,
        session_id: str,
        staging_url: str,
        production_url: Optional[str] = None
    ) -> None:
        """
        Mark issue as complete after successful E2E tests and deploy.

        Args:
            issue_number: GitHub issue number
            session_id: AgentCore session ID
            staging_url: URL to staging deployment
            production_url: URL to production (if deployed)
        """
        issue = self.repo.get_issue(issue_number)

        # Update labels
        issue.remove_from_labels(LABEL_BUILDING)
        issue.add_to_labels(LABEL_COMPLETE)
        if production_url:
            issue.add_to_labels(LABEL_DEPLOYED)

        # Add completion comment
        timestamp = datetime.utcnow().isoformat() + 'Z'
        prod_line = f"\n- 🌐 Production: {production_url}" if production_url else ""

        comment = f"""✅ **Build Complete!**

Session ID: `{session_id}`
Completed: {timestamp}

**Deployed:**
- 🧪 Staging: {staging_url}{prod_line}

All E2E tests passed. Closing this issue.
"""
        issue.create_comment(comment)

        # Close the issue
        issue.edit(state='closed')

    def mark_issue_failed(
        self,
        issue_number: int,
        session_id: str,
        error_message: str,
        workflow_url: Optional[str] = None
    ) -> None:
        """
        Report build failure and remove in-progress label.

        Args:
            issue_number: GitHub issue number
            session_id: AgentCore session ID
            error_message: Error description
            workflow_url: Link to failed GitHub Actions run
        """
        issue = self.repo.get_issue(issue_number)

        # Update labels
        issue.remove_from_labels(LABEL_BUILDING)
        issue.add_to_labels(LABEL_FAILED)

        # Add failure comment
        timestamp = datetime.utcnow().isoformat() + 'Z'
        workflow_link = f"\n\nCheck [workflow run]({workflow_url}) for details." if workflow_url else ""

        comment = f"""⚠️ **Build Failed**

Session ID: `{session_id}`
Failed: {timestamp}

**Error:**
```
{error_message}
```{workflow_link}

The issue remains open for retry. Staff can remove the `{LABEL_FAILED}` label and re-approve with 🚀 to try again.
"""
        issue.create_comment(comment)

    def generate_feature_prompt(self, issue: Issue, base_code_dir: str) -> str:
        """
        Generate FEATURE_REQUEST.md prompt for incremental feature.

        This is NOT a BUILD_PLAN.md (which is for greenfield builds).
        This tells the agent to enhance existing code.

        Args:
            issue: GitHub Issue object
            base_code_dir: Path to existing codebase

        Returns:
            Feature request prompt text
        """
        # Count votes
        votes = self._count_thumbs_up(issue)
        approvers = self._get_staff_approvers(issue)

        template = f"""# Feature Enhancement Request

## From GitHub Issue #{issue.number}

**Title:** {issue.title}
**Votes:** {votes} 👍
**Approved by:** {', '.join(approvers)}
**Requested:** {issue.created_at.isoformat()}

---

## Feature Specification

{issue.body}

---

## Implementation Instructions

You are enhancing an **existing application** (antodo task manager).

### Existing Codebase

The application already has a working codebase at: `{base_code_dir}`

**CRITICAL:** Review the existing code structure before making changes!

### Your Task

1. **Review existing code** to understand:
   - Current architecture and patterns
   - Existing components and utilities
   - Code style and conventions
   - Testing patterns

2. **Add the requested feature** by:
   - Following existing patterns
   - Integrating with current components
   - Updating only necessary files
   - Maintaining code quality

3. **Write tests** for the new feature:
   - E2E test using Playwright
   - Validate feature works correctly
   - Ensure no regressions to existing features

4. **Verify quality**:
   - All new tests pass
   - All existing tests still pass
   - No console errors
   - Code committed with clear messages

### Constraints

⚠️ **DO NOT:**
- Rewrite existing working code unnecessarily
- Break existing functionality
- Change architectural patterns
- Remove features

✅ **DO:**
- Preserve all existing features
- Follow current code style
- Add comprehensive tests
- Make surgical, focused changes

### Success Criteria

Feature is complete when:
- [ ] Feature works as specified
- [ ] E2E test passes reliably
- [ ] No regressions (existing tests pass)
- [ ] No console errors
- [ ] Code committed to `issue-{issue.number}` branch
- [ ] Agent signals: "🎉 IMPLEMENTATION COMPLETE"

### Testing

Validate the feature by testing that:
{self._generate_test_criteria(issue.body)}
"""
        return template

    def _generate_test_criteria(self, issue_body: str) -> str:
        """Generate test criteria from issue specification"""
        # Basic criteria - could be enhanced with NLP
        return """- Feature behaves as described in specification
- UI elements are visible and interactive
- Data persists correctly
- Error handling works properly
- Accessibility requirements met"""

    def _get_staff_approvers(self, issue: Issue) -> List[str]:
        """
        Get list of staff members who approved (🚀 or 🎉).

        Args:
            issue: GitHub Issue object

        Returns:
            List of approver usernames
        """
        approvers = []
        try:
            reactions = issue.get_reactions()
            for reaction in reactions:
                if (reaction.content in ['rocket', 'hooray'] and
                    reaction.user.login in AUTHORIZED_APPROVERS):
                    approvers.append(reaction.user.login)
        except GithubException:
            pass
        return list(set(approvers))  # Deduplicate

    def _count_thumbs_up(self, issue: Issue) -> int:
        """
        Count 👍 reactions (from anyone).

        Args:
            issue: GitHub Issue object

        Returns:
            Count of thumbs up reactions
        """
        try:
            reactions = issue.get_reactions()
            return sum(1 for r in reactions if r.content == '+1')
        except GithubException:
            return 0

    def _has_label(self, issue: Issue, label_name: str) -> bool:
        """
        Check if issue has a specific label.

        Args:
            issue: GitHub Issue object
            label_name: Label to check for

        Returns:
            True if label exists
        """
        return any(label.name == label_name for label in issue.labels)
