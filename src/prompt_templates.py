"""Prompt templating utilities for Claude Code."""

import shutil
from pathlib import Path
from typing import Any

from .config import TEMPLATE_FILE_EXTENSIONS


class PromptTemplater:
    """Handles template variable substitution in prompt files."""

    @staticmethod
    def apply_template(content: str, template_vars: dict[str, Any]) -> str:
        """Apply template variable substitution to content.

        Args:
            content: The content to process
            template_vars: Dictionary of variables to substitute

        Returns:
            Content with template variables replaced
        """
        for key, value in template_vars.items():
            placeholder = "{" + key + "}"
            content = content.replace(placeholder, str(value))
        return content

    @staticmethod
    def copy_with_templating(
        src_dir: Path, dest_dir: Path, template_vars: dict[str, Any]
    ) -> None:
        """Copy a directory and apply template substitution to text files.

        Args:
            src_dir: Source directory path
            dest_dir: Destination directory path
            template_vars: Dictionary of variables to substitute
        """
        # Create destination directory
        dest_dir.mkdir(parents=True, exist_ok=True)

        # Copy all files, applying templating to text files
        for item in src_dir.iterdir():
            src_path = item
            dest_path = dest_dir / item.name

            if item.is_file():
                PromptTemplater._copy_file_with_templating(
                    src_path, dest_path, template_vars
                )
            elif item.is_dir():
                # Recursively copy subdirectories with templating
                PromptTemplater.copy_with_templating(src_path, dest_path, template_vars)

    @staticmethod
    def _copy_file_with_templating(
        src_path: Path, dest_path: Path, template_vars: dict[str, Any]
    ) -> None:
        """Copy a single file, applying templating if it's a text file.

        Args:
            src_path: Source file path
            dest_path: Destination file path
            template_vars: Dictionary of variables to substitute
        """
        # Apply templating to text files
        if src_path.suffix in TEMPLATE_FILE_EXTENSIONS:
            try:
                with open(src_path, encoding="utf-8") as f:
                    content = f.read()

                # Apply template substitution
                templated_content = PromptTemplater.apply_template(
                    content, template_vars
                )

                with open(dest_path, "w", encoding="utf-8") as f:
                    f.write(templated_content)
            except Exception as e:
                # Fallback to regular copy if templating fails
                print(
                    f"⚠️ Template substitution failed for {src_path.name}, copying as-is: {e}"
                )
                shutil.copy2(src_path, dest_path)
        else:
            # Copy non-text files as-is
            shutil.copy2(src_path, dest_path)

    @staticmethod
    def load_templated_file(file_path: Path, template_vars: dict[str, Any]) -> str:
        """Load a file and apply template substitution.

        Args:
            file_path: Path to the file to load
            template_vars: Dictionary of variables to substitute

        Returns:
            File content with template variables replaced
        """
        with open(file_path, encoding="utf-8") as f:
            content = f.read()
        return PromptTemplater.apply_template(content, template_vars)
