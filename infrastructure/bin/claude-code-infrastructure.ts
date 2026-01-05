#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ClaudeCodeStack } from '../lib/claude-code-stack';
import { DemoViewerStack } from '../lib/demo-viewer-stack';

const app = new cdk.App();

// Get configuration from context or environment
const env = {
  account: process.env.CDK_DEFAULT_ACCOUNT || process.env.AWS_ACCOUNT_ID,
  region: process.env.CDK_DEFAULT_REGION || process.env.AWS_REGION || 'us-west-2',
};

const projectName = app.node.tryGetContext('projectName') || 'claude-code';
const environment = app.node.tryGetContext('environment') || 'prod';

new ClaudeCodeStack(app, `${projectName}-${environment}`, {
  env,
  description: 'Claude Code Agent - Supporting infrastructure for AgentCore',

  // Stack configuration
  projectName,
  environment,

  // Observability
  logRetentionDays: parseInt(app.node.tryGetContext('logRetentionDays') || '7'),

  tags: {
    Project: projectName,
    Environment: environment,
    ManagedBy: 'CDK',
  },
});

// Demo Viewer Stack - Read-only access for laptops without SSO
new DemoViewerStack(app, `${projectName}-demo-viewer`, {
  env,
  description: 'Read-only demo viewer access for Claude Code Agent',
  projectName,
  environment,
  tags: {
    Project: projectName,
    Environment: environment,
    ManagedBy: 'CDK',
  },
});
