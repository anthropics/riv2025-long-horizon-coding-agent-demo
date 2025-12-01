"""Token usage tracking and limit enforcement for Claude Code."""

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any, Optional

from .config import (
    MAX_API_CALLS,
    MAX_COST_USD,
    MAX_OUTPUT_TOKENS,
    WARNING_THRESHOLD_HIGH,
    WARNING_THRESHOLD_MEDIUM,
)


@dataclass
class TokenUsage:
    """Token usage data for a single API call."""

    input_tokens: int = 0
    output_tokens: int = 0
    cache_creation_input_tokens: int = 0
    cache_read_input_tokens: int = 0
    total_cost_usd: float = 0.0


@dataclass
class SessionTotals:
    """Cumulative totals for a session."""

    input_tokens: int = 0
    output_tokens: int = 0
    cache_creation_input_tokens: int = 0
    cache_read_input_tokens: int = 0
    total_cost_usd: float = 0.0
    api_calls: int = 0

    @property
    def billable_input_tokens(self) -> int:
        """Calculate billable input tokens (input + cache creation)."""
        return self.input_tokens + self.cache_creation_input_tokens

    @property
    def cached_input_tokens(self) -> int:
        """Get cached input tokens (read from cache)."""
        return self.cache_read_input_tokens

    @property
    def grand_total_tokens(self) -> int:
        """Calculate grand total of all tokens."""
        return (
            self.billable_input_tokens + self.cached_input_tokens + self.output_tokens
        )


