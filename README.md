# Chewy

Autonomous coding agent for eqho.ai powered by Claude.

## Quick Start

### Local Docker

```bash
# 1. Copy env file and add your Anthropic API key
cp .env.example .env
# Edit .env and set ANTHROPIC_API_KEY

# 2. Run with docker-compose
docker-compose up --build
```

### Railway

1. Connect your repo to [Railway](https://railway.app)
2. Add environment variable: `ANTHROPIC_API_KEY`
3. Deploy

Railway will use `Dockerfile.local` and `railway.toml` automatically.

## Configuration

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `ANTHROPIC_API_KEY` | Yes | - | Your Anthropic API key |
| `DEFAULT_MODEL` | No | `claude-sonnet-4-20250514` | Claude model to use |
| `PROJECT_NAME` | No | `chewy` | Project config in `prompts/{name}/` |
| `GITHUB_TOKEN` | No | - | For GitHub issue integration |
| `GITHUB_REPO` | No | - | e.g., `eqho-ai/chewy` |

## Project Structure

```
├── claude_code.py           # Main agent runner
├── Dockerfile.railway       # Local/Railway Docker build
├── docker-compose.yml       # Local development
├── railway.toml             # Railway deployment config
├── prompts/                 # Project-specific prompts
│   └── chewy/               # Chewy build plans
├── src/                     # Python modules
└── frontend-scaffold-template/  # React + Vite starter
```

## How It Works

1. Agent reads build plan from `prompts/{project}/BUILD_PLAN.md`
2. Builds the application incrementally
3. Takes screenshots and runs tests
4. (Optional) Posts updates to GitHub issues

## Future: GCP Migration

When ready to scale to GCP:
- Cloud Run for container hosting
- Secret Manager for credentials
- Cloud Storage for artifacts

## License

Apache 2.0
