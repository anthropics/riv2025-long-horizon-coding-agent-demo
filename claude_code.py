# Copyright 2025-present Anthropic PBC.
# Licensed under Apache 2.0

# #!/usr/bin/env python3
"""Claude Code Multi-Project Implementation.

A modular, clean implementation of Claude Code with proper separation of concerns.
"""

import argparse
import asyncio
import builtins
import json
import os
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, Optional

from claude_agent_sdk import ClaudeAgentOptions, ClaudeSDKClient, tool
from claude_agent_sdk.types import (
    AssistantMessage,
    HookMatcher,
    ResultMessage,
    SystemMessage,
    TextBlock,
    ToolResultBlock,
    ToolUseBlock,
)

# Import our custom modules
from src import (
    DEFAULT_BACKEND_PORT,
    DEFAULT_FRONTEND_PORT,
    DEFAULT_MODEL,
    LoggingManager,
    SessionManager,
    TokenTracker,
)
from src.security import SecurityValidator

# Global state
PROJECT_ROOT: Optional[str] = None
SESSION_ID: Optional[str] = None

# Constants
COMPLETION_CONFIRMATIONS_REQUIRED = 1
AUTO_CONTINUE_DELAY_SECONDS = 2
CONTENT_PREVIEW_MAX_LENGTH = 500
THOUGHT_PREVIEW_MAX_LENGTH = 100
PAUSE_POLL_INTERVAL_SECONDS = 10

# State management constants
STATE_FILE_NAME = "agent_state.json"
VALID_STATES = {"continuous", "run_once", "run_cleanup", "pause", "terminated"}

# Error detection patterns
ERROR_PATTERNS = {
    "prompt_too_long": "prompt is too long",
    "json_buffer_size": "JSON message exceeded maximum buffer size",
    "image_size_error": "image dimensions exceed max allowed size",
}

# Completion detection patterns
COMPLETION_MARKERS = {
    "emoji": "🎉",
    "complete": "implementation complete",
    "finished": "all tasks finished",
}

COMPLETION_EXCLUSIONS = ["unfinished", "issues"]


def load_example_test(current_dir: str, project_name: Optional[str]) -> str:
    """Load example test description from project's EXAMPLE_TEST.txt file.

    Args:
        current_dir: Current working directory
        project_name: Project name

    Returns:
        Example test description string
    """
    if not project_name:
        return (
            "navigating through the main pages and verifying core functionality works"
        )

    # Try to load from prompts/{project}/EXAMPLE_TEST.txt
    example_test_path = Path(f"{current_dir}/prompts/{project_name}/EXAMPLE_TEST.txt")

    if example_test_path.exists():
        try:
            return example_test_path.read_text(encoding="utf-8").strip()
        except (OSError, UnicodeDecodeError) as e:
            print(f"⚠️ Warning: Could not read EXAMPLE_TEST.txt: {e}")

    # Fallback to generic example
    return "navigating through the main pages and verifying core functionality works"


@tool(
    name="think",
    description="Use this tool to think through complex problems step-by-step. This helps organize thoughts when debugging, planning implementations, or working through issues. The thought will be logged but won't change any code or data.",
    input_schema={
        "type": "object",
        "properties": {
            "thought": {
                "type": "string",
                "description": "Your structured thinking about the current task or problem",
            }
        },
        "required": ["thought"],
    },
)
async def think_tool(args: dict) -> dict:
    """Think tool for structured problem-solving."""
    thought = args.get("thought", "")
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    print(f"[{timestamp}] 💭 [THINKING]: {thought}")

    preview = _truncate_text(thought, THOUGHT_PREVIEW_MAX_LENGTH)
    return {"content": [{"type": "text", "text": f"Thought recorded: {preview}"}]}


def _truncate_text(text: str, max_length: int) -> str:
    """Truncate text to max_length with ellipsis if needed."""
    return f"{text[:max_length]}..." if len(text) > max_length else text


def _detect_error_patterns(text: str) -> tuple[bool, bool, bool]:
    """Detect various error patterns in text."""
    text_lower = text.lower()
    return (
        ERROR_PATTERNS["prompt_too_long"] in text_lower,
        ERROR_PATTERNS["json_buffer_size"] in text_lower,
        ERROR_PATTERNS["image_size_error"] in text_lower,
    )


def _detect_completion_signal(text: str) -> bool:
    """Detect completion signal in text."""
    text_lower = text.lower()
    has_markers = (
        COMPLETION_MARKERS["emoji"] in text
        and COMPLETION_MARKERS["complete"] in text_lower
        and COMPLETION_MARKERS["finished"] in text_lower
    )
    has_exclusions = any(exclusion in text_lower for exclusion in COMPLETION_EXCLUSIONS)
    return has_markers and not has_exclusions


def _capture_session_id(message, current_session_id: Optional[str]) -> Optional[str]:
    """Extract session ID from message if available."""
    if not isinstance(message, (SystemMessage, ResultMessage)):
        return current_session_id

    session_id = getattr(message, "session_id", None) or (
        getattr(message, "data", {}).get("session_id")
        if hasattr(message, "data")
        else None
    )
    return session_id if session_id else current_session_id


def _process_text_block(block: TextBlock) -> tuple[bool, bool]:
    """Process a text block and return (prompt_too_long_detected, completion_detected)."""
    print(f"Agent: {block.text}")

    prompt_too_long_detected, _, _ = _detect_error_patterns(block.text)
    if prompt_too_long_detected:
        print("\n⚠️ [DETECTED: 'Prompt is too long' - Will terminate session]")

    completion_detected = _detect_completion_signal(block.text)
    return prompt_too_long_detected, completion_detected


def _process_tool_block(block: ToolUseBlock | ToolResultBlock) -> None:
    """Process tool use or tool result blocks."""
    # Include issue number in logs for CloudWatch filtering
    issue_num = os.environ.get('ISSUE_NUMBER', '')
    issue_tag = f" [issue:{issue_num}]" if issue_num else ""
    if isinstance(block, ToolUseBlock):
        print(f"\n[Tool Call] {block.name}{issue_tag}")
        print(f"  Input: {block.input}")
    elif isinstance(block, ToolResultBlock):
        content_preview = _truncate_text(
            str(block.content) if block.content else "No content",
            CONTENT_PREVIEW_MAX_LENGTH,
        )
        print(f"\n[Tool Result] {block.tool_use_id}")
        print(f"  Content: {content_preview}...")
        if block.is_error:
            print("  Error: True")


# ============================================================================
# Agent State Management Functions
# ============================================================================


def _get_utc_timestamp() -> str:
    """Get current UTC timestamp in ISO 8601 format with 'Z' suffix.

    Returns:
        Timestamp string like "2025-10-15T23:52:09.505Z"
    """
    # Use timezone-aware datetime to get proper UTC time
    utc_now = datetime.now(UTC)
    # Format with milliseconds and 'Z' suffix
    # isoformat() with timezone.utc gives +00:00, so we replace with Z
    return utc_now.isoformat(timespec="milliseconds").replace("+00:00", "Z")


def read_agent_state(generation_dir: Path) -> dict[str, Any]:
    """Read the agent state from agent_state.json.

    Returns a dict with keys: desired_state, current_state, timestamp, setBy, note.
    If file doesn't exist or is malformed, returns default pause state.
    """
    state_file = generation_dir / STATE_FILE_NAME

    if not state_file.exists():
        return {
            "desired_state": "pause",
            "current_state": "pause",
            "timestamp": _get_utc_timestamp(),
            "setBy": "agent",
            "note": "Default state (file did not exist)",
        }

    try:
        with open(state_file) as f:
            state = json.load(f)

        # Validate state structure
        if "desired_state" not in state or "current_state" not in state:
            print(
                f"⚠️ Warning: agent_state.json missing required fields, using default pause state"
            )
            return {
                "desired_state": "pause",
                "current_state": "pause",
                "timestamp": _get_utc_timestamp(),
                "setBy": "agent",
                "note": "Malformed state file",
            }

        # Validate state values
        if state["desired_state"] not in VALID_STATES:
            print(
                f"⚠️ Warning: Unknown desired_state '{state['desired_state']}', treating as 'pause'"
            )
            state["desired_state"] = "pause"

        if state["current_state"] not in VALID_STATES:
            print(
                f"⚠️ Warning: Unknown current_state '{state['current_state']}', treating as 'pause'"
            )
            state["current_state"] = "pause"

        return state

    except json.JSONDecodeError as e:
        print(
            f"⚠️ Warning: Could not parse agent_state.json ({e}), using default pause state"
        )
        return {
            "desired_state": "pause",
            "current_state": "pause",
            "timestamp": _get_utc_timestamp(),
            "setBy": "agent",
            "note": "JSON decode error",
        }
    except Exception as e:
        print(
            f"⚠️ Warning: Error reading agent_state.json ({e}), using default pause state"
        )
        return {
            "desired_state": "pause",
            "current_state": "pause",
            "timestamp": _get_utc_timestamp(),
            "setBy": "agent",
            "note": f"Read error: {e}",
        }


