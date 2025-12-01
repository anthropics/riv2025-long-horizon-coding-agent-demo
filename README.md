# 🤖 Long-Horizon Coding Agent Demo

An autonomous agent system that builds React applications from GitHub issues using AWS Bedrock AgentCore and the Claude Agent SDK. Demonstrated at AWS re:Invent 2025.

## How It Works

### End-to-End Flow

1. **User creates GitHub issue** with a feature request
2. **Users vote** with 👍 reactions to prioritize what gets built
3. **Authorized user approves** by adding a 🚀 reaction
4. **Issue poller** (runs every 5 min) detects approved issues, sorted by votes
5. **Agent builder** workflow acquires lock and invokes AWS Bedrock AgentCore
6. **Bedrock entrypoint** clones the repo and starts the Claude agent
7. **Agent builds the feature** following the build plan, taking screenshots, running tests
8. **Progress is tracked** via commits pushed to the `agent-runtime` branch
9. **Screenshots and updates are posted** to the GitHub issue
10. **On completion**, the agent signals done, commits are pushed, and `agent-complete` label is added
11. **If more issues exist**, the agent continues in enhancement mode
12. **Deploy preview** workflow builds and deploys to CloudFront

## Key Features

- **Vote-based prioritization** - Issues with more 👍 reactions are built first
- **Health monitoring** - CloudWatch heartbeat detects stale sessions and triggers auto-restart
- **Incremental builds** - Agent builds new features on top of existing generated code
- **Screenshot capture** - Playwright takes screenshots throughout development
- **Live previews** - Each issue gets a CloudFront preview URL

## Configuration

### Prerequisites

- AWS account with Bedrock AgentCore access
- GitHub repository with Actions enabled
- Docker for local development

### AWS Configuration

1. Copy `.bedrock_agentcore.yaml.template` to `.bedrock_agentcore.yaml`
2. Fill in your AWS values:

| Value | Description | Example |
|-------|-------------|---------|
| `YOUR_ACCOUNT_ID` | Your AWS account ID | `123456789012` |
| `YOUR_EXECUTION_ROLE` | IAM role for AgentCore runtime | `AmazonBedrockAgentCoreSDKRuntime-...` |
| `YOUR_PROJECT_NAME` | ECR repository name | `my-agent` |
| `YOUR_AGENT_RUNTIME_ID` | AgentCore runtime ID (after first deploy) | `my_agent-abc123` |
| `YOUR_CODEBUILD_ROLE` | IAM role for CodeBuild | `AmazonBedrockAgentCoreSDKCodeBuild-...` |

### GitHub Repository Secrets

Configure in Settings → Secrets and variables → Actions → Secrets:

| Secret | Description |
|--------|-------------|
| `AWS_ACCESS_KEY_ID` | IAM user access key for GitHub Actions |
| `AWS_SECRET_ACCESS_KEY` | IAM user secret key |
| `AWS_AGENTCORE_ROLE_ARN` | IAM role ARN for invoking AgentCore |
| `AWS_PREVIEW_DEPLOY_ROLE_ARN` | IAM role ARN for deploying previews |

### GitHub Repository Variables

Configure in Settings → Secrets and variables → Actions → Variables:

| Variable | Description |
|----------|-------------|
| `AUTHORIZED_APPROVERS` | Comma-separated GitHub usernames who can approve builds with 🚀 |
| `PREVIEWS_BUCKET_NAME` | S3 bucket for preview deployments |
| `PREVIEWS_CDN_DOMAIN` | CloudFront domain for previews |
| `PREVIEWS_DISTRIBUTION_ID` | CloudFront distribution ID for cache invalidation |

## Project Structure

```
├── bedrock_entrypoint.py    # Main orchestrator for AWS Bedrock AgentCore
├── claude_code.py           # Agent session manager and local runner
├── src/                     # Python modules
│   ├── cloudwatch_metrics.py  # Heartbeat and metrics
│   ├── github_integration.py  # GitHub API operations
│   └── git_operations.py      # Git commit/push logic
├── prompts/                 # Build plans and system prompts
│   └── canopy/              # Project Management app build plan
├── frontend-scaffold-template/  # React + Vite + Tailwind scaffold
└── .github/workflows/       # GitHub Actions
    ├── issue-poller.yml     # Polls for approved issues
    ├── agent-builder.yml    # Invokes AgentCore
    └── deploy-preview.yml   # Deploys to CloudFront
```

## License

MIT
