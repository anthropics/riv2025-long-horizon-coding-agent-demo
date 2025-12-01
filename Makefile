# AgentCore Deployment Makefile
# Provides repeatable IaC for launching and managing the agent

# AWS Configuration
AWS_PROFILE ?= aws-riv-2025
AWS_REGION ?= us-west-2
export AWS_PROFILE
export AWS_REGION

# Stack configuration (infrastructure naming)
ENVIRONMENT ?= reinvent
STACK_NAME ?= claude-code-$(ENVIRONMENT)

# AgentCore runtime (from .bedrock_agentcore.yaml or environment)
# Set these via environment variables or override on command line
AGENT_RUNTIME_ID ?= YOUR_AGENT_RUNTIME_ID
EXECUTION_ROLE_ARN ?= arn:aws:iam::YOUR_ACCOUNT_ID:role/YOUR_EXECUTION_ROLE

# Agent configuration (environment variables)
PUSH_INTERVAL_SECONDS ?= 300
SCREENSHOT_INTERVAL_SECONDS ?= 300
SESSION_DURATION_HOURS ?= 1.0
DEFAULT_MODEL ?= claude-opus-4-5-20251101
PROJECT_NAME ?= canopy

# OpenTelemetry Configuration
# Based on: https://docs.aws.amazon.com/bedrock-agentcore/latest/devguide/observability-configure.html
#           https://code.claude.com/docs/en/monitoring-usage.md

# OpenTelemetry configuration for AgentCore deployment
# Note: Using = instead of ?= to prevent local environment variables from leaking into deployment

# Claude Code telemetry (enables built-in telemetry collection)
CLAUDE_CODE_ENABLE_TELEMETRY = 1

# AWS Bedrock AgentCore observability settings (AWS ADOT)
AGENT_OBSERVABILITY_ENABLED = true
OTEL_PYTHON_DISTRO = aws_distro
OTEL_PYTHON_CONFIGURATOR = aws_configurator
OTEL_EXPORTER_OTLP_PROTOCOL = http/protobuf
OTEL_TRACES_EXPORTER = otlp

# Agent metadata for resource attributes
AGENT_NAME ?= antodo_agent
OTEL_RESOURCE_ATTRIBUTES = service.name=$(AGENT_NAME),aws.log.group.names=/aws/bedrock-agentcore/runtimes/$(AGENT_RUNTIME_ID)
OTEL_EXPORTER_OTLP_LOGS_HEADERS = x-aws-log-group=/aws/bedrock-agentcore/runtimes/$(AGENT_RUNTIME_ID),x-aws-log-stream=runtime-logs,x-aws-metric-namespace=bedrock-agentcore

# Get dynamic values from CloudFormation outputs (explicitly use us-west-2 where the stack lives)
CF_REGION := us-west-2
SCREENSHOT_BUCKET := $(shell aws cloudformation describe-stacks --stack-name $(STACK_NAME) --region $(CF_REGION) --profile $(AWS_PROFILE) --query "Stacks[0].Outputs[?OutputKey=='ScreenshotsBucketName'].OutputValue" --output text 2>/dev/null)
SCREENSHOT_CDN_DOMAIN := $(shell aws cloudformation describe-stacks --stack-name $(STACK_NAME) --region $(CF_REGION) --profile $(AWS_PROFILE) --query "Stacks[0].Outputs[?OutputKey=='ScreenshotsCdnDomain'].OutputValue" --output text 2>/dev/null)
ECR_URI := $(shell aws cloudformation describe-stacks --stack-name $(STACK_NAME) --region $(CF_REGION) --profile $(AWS_PROFILE) --query "Stacks[0].Outputs[?OutputKey=='EcrRepositoryUri'].OutputValue" --output text 2>/dev/null)

# GitHub configuration
GITHUB_REPO ?= anthropics/riv2025-long-horizon-coding-agent-demo

.PHONY: help launch launch-local deploy-infra status destroy show-config update-runtime-env get-runtime cleanup-test stop-session