def write_agent_state(
    generation_dir: Path,
    desired: Optional[str] = None,
    current: Optional[str] = None,
    note: Optional[str] = None,
) -> None:
    """Write agent state to agent_state.json.

    Updates only the fields provided. Preserves other fields.
    Always updates timestamp.
    """
    state_file = generation_dir / STATE_FILE_NAME

    # Read existing state or start with defaults
    state = read_agent_state(generation_dir)

    # Update provided fields
    if desired is not None:
        if desired not in VALID_STATES:
            print(
                f"⚠️ Warning: Attempting to set invalid desired_state '{desired}', ignoring"
            )
        else:
            state["desired_state"] = desired

    if current is not None:
        if current not in VALID_STATES:
            print(
                f"⚠️ Warning: Attempting to set invalid current_state '{current}', ignoring"
            )
        else:
            state["current_state"] = current

    if note is not None:
        state["note"] = note

    # Always update timestamp and setBy
    state["timestamp"] = _get_utc_timestamp()
    state["setBy"] = "agent"

    # Write atomically by writing to temp file and renaming
    temp_file = state_file.with_suffix(".json.tmp")
    try:
        with open(temp_file, "w") as f:
            json.dump(state, f, indent=2)
        temp_file.replace(state_file)
    except Exception as e:
        print(f"⚠️ Error writing agent state: {e}")
        if temp_file.exists():
            temp_file.unlink()


def update_agent_state(
    generation_dir: Path, current: str, note: Optional[str] = None
) -> None:
    """Convenience function to update only current_state.

    This is the most common operation - agent reporting its status.
    """
    write_agent_state(generation_dir, current=current, note=note)


def parse_arguments() -> argparse.Namespace:
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description="Claude Code Multi-Project Implementation"
    )

    parser.add_argument(
        "--resume",
        type=str,
        help="[DEPRECATED] No longer needed - auto-resumes if output directory exists",
        metavar="SESSION_ID",
    )

    parser.add_argument(
        "--project",
        type=str,
        help="Project name to use (e.g., 'twitter_clone'). Uses default prompts if not specified.",
        metavar="PROJECT_NAME",
    )

    parser.add_argument(
        "--model",
        type=str,
        default=DEFAULT_MODEL,
        help=f"Model ID to use (default: {DEFAULT_MODEL})",
        metavar="MODEL_ID",
    )

    parser.add_argument(
        "--frontend-port",
        type=int,
        default=DEFAULT_FRONTEND_PORT,
        help=f"Port for the frontend server (default: {DEFAULT_FRONTEND_PORT})",
        metavar="PORT",
    )

    parser.add_argument(
        "--backend-port",
        type=int,
        default=DEFAULT_BACKEND_PORT,
        help=f"Port for the backend server (default: {DEFAULT_BACKEND_PORT})",
        metavar="PORT",
    )

    parser.add_argument(
        "--print-prompts",
        action="store_true",
        help="Print the system prompt and initial user prompt that would be sent to Claude Code SDK",
    )

    parser.add_argument(
        "--cleanup-session",
        action="store_true",
        help="Run a single cleanup session to remove technical debt and organize the repository",
    )

    parser.add_argument(
        "--cleanup-frequency",
        type=int,
        help="Run a cleanup session after every N continuation sessions (e.g., --cleanup-frequency 5)",
        metavar="N",
    )

    parser.add_argument(
        "--bootstrap-files",
        action="store_true",
        help="Copy reference implementation files (claude_code.py, src/) into project for agent to study",
    )

    parser.add_argument(
        "--start-paused",
        action="store_true",
        help="Start the agent in paused state instead of continuous (agent will wait for Mission Control to start it)",
    )

    parser.add_argument(
        "--enhance-feature",
        type=str,
        help="Path to a FEATURE_REQUEST.md file describing the feature to add to existing code",
        metavar="SPEC_FILE",
    )

    parser.add_argument(
        "--existing-codebase",
        type=str,
        help="Path to existing codebase to enhance (used with --enhance-feature)",
        metavar="PATH",
    )

    parser.add_argument(
        "--output-dir",
        type=str,
        help="Directory to output generated code (for GitHub mode)",
        metavar="PATH",
    )

    parser.add_argument(
        "--skip-git-init",
        action="store_true",
        help="Skip git initialization (used when bedrock_entrypoint.py handles git setup)",
    )

    return parser.parse_args()


def load_build_plan_content(generation_dir: Path) -> str:
    """Load BUILD_PLAN.md content for use in templates."""
    build_plan_path = generation_dir / "prompts" / "BUILD_PLAN.md"
    if not build_plan_path.exists():
        print(f"⚠️ Warning: BUILD_PLAN.md not found at {build_plan_path}")
        return "[BUILD_PLAN.md not found]"

    try:
        return build_plan_path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as e:
        error_type = "encoding" if isinstance(e, UnicodeDecodeError) else "file system"
        print(f"⚠️ Warning: Could not read BUILD_PLAN.md ({error_type} error): {e}")
        return "[BUILD_PLAN.md could not be loaded]"


def create_thyme_style_message(
    generation_dir: Path,
    frontend_port: int = DEFAULT_FRONTEND_PORT,
    backend_port: int = DEFAULT_BACKEND_PORT,
) -> str:
    """Create a user message with BUILD_PLAN content and injected template parameters."""
    build_plan_content = load_build_plan_content(generation_dir)

    # Load the prompt template from file
    template_path = Path(__file__).parent / "prompt_template.txt"
    try:
        template_content = template_path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as e:
        print(f"⚠️ Warning: Could not load prompt template ({e}), using fallback")
        template_content = (
            "IMPORTANT: Make sure to use the following ports for development:\n"
            "- Frontend: {frontend_port}\n"
            "- Backend: {backend_port}"
        )

    # Inject the template parameters
    injected_template = template_content.format(
        frontend_port=frontend_port, backend_port=backend_port
    )

    return f"Please implement the application based on this build plan:\n\n{build_plan_content}\n\n{injected_template}"


def create_thyme_style_message_from_prompts_dir(prompts_dir: Path) -> str:
    """Create a user message with BUILD_PLAN content loaded directly from prompts directory."""
    build_plan_path = prompts_dir / "BUILD_PLAN.md"
    if not build_plan_path.exists():
        print(f"⚠️ Warning: BUILD_PLAN.md not found at {build_plan_path}")
        build_plan_content = "[BUILD_PLAN.md not found]"
    else:
        try:
            build_plan_content = build_plan_path.read_text(encoding="utf-8")
        except (OSError, UnicodeDecodeError) as e:
            error_type = (
                "encoding" if isinstance(e, UnicodeDecodeError) else "file system"
            )
            print(f"⚠️ Warning: Could not read BUILD_PLAN.md ({error_type} error): {e}")
            build_plan_content = "[BUILD_PLAN.md could not be loaded]"

    return f"Please implement the application based on this build plan:\n\n{build_plan_content}"


