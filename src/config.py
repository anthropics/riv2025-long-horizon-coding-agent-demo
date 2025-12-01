"""Configuration constants and settings for Claude Code."""

from typing import Any

# Model defaults
DEFAULT_MODEL = "claude-opus-4-5-20251101"

# Port defaults
DEFAULT_FRONTEND_PORT = 6174
DEFAULT_BACKEND_PORT = 4001

# Usage limits
MAX_OUTPUT_TOKENS = 500_000_000
MAX_API_CALLS = 5_000
MAX_COST_USD = 5_000.0

# Warning thresholds (as percentages)
WARNING_THRESHOLD_HIGH = 90  # Red warning
WARNING_THRESHOLD_MEDIUM = 75  # Yellow notice

# File patterns for templating
TEMPLATE_FILE_EXTENSIONS = {".txt", ".md"}

# Required project files (system_prompt.txt now comes from top-level prompts directory)
REQUIRED_PROJECT_FILES = ["BUILD_PLAN.md"]
OPTIONAL_PROJECT_FILES = ["DEBUGGING_GUIDE.md", "system_prompt.txt"]

# Log file settings
LOG_FILE_PATTERN = "*.json"
LOGS_DIR_NAME = "logs"

# Security: Allowed bash commands
ALLOWED_BASH_COMMANDS = [
    "npm",
    "npx",
    "pnpm",
    "node",
    "curl",
    "mkdir",
    "echo",
    "ls",
    "cat",
    "cd",
    "pwd",
    "touch",
    "lsof",
    "ps",
    "jq",
    "sed",
    "awk",
    "find",
    "git",
    "cp",
    "wc",
    "grep",
    "sleep",
    "kill",
    "tail",
    "sqlite3",
    "netstat",
    "rg",
    "chmod",
    "./init.sh",
    "test",
    "node",
    "which",
    "time",
    "head",
    "pip",
    "pip3",
    "playwright",
    "python3",
    "google-chrome",
]

# Special command patterns
ALLOWED_RM_COMMANDS = ["rm -rf node_modules"]
ALLOWED_NODE_PATTERNS = ["server.js", "server/index.js", "playwright-test.cjs"]
ALLOWED_PKILL_PATTERNS = [
    'pkill -f "node server/index.js"',
    'pkill -f "node server.js"',
    'pkill -f "vite"',
    'pkill -f "chrome"',
]

# Blocked sed patterns - prevent bulk modification of test results
# These regex patterns match sed commands that should be blocked
BLOCKED_SED_PATTERNS = [
    # Block any sed command that modifies "passes" field in tests.json
    r'sed.*passes.*tests\.json',
    r'sed.*tests\.json.*passes',
    # Block bulk true/false replacements in tests.json
    r'sed.*false.*true.*tests\.json',
    r'sed.*true.*false.*tests\.json',
]

# Block any bash command that could modify tests.json
# Agent must use Edit tool with screenshot verification instead
BLOCKED_TESTS_JSON_PATTERNS = [
    r'awk.*tests\.json',
    r'jq.*tests\.json',
    r'python3?\s.*tests\.json',
    r'node\s.*tests\.json',
    r'echo.*>.*tests\.json',
    r'cat.*>.*tests\.json',
    r'printf.*>.*tests\.json',
    r'tee.*tests\.json',
    r'>.*tests\.json',  # Any redirection to tests.json
]


def get_default_template_vars() -> dict[str, Any]:
    """Get default template variables."""
    return {
        "frontend_port": DEFAULT_FRONTEND_PORT,
        "backend_port": DEFAULT_BACKEND_PORT,
    }
