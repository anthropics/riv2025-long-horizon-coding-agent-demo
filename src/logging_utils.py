"""Logging utilities for Claude Code."""

import builtins
import json
from dataclasses import asdict
from datetime import datetime
from pathlib import Path
from typing import Any, Optional, TextIO

from .config import LOGS_DIR_NAME


class LoggingManager:
    """Manages logging functionality for Claude Code sessions."""

    def __init__(self, log_file: Optional[TextIO] = None):
        self.log_file = log_file
        self.session_id: Optional[str] = None

    def setup_timestamped_print(self, log_file_path: Path) -> None:
        """Set up timestamped printing to both console and log file."""
        self.log_file = open(log_file_path, "a", encoding="utf-8")
        original_print = builtins.print

        def timestamped_print(*args, **kwargs):
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            timestamped_args = (f"[{timestamp}]", *args)
            original_print(*timestamped_args, **kwargs)  # Print to terminal
            if self.log_file:
                original_print(
                    *timestamped_args, **kwargs, file=self.log_file
                )  # Print to file
                self.log_file.flush()  # Ensure it's written immediately

        builtins.print = timestamped_print

    def close(self) -> None:
        """Close the log file."""
        if self.log_file:
            self.log_file.close()
            self.log_file = None

    def save_json_log(self, run_dir: Path, data: dict[str, Any]) -> None:
        """Save a JSON log entry with timestamp.

        Args:
            run_dir: Directory to save logs in
            data: Data to save as JSON
        """
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")[
            :-3
        ]  # Include milliseconds

        # Create logs subdirectory
        logs_dir = run_dir / LOGS_DIR_NAME
        logs_dir.mkdir(exist_ok=True)

        log_file = logs_dir / f"{timestamp}.json"

        try:
            with open(log_file, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False, default=str)
        except Exception as e:
            print(f"⚠️ Failed to save JSON log: {e}")

    def log_user_query(self, run_dir: Path, query: str, context: str = "") -> None:
        """Log a user query/request to JSON.

        Args:
            run_dir: Directory to save logs in
            query: The user query
            context: Additional context for the query
        """
        if not run_dir:
            return

        query_data = {
            "type": "user_query",
            "timestamp": datetime.now().isoformat(),
            "session_id": self.session_id,
            "query": query,
            "context": context,
        }

        self.save_json_log(run_dir, query_data)

    def serialize_message_for_json(self, message: Any) -> dict[str, Any]:
        """Convert SDK message objects to JSON-serializable format with size tracking.

        Args:
            message: SDK message object

        Returns:
            JSON-serializable dictionary representation
        """
        from claude_agent_sdk.types import (
            AssistantMessage,
            ResultMessage,
            SystemMessage,
            TextBlock,
            ThinkingBlock,
            ToolResultBlock,
            ToolUseBlock,
            UserMessage,
        )

        if isinstance(
            message, (AssistantMessage, ResultMessage, SystemMessage, UserMessage)
        ):
            # Use dataclass asdict for structured objects
            data = asdict(message)
            data["message_type"] = type(message).__name__

            # Add size estimation for debugging
            self._add_size_debug_info(data, type(message).__name__)
            return data

        elif isinstance(
            message, (TextBlock, ToolUseBlock, ToolResultBlock, ThinkingBlock)
        ):
            # Content blocks
            data = asdict(message)
            data["block_type"] = type(message).__name__

            # Add size estimation for debugging
            self._add_size_debug_info(
                data, type(message).__name__, size_threshold=50000
            )
            return data

        else:
            # Fallback for unknown types
            try:
                return {
                    "message_type": type(message).__name__,
                    "raw_data": str(message),
                    "attributes": {
                        k: v for k, v in vars(message).items() if not k.startswith("_")
                    },
                }
            except Exception:
                return {
                    "message_type": type(message).__name__,
                    "raw_data": str(message),
                }

    def _add_size_debug_info(
        self, data: dict[str, Any], type_name: str, size_threshold: int = 100000
    ) -> None:
        """Add size debugging information to message data.

        Args:
            data: Message data dictionary
            type_name: Type name for logging
            size_threshold: Threshold above which to log size warnings
        """
        try:
            data_size = len(json.dumps(data, default=str))
            data["_debug_size_bytes"] = data_size
            if data_size > size_threshold:
                print(f"⚠️ Large message detected: {type_name} ({data_size:,} bytes)")
        except Exception:
            pass