def create_enhancement_message(
    feature_request_path: Path,
    generation_dir: Path,
    frontend_port: int = DEFAULT_FRONTEND_PORT,
    backend_port: int = DEFAULT_BACKEND_PORT,
) -> str:
    """Create a user message for enhancement mode with feature request content.

    This is used when the agent is enhancing an existing application rather than
    building from scratch. It reads the FEATURE_REQUEST.md file and creates a
    prompt focused on adding the new feature while preserving existing functionality.
    """
    # Read the feature request file
    try:
        feature_request_content = Path(feature_request_path).read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError) as e:
        error_type = "encoding" if isinstance(e, UnicodeDecodeError) else "file system"
        print(f"⚠️ Warning: Could not read feature request ({error_type} error): {e}")
        feature_request_content = "[FEATURE_REQUEST.md could not be loaded]"

    return f"""# Enhancement Mode - Implement New Feature

You are enhancing an EXISTING application. Your task is to implement the feature described below while preserving all existing functionality.

## Feature Request

{feature_request_content}

## Critical Instructions

### 1. Understand the Existing Codebase
- Start by reading `claude-progress.txt` to understand what has been implemented
- Read `tests.json` to understand the test suite structure
- Review the existing code structure before making changes

### 2. Preserve Existing Functionality
- DO NOT break any existing features
- DO NOT remove or modify existing tests in tests.json
- All existing tests must continue to pass after your changes

### 3. Implement the New Feature
- Add the requested functionality as described above
- Follow the existing code patterns and style
- Add NEW tests to tests.json for the new feature (append to existing array)
- Update claude-progress.txt with your changes

### 4. Testing Your Changes
- Run `npm run build` to verify the build passes - this is REQUIRED before completion
- If build fails, you MUST fix the build errors before proceeding
- Take screenshots to verify UI changes work correctly

### 5. Port Configuration
- Frontend MUST use port: {frontend_port}
- Backend MUST use port: {backend_port}

### 6. Test Verification (CRITICAL - ENFORCED BY SYSTEM)
For EACH test in tests.json, you MUST follow this exact process:

1. **Read the test steps** from tests.json
2. **Execute the test** by performing the steps in the browser
3. **Take a screenshot AND capture console output** using the playwright-test helper:
   `node playwright-test.cjs --url http://localhost:6174 --test-id <TEST_ID> --output-dir screenshots/issue-$ISSUE_NUMBER --operation full`

   This creates both: `<TEST_ID>-<timestamp>.png` and `<TEST_ID>-console.txt`

   For pages with routes: `node playwright-test.cjs --url http://localhost:6174/settings --test-id settings-v1 --output-dir screenshots/issue-$ISSUE_NUMBER --operation full`
4. **View the screenshot** using the Read tool to verify expected behavior
5. **View the console log** using the Read tool to verify NO_CONSOLE_ERRORS
6. **Fix any console errors** - a test CANNOT pass with console errors
7. **ONLY THEN** mark the test as passing using the Edit tool

**THE SYSTEM WILL BLOCK YOUR EDIT IF:**
- No screenshot exists with the test ID in the filename
- No console log file exists (`<TEST_ID>-console.txt`)
- You haven't viewed (Read) both the screenshot AND console log
- The test ID cannot be determined from your edit

**CRITICAL RULES:**
- You MUST NOT bulk-update tests.json (sed/awk/jq/python/node are ALL BLOCKED)
- You MUST take AND view BOTH screenshot AND console log for each test
- Console log MUST show `NO_CONSOLE_ERRORS` - fix any errors first!
- Each test must have: `<TEST_ID>-*.png` AND `<TEST_ID>-console.txt`
- If there are console errors, FIX THEM before marking the test as passing

### 7. Completion Requirements
Before signaling completion, ALL of these must be true:
1. `npm run build` succeeds without errors
2. All pages/features you implemented are verified working (not blank, not erroring)
3. Each test in tests.json has been individually verified and marked as passing
4. No known broken features - if you discover something broken, FIX IT before completing

Only after meeting ALL requirements:
- Update claude-progress.txt with what you implemented
- Take a final screenshot of the working app
- Signal completion with: "🎉 IMPLEMENTATION COMPLETE - ALL TASKS FINISHED"

**DO NOT signal completion if:**
- Build is failing
- Any page shows blank/errors
- You found issues but didn't fix them
- You used sed/awk to bulk-modify tests.json

Remember: You are ENHANCING an existing app, not building from scratch. Preserve what works, add what's needed.

You should run `pwd` at the start of the session to get your bearings. You will only be able to operate on files within your current working directory.
"""


def create_cleanup_session_message(generation_dir: Path) -> str:
    """Create a user message for cleanup sessions focused on removing technical debt."""
    build_plan_content = load_build_plan_content(generation_dir)

    return f"""# CLEANUP SESSION - Technical Debt Removal

Your mission for this session is to **aggressively clean up technical debt** in this repository, NOT to implement new features or fix bugs.

## Project Context

This is a project implementing the following specification:

{build_plan_content}

The project has gone through many implementation sessions, and technical debt has accumulated. Your job is to make the repository dramatically easier to navigate.

## What You Should Do

Start by understanding the current state:
- Read `claude-progress.txt` to understand what's been implemented (and assess if it needs condensing)
- Read `tests.json` to see the test suite structure
- Look at the git history to see patterns of commits
- Survey the directory structure

Then aggressively address these types of technical debt:

### 1. Test Script Sprawl
- Dozens of one-off test scripts scattered in root directory
- Multiple versions of similar tests (test_X.mjs, test_X_v2.mjs, test_X_direct.mjs)
- Session-specific verification scripts that served one purpose
- Scripts in "old-test-scripts/" directories that were never deleted

**Be ruthless**: If a test script was only used once in an old session, delete it. If there are 5 variations of the same test, pick the best one and delete the rest.

### 2. Screenshot Clutter
- 100+ PNG files dumped in root directory
- Session-specific screenshots (s73_test_01_main.png)
- Verification screenshots from debugging
- Screenshots that were useful once but aren't documentation

**Be aggressive**: Keep maybe 5-10 screenshots that document the final product. Delete the rest. They're artifacts of development, not documentation.

### 3. Documentation Bloat
- Multiple SESSION_N_SUMMARY.md files accumulating
- Multiple versions of handoff docs (NEXT_SESSION_START_HERE.md, v2, v3)
- Session notes files (session32_notes.txt, session77_header.txt)

**Be decisive**: Current session progress is in claude-progress.txt. Historical session summaries are in git history. Delete old handoff documents unless they contain unique value.

### 4. One-Off Utility Scripts
- Small Python/JavaScript scripts created for one specific task
- Scripts with version numbers in names (update_tests2.py)
- Scripts that duplicate functionality

**Be practical**: If it's a one-liner or does something trivial, delete it. If multiple scripts do similar things, consolidate to one good version.

### 5. Structural Organization
- No clear separation between production code, test artifacts, and development utilities
- Things dumped in root that should be organized
- Logs and temporary files that don't belong

**Be smart**: Create minimal organization if it helps (a scripts/ directory, moving a few things), but don't over-engineer it. The best organization is having fewer files.

### 6. Dead Code & Dependencies
- Unused npm dependencies
- Dead imports in source files
- Commented-out code
- TODO comments from many sessions ago

**Be thorough**: Remove unused dependencies. Delete commented-out code (it's in git). Clean up imports.

### 7. Progress File Cleanup
- claude-progress.txt can accumulate stale session notes spanning dozens of sessions
- Redundant information that's already captured in git history
- Contradictory or outdated status information from old sessions
- Verbose play-by-play descriptions that obscure current state
- Session-specific notes that are no longer relevant

**Be thoughtful**: claude-progress.txt should help future sessions understand the *current* state, not provide a complete historical record (that's what git is for). If it's bloated with detailed notes from 50 sessions ago, condense it aggressively. Keep:
- Current implementation status
- Known issues or important context
- Critical architectural decisions

You do not need to be too aggressive in cleaning up claude-progress.txt - you'll have chances in the future to clean up. But if anything is clearly obsolete or redundant, feel free to remove it.

## Guiding Principles

1. **When in doubt, delete it.** Git history preserves everything.

2. **Be aggressive, not conservative.** The repository has suffered from accumulation, not from over-deletion.

3. **Value clarity over completeness.** A repository with 20 essential files is better than one with 200 files where 180 are obsolete.

4. **Focus on developer experience.** The next session should be able to quickly understand what's in the repository.

5. **Preserve what matters:**
   - Production code (src/, core config files)
   - Current progress tracking (claude-progress.txt can be edited/condensed but never deleted; tests.json test completions must NEVER be modified)
   - Build/dev scripts that are actively used (init.sh, package.json)
   - Current prompts (prompts/)
   - Session logs (logs/ directory - these are for debugging, never modify or delete)
   - Human backlog (human_backlog.json - contains explicit human requests, never modify or delete)

6. **Don't overthink organization.** You don't need a perfect folder structure. You need fewer files.

## Critical Rules

- **NEVER modify tests.json test completions**
- **NEVER delete src/, prompts/, claude-progress.txt, tests.json, logs/, human_backlog.json**
- **NEVER modify or delete anything in logs/ directory** (session logs for debugging)
- **NEVER modify or delete human_backlog.json** (contains explicit human feature/bug requests)
- **NEVER implement new features or fix bugs** - this is cleanup only
- **NEVER remove or modify files in prompts/** (these are the source of truth for requirements)
- **DO create a git commit before major deletions** for easy rollback
- **DO test that the app still runs after cleanup** (run ./init.sh if it exists)
- **DO document what you deleted and why** in your summary

## Approach

You have complete agency in how you tackle this. Use your judgment. Be bold. Make the repository clean.

The smell test: If a fresh developer looked at this repository, would they be confused by artifacts from old sessions? If yes, be more aggressive with deletion.
"""