help:
	@echo "AgentCore Management Commands"
	@echo ""
	@echo "  make launch            - Deploy agent to cloud (CodeBuild + env vars)"
	@echo "  make launch-local      - Run agent locally for testing"
	@echo "  make update-runtime-env - Update env vars on existing runtime (AWS CLI)"
	@echo "  make get-runtime       - Get current runtime configuration"
	@echo "  make deploy-infra      - Deploy CDK infrastructure"
	@echo "  make status            - Show AgentCore status"
	@echo "  make destroy           - Destroy AgentCore runtime"
	@echo "  make show-config       - Show current configuration values"
	@echo "  make cleanup-test      - Clean up test issues, branches, and S3"
	@echo "  make stop-session SESSION_ID=xxx - Stop a running agent session"
	@echo ""
	@echo "Configuration (override with VAR=value):"
	@echo "  AWS_PROFILE=$(AWS_PROFILE)"
	@echo "  PROJECT_NAME=$(PROJECT_NAME)"
	@echo "  PUSH_INTERVAL_SECONDS=$(PUSH_INTERVAL_SECONDS)"
	@echo "  SCREENSHOT_INTERVAL_SECONDS=$(SCREENSHOT_INTERVAL_SECONDS)"
	@echo "  SESSION_DURATION_HOURS=$(SESSION_DURATION_HOURS)"
	@echo "  DEFAULT_MODEL=$(DEFAULT_MODEL)"

show-config:
	@echo "AWS Configuration:"
	@echo "  AWS_PROFILE=$(AWS_PROFILE)"
	@echo "  CF_REGION=$(CF_REGION) (CloudFormation stack region)"
	@echo "  AWS_REGION=$(AWS_REGION) (AgentCore region)"
	@echo ""
	@echo "Stack Configuration:"
	@echo "  STACK_NAME=$(STACK_NAME)"
	@echo "  AGENT_RUNTIME_ID=$(AGENT_RUNTIME_ID)"
	@echo ""
	@echo "Dynamic Values (from CloudFormation):"
	@echo "  SCREENSHOT_BUCKET=$(SCREENSHOT_BUCKET)"
	@echo "  SCREENSHOT_CDN_DOMAIN=$(SCREENSHOT_CDN_DOMAIN)"
	@echo "  ECR_URI=$(ECR_URI)"
	@echo ""
	@echo "Agent Configuration:"
	@echo "  PROJECT_NAME=$(PROJECT_NAME)"
	@echo "  PUSH_INTERVAL_SECONDS=$(PUSH_INTERVAL_SECONDS)"
	@echo "  SCREENSHOT_INTERVAL_SECONDS=$(SCREENSHOT_INTERVAL_SECONDS)"
	@echo "  SESSION_DURATION_HOURS=$(SESSION_DURATION_HOURS)"
	@echo "  DEFAULT_MODEL=$(DEFAULT_MODEL)"
	@echo ""
	@echo "OpenTelemetry Configuration:"
	@echo "  Claude Code Telemetry:"
	@echo "    CLAUDE_CODE_ENABLE_TELEMETRY=$(CLAUDE_CODE_ENABLE_TELEMETRY)"
	@echo "  AWS Bedrock AgentCore Observability:"
	@echo "    AGENT_OBSERVABILITY_ENABLED=$(AGENT_OBSERVABILITY_ENABLED)"
	@echo "    OTEL_PYTHON_DISTRO=$(OTEL_PYTHON_DISTRO)"
	@echo "    OTEL_PYTHON_CONFIGURATOR=$(OTEL_PYTHON_CONFIGURATOR)"
	@echo "    OTEL_EXPORTER_OTLP_PROTOCOL=$(OTEL_EXPORTER_OTLP_PROTOCOL)"
	@echo "    OTEL_TRACES_EXPORTER=$(OTEL_TRACES_EXPORTER)"
	@echo "    OTEL_RESOURCE_ATTRIBUTES=$(OTEL_RESOURCE_ATTRIBUTES)"
	@echo "    OTEL_EXPORTER_OTLP_LOGS_HEADERS=$(OTEL_EXPORTER_OTLP_LOGS_HEADERS)"

# Deploy CDK infrastructure
deploy-infra:
	cd infrastructure && AWS_PROFILE=$(AWS_PROFILE) npx cdk deploy --require-approval never

