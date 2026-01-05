"""CloudWatch metrics publisher for Claude Code Agent.

Publishes custom metrics to CloudWatch for dashboard visualization.
Metrics are published to the 'ClaudeCodeAgent' namespace with dimensions
for Environment and IssueNumber.
"""

import os
from datetime import datetime, timezone
from typing import Optional

import boto3


class MetricsPublisher:
    """Publishes custom metrics to CloudWatch for agent monitoring dashboards."""

    NAMESPACE = "ClaudeCodeAgent"

    def __init__(
        self,
        issue_number: Optional[int] = None,
        session_id: Optional[str] = None,
        enabled: bool = True,
    ):
        """Initialize the metrics publisher.

        Args:
            issue_number: GitHub issue number for dimension filtering
            session_id: AgentCore session ID for dimension filtering
            enabled: Whether to actually publish metrics (can be disabled for local dev)
        """
        self.issue_number = issue_number
        self.session_id = session_id
        self.enabled = enabled and os.environ.get(
            "CLOUDWATCH_METRICS_ENABLED", "true"
        ).lower() == "true"
        self._total_commits = 0  # Track cumulative commits for the session

        if self.enabled:
            region = os.environ.get("AWS_REGION", "us-west-2")
            self.client = boto3.client("cloudwatch", region_name=region)
        else:
            self.client = None

    def _get_dimensions(self):
        """Get base dimensions for all metrics."""
        dims = [
            {"Name": "Environment", "Value": os.environ.get("ENVIRONMENT", "prod")}
        ]
        if self.issue_number:
            dims.append({"Name": "IssueNumber", "Value": str(self.issue_number)})
        return dims

    def _put_metric(
        self,
        metric_name: str,
        value: float,
        unit: str = "Count",
        extra_dims: Optional[list] = None,
    ) -> bool:
        """Publish a single metric to CloudWatch.

        Args:
            metric_name: Name of the metric
            value: Metric value
            unit: CloudWatch unit (Count, None, Percent, etc.)
            extra_dims: Additional dimensions beyond the base dimensions

        Returns:
            True if successful, False otherwise
        """
        if not self.enabled or not self.client:
            return False

        try:
            dims = self._get_dimensions()
            if extra_dims:
                dims.extend(extra_dims)

            self.client.put_metric_data(
                Namespace=self.NAMESPACE,
                MetricData=[
                    {
                        "MetricName": metric_name,
                        "Value": value,
                        "Unit": unit,
                        "Timestamp": datetime.now(timezone.utc),
                        "Dimensions": dims,
                    }
                ],
            )
            return True
        except Exception as e:
            print(f"⚠️ CloudWatch metric error ({metric_name}): {e}")
            return False

    def _put_metrics_batch(self, metrics: list) -> bool:
        """Publish multiple metrics in a single API call.

        Args:
            metrics: List of dicts with keys: name, value, unit (optional), dimensions (optional)

        Returns:
            True if successful, False otherwise
        """
        if not self.enabled or not self.client or not metrics:
            return False

        try:
            base_dims = self._get_dimensions()
            metric_data = []

            for m in metrics[:1000]:  # CloudWatch limit is 1000 per call
                dims = base_dims.copy()
                if m.get("dimensions"):
                    dims.extend(m["dimensions"])

                metric_data.append(
                    {
                        "MetricName": m["name"],
                        "Value": m["value"],
                        "Unit": m.get("unit", "Count"),
                        "Timestamp": datetime.now(timezone.utc),
                        "Dimensions": dims,
                    }
                )

            self.client.put_metric_data(
                Namespace=self.NAMESPACE, MetricData=metric_data
            )
            return True
        except Exception as e:
            print(f"⚠️ CloudWatch batch metric error: {e}")
            return False

    # === Session Lifecycle Metrics ===

    def publish_session_started(self, mode: str = "full_build") -> bool:
        """Publish session start event.

        Args:
            mode: Either 'full_build' or 'enhancement'
        """
        return self._put_metric(
            "SessionStarted",
            1,
            "Count",
            [{"Name": "Mode", "Value": mode}],
        )

    def publish_session_completed(self, exit_code: int, duration_seconds: float) -> bool:
        """Publish session completion with exit code and duration."""
        return self._put_metrics_batch(
            [
                {"name": "SessionCompleted", "value": 1},
                {"name": "SessionDuration", "value": duration_seconds, "unit": "Seconds"},
                {
                    "name": "SessionExitCode",
                    "value": exit_code,
                    "unit": "None",
                },
            ]
        )

    def publish_session_heartbeat(self) -> bool:
        """Publish session heartbeat (agent is alive and running).

        Publishes with only Environment dimension (no IssueNumber) so GHA
        health check can query without knowing which issue is being worked on.
        """
        if not self.enabled or not self.client:
            return False

        try:
            # Use only Environment dimension so GHA can query without issue number
            self.client.put_metric_data(
                Namespace=self.NAMESPACE,
                MetricData=[
                    {
                        "MetricName": "SessionHeartbeat",
                        "Value": 1,
                        "Unit": "Count",
                        "Timestamp": datetime.now(timezone.utc),
                        "Dimensions": [
                            {"Name": "Environment", "Value": os.environ.get("ENVIRONMENT", "prod")}
                        ],
                    }
                ],
            )
            return True
        except Exception as e:
            print(f"⚠️ CloudWatch heartbeat error: {e}")
            return False

    # === Progress Metrics ===

    def publish_progress(
        self,
        elapsed_hours: float,
        remaining_hours: float,
        cost_usd: float = 0.0,
        api_calls: int = 0,
        input_tokens: int = 0,
        output_tokens: int = 0,
    ) -> bool:
        """Publish comprehensive progress metrics.

        This is the main method called every 30 seconds during agent execution.
        """
        return self._put_metrics_batch(
            [
                {"name": "ElapsedHours", "value": elapsed_hours, "unit": "None"},
                {"name": "RemainingHours", "value": remaining_hours, "unit": "None"},
                {
                    "name": "TotalCostCents",
                    "value": cost_usd * 100,  # Convert to cents for easier display
                    "unit": "None",
                },
                {"name": "APICallCount", "value": api_calls, "unit": "Count"},
                {"name": "InputTokens", "value": input_tokens, "unit": "Count"},
                {"name": "OutputTokens", "value": output_tokens, "unit": "Count"},
                {"name": "TotalCommits", "value": self._total_commits, "unit": "Count"},
            ]
        )

    # === Git/GitHub Metrics ===

    def publish_commits_pushed(self, count: int) -> bool:
        """Publish successful commit push event.

        Args:
            count: Number of commits pushed in this push operation
        """
        self._total_commits += count
        return self._put_metrics_batch(
            [
                {"name": "CommitsPushed", "value": count},
                {"name": "PushSuccess", "value": 1},
            ]
        )

    def publish_push_failed(self) -> bool:
        """Publish failed push event."""
        return self._put_metric("PushFailure", 1)

    def publish_screenshots_uploaded(self, count: int) -> bool:
        """Publish screenshot upload count."""
        return self._put_metric("ScreenshotsUploaded", count)

    # === Error Metrics ===

    def publish_error(self, error_type: str) -> bool:
        """Publish error event with type.

        Args:
            error_type: Type of error (e.g., 'setup_failed', 'push_failed', 'agent_crash')
        """
        return self._put_metric(
            "ErrorCount",
            1,
            "Count",
            [{"Name": "ErrorType", "Value": error_type}],
        )