def _create_message_log_data() -> dict[str, Any]:
    """Create initial message log data structure."""
    return {
        "type": "agent_response",
        "session_id": SESSION_ID,
        "timestamp": datetime.now().isoformat(),
        "messages": [],
        "completion_detected": False,
        "prompt_too_long_detected": False,
        "image_size_error_detected": False,
    }


def _update_session_id_from_message(
    message: Any, message_log_data: dict[str, Any]
) -> None:
    """Update global session ID if found in message."""
    global SESSION_ID

    session_id = _capture_session_id(message, SESSION_ID)
    if session_id and SESSION_ID is None:
        SESSION_ID = session_id
        message_log_data["session_id"] = SESSION_ID
        print(f"📌 [Captured Session ID: {SESSION_ID}]")


def _process_assistant_message(message: AssistantMessage) -> tuple[bool, bool]:
    """Process assistant message blocks and return detection flags."""
    prompt_too_long_detected = False
    completion_detected = False

    for block in message.content:
        if isinstance(block, TextBlock):
            block_prompt_too_long, block_completion = _process_text_block(block)
            prompt_too_long_detected = prompt_too_long_detected or block_prompt_too_long
            completion_detected = completion_detected or block_completion
        elif isinstance(block, (ToolUseBlock, ToolResultBlock)):
            _process_tool_block(block)

    return prompt_too_long_detected, completion_detected


def _handle_api_error(
    error: Exception,
    message_log_data: dict[str, Any],
    logging_manager: LoggingManager,
    run_dir: Optional[Path],
) -> tuple[bool, str]:
    """Handle API errors and return (should_terminate, error_type)."""
    error_str = str(error)
    print(f"\n❌ [API Error]: {error_str}")
    message_log_data["error"] = error_str
    message_log_data["error_timestamp"] = datetime.now().isoformat()

    _, json_buffer_error, image_size_error = _detect_error_patterns(error_str)

    if json_buffer_error:
        print("\n🚨 [DETECTED: JSON buffer size error - Will terminate session]")
        message_log_data["json_buffer_error_detected"] = True
        return True, "json_buffer_size"
    elif image_size_error:
        print("\n🚨 [DETECTED: Image size error - Will terminate session]")
        message_log_data["image_size_error_detected"] = True
        return True, "image_size_error"
    else:
        if run_dir:
            logging_manager.save_json_log(run_dir, message_log_data)
        raise error


async def log_agent_response(
    client: ClaudeSDKClient,
    token_tracker: TokenTracker,
    logging_manager: LoggingManager,
    pause_flag: Optional[dict] = None,
    run_dir: Optional[Path] = None,
) -> str:
    """Log agent responses and update token tracking."""
    global SESSION_ID

    completion_detected = False
    prompt_too_long_detected = False
    image_size_error_detected = False

    message_log_data = _create_message_log_data()

    try:
        async for message in client.receive_response():
            # Serialize message for JSON logging
            try:
                message_json = logging_manager.serialize_message_for_json(message)
                message_log_data["messages"].append(message_json)
            except Exception as json_error:
                print(f"⚠️ Failed to serialize message for JSON: {json_error}")

            # Check for pause request
            if pause_flag and pause_flag.get("requested", False):
                print("\n[Agent paused by user]")
                if SESSION_ID:
                    message_log_data["session_id"] = SESSION_ID
                if run_dir:
                    logging_manager.save_json_log(run_dir, message_log_data)
                return "paused"

            # Update session ID from message
            _update_session_id_from_message(message, message_log_data)
            if SESSION_ID:
                logging_manager.session_id = SESSION_ID

            # Process assistant messages
            if isinstance(message, AssistantMessage):
                msg_prompt_too_long, msg_completion = _process_assistant_message(
                    message
                )
                prompt_too_long_detected = (
                    prompt_too_long_detected or msg_prompt_too_long
                )
                completion_detected = completion_detected or msg_completion

    except Exception as e:
        should_terminate, error_type = _handle_api_error(
            e, message_log_data, logging_manager, run_dir
        )
        if should_terminate:
            if run_dir:
                logging_manager.save_json_log(run_dir, message_log_data)
            await handle_session_terminating_error(
                client, logging_manager, run_dir, error_type
            )
            image_size_error_detected = error_type == "image_size_error"

    # Update log data with final detection states
    message_log_data.update(
        {
            "completion_detected": completion_detected,
            "prompt_too_long_detected": prompt_too_long_detected,
            "image_size_error_detected": image_size_error_detected,
        }
    )

    # Save final JSON log data
    if run_dir:
        logging_manager.save_json_log(run_dir, message_log_data)

    # Update token counts
    if token_tracker.update_from_messages(message_log_data.get("messages", [])):
        # Get the last usage for display
        last_usage = None
        for message in reversed(message_log_data.get("messages", [])):
            last_usage = token_tracker.extract_usage_from_message(message)
            if last_usage:
                break

        token_tracker.print_current_usage(last_usage)
        token_tracker.check_limits()

        # Export token stats for CloudWatch dashboard metrics
        try:
            token_export = {
                "input_tokens": token_tracker.totals.input_tokens,
                "output_tokens": token_tracker.totals.output_tokens,
                "cache_read_tokens": token_tracker.totals.cache_read_input_tokens,
                "cache_creation_tokens": token_tracker.totals.cache_creation_input_tokens,
                "total_cost_usd": token_tracker.totals.total_cost_usd,
                "api_calls": token_tracker.totals.api_calls,
            }
            Path("/tmp/token_stats.json").write_text(json.dumps(token_export))
        except Exception:
            pass  # Non-critical - dashboard metrics export

    # Return status
    if prompt_too_long_detected:
        return "prompt_too_long"
    elif image_size_error_detected:
        return "image_size_error_fixed"
    else:
        return "completion_claimed" if completion_detected else "continue"


async def handle_session_terminating_error(
    client: ClaudeSDKClient,
    logging_manager: LoggingManager,
    run_dir: Optional[Path] = None,
    error_type: str = "unknown",
) -> None:
    """Handle errors that require session termination by logging and raising exception."""
    print(f"🚨 Session terminating error: {error_type}")
    print("   → Will start fresh session with clean context")
    print("   → Progress will be maintained via claude-progress.txt")

    if run_dir:
        logging_manager.log_user_query(
            run_dir,
            f"Session terminated due to {error_type}",
            f"{error_type}_termination",
        )

    # Raise exception to terminate current session
    raise RuntimeError(f"Session terminated due to {error_type}")



def _create_claude_client(
    args: argparse.Namespace,
    system_prompt: str,
    generation_dir: Path,
) -> ClaudeSDKClient:
    """Create and configure the Claude SDK client."""

    # Use the generation_dir directly as the project root
    project_root = str(generation_dir)

    # Create security hook wrappers that capture project_root
    async def bash_security_hook_wrapper(input_data, tool_use_id=None, context=None):
        return await SecurityValidator.bash_security_hook(
            input_data, tool_use_id, context, project_root
        )

    async def cd_enforcement_hook_wrapper(input_data, tool_use_id=None, context=None):
        return await SecurityValidator.cd_enforcement_hook(
            input_data, tool_use_id, context, project_root
        )

    async def universal_path_security_hook_wrapper(
        input_data, tool_use_id=None, context=None
    ):
        return await SecurityValidator.universal_path_security_hook(
            input_data, tool_use_id, context, project_root
        )

    async def track_read_hook_wrapper(input_data, tool_use_id=None, context=None):
        return await SecurityValidator.track_read_hook(
            input_data, tool_use_id, context, project_root
        )

    # For Docker/AWS deployment: explicitly set CLI path if in containerized environment
    cli_path = "/usr/local/bin/claude" if os.path.exists("/usr/local/bin/claude") else None

    return ClaudeSDKClient(
        options=ClaudeAgentOptions(
            model=args.model,
            system_prompt=system_prompt,
            cli_path=cli_path,  # Explicitly set for Docker compatibility
            allowed_tools=[
                "think",
                "Read",
                "Glob",
                "Grep",
                "Write",
                "Edit",
                "MultiEdit",
                "Bash",
            ],
            disallowed_tools=[],
            mcp_servers={},
            hooks={
                "PreToolUse": [
                    HookMatcher(
                        matcher="*", hooks=[universal_path_security_hook_wrapper]
                    ),
                ],
                "PostToolUse": [
                    HookMatcher(matcher="Bash", hooks=[cd_enforcement_hook_wrapper]),
                    HookMatcher(matcher="Read", hooks=[track_read_hook_wrapper]),
                ],
            },
            max_turns=10000,
            cwd=str(generation_dir),
            add_dirs=[str(generation_dir / "prompts")],
        )
    )


