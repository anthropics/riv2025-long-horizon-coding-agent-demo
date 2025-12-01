"""Security utilities for Claude Code."""

import glob
import os
from pathlib import Path
from typing import Any, Optional

import re

from .config import (
    ALLOWED_BASH_COMMANDS,
    ALLOWED_NODE_PATTERNS,
    ALLOWED_PKILL_PATTERNS,
    ALLOWED_RM_COMMANDS,
    BLOCKED_SED_PATTERNS,
    BLOCKED_TESTS_JSON_PATTERNS,
)


# ============================================================================
# Screenshot Verification State
# ============================================================================
# Track which screenshots have been viewed (read) during the session.
# This prevents the agent from marking tests as passing without actually
# viewing the screenshot evidence.

_viewed_screenshots: set[str] = set()


def track_screenshot_read(file_path: str) -> None:
    """Track that a screenshot or console log was viewed by the agent.

    Args:
        file_path: Path to the screenshot/console file that was read
    """
    if 'screenshots/' in file_path:
        if file_path.endswith('.png') or file_path.endswith('-console.txt'):
            _viewed_screenshots.add(file_path)
            file_type = "screenshot" if file_path.endswith('.png') else "console log"
            print(f"📸 Tracked {file_type} view: {file_path}")


def was_screenshot_viewed(file_path: str) -> bool:
    """Check if a specific screenshot was viewed.

    Args:
        file_path: Path to check

    Returns:
        True if the screenshot was previously read by the agent
    """
    return file_path in _viewed_screenshots


def clear_screenshot_tracking() -> None:
    """Clear the screenshot tracking state (for testing/reset)."""
    _viewed_screenshots.clear()


def _extract_test_id(old_string: str, new_string: str) -> Optional[str]:
    """Extract test ID from the edit context.

    Looks for patterns like:
    - "id": "test-name"
    - "name": "Test Name" (converted to slug)

    Args:
        old_string: The original string being replaced
        new_string: The new string replacing it

    Returns:
        Test ID if found, None otherwise
    """
    # Combine old and new strings for context
    context = old_string + new_string

    # Try to find "id": "xxx" pattern
    id_match = re.search(r'"id"\s*:\s*"([^"]+)"', context)
    if id_match:
        return id_match.group(1)

    # Try to find "name": "xxx" and slugify it
    name_match = re.search(r'"name"\s*:\s*"([^"]+)"', context)
    if name_match:
        name = name_match.group(1)
        # Convert to slug: "First Time User" -> "first-time-user"
        slug = re.sub(r'[^a-zA-Z0-9]+', '-', name.lower()).strip('-')
        return slug

    return None


def _deny_response(reason: str) -> dict[str, Any]:
    """Create a deny response for PreToolUse hooks.

    Args:
        reason: Explanation of why the action was denied

    Returns:
        Hook response dict with deny decision
    """
    return {
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }


class SecurityValidator:
    """Validates bash commands and file paths for security."""

    @staticmethod
    def _validate_path_within_run_directory(
        file_path: str, project_root: Optional[str]
    ) -> tuple[bool, str]:
        """Validate that a path is within the run-specific directory.

        Args:
            file_path: Path to validate
            project_root: Project root directory (run-specific directory)

        Returns:
            Tuple of (is_valid, error_reason)
        """
        if not project_root:
            return False, "No project root directory set"

        try:
            # Resolve absolute paths to handle relative paths and symlinks
            project_root_resolved = Path(project_root).resolve()
            file_path_resolved = Path(file_path).resolve()

            # Check if the file path is within the project root
            try:
                file_path_resolved.relative_to(project_root_resolved)
                return True, ""
            except ValueError:
                # Path is outside project root
                return (
                    False,
                    f"Path '{file_path}' is outside the allowed directory '{project_root}'",
                )

        except (OSError, RuntimeError) as e:
            return False, f"Error validating path: {e}"

    @staticmethod
    def _validate_bash_paths(
        command: str, project_root: str
    ) -> Optional[dict[str, Any]]:
        """Validate paths in bash commands to ensure they stay within the run directory.

        Args:
            command: Bash command to validate
            project_root: Project root directory

        Returns:
            Hook response dict if path is invalid, None if valid
        """
        import shlex

        try:
            # Parse command into tokens
            tokens = shlex.split(command)
        except ValueError:
            # If command can't be parsed, allow bash to handle the error
            return None

        if not tokens:
            return None

        # Commands that commonly take file paths as arguments
        path_sensitive_commands = {
            "cat",
            "less",
            "more",
            "head",
            "tail",
            "file",
            "stat",
            "cp",
            "mv",
            "rm",
            "mkdir",
            "rmdir",
            "touch",
            "chmod",
            "chown",
            "ls",
            "find",
            "locate",
            "grep",
            "egrep",
            "fgrep",
            "vi",
            "vim",
            "nano",
            "emacs",
            "gedit",
            "git",
            "python",
            "python3",
            "node",
            "npm",
            "pip",
            "tar",
            "unzip",
            "zip",
            "gzip",
            "gunzip",
            "curl",
            "wget",
            "scp",
            "rsync",
        }

        first_word = tokens[0].lower()

        # Check if this is a command that might operate on files outside our directory
        if first_word not in path_sensitive_commands:
            return None

        # Extract potential file paths from the command
        # Look for arguments that look like paths (start with /, ./, ../, or contain /)
        potential_paths = []

        for token in tokens[1:]:  # Skip the command itself
            # Skip flags and options (start with -)
            if token.startswith("-"):
                continue

            # Check if token looks like a path
            if (
                "/" in token
                or token.startswith("./")
                or token.startswith("../")
                or token.startswith("~/")
                or token.startswith("/")
                or
                # Also check for common file patterns
                "." in token
                and len(token.split(".")) <= 3
            ):  # Basic file extension check
                potential_paths.append(token)

        # Validate each potential path
        for path in potential_paths:
            # Skip URLs and special cases
            if any(
                pattern in path
                for pattern in [
                    "http://",
                    "https://",
                    "ftp://",
                    "|",
                    ">",
                    "<",
                    "&&",
                    "||",
                    "/dev/null",  # Allow /dev/null for redirection
                ]
            ):
                continue

            # For relative paths, resolve them relative to current directory (which should be project root)
            is_valid, error_reason = (
                SecurityValidator._validate_path_within_run_directory(
                    path, project_root
                )
            )

            if not is_valid:
                print(f"🚨 BLOCKED Bash command: {error_reason}")
                print(f"   Command: {command}")
                return {
                    "hookSpecificOutput": {
                        "hookEventName": "PreToolUse",
                        "permissionDecision": "deny",
                        "permissionDecisionReason": f"Bash command contains restricted path: {error_reason}",
                    }
                }

        return None

    @staticmethod
    async def bash_security_hook(
        input_data: dict[str, Any],
        tool_use_id: Optional[str] = None,
        context: Optional[Any] = None,
        project_root: Optional[str] = None,
    ) -> dict[str, Any]:
        """Security hook to restrict Bash commands to only allowed ones.

        Args:
            input_data: Tool input data
            tool_use_id: Tool use ID (optional)
            context: Hook context (optional)

        Returns:
            Hook response dict
        """
        tool_input = input_data.get("tool_input", {})
        tool_name = input_data.get("tool_name", "")

        if tool_name != "Bash":
            return {}

        command = tool_input.get("command", "")

        # Get first word of command
        first_word = command.strip().split()[0] if command.strip() else ""

        # Validate paths in the command for certain operations
        if project_root:
            path_validation_result = SecurityValidator._validate_bash_paths(
                command, project_root
            )
            if path_validation_result:
                return path_validation_result

        # Special check for rm command
        if first_word == "rm":
            return SecurityValidator._validate_rm_command(command)

        # Special check for node command
        if first_word == "node":
            return SecurityValidator._validate_node_command(command)

        # Special check for pkill command
        if first_word == "pkill":
            return SecurityValidator._validate_pkill_command(command)

        # Special check for sed command - block bulk test result modifications
        if first_word == "sed":
            sed_result = SecurityValidator._validate_sed_command(command)
            if sed_result:  # Non-empty means blocked
                return sed_result
            # If not blocked, fall through to general allow check

        # Block any bash command that could modify tests.json (awk, jq, python, node, etc.)
        tests_json_result = SecurityValidator._validate_tests_json_bash_command(command)
        if tests_json_result:  # Non-empty means blocked
            return tests_json_result

        # Block git init - creates nested repos that break commit tracking
        if first_word == "git":
            tokens = command.strip().split()
            if len(tokens) >= 2 and tokens[1] == "init":
                print(f"🚨 BLOCKED: git init - use the existing repository")
                return {
                    "hookSpecificOutput": {
                        "hookEventName": "PreToolUse",
                        "permissionDecision": "deny",
                        "permissionDecisionReason": "git init is not allowed. The infrastructure handles git setup. Use 'git add' and 'git commit' to commit your changes to the existing repository.",
                    }
                }

        # Check if command is in allowed list
        if first_word in ALLOWED_BASH_COMMANDS:
            print(f"✅ Allowed: {first_word}")
            return {}
        else:
            print(f"🚨 BLOCKED: {command}")
            return {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": f"Command '{first_word}' not allowed. Permitted: {', '.join(ALLOWED_BASH_COMMANDS)}",
                }
            }

    @staticmethod
    async def universal_path_security_hook(
        input_data: dict[str, Any],
        tool_use_id: Optional[str] = None,
        context: Optional[Any] = None,
        project_root: Optional[str] = None,
    ) -> dict[str, Any]:
        """Universal security hook to restrict all operations to the run-specific directory.

        Args:
            input_data: Tool input data
            tool_use_id: Tool use ID (optional)
            context: Hook context (optional)
            project_root: Project root directory (run-specific directory)

        Returns:
            Hook response dict
        """
        tool_input = input_data.get("tool_input", {})
        tool_name = input_data.get("tool_name", "")

        # Handle Bash commands (includes both command restriction and path validation)
        if tool_name == "Bash":
            return await SecurityValidator.bash_security_hook(
                input_data, tool_use_id, context, project_root
            )

        # File operation tools to validate
        file_tools = ["Read", "Edit", "Write", "MultiEdit", "Glob", "Grep"]

        if tool_name not in file_tools:
            return {}

        # Extract file path based on tool type
        file_path = None
        if tool_name in ["Read", "Edit", "Write", "MultiEdit"]:
            file_path = tool_input.get("file_path")
        elif tool_name == "Glob":
            # For Glob, validate the base path
            file_path = tool_input.get("path", ".")
        elif tool_name == "Grep":
            # For Grep, validate the search path
            file_path = tool_input.get("path", ".")

        if not file_path:
            return {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": f"No file path provided for {tool_name} operation",
                }
            }

        # Validate path
        is_valid, error_reason = SecurityValidator._validate_path_within_run_directory(
            file_path, project_root
        )

        if not is_valid:
            print(f"🚨 BLOCKED {tool_name}: {error_reason}")
            return {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": error_reason,
                }
            }

        # Additional validation for Edit/Write operations on tests.json
        if tool_name in ["Edit", "Write", "MultiEdit"]:
            test_validation_result = SecurityValidator._validate_test_result_modification(
                tool_input, project_root
            )
            if test_validation_result:
                return test_validation_result

        print(f"✅ Allowed {tool_name}: {file_path}")
        return {}

    @staticmethod
    def _validate_rm_command(command: str) -> dict[str, Any]:
        """Validate rm command against allowed patterns.

        Args:
            command: Command to validate

        Returns:
            Hook response dict
        """
        if command.strip() in ALLOWED_RM_COMMANDS:
            print(f"✅ Allowed: {command} (cleaning node_modules)")
            return {}
        else:
            print(f"🚨 BLOCKED: {command}")
            print("   rm command only allowed for 'rm -rf node_modules'")
            return {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": "rm command only allowed for 'rm -rf node_modules'",
                }
            }

    @staticmethod
    def _validate_node_command(command: str) -> dict[str, Any]:
        """Validate node command against allowed patterns.

        Args:
            command: Command to validate

        Returns:
            Hook response dict
        """
        if any(pattern in command for pattern in ALLOWED_NODE_PATTERNS):
            print(f"✅ Allowed: {command}")
            return {}
        else:
            print(f"🚨 BLOCKED: {command}")
            print("   Node can only be used to run server.js or server/index.js")
            return {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": "Node command can only be used to run server.js or server/index.js",
                }
            }

    @staticmethod
    def _validate_pkill_command(command: str) -> dict[str, Any]:
        """Validate pkill command against allowed patterns.

        Args:
            command: Command to validate

        Returns:
            Hook response dict
        """
        if command.strip() in ALLOWED_PKILL_PATTERNS:
            print(f"✅ Allowed: {command}")
            return {}
        else:
            print(f"🚨 BLOCKED: {command}")
            print(
                f"   pkill can only be used with specific patterns: {', '.join(ALLOWED_PKILL_PATTERNS)}"
            )
            return {
                "hookSpecificOutput": {
                    "hookEventName": "PreToolUse",
                    "permissionDecision": "deny",
                    "permissionDecisionReason": f"pkill can only be used with specific patterns: {', '.join(ALLOWED_PKILL_PATTERNS)}",
                }
            }

    @staticmethod
    def _validate_sed_command(command: str) -> dict[str, Any]:
        """Validate sed command against blocked patterns.

        Prevents bulk modification of test results in tests.json.
        The agent must update test results individually after verification,
        not use sed to mass-update all tests as passing.

        Args:
            command: Command to validate

        Returns:
            Hook response dict (empty if allowed, deny response if blocked)
        """
        for pattern in BLOCKED_SED_PATTERNS:
            if re.search(pattern, command, re.IGNORECASE):
                print(f"🚨 BLOCKED: {command}")
                print("   sed cannot be used to bulk-modify test results in tests.json")
                print("   Each test must be verified individually before marking as passed")
                return {
                    "hookSpecificOutput": {
                        "hookEventName": "PreToolUse",
                        "permissionDecision": "deny",
                        "permissionDecisionReason": (
                            "sed cannot be used to bulk-modify test results in tests.json. "
                            "Each test must be verified individually (take screenshot, confirm functionality) "
                            "before updating its 'passes' field to true. Use the Edit tool to update "
                            "individual test entries after verification."
                        ),
                    }
                }
        # sed command is allowed (doesn't match blocked patterns)
        return {}

    @staticmethod
    async def cd_enforcement_hook(
        input_data: dict[str, Any],
        tool_use_id: Optional[str] = None,
        context: Optional[Any] = None,
        project_root: Optional[str] = None,
    ) -> dict[str, Any]:
        """PostToolUse hook to enforce directory boundaries after cd commands.

        Args:
            input_data: Tool input data
            tool_use_id: Tool use ID (optional)
            context: Hook context (optional)
            project_root: Project root directory

        Returns:
            Hook response dict
        """

        tool_name = input_data.get("tool_name", "")

        if tool_name == "Bash":
            tool_input = input_data.get("tool_input", {})
            command = tool_input.get("command", "")

            # Only check after cd commands
            if command.strip().startswith("cd ") and project_root:
                # Get the actual current directory
                current_dir = os.getcwd()

                # Check if we've escaped the project root
                if not current_dir.startswith(project_root):
                    print(f"⚠️ Directory escape detected!")
                    print(f"   Current dir: {current_dir}")
                    print(f"   Project root: {project_root}")
                    print(f"   Resetting to project root...")

                    # Reset to project root
                    os.chdir(project_root)

                    return {
                        "systemMessage": f"⚠️ You navigated outside the project directory. I've automatically returned you to the project root at `{project_root}`. Please stay within the project directory."
                    }

        return {}

    @staticmethod
    def _validate_tests_json_bash_command(command: str) -> dict[str, Any]:
        """Block bash commands that could modify tests.json.

        Prevents use of awk, jq, python, node, echo, etc. to modify tests.json.
        The agent must use the Edit tool with screenshot verification.

        Args:
            command: Bash command to validate

        Returns:
            Hook response dict (empty if allowed, deny response if blocked)
        """
        for pattern in BLOCKED_TESTS_JSON_PATTERNS:
            if re.search(pattern, command, re.IGNORECASE):
                print(f"🚨 BLOCKED: {command}")
                print("   Cannot use bash commands to modify tests.json")
                return _deny_response(
                    "Cannot use bash commands to modify tests.json. "
                    "You must use the Edit tool to update test results after taking "
                    "and viewing a screenshot that proves the test passes."
                )
        return {}

    @staticmethod
    def _validate_test_result_modification(
        tool_input: dict[str, Any],
        project_root: Optional[str],
    ) -> Optional[dict[str, Any]]:
        """Validate that screenshot AND console check exist and were viewed before marking test as passing.

        This prevents the agent from claiming tests pass without actually running
        and verifying them. The agent must:
        1. Execute the test steps
        2. Take a screenshot with the test ID in the filename
        3. Capture console output to a file
        4. View both the screenshot and console file using the Read tool
        5. Verify no console errors exist
        6. Only then can they mark the test as passing

        Args:
            tool_input: Tool input data containing file_path, old_string, new_string
            project_root: Project root directory

        Returns:
            Hook response dict if validation fails, None if allowed
        """
        file_path = tool_input.get("file_path", "")

        # Only check tests.json modifications
        if not file_path.endswith("tests.json"):
            return None

        # Parse the edit to find which test is being marked as passing
        new_string = tool_input.get("new_string", "")
        old_string = tool_input.get("old_string", "")

        # If changing "passes": false to "passes": true, require screenshot
        if '"passes": true' not in new_string and "'passes': true" not in new_string:
            return None  # Not marking as passing, allow

        # Extract test ID from context
        test_id = _extract_test_id(old_string, new_string)

        if not test_id:
            print(f"🚨 BLOCKED: Cannot determine test ID from edit context")
            return _deny_response(
                "Cannot determine which test you are trying to mark as passing. "
                "Ensure the edit context includes the test 'id' or 'name' field. "
                "You must edit one test at a time with sufficient context."
            )

        # Get issue number from environment
        issue_number = os.environ.get("ISSUE_NUMBER", "0")

        # Check if project_root is set
        if not project_root:
            print(f"⚠️ WARNING: No project_root set, cannot validate screenshots")
            return None  # Can't validate without project root

        # =====================================================================
        # Check 1: Screenshot must exist
        # =====================================================================
        screenshot_pattern = f"{project_root}/screenshots/issue-{issue_number}/{test_id}-*.png"
        screenshots = glob.glob(screenshot_pattern)

        if not screenshots:
            print(f"🚨 BLOCKED: No screenshot found for test '{test_id}'")
            print(f"   Pattern: {screenshot_pattern}")
            return _deny_response(
                f"Cannot mark test '{test_id}' as passing. No screenshot found.\n\n"
                f"You must:\n"
                f"  1. Execute the test steps for '{test_id}'\n"
                f"  2. Take screenshot:\n"
                f"     npx playwright screenshot http://localhost:6174 "
                f"screenshots/issue-{issue_number}/{test_id}-$(date +%s | tail -c 5).png\n"
                f"  3. Capture console output (see instructions below)\n"
                f"  4. View both files using Read tool\n"
                f"  5. Fix any console errors before marking as passing"
            )

        # =====================================================================
        # Check 2: Screenshot must have been viewed
        # =====================================================================
        screenshot_viewed = any(was_screenshot_viewed(s) for s in screenshots)
        if not screenshot_viewed:
            print(f"🚨 BLOCKED: Screenshot exists for test '{test_id}' but not viewed")
            return _deny_response(
                f"Screenshot exists for test '{test_id}' but you haven't verified it.\n\n"
                f"You must use the Read tool to view the screenshot:\n"
                f"  Read file: {screenshots[0]}\n\n"
                f"After viewing, also check the console log file."
            )

        # =====================================================================
        # Check 3: Console log file must exist
        # =====================================================================
        console_pattern = f"{project_root}/screenshots/issue-{issue_number}/{test_id}-console.txt"
        console_files = glob.glob(console_pattern)

        if not console_files:
            print(f"🚨 BLOCKED: No console log found for test '{test_id}'")
            print(f"   Pattern: {console_pattern}")
            return _deny_response(
                f"Cannot mark test '{test_id}' as passing. No console log file found.\n\n"
                f"You must capture browser console output to verify there are no errors.\n\n"
                f"Run this command to take a screenshot AND capture console output:\n"
                f"  node playwright-test.cjs --url http://localhost:6174 --test-id {test_id} "
                f"--output-dir screenshots/issue-{issue_number} --operation full\n\n"
                f"This creates both:\n"
                f"  - screenshots/issue-{issue_number}/{test_id}-<timestamp>.png\n"
                f"  - screenshots/issue-{issue_number}/{test_id}-console.txt\n\n"
                f"Then view both files and fix any errors before marking the test as passing."
            )

        # =====================================================================
        # Check 4: Console log file must have been viewed
        # =====================================================================
        console_viewed = any(was_screenshot_viewed(f) for f in console_files)
        if not console_viewed:
            print(f"🚨 BLOCKED: Console log exists for test '{test_id}' but not viewed")
            return _deny_response(
                f"Console log exists for test '{test_id}' but you haven't verified it.\n\n"
                f"You must use the Read tool to view the console log:\n"
                f"  Read file: {console_files[0]}\n\n"
                f"If there are any console errors, you must fix them before marking the test as passing.\n"
                f"The console log should show 'NO_CONSOLE_ERRORS' for the test to pass."
            )

        print(f"✅ Test '{test_id}' verified: screenshot and console log exist and were viewed")
        return None  # Allow the edit

    @staticmethod
    async def track_read_hook(
        input_data: dict[str, Any],
        tool_use_id: Optional[str] = None,
        context: Optional[Any] = None,
        project_root: Optional[str] = None,
    ) -> dict[str, Any]:
        """PostToolUse hook to track when screenshots are read.

        This is called after the Read tool completes. It tracks which
        screenshot files have been viewed by the agent.

        Args:
            input_data: Tool input data
            tool_use_id: Tool use ID (optional)
            context: Hook context (optional)
            project_root: Project root directory (optional)

        Returns:
            Empty dict (just tracks state, no output)
        """
        tool_name = input_data.get("tool_name", "")

        if tool_name == "Read":
            file_path = input_data.get("tool_input", {}).get("file_path", "")
            track_screenshot_read(file_path)

        return {}