class TokenTracker:
    """Tracks token usage and enforces limits."""

    def __init__(self):
        self.totals = SessionTotals()

    def extract_usage_from_message(
        self, message: dict[str, Any]
    ) -> Optional[TokenUsage]:
        """Extract token usage from a ResultMessage."""
        if message.get("message_type") != "ResultMessage":
            return None

        usage = TokenUsage()

        # Try direct fields first
        if "input_tokens" in message:
            usage.input_tokens = message.get("input_tokens", 0)
            usage.output_tokens = message.get("output_tokens", 0)
            usage.cache_creation_input_tokens = message.get(
                "cache_creation_input_tokens", 0
            )
            usage.cache_read_input_tokens = message.get("cache_read_input_tokens", 0)
            usage.total_cost_usd = message.get("total_cost_usd", 0.0)
        # Try usage field
        elif "usage" in message:
            usage_data = message.get("usage", {})
            usage.input_tokens = usage_data.get("input_tokens", 0)
            usage.output_tokens = usage_data.get("output_tokens", 0)
            usage.cache_creation_input_tokens = usage_data.get(
                "cache_creation_input_tokens", 0
            )
            usage.cache_read_input_tokens = usage_data.get("cache_read_input_tokens", 0)
            usage.total_cost_usd = message.get("total_cost_usd", 0.0)
        else:
            return None

        return usage

    def update_from_messages(self, messages: list[dict[str, Any]]) -> bool:
        """Update totals from API response messages. Returns True if usage was found."""
        for message in messages:
            usage = self.extract_usage_from_message(message)
            if usage:
                self.totals.input_tokens += usage.input_tokens
                self.totals.output_tokens += usage.output_tokens
                self.totals.cache_creation_input_tokens += (
                    usage.cache_creation_input_tokens
                )
                self.totals.cache_read_input_tokens += usage.cache_read_input_tokens

                # Add cost from this API call
                if usage.total_cost_usd > 0:
                    self.totals.total_cost_usd += usage.total_cost_usd

                self.totals.api_calls += 1
                return True
        return False

    def load_from_logs(self, logs_dir: Path) -> None:
        """Load existing token counts from log files."""
        if not logs_dir.exists():
            print("📊 No logs directory found - starting with zero token counts")
            return

        log_files = sorted(logs_dir.glob("*.json"))
        if not log_files:
            print("📊 No log files found - starting with zero token counts")
            return

        print(f"📊 Loading token counts from {len(log_files)} log files...")

        for log_file in log_files:
            try:
                with open(log_file, encoding="utf-8") as f:
                    data = json.load(f)

                if data.get("type") == "agent_response":
                    messages = data.get("messages", [])
                    for message in messages:
                        usage = self.extract_usage_from_message(message)
                        if usage:
                            self.totals.input_tokens += usage.input_tokens
                            self.totals.output_tokens += usage.output_tokens
                            self.totals.cache_creation_input_tokens += (
                                usage.cache_creation_input_tokens
                            )
                            self.totals.cache_read_input_tokens += (
                                usage.cache_read_input_tokens
                            )
                            self.totals.api_calls += 1

                            # Add cost from this API call
                            if usage.total_cost_usd > 0:
                                self.totals.total_cost_usd += usage.total_cost_usd
                            break

            except Exception as e:
                print(f"⚠️ Failed to read log file {log_file}: {e}")
                continue
        self._print_loaded_totals()
        self._warn_if_approaching_limits()

    def _print_loaded_totals(self) -> None:
        """Print loaded token counts."""
        print("📊 Loaded token counts from previous session:")
        print(f"   📥 Input tokens: {self.totals.input_tokens:,}")
        print(f"   📤 Output tokens: {self.totals.output_tokens:,}")
        print(
            f"   💾 Cache creation tokens: {self.totals.cache_creation_input_tokens:,}"
        )
        print(f"   🔄 Cache read tokens: {self.totals.cache_read_input_tokens:,}")
        print(f"   💰 Total cost: ${self.totals.total_cost_usd:.2f}")
        print(f"   🔢 API calls: {self.totals.api_calls}")

    def _warn_if_approaching_limits(self) -> None:
        """Warn if approaching any limits."""
        if self.totals.output_tokens > MAX_OUTPUT_TOKENS * (
            WARNING_THRESHOLD_MEDIUM / 100
        ):
            percentage = (self.totals.output_tokens / MAX_OUTPUT_TOKENS) * 100
            print(
                f"⚠️ WARNING: Already at {self.totals.output_tokens:,}/{MAX_OUTPUT_TOKENS:,} output tokens ({percentage:.1f}%)"
            )

        if self.totals.api_calls > MAX_API_CALLS * (WARNING_THRESHOLD_MEDIUM / 100):
            percentage = (self.totals.api_calls / MAX_API_CALLS) * 100
            print(
                f"⚠️ WARNING: Already at {self.totals.api_calls}/{MAX_API_CALLS} API calls ({percentage:.1f}%)"
            )

        if self.totals.total_cost_usd > MAX_COST_USD * (WARNING_THRESHOLD_MEDIUM / 100):
            percentage = (self.totals.total_cost_usd / MAX_COST_USD) * 100
            print(
                f"⚠️ WARNING: Already at ${self.totals.total_cost_usd:.2f}/${MAX_COST_USD:.0f} cost ({percentage:.1f}%)"
            )

    def print_current_usage(self, last_usage: Optional[TokenUsage] = None) -> None:
        """Print current usage information."""
        if last_usage:
            print(
                f"📊 Token usage - Input: {last_usage.input_tokens:,} | Output: {last_usage.output_tokens:,} | API Call #{self.totals.api_calls}"
            )
            if last_usage.total_cost_usd > 0:
                print(
                    f"📊 Running totals - Input: {self.totals.input_tokens:,} | Output: {self.totals.output_tokens:,} | Cost: ${self.totals.total_cost_usd:.2f}"
                )
            else:
                print(
                    f"📊 Running totals - Input: {self.totals.input_tokens:,} | Output: {self.totals.output_tokens:,}"
                )

    def check_limits(self) -> None:
        """Check if limits have been exceeded and exit if so."""
        if self.totals.output_tokens >= MAX_OUTPUT_TOKENS:
            print(f"\n🚨 OUTPUT TOKEN LIMIT EXCEEDED!")
            print(
                f"   Used: {self.totals.output_tokens:,}/{MAX_OUTPUT_TOKENS:,} tokens"
            )
            print(f"   Terminating program to prevent excessive usage.")
            exit(1)

        if self.totals.api_calls >= MAX_API_CALLS:
            print(f"\n🚨 API CALL LIMIT EXCEEDED!")
            print(f"   Used: {self.totals.api_calls}/{MAX_API_CALLS} calls")
            print(f"   Terminating program to prevent excessive usage.")
            exit(1)

        if self.totals.total_cost_usd >= MAX_COST_USD:
            print(f"\n🚨 COST LIMIT EXCEEDED!")
            print(f"   Used: ${self.totals.total_cost_usd:.2f}/${MAX_COST_USD:.0f}")
            print(f"   Terminating program to prevent excessive costs.")
            exit(1)

        # Progressive warnings
        self._check_progressive_warnings()

    def _check_progressive_warnings(self) -> None:
        """Show progressive warnings as limits are approached."""
        output_percentage = (self.totals.output_tokens / MAX_OUTPUT_TOKENS) * 100
        call_percentage = (self.totals.api_calls / MAX_API_CALLS) * 100
        cost_percentage = (self.totals.total_cost_usd / MAX_COST_USD) * 100

        if output_percentage >= WARNING_THRESHOLD_HIGH:
            print(
                f"⚠️ WARNING: {output_percentage:.1f}% of output token limit used ({self.totals.output_tokens:,}/{MAX_OUTPUT_TOKENS:,})"
            )
        elif output_percentage >= WARNING_THRESHOLD_MEDIUM:
            print(
                f"📊 Notice: {output_percentage:.1f}% of output token limit used ({self.totals.output_tokens:,}/{MAX_OUTPUT_TOKENS:,})"
            )

        if call_percentage >= WARNING_THRESHOLD_HIGH:
            print(
                f"⚠️ WARNING: {call_percentage:.1f}% of API call limit used ({self.totals.api_calls}/{MAX_API_CALLS})"
            )
        elif call_percentage >= WARNING_THRESHOLD_MEDIUM:
            print(
                f"📊 Notice: {call_percentage:.1f}% of API call limit used ({self.totals.api_calls}/{MAX_API_CALLS})"
            )

        if cost_percentage >= WARNING_THRESHOLD_HIGH:
            print(
                f"⚠️ WARNING: {cost_percentage:.1f}% of cost limit used (${self.totals.total_cost_usd:.2f}/${MAX_COST_USD:.0f})"
            )
        elif cost_percentage >= WARNING_THRESHOLD_MEDIUM:
            print(
                f"📊 Notice: {cost_percentage:.1f}% of cost limit used (${self.totals.total_cost_usd:.2f}/${MAX_COST_USD:.0f})"
            )