async def _run_cleanup_session(
    generation_dir: Path,
    args: argparse.Namespace,
    system_prompt: str,
    logging_manager: LoggingManager,
    token_tracker: TokenTracker,
    transition_to_pause: bool = False,
) -> None:
    """Run a single cleanup session to remove technical debt.

    Args:
        generation_dir: Project directory
        args: Command line arguments
        system_prompt: System prompt for Claude
        logging_manager: Logging manager instance
        token_tracker: Token tracking instance
        transition_to_pause: If True, set state to pause after completion (for run_cleanup state).
                           If False, continue normally (for cleanup during continuous mode).
    """
    print("\n" + "=" * 80)
    print("🧹 STARTING CLEANUP SESSION")
    print("=" * 80)
    print("Mission: Aggressively clean up technical debt and organize the repository")
    print("This session will NOT implement features or fix bugs\n")

    client = _create_claude_client(args, system_prompt, generation_dir)

    try:
        async with client:
            message = create_cleanup_session_message(generation_dir)
            query_type = "cleanup"

            print(f"User: [Starting cleanup session with cleanup-specific prompt]")
            logging_manager.log_user_query(generation_dir, message, query_type)
            await client.query(message)

            # Run the cleanup session
            await log_agent_response(
                client, token_tracker, logging_manager, run_dir=generation_dir
            )

            print("\n" + "=" * 80)
            print("✅ CLEANUP SESSION COMPLETE")
            print("=" * 80)
            print("Repository should now be cleaner and easier to navigate\n")

            # Transition to pause if this was a single-shot cleanup (run_cleanup state)
            if transition_to_pause:
                write_agent_state(
                    generation_dir,
                    desired="pause",
                    current="pause",
                    note="Cleanup session completed, transitioning to pause",
                )
                print("🔄 State transitioned to pause after cleanup session\n")

    except Exception as e:
        print(f"\n❌ Cleanup session error: {e}")
        raise


async def _handle_pause_mode(generation_dir: Path) -> None:
    """Handle pause mode - poll for state changes and wait."""
    update_agent_state(generation_dir, "pause", "Agent paused, waiting for commands")
    print("\n" + "=" * 80)
    print("⏸️  AGENT PAUSED")
    print("=" * 80)
    print(f"Polling agent_state.json every {PAUSE_POLL_INTERVAL_SECONDS} seconds...")
    print(
        "Waiting for desired_state to change (continuous, run_once, or run_cleanup)\n"
    )

    while True:
        await asyncio.sleep(PAUSE_POLL_INTERVAL_SECONDS)
        state = read_agent_state(generation_dir)
        desired = state["desired_state"]

        if desired != "pause":
            print(f"\n✅ State change detected: desired_state = '{desired}'")
            print("Exiting pause mode...\n")
            break