# Launch agent to cloud with environment variables
# Note: agentcore CLI doesn't have --profile, so we set AWS_PROFILE env var
launch:
	@if [ -z "$(SCREENSHOT_CDN_DOMAIN)" ]; then \
		echo "Error: SCREENSHOT_CDN_DOMAIN not found. Run 'make deploy-infra' first."; \
		exit 1; \
	fi
	AWS_PROFILE=$(AWS_PROFILE) AWS_REGION=$(CF_REGION) agentcore launch \
		--env "ENVIRONMENT=$(ENVIRONMENT)" \
		--env "PROJECT_NAME=$(PROJECT_NAME)" \
		--env "PUSH_INTERVAL_SECONDS=$(PUSH_INTERVAL_SECONDS)" \
		--env "SCREENSHOT_INTERVAL_SECONDS=$(SCREENSHOT_INTERVAL_SECONDS)" \
		--env "SCREENSHOT_BUCKET=$(SCREENSHOT_BUCKET)" \
		--env "SCREENSHOT_CDN_DOMAIN=$(SCREENSHOT_CDN_DOMAIN)" \
		--env "SESSION_DURATION_HOURS=$(SESSION_DURATION_HOURS)" \
		--env "DEFAULT_MODEL=$(DEFAULT_MODEL)" \
		--env "CLAUDE_CODE_ENABLE_TELEMETRY=$(CLAUDE_CODE_ENABLE_TELEMETRY)" \
		--env "AGENT_OBSERVABILITY_ENABLED=$(AGENT_OBSERVABILITY_ENABLED)" \
		--env "OTEL_PYTHON_DISTRO=$(OTEL_PYTHON_DISTRO)" \
		--env "OTEL_PYTHON_CONFIGURATOR=$(OTEL_PYTHON_CONFIGURATOR)" \
		--env "OTEL_EXPORTER_OTLP_PROTOCOL=$(OTEL_EXPORTER_OTLP_PROTOCOL)" \
		--env "OTEL_TRACES_EXPORTER=$(OTEL_TRACES_EXPORTER)" \
		--env "OTEL_RESOURCE_ATTRIBUTES=$(OTEL_RESOURCE_ATTRIBUTES)" \
		--env "OTEL_EXPORTER_OTLP_LOGS_HEADERS=$(OTEL_EXPORTER_OTLP_LOGS_HEADERS)" \
		--auto-update-on-conflict

# Launch agent locally for development/testing
launch-local:
	AWS_PROFILE=$(AWS_PROFILE) AWS_REGION=$(CF_REGION) agentcore launch --local \
		--env "ENVIRONMENT=$(ENVIRONMENT)" \
		--env "PROJECT_NAME=$(PROJECT_NAME)" \
		--env "PUSH_INTERVAL_SECONDS=$(PUSH_INTERVAL_SECONDS)" \
		--env "SCREENSHOT_INTERVAL_SECONDS=$(SCREENSHOT_INTERVAL_SECONDS)" \
		--env "SCREENSHOT_BUCKET=$(SCREENSHOT_BUCKET)" \
		--env "SCREENSHOT_CDN_DOMAIN=$(SCREENSHOT_CDN_DOMAIN)" \
		--env "SESSION_DURATION_HOURS=$(SESSION_DURATION_HOURS)" \
		--env "DEFAULT_MODEL=$(DEFAULT_MODEL)" \
		--env "CLAUDE_CODE_ENABLE_TELEMETRY=$(CLAUDE_CODE_ENABLE_TELEMETRY)" \
		--env "AGENT_OBSERVABILITY_ENABLED=$(AGENT_OBSERVABILITY_ENABLED)" \
		--env "OTEL_PYTHON_DISTRO=$(OTEL_PYTHON_DISTRO)" \
		--env "OTEL_PYTHON_CONFIGURATOR=$(OTEL_PYTHON_CONFIGURATOR)" \
		--env "OTEL_EXPORTER_OTLP_PROTOCOL=$(OTEL_EXPORTER_OTLP_PROTOCOL)" \
		--env "OTEL_TRACES_EXPORTER=$(OTEL_TRACES_EXPORTER)" \
		--env "OTEL_RESOURCE_ATTRIBUTES=$(OTEL_RESOURCE_ATTRIBUTES)" \
		--env "OTEL_EXPORTER_OTLP_LOGS_HEADERS=$(OTEL_EXPORTER_OTLP_LOGS_HEADERS)"

# Show AgentCore status
status:
	AWS_PROFILE=$(AWS_PROFILE) AWS_REGION=$(CF_REGION) agentcore status

# Destroy AgentCore runtime (keeps infrastructure)
destroy:
	AWS_PROFILE=$(AWS_PROFILE) AWS_REGION=$(CF_REGION) agentcore destroy

# Get current runtime configuration from AWS
get-runtime:
	aws bedrock-agentcore-control get-agent-runtime \
		--agent-runtime-id $(AGENT_RUNTIME_ID) \
		--region $(CF_REGION) \
		--profile $(AWS_PROFILE)

