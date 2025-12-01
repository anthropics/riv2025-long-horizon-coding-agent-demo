FROM public.ecr.aws/docker/library/python:3.12-slim

# Install system dependencies for Playwright, git operations, and process management
# Also includes Chromium dependencies for Playwright headless browser
RUN apt-get update && apt-get install -y \
    git \
    curl \
    nodejs \
    npm \
    procps \
    lsof \
    ripgrep \
    jq \
    net-tools \
    findutils \
    chromium \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libxshmfence1 \
    && rm -rf /var/lib/apt/lists/*

# Playwright will use its own Chromium downloaded via `npx playwright install chromium`

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install Bedrock AgentCore SDK
RUN pip install --no-cache-dir bedrock-agentcore

# Copy application code
COPY claude_code.py .
COPY bedrock_entrypoint.py .
COPY src/ ./src/
COPY prompts/ ./prompts/
COPY frontend-scaffold-template/ ./frontend-scaffold-template/
COPY prompt_template.txt .
COPY state_management.txt .

# Install Claude Code CLI (required by Claude Agent SDK)
RUN npm install -g @anthropic-ai/claude-code

# Install Playwright for browser automation (screenshots, testing)
RUN npx playwright install chromium

# Create workspace directory (ephemeral in AgentCore)
RUN mkdir -p /app/workspace

# Environment variables
ENV PYTHONUNBUFFERED=1

# Initialize workspace with required files at startup
# Use opentelemetry-instrument to enable ADOT tracing for AgentCore observability
CMD ["sh", "-c", "cp -r /app/prompts /app/workspace/ 2>/dev/null || true && cp -r /app/frontend-scaffold-template /app/workspace/ 2>/dev/null || true && opentelemetry-instrument python bedrock_entrypoint.py"]