async def _run_single_session(
    generation_dir: Path,
    args: argparse.Namespace,
    system_prompt: str,
    logging_manager: LoggingManager,
    token_tracker: TokenTracker,
    current_dir: str,
    is_first_session: bool = False,
) -> str:
    """Run a single implementation session.

    Returns:
        Session result: "completion_claimed", "continue", "prompt_too_long", etc.
    """
    client = _create_claude_client(args, system_prompt, generation_dir)

    async with client:
        # Determine message type based on mode
        # Check for enhancement mode in two ways:
        # 1. Explicit --enhance-feature argument (initial launch)
        # 2. FEATURE_REQUEST.md exists in parent dir (multi-issue: new issue after first build)
        #
        # Note: We only check parent's FEATURE_REQUEST.md for non-first sessions.
        # For first session, bedrock_entrypoint.py already set the correct mode via args.
        # After reading FEATURE_REQUEST.md, we rename it to .processed so that
        # continuation sessions don't re-read it.
        feature_request_path = None
        if args.enhance_feature:
            # Explicit enhancement mode from command line
            feature_request_path = Path(args.enhance_feature)
        elif not is_first_session:
            # Check parent directory for FEATURE_REQUEST.md (multi-issue scenario)
            # This handles: first issue was full build, subsequent issues are enhancements
            # Only use it if it's actually an enhancement request (contains "Mode: Enhancement")
            parent_feature_request = generation_dir.parent / "FEATURE_REQUEST.md"
            if parent_feature_request.exists():
                try:
                    content = parent_feature_request.read_text(encoding="utf-8")
                    # Only use enhancement mode if the file says so
                    # (Full Build requests should not trigger enhancement mode)
                    if "Enhancement" in content and "Full Build" not in content:
                        feature_request_path = parent_feature_request
                except (OSError, UnicodeDecodeError):
                    pass  # If we can't read it, skip enhancement mode

        if feature_request_path and feature_request_path.exists():
            # Enhancement mode - use feature request as task specification
            query_type = "enhancement"
            message = create_enhancement_message(
                feature_request_path,
                generation_dir,
                args.frontend_port,
                args.backend_port,
            )
            print(f"User: [Enhancement mode - implementing feature from {feature_request_path}]")

            # Mark as processed so continuation sessions don't re-read it
            # Only rename if it's not the explicit --enhance-feature arg (which might be reused)
            if not args.enhance_feature:
                try:
                    processed_path = feature_request_path.with_suffix(".md.processed")
                    feature_request_path.rename(processed_path)
                    print(f"📝 Marked feature request as processed: {processed_path.name}")
                except OSError as e:
                    print(f"⚠️ Could not mark feature request as processed: {e}")
        elif is_first_session:
            query_type, message = _prepare_initial_query(args, generation_dir)
            message += f"""
CRITICAL PORT CONFIGURATION:
- You MUST configure vite.config.ts with: server: {{ port: {args.frontend_port} }}
- You MUST configure backend server to use port: {args.backend_port}
- Never use default ports (5173, 3000) as they may conflict with other running apps

"""
            message += """
You absolutely must start by writing a detailed testing plan in tests.json. This should include at least 200 extremely detailed end-to-end tests that must be completed using Playwright CLI for screenshots and manual verification. The JSON file should be an array of objects in this format:
[
  {"category": "functional",
    "description": "User can sign in and navigate to the home page",
    "steps": [
      "Navigate to the sign-in page",
      "Enter credentials",
      "Click sign-in button",
      "Verify redirection to home page"
    ],
    "passes": false
  },
  {"category": "style",
    "description": "Sign-in component is perfectly formatted, well-spaced, clean, and modern",
    "steps": [
      "Navigate to the sign-in page",
      "Take a screenshot",
      "Verify that the forms and buttons on the sign-in page are well-spaced",
      "Verify redirection to home page"
    ],
    "passes": false
  },
  ...
]

There should be distinct tests for both functionality and style/UI quality. For example, a good end-to-end test case is 'Navigated to Page X. Clicked the Search Bar. Inputted Text. Clicked the Search button. Saw Successful search results.'. You can only mark a test as complete once you have successfully completed a run through the web site and reviewed the screenshots.

There should be a good mix of both short and very long functional tests. A functional test can span as many as 20 steps. For example, a long functional test may require logging in to the app, opening a DM with another user, sending a message, starting a thread in that message, replying in that thread, and seeing the AI response in that thread. At least 25 of the tests MUST have at least 10 steps.

Order the tests with the most fundamental functionality first, and the most advanced features last. This way, you can build up the app piece by piece and verify that the core functionality is working before moving on to more advanced features. You should also start with a foundation for a beautiful, modern design.

Make sure you don't miss anything! It's extremely important that we implement every feature so that this is a fully production-quality website with no bugs. You have unlimited time, so take as long as you need to get everything perfect. This is not a demo, it's a production-quality final product.

If a file called `human_backlog.json` exists in the project root, check it for any specific feature requests or bug fixes that a human has explicitly requested. These should be prioritized based on priority and status. The file format is a JSON array with items like:

[
  {
    "id": "1760571330555",
    "type": "bug" | "feature" | "idea",
    "priority": "low" | "medium" | "high" | "critical",
    "status": "backlog" | "in progress" | "blocked" | "done",
    "description": "Brief description",
    "details": "Additional context or requirements",
    "comments": [
      {
        "author": "agent" | "human",
        "timestamp": "2025-10-15T23:42:06.734Z",
        "text": "Comment text with updates or discussions"
      }
    ],
    "added": "2025-10-15T23:35:30.555Z",
    "completed": false,
    "completedDate": null
  }
]

IMPORTANT RULES for human_backlog.json:
- DO NOT modify id, type, priority, description, details, or added fields - these are set by the human
- You MAY add comments to the comments array to discuss progress or ask questions
- You MAY change status from "backlog" → "in progress" → "done" as you work on items
- When marking as "done", set completed: true, completedDate: "<ISO timestamp>", status: "done"
- If blocked, set status: "blocked" and add a comment explaining why
- DO NOT delete items from this file - mark them as done instead
- Prioritize items by: critical > high > medium > low, and "in progress" items should be finished first

Since the next session will start without much context, you should also try writing a script like `init.sh` that can quickly restart both the backend and frontend servers and document it so that the continuation can quickly get the app set up without too much work. You should also set up a unit test suite that can be run as part of the `init.sh` script at the beginning of a continuation session.

When writing init.sh, use absolute paths and avoid changing directories:
- Get script directory: SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
- Use absolute paths for all commands: node "$SCRIPT_DIR/server/server.js"
- Use absolute paths for log files: > "$SCRIPT_DIR/server.log" 2>&1 &
- Only cd once if required by npm/package.json: cd "$SCRIPT_DIR"
- Never cd into subdirectories and back (cd server && ... && cd ..)
"""
        else:
            # Continuation session
            query_type = "auto_continue"
            message = create_thyme_style_message(
                generation_dir, args.frontend_port, args.backend_port
            )
            example_test = load_example_test(current_dir, args.project)
            message += f"""
CRITICAL PORT CONFIGURATION:
- Frontend MUST use port: {args.frontend_port} (configured in vite.config.ts: server: {{ port: {args.frontend_port} }})
- Backend MUST use port: {args.backend_port}
- Verify these ports are correctly configured before starting any servers

You absolutely must start by reading the claude-progress.txt and tests.json files and the git history to see how many tests have been completed and what work is remaining. DO NOT UNDER ANY CIRCUMSTANCES remove test cases from claude-progress.txt. You should only check a box for a unit test when it's perfectly done.

**CHECK FOR WIP COMMITS**: Run `git log --oneline -5` to check recent commits. If you see a commit starting with "wip:" (e.g., "wip: Session timeout approaching"), this means the previous session was interrupted by a timeout and created an automatic work-in-progress commit. This WIP commit contains all uncommitted work from the previous session. You should:
1. Review what was being worked on from the WIP commit message
2. Read claude-progress.txt to understand the current state
3. Continue from where the previous session left off
4. Make a regular commit once you complete the work that was in progress

Check if a file called `human_backlog.json` exists in the project root. If it does, read it at the start of your session. This file contains feature requests and bug fixes that a human has explicitly requested. Prioritize these items based on their priority and status.

The file format is a JSON array of items like:
[
  {{
    "id": "1760571330555",
    "type": "bug" | "feature" | "idea",
    "priority": "low" | "medium" | "high" | "critical",
    "status": "backlog" | "in progress" | "blocked" | "done",
    "description": "Brief description",
    "details": "Additional context or requirements",
    "comments": [
      {{
        "author": "agent" | "human",
        "timestamp": "2025-10-15T23:42:06.734Z",
        "text": "Comment text with updates or discussions"
      }}
    ],
    "added": "2025-10-15T23:35:30.555Z",
    "completed": false,
    "completedDate": null
  }}
]

IMPORTANT RULES for human_backlog.json:
- DO NOT modify id, type, priority, description, details, or added fields - these are set by the human
- You MAY add comments to the comments array to discuss progress or ask questions
- You MAY change status from "backlog" → "in progress" → "done" as you work on items
- When marking as "done", set completed: true, completedDate: "<ISO timestamp>", status: "done"
- If blocked, set status: "blocked" and add a comment explaining why
- DO NOT delete items from this file - mark them as done instead
- Prioritize items by: critical > high > medium > low, and "in progress" items should be finished first

If `init.sh` already exists, you should run it to restart the servers. Otherwise, since the next session will start without much context, you should try writing a script called `init.sh` that can quickly restart both the backend and frontend servers and document it so that the continuation can quickly get the app set up without too much work.

`init.sh` should start by running a unit test suite. You should add to this unit test suite as you add new features, and make sure it continues to pass all tests before moving on to Playwright tests.

CRITICAL: YOU CAN ONLY CHANGE ONE LINE OF THE tests.json FILE AT A TIME. THE ONLY CHANGES YOU CAN MAKE TO THE TESTS IS CHANGING THE "passes" FIELD, AND YOU MAY ONLY DO THIS WHEN YOU HAVE VERIFIED THAT A TEST PASSES BY DOING THE TESTING YOURSELF. IT IS CATASTROPHIC TO REMOVE OR EDIT TESTS BECAUSE THIS MEANS THAT FUNCTIONALITY COULD BE MISSING OR BUGGY.

**IMPORTANT**: If human_backlog.json exists, prioritize items in this order:
1. Items with status "in progress" - finish what was started
2. Items with priority "critical" - urgent bugs or features
3. Items with priority "high" - important work
4. Items with priority "medium" - standard backlog items
5. Items with priority "low" - nice-to-haves

These are explicit human requests that take precedence over general test completion work.

Since this is a continuation session, you should be very skeptical about the current state of the project. The last session may have broken tests that were marked as complete. After reading the progress notes, you should start the session by running through 1-2 of the longest and most fundamental functional tests that are marked as complete, if any are. If this verification shows any issues at all, you should immediately mark the test as "passes": false and work on fixing it before moving on to new features. This includes UI bugs: if you see issues, you should fix those immediately. Make a list of any UI imperfections that you see and prioritize those above adding new functionality.

Check for a list of UI bugs like the following:
 1. white-on-white or otherwise hard to read text
 2. random characters being displayed (e.g. "0" randomly placed after a username)
 3. message timestamps being reported in the future
 4. sidebars not being displayed due to components overflowing with no scrolling
 5. buttons or text being too close together or overlapping

An example of a test that verifies fundamental functionality is {example_test}

Your goal is ultimately to have a perfect UI and to get all the tests checked off, and in this session, you should try to make incremental progress towards that goal. Once you've read the progress file and the git history and verified basic functionality, you should start with the most critical uncompleted test and try to get it working, then move on to the next one only when it's perfectly done.

**The Boy Scout Rule: Leave It Better Than You Found It**
Before you end your session, it is MANDATORY for you to take a moment to scan your changes. Did you add appropriate tests for your new code? Are files organized according to the project's structure? If you touched existing code, did you clean up any unused or outdated pieces you spotted along the way? Did you create many files when you could have consolidated them?

Small acts of tidiness compound. Every feature is a chance to make the next developer's life easier—including future you. Ship your feature *and* leave the codebase a little more organized, a little better tested, and a little less cluttered than when you started. Always remember to leave plenty of time to be a good steward of the codebase before you finish your session.
"""
            print("\n[Auto-continuing: Running next session]")

        message += """
Remember that we are looking for a production-quality website where every single component works with no bugs. For browser testing, use Playwright CLI to take screenshots and verify the UI:
- Take screenshots: `mkdir -p screenshots/issue-$ISSUE_NUMBER && npx playwright screenshot http://localhost:PORT screenshots/issue-$ISSUE_NUMBER/<name>-<hash>.png`
- Full-page: `mkdir -p screenshots/issue-$ISSUE_NUMBER && npx playwright screenshot --full-page http://localhost:PORT screenshots/issue-$ISSUE_NUMBER/<name>-<hash>.png`
- Custom viewport: `mkdir -p screenshots/issue-$ISSUE_NUMBER && npx playwright screenshot --viewport-size="1280,900" http://localhost:PORT screenshots/issue-$ISSUE_NUMBER/<name>-<hash>.png`
- Use descriptive names with short hash, e.g. `screenshots/issue-87/homepage-initial-a1b2c3.png`
- Read the screenshot file using the Read tool to visually verify the UI

You should run `pwd` at the start of the session to get your bearings. You will only be able to operate on files within your current working directory.

You must not use `sleep()` command for more than 1 second at a time.
"""
        print(f"User: [Using Thyme-style template for {query_type}] (Fresh context)")
        logging_manager.log_user_query(generation_dir, message, query_type)
        await client.query(message)

        # Check agent response
        result = await log_agent_response(
            client, token_tracker, logging_manager, run_dir=generation_dir
        )

        return result