# Update environment variables on existing runtime using AWS CLI
# This is the IaC way to configure an existing runtime
update-runtime-env:
	@if [ -z "$(SCREENSHOT_CDN_DOMAIN)" ]; then \
		echo "Error: SCREENSHOT_CDN_DOMAIN not found. Run 'make deploy-infra' first or check AWS credentials."; \
		exit 1; \
	fi
	@echo "Updating runtime environment variables..."
	aws bedrock-agentcore-control update-agent-runtime \
		--agent-runtime-id $(AGENT_RUNTIME_ID) \
		--region $(CF_REGION) \
		--profile $(AWS_PROFILE) \
		--role-arn $(EXECUTION_ROLE_ARN) \
		--agent-runtime-artifact 'containerConfiguration={containerUri=$(ECR_URI):latest}' \
		--network-configuration 'networkMode=PUBLIC' \
		--environment-variables '{ \
			"ENVIRONMENT": "$(ENVIRONMENT)", \
			"PROJECT_NAME": "$(PROJECT_NAME)", \
			"PUSH_INTERVAL_SECONDS": "$(PUSH_INTERVAL_SECONDS)", \
			"SCREENSHOT_INTERVAL_SECONDS": "$(SCREENSHOT_INTERVAL_SECONDS)", \
			"SCREENSHOT_BUCKET": "$(SCREENSHOT_BUCKET)", \
			"SCREENSHOT_CDN_DOMAIN": "$(SCREENSHOT_CDN_DOMAIN)", \
			"SESSION_DURATION_HOURS": "$(SESSION_DURATION_HOURS)", \
			"DEFAULT_MODEL": "$(DEFAULT_MODEL)", \
			"CLAUDE_CODE_ENABLE_TELEMETRY": "$(CLAUDE_CODE_ENABLE_TELEMETRY)", \
			"AGENT_OBSERVABILITY_ENABLED": "$(AGENT_OBSERVABILITY_ENABLED)", \
			"OTEL_PYTHON_DISTRO": "$(OTEL_PYTHON_DISTRO)", \
			"OTEL_PYTHON_CONFIGURATOR": "$(OTEL_PYTHON_CONFIGURATOR)", \
			"OTEL_EXPORTER_OTLP_PROTOCOL": "$(OTEL_EXPORTER_OTLP_PROTOCOL)", \
			"OTEL_TRACES_EXPORTER": "$(OTEL_TRACES_EXPORTER)", \
			"OTEL_RESOURCE_ATTRIBUTES": "$(OTEL_RESOURCE_ATTRIBUTES)", \
			"OTEL_EXPORTER_OTLP_LOGS_HEADERS": "$(OTEL_EXPORTER_OTLP_LOGS_HEADERS)" \
		}'
	@echo "Runtime environment variables updated successfully!"

# Clean up test artifacts (issues, branches, S3 screenshots)
# Usage: make cleanup-test ISSUES="3 4" to close specific issues
ISSUES ?=
cleanup-test:
	@echo "🧹 Cleaning up test artifacts..."
	@echo ""
	@if [ -n "$(ISSUES)" ]; then \
		for issue in $(ISSUES); do \
			echo "📋 Closing issue #$$issue..."; \
			gh issue close $$issue --repo $(GITHUB_REPO) --comment "Closing for cleanup" 2>/dev/null || true; \
			echo "🌿 Deleting branch issue-$$issue..."; \
			gh api -X DELETE repos/$(GITHUB_REPO)/git/refs/heads/issue-$$issue 2>/dev/null || true; \
		done; \
	else \
		echo "No issues specified. Use: make cleanup-test ISSUES=\"3 4\""; \
	fi
	@echo ""
	@echo "🗑️  Clearing S3 screenshots bucket..."
	@aws s3 rm s3://$(SCREENSHOT_BUCKET)/ --recursive --region $(CF_REGION) --profile $(AWS_PROFILE) 2>/dev/null || echo "Bucket empty or not found"
	@echo ""
	@echo "✅ Cleanup complete!"
	@echo ""
	@echo "Next steps:"
	@echo "  1. make launch PROJECT_NAME=claude-code  # Deploy new code"
	@echo "  2. Create a new test issue on GitHub"
	@echo "  3. Add 'agent' label to trigger the workflow"

# Stop a running agent session
# Usage: make stop-session SESSION_ID=your-session-id
# The session ID is posted to the GitHub issue when the agent starts
SESSION_ID ?=

stop-session:
	@if [ -z "$(SESSION_ID)" ]; then \
		echo "Error: SESSION_ID is required"; \
		echo "Usage: make stop-session SESSION_ID=your-session-id"; \
		echo ""; \
		echo "Find the session ID in the GitHub issue comments"; \
		exit 1; \
	fi
	@echo "🛑 Stopping agent session: $(SESSION_ID)"
	AWS_PROFILE=$(AWS_PROFILE) AWS_REGION=$(CF_REGION) agentcore stop-session --session-id "$(SESSION_ID)"
	@echo "✅ Session stop requested"