async def _handle_implementation_loop(
    generation_dir: Path,
    args: argparse.Namespace,
    system_prompt: str,
    logging_manager: LoggingManager,
    token_tracker: TokenTracker,
    current_dir: str,
    is_existing_project: bool = False,
) -> None:
    """Handle the main state-driven implementation loop.

    This function now operates based on the agent_state.json file:
    - continuous: Keep running sessions indefinitely
    - run_once: Run one session then transition to pause
    - run_cleanup: Run one cleanup session then transition to pause
    - pause: Wait and poll for state changes
    """
    first_run = True
    completion_confirmations = 0
    continuation_counter = 0  # Track continuation sessions for cleanup frequency

    while True:
        # Read current desired state
        state = read_agent_state(generation_dir)
        desired = state["desired_state"]

        print(
            f"\n📊 Current state: desired='{desired}', current='{state['current_state']}'"
        )

        try:
            if desired == "pause":
                # Enter pause mode - poll for state changes
                await _handle_pause_mode(generation_dir)
                # After exiting pause mode, loop will re-read state

            elif desired == "continuous":
                # Continuous mode - run sessions indefinitely
                update_agent_state(
                    generation_dir, "continuous", "Running in continuous mode"
                )

                # Run a single session
                result = await _run_single_session(
                    generation_dir,
                    args,
                    system_prompt,
                    logging_manager,
                    token_tracker,
                    current_dir,
                    is_first_session=(first_run and not is_existing_project),
                )
                first_run = False
                continuation_counter += 1

                # Handle session result
                if result == "prompt_too_long":
                    print(
                        "\n⚠️ Prompt too long error - will start fresh session next loop"
                    )
                    await asyncio.sleep(AUTO_CONTINUE_DELAY_SECONDS)
                elif result == "completion_claimed":
                    completion_confirmations += 1
                    if completion_confirmations >= COMPLETION_CONFIRMATIONS_REQUIRED:
                        print(
                            f"\n✅ Agent confirmed completion {COMPLETION_CONFIRMATIONS_REQUIRED} times!"
                        )
                        print("Transitioning to pause state...\n")
                        write_agent_state(
                            generation_dir,
                            desired="pause",
                            current="pause",
                            note="Implementation complete",
                        )
                    else:
                        print(
                            f"\n🔄 Completion claimed ({completion_confirmations}/{COMPLETION_CONFIRMATIONS_REQUIRED})"
                        )
                        await asyncio.sleep(AUTO_CONTINUE_DELAY_SECONDS)
                else:
                    # Reset confirmations if agent continues working
                    if completion_confirmations > 0:
                        print("[Agent continuing work - resetting completion counter]")
                        completion_confirmations = 0
                    await asyncio.sleep(AUTO_CONTINUE_DELAY_SECONDS)

                # Check if we should run a cleanup session (during continuous mode, doesn't pause)
                if (
                    args.cleanup_frequency
                    and continuation_counter > 0
                    and continuation_counter % args.cleanup_frequency == 0
                ):
                    print(
                        f"\n🧹 Cleanup frequency reached ({continuation_counter} sessions)"
                    )
                    print("Running cleanup session (will continue after)...\n")
                    await asyncio.sleep(2)
                    await _run_cleanup_session(
                        generation_dir,
                        args,
                        system_prompt,
                        logging_manager,
                        token_tracker,
                        transition_to_pause=False,  # Don't pause, continue running
                    )

            elif desired == "run_once":
                # Run exactly one session, then transition to pause
                update_agent_state(generation_dir, "run_once", "Running single session")
                print("\n🎯 Running single session (will pause after)...\n")

                result = await _run_single_session(
                    generation_dir,
                    args,
                    system_prompt,
                    logging_manager,
                    token_tracker,
                    current_dir,
                    is_first_session=(first_run and not is_existing_project),
                )
                first_run = False

                # Transition to pause after completion
                write_agent_state(
                    generation_dir,
                    desired="pause",
                    current="pause",
                    note="Single session completed, transitioning to pause",
                )
                print("\n✅ Single session complete. Transitioned to pause.\n")

            elif desired == "run_cleanup":
                # Run exactly one cleanup session, then transition to pause
                update_agent_state(
                    generation_dir, "run_cleanup", "Running cleanup session"
                )
                print("\n🧹 Running single cleanup session (will pause after)...\n")

                await _run_cleanup_session(
                    generation_dir,
                    args,
                    system_prompt,
                    logging_manager,
                    token_tracker,
                    transition_to_pause=True,  # Will set state to pause after
                )
                first_run = False
                print("\n✅ Cleanup session complete. Transitioned to pause.\n")

            else:
                # Unknown state - treat as pause
                print(f"\n⚠️ Unknown desired_state: '{desired}', treating as pause")
                write_agent_state(
                    generation_dir,
                    desired="pause",
                    current="pause",
                    note=f"Unknown state '{desired}' converted to pause",
                )

        except RuntimeError as e:
            if "Session terminated" in str(e):
                raise  # Re-raise to propagate up
            else:
                raise


def _prepare_initial_query(
    args: argparse.Namespace, generation_dir: Path
) -> tuple[str, str]:
    """Prepare the initial query message and determine type."""
    project_desc = f" for project '{args.project}'" if args.project else ""
    print(f"🚀 Starting new implementation{project_desc}...")
    query_type = "initial_implementation"

    return query_type, create_thyme_style_message(
        generation_dir, args.frontend_port, args.backend_port
    )


def print_prompts_command(
    args: argparse.Namespace,
    current_dir: str,
) -> None:
    """Print the prompts that would be sent to Claude Code SDK."""
    print("=" * 80)
    print("CLAUDE CODE SDK PROMPTS PREVIEW")
    print("=" * 80)

    # Get prompts directory
    try:
        prompts_dir = SessionManager.get_project_prompts_dir(current_dir, args.project)
        if args.project:
            print(f"🎯 Project: {args.project}")
        else:
            print("🎯 Project: (default)")
        print(f"📁 Prompts directory: {prompts_dir}")
        print(f"🤖 Model: {args.model}")
        if (
            args.frontend_port != DEFAULT_FRONTEND_PORT
            or args.backend_port != DEFAULT_BACKEND_PORT
        ):
            print(
                f"🔧 Ports - Frontend: {args.frontend_port}, Backend: {args.backend_port}"
            )
    except (FileNotFoundError, ValueError) as e:
        print(f"❌ Error with project: {e}")
        available_projects = SessionManager.list_available_projects(current_dir)
        if available_projects:
            print("Available projects:")
            for project in available_projects:
                print(f"  - {project}")
        return

    print("\n" + "=" * 80)
    print("SYSTEM PROMPT")
    print("=" * 80)

    # Load and display system prompt from top-level prompts directory
    try:
        # Always use the generic system prompt from the top level
        # If prompts_dir ends with a project name, go up one level; otherwise use it directly
        if args.project:
            # For specific projects: /path/to/prompts/project_name -> /path/to/prompts
            top_level_prompts_dir = Path(prompts_dir).parent
        else:
            # For default: /path/to/prompts -> use it directly
            top_level_prompts_dir = Path(prompts_dir)

        # System prompt no longer uses template variables
        system_prompt_path = top_level_prompts_dir / "system_prompt.txt"
        system_prompt = system_prompt_path.read_text(encoding="utf-8")
        print(system_prompt)
    except Exception as e:
        print(f"❌ Error loading system prompt: {e}")
        return

    print("\n" + "=" * 80)
    print("INITIAL USER PROMPT")
    print("=" * 80)

    # Create the user prompt using the specialized function for prompts directory
    try:
        # Use the specialized function that loads BUILD_PLAN.md directly from prompts directory
        user_prompt = create_thyme_style_message_from_prompts_dir(Path(prompts_dir))
        print(user_prompt)
    except Exception as e:
        print(f"❌ Error creating user prompt: {e}")
        print(
            "\nNote: The user prompt includes BUILD_PLAN.md content from the prompts directory."
        )
        print(
            "Make sure BUILD_PLAN.md exists in the specified project's prompts directory."
        )

    print("\n" + "=" * 80)
    print("NOTES")
    print("=" * 80)
    print("• System prompt contains general autonomous development instructions")
    print(
        "• System prompt is loaded from: prompts/system_prompt.txt (generic, no variables)"
    )
    print(
        "• User prompt contains only the BUILD_PLAN.md content for the specific project"
    )
    print(
        "• This separation avoids redundancy and follows proper prompt engineering practices"
    )
    print("• In actual usage, system prompt is copied to the session directory")


async def run_autonomous_implementation(
    args: argparse.Namespace,
    generation_dir: Path,
    system_prompt: str,
    build_plan_path: str,
    logging_manager: LoggingManager,
    token_tracker: TokenTracker,
    is_existing_project: bool = False,
) -> None:
    """Run the autonomous implementation loop with fresh client context."""
    print("--- Starting autonomous implementation ---")
    print("[Agent will work autonomously with fresh context each loop]\n")

    await _handle_implementation_loop(
        generation_dir, args, system_prompt, logging_manager, token_tracker, os.getcwd(),
        is_existing_project=is_existing_project
    )

    print(f"\nGeneration complete! Project saved at: {generation_dir}")


async def main() -> None:
    """Main entry point."""
    global PROJECT_ROOT

    # Parse arguments
    args = parse_arguments()

    # Setup
    # Use PROJECT_ROOT environment variable if set (for Docker/AWS deployment)
    current_dir = os.environ.get('PROJECT_ROOT', os.getcwd())

    # Handle print-prompts command separately
    if args.print_prompts:
        print_prompts_command(args, current_dir)
        return

    # Handle enhance-feature mode
    if args.enhance_feature:
        builtins.print(f"🔧 Enhancement mode: {args.enhance_feature}")
        if not Path(args.enhance_feature).exists():
            builtins.print(f"❌ Error: Feature spec file not found: {args.enhance_feature}")
            return
        if args.existing_codebase and not Path(args.existing_codebase).exists():
            builtins.print(f"❌ Error: Existing codebase not found: {args.existing_codebase}")
            return
        # Enhancement mode will be handled in the session setup below

    builtins.print("Current Directory:", current_dir)

    # Validate and set up project
    try:
        prompts_dir = SessionManager.get_project_prompts_dir(current_dir, args.project)
        if args.project:
            builtins.print(f"🎯 Using project: {args.project}")
        builtins.print(f"📁 Prompts directory: {prompts_dir}")
    except (FileNotFoundError, ValueError) as e:
        builtins.print(f"❌ Error with project: {e}")
        available_projects = SessionManager.list_available_projects(current_dir)
        if available_projects:
            builtins.print("Available projects:")
            for project in available_projects:
                builtins.print(f"  - {project}")
        return

    # Template variables
    template_vars = {
        "frontend_port": args.frontend_port,
        "backend_port": args.backend_port,
    }

    # Determine output directory
    # Default to ./generated-app, can be overridden with --output-dir
    output_dir = args.output_dir if args.output_dir else str(Path(current_dir) / "generated-app")
    generation_dir = Path(output_dir)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")

    # Check if this is an existing project (for resume vs fresh start)
    is_existing_project = generation_dir.exists() and (generation_dir / "package.json").exists()

    if is_existing_project:
        # Directory exists with code - automatic resume
        builtins.print(f"📁 Found existing project at: {generation_dir}")
        builtins.print(f"📂 Resuming from previous work")
    else:
        # Directory doesn't exist or is empty - create from template
        builtins.print(f"📁 Creating new project at: {generation_dir}")
        generation_dir.mkdir(parents=True, exist_ok=True)

        # Clone template
        template_dir = Path(current_dir) / "frontend-scaffold-template"
        if template_dir.exists():
            import shutil
            # Copy template contents (not the directory itself)
            for item in template_dir.iterdir():
                dest = generation_dir / item.name
                if item.is_dir():
                    shutil.copytree(item, dest)
                else:
                    shutil.copy2(item, dest)
            builtins.print(f"📂 Cloned template to {generation_dir}")

        # Setup prompts
        SessionManager.setup_session_prompts(
            generation_dir,
            prompts_dir,
            template_vars,
            bootstrap_files=args.bootstrap_files,
        )

    # Validate cleanup-session requires existing project
    if args.cleanup_session and not is_existing_project:
        builtins.print("❌ Error: --cleanup-session requires an existing project")
        builtins.print(f"   No project found at: {generation_dir}")
        return

    os.chdir(generation_dir)
    PROJECT_ROOT = str(generation_dir)

    # Initialize git repo only for fresh projects without --skip-git-init
    if not is_existing_project and not args.skip_git_init:
        SessionManager.initialize_git_repo(generation_dir)
    elif args.skip_git_init:
        builtins.print("⏭️ Skipping git init (--skip-git-init flag set)")

    # Set up logging
    log_file_path = generation_dir / f"claude_log_{timestamp}.txt"
    logging_manager = LoggingManager()
    logging_manager.setup_timestamped_print(log_file_path)

    print(f"Working directory: {generation_dir}")
    print(f"Log file: {log_file_path}")

    # Load system prompt (no templating needed since it has no variables)
    prompts_dir_path = generation_dir / "prompts"
    system_prompt_path = Path(prompts_dir_path) / "system_prompt.txt"
    system_prompt = system_prompt_path.read_text(encoding="utf-8")
    build_plan_path = f"{prompts_dir_path}/BUILD_PLAN.md"

    # Show custom ports if used
    if (
        args.frontend_port != DEFAULT_FRONTEND_PORT
        or args.backend_port != DEFAULT_BACKEND_PORT
    ):
        print(
            f"🔧 Using custom ports - Frontend: {args.frontend_port}, Backend: {args.backend_port}"
        )

    # Set up token tracking
    token_tracker = TokenTracker()
    if is_existing_project:
        token_tracker.load_from_logs(generation_dir / "logs")
    else:
        print("📊 Starting with zero token counts for new session")

    # Show cleanup frequency if set
    if args.cleanup_frequency and not args.cleanup_session:
        print(
            f"🧹 Cleanup sessions enabled: will run after every {args.cleanup_frequency} continuation session(s)"
        )

    # Initialize agent state if it doesn't exist
    if not (generation_dir / STATE_FILE_NAME).exists():
        # Determine initial desired state based on flags
        if args.cleanup_session:
            initial_desired = "pause"
            note = "Initial state created for cleanup session"
        elif args.start_paused:
            initial_desired = "pause"
            note = "Initial state created with --start-paused flag"
        else:
            initial_desired = "continuous"
            note = "Initial state created on startup"

        # Create initial state file
        write_agent_state(
            generation_dir,
            desired=initial_desired,
            current="pause",
            note=note,
        )
        print(
            f"📝 Created initial agent_state.json with desired_state='{initial_desired}'"
        )

    # Run appropriate session type
    try:
        if args.cleanup_session:
            # Run a single cleanup session
            print("🧹 Running cleanup session only (no implementation)")
            await _run_cleanup_session(
                generation_dir,
                args,
                system_prompt,
                logging_manager,
                token_tracker,
                transition_to_pause=True,
            )
            print(f"\n✅ Cleanup session complete! Project at: {generation_dir}")
        else:
            # Run normal autonomous implementation
            await run_autonomous_implementation(
                args,
                generation_dir,
                system_prompt,
                build_plan_path,
                logging_manager,
                token_tracker,
                is_existing_project=is_existing_project,
            )
    except KeyboardInterrupt:
        # Handle Ctrl-C - update state to terminated and exit gracefully
        print("\n\n🛑 Ctrl-C detected - terminating agent gracefully...")
        update_agent_state(generation_dir, "terminated", "Agent terminated by Ctrl-C")
        print(f"✅ Agent state updated to 'terminated'")
        print(f"📁 Project directory: {generation_dir}")
        print("\nTo resume, just run the same command again - it auto-detects existing project.")
    except RuntimeError as e:
        # Handle session-terminating errors
        error_str = str(e)
        if "Session terminated" in error_str:
            print(f"\n🚨 {error_str}")
            print("\n🔄 To continue, just run the same command again - it auto-detects existing project.")
            print("   Progress is preserved in claude-progress.txt")
            print("   The next session will start with a clean context window")
        else:
            raise
    finally:
        logging_manager.close()


if __name__ == "__main__":
    asyncio.run(main())
