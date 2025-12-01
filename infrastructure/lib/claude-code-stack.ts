// Copyright 2025-present Anthropic PBC.
// Licensed under Apache 2.0

import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as efs from 'aws-cdk-lib/aws-efs';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import * as backup from 'aws-cdk-lib/aws-backup';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as cloudwatch from 'aws-cdk-lib/aws-cloudwatch';
import * as cr from 'aws-cdk-lib/custom-resources';
import { Construct } from 'constructs';

export interface ClaudeCodeStackProps extends cdk.StackProps {
  projectName: string;
  environment: string;
  logRetentionDays: number;
}

/**
 * Simplified CDK Stack for AgentCore
 *
 * This stack provides supporting infrastructure for AWS Bedrock AgentCore.
 * AgentCore manages its own compute - we just provide:
 * - ECR repository (stores the agent container image)
 * - EFS file system (persistent storage)
 * - Secrets Manager (API keys)
 * - IAM roles (for GitHub Actions to invoke AgentCore)
 * - CloudWatch logs (observability)
 * - Backup (EFS snapshots)
 */
export class ClaudeCodeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: ClaudeCodeStackProps) {
    super(scope, id, props);

    const { projectName, environment, logRetentionDays } = props;

    // ========================================================================
    // VPC - Required for EFS
    // ========================================================================
    const vpc = new ec2.Vpc(this, 'VPC', {
      maxAzs: 2,
      natGateways: 0,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
      ],
    });

    // ========================================================================
    // ECR Repository - Stores agent container image (used by AgentCore)
    // ========================================================================
    const repository = new ecr.Repository(this, 'Repository', {
      repositoryName: `${projectName}-${environment}`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      lifecycleRules: [
        {
          description: 'Keep last 10 images',
          maxImageCount: 10,
        },
      ],
    });

    // ========================================================================
    // EFS File System - Persistent storage for agent state
    // ========================================================================
    const fileSystem = new efs.FileSystem(this, 'FileSystem', {
      vpc,
      performanceMode: efs.PerformanceMode.GENERAL_PURPOSE,
      throughputMode: efs.ThroughputMode.BURSTING,
      encrypted: true,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      enableAutomaticBackups: true,
    });

    // Create access point for agent
    const accessPoint = fileSystem.addAccessPoint('AgentAccessPoint', {
      path: '/projects',
      createAcl: {
        ownerUid: '1000',
        ownerGid: '1000',
        permissions: '755',
      },
      posixUser: {
        uid: '1000',
        gid: '1000',
      },
    });

    // ========================================================================
    // Secrets Manager - Store API keys and tokens
    // ========================================================================
    const anthropicApiKey = new secretsmanager.Secret(this, 'AnthropicApiKey', {
      secretName: `${projectName}/${environment}/anthropic-api-key`,
      description: 'Anthropic API key for Claude Code Agent',
    });

    // Import existing GitHub token secret (created manually)
    const githubToken = secretsmanager.Secret.fromSecretNameV2(
      this,
      'GitHubToken',
      `${projectName}/${environment}/github-token`
    );

    // ========================================================================
    // CloudWatch Log Group - For observability
    // ========================================================================
    const logGroup = new logs.LogGroup(this, 'LogGroup', {
      logGroupName: `/agentcore/${projectName}-${environment}`,
      retention: logRetentionDays === 7
        ? logs.RetentionDays.ONE_WEEK
        : logs.RetentionDays.TWO_WEEKS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // ========================================================================
    // AWS Backup - Daily EFS snapshots
    // ========================================================================
    const backupVault = new backup.BackupVault(this, 'BackupVault', {
      backupVaultName: `${projectName}-${environment}-vault`,
    });

    const backupPlan = new backup.BackupPlan(this, 'BackupPlan', {
      backupPlanName: `${projectName}-${environment}-daily`,
      backupPlanRules: [
        new backup.BackupPlanRule({
          ruleName: 'DailyBackup',
          scheduleExpression: cdk.aws_events.Schedule.cron({
            hour: '2',
            minute: '0',
          }),
          deleteAfter: cdk.Duration.days(35),
        }),
      ],
    });

    backupPlan.addSelection('EfsBackupSelection', {
      resources: [backup.BackupResource.fromEfsFileSystem(fileSystem)],
    });

    // ========================================================================
    // IAM Role for AgentCore Invocation (GitHub Actions)
    // ========================================================================
    const githubAgentCoreRole = new iam.Role(this, 'GitHubAgentCoreRole', {
      roleName: `${projectName}-github-agentcore-invoker`,
      description: 'Role for GitHub Actions to invoke Bedrock AgentCore',
      assumedBy: new iam.AccountPrincipal(cdk.Stack.of(this).account),
      maxSessionDuration: cdk.Duration.hours(8),
    });

    githubAgentCoreRole.assumeRolePolicy?.addStatements(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.AccountPrincipal(cdk.Stack.of(this).account)],
        actions: ['sts:TagSession'],
      })
    );

    // Grant Bedrock AgentCore permissions
    githubAgentCoreRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        'bedrock:InvokeAgent',
        'bedrock-agent-runtime:InvokeAgent',
        'bedrock-agentcore:InvokeAgentRuntime',
        'bedrock-agentcore:StopRuntimeSession',
      ],
      resources: [
        `arn:aws:bedrock-agentcore:${this.region}:${this.account}:runtime/antodo_agent-0UyfaL5NVq`,
        '*',
      ],
    }));

    // Grant Secrets Manager read
    githubAgentCoreRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['secretsmanager:GetSecretValue'],
      resources: [
        `arn:aws:secretsmanager:${this.region}:${this.account}:secret:claude-code/*`,
      ],
    }));

    // Grant SSM Parameter Store read access (for health monitor to read current issue)
    githubAgentCoreRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['ssm:GetParameter'],
      resources: [
        `arn:aws:ssm:${this.region}:${this.account}:parameter/claude-code/*`,
      ],
    }));

    // Grant CloudWatch read access (for health monitor to check heartbeat metrics)
    githubAgentCoreRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['cloudwatch:GetMetricStatistics'],
      resources: ['*'],
    }));

    // ========================================================================
    // AgentCore Execution Role - Grant Secrets & CloudWatch Access
    // ========================================================================
    const agentCoreSecretsPolicy = new iam.ManagedPolicy(this, 'AgentCoreSecretsPolicy', {
      // Let CDK auto-generate name to avoid replacement conflicts
      description: 'Allows AgentCore execution role to read claude-code secrets and manage SSM parameters',
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['secretsmanager:GetSecretValue'],
          resources: [
            `arn:aws:secretsmanager:${this.region}:${this.account}:secret:claude-code/*`,
          ],
        }),
        // SSM Parameter Store write/delete access for session health tracking
        // AgentCore writes current issue number for health monitor to read
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['ssm:PutParameter', 'ssm:DeleteParameter', 'ssm:GetParameter'],
          resources: [
            `arn:aws:ssm:${this.region}:${this.account}:parameter/claude-code/*`,
          ],
        }),
      ],
      roles: [
        iam.Role.fromRoleName(
          this,
          'AgentCoreExecutionRole',
          'AmazonBedrockAgentCoreSDKRuntime-us-west-2-f3ae55dcc2'
        ),
      ],
    });

    // CloudWatch metrics policy for AgentCore runtime
    new iam.ManagedPolicy(this, 'AgentCoreCloudWatchPolicy', {
      // Let CDK auto-generate name to avoid replacement conflicts
      description: 'Allows AgentCore execution role to push CloudWatch metrics',
      statements: [
        new iam.PolicyStatement({
          effect: iam.Effect.ALLOW,
          actions: ['cloudwatch:PutMetricData'],
          resources: ['*'],
          conditions: {
            StringEquals: {
              'cloudwatch:namespace': 'ClaudeCodeAgent',
            },
          },
        }),
      ],
      roles: [
        iam.Role.fromRoleName(
          this,
          'AgentCoreExecutionRoleForCloudWatch',
          'AmazonBedrockAgentCoreSDKRuntime-us-west-2-f3ae55dcc2'
        ),
      ],
    });

    // ========================================================================
    // S3 Bucket + CloudFront - Screenshot storage for agent builds
    // ========================================================================
    const screenshotsBucket = new s3.Bucket(this, 'ScreenshotsBucket', {
      bucketName: `${projectName}-${environment}-screenshots`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // CloudFront distribution for serving screenshots
    const screenshotsDistribution = new cloudfront.Distribution(this, 'ScreenshotsDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(screenshotsBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      comment: `${projectName} agent screenshots`,
    });

    // Grant AgentCore execution role write access to S3
    screenshotsBucket.grantWrite(
      iam.Role.fromRoleName(
        this,
        'AgentCoreExecutionRoleForScreenshots',
        'AmazonBedrockAgentCoreSDKRuntime-us-west-2-f3ae55dcc2'
      )
    );

    // ========================================================================
    // S3 Bucket + CloudFront - App Preview hosting for agent builds
    // ========================================================================
    const previewsBucket = new s3.Bucket(this, 'PreviewsBucket', {
      bucketName: `${projectName}-${environment}-previews`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      lifecycleRules: [
        {
          id: 'ExpireOldPreviews',
          enabled: true,
          expiration: cdk.Duration.days(30),
          prefix: 'previews/',
        },
        {
          id: 'AbortIncompleteUploads',
          enabled: true,
          abortIncompleteMultipartUploadAfter: cdk.Duration.days(1),
        },
      ],
    });

    // CloudFront Function for SPA routing (rewrites non-file paths to index.html)
    const spaRoutingFunction = new cloudfront.Function(this, 'SpaRoutingFunction', {
      functionName: `${projectName}-${environment}-spa-routing`,
      code: cloudfront.FunctionCode.fromInline(`
function handler(event) {
  var request = event.request;
  var uri = request.uri;

  // Match /previews/issue-{N}/... pattern
  var match = uri.match(/^\\/previews\\/issue-(\\d+)(\\/.*)?$/);
  if (match) {
    var issueNum = match[1];
    var subPath = match[2] || '/';

    // No file extension = SPA route, serve index.html
    if (!subPath.match(/\\.[a-zA-Z0-9]+$/)) {
      request.uri = '/previews/issue-' + issueNum + '/index.html';
    }
  }
  return request;
}
      `),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      comment: 'SPA routing for app previews',
    });

    // Custom cache policy for previews (shorter TTL for active development)
    const previewsCachePolicy = new cloudfront.CachePolicy(this, 'PreviewsCachePolicy', {
      cachePolicyName: `${projectName}-${environment}-previews-cache`,
      comment: 'Cache policy for SPA preview deployments',
      defaultTtl: cdk.Duration.hours(1),
      maxTtl: cdk.Duration.days(1),
      minTtl: cdk.Duration.seconds(0),
      enableAcceptEncodingGzip: true,
      enableAcceptEncodingBrotli: true,
      queryStringBehavior: cloudfront.CacheQueryStringBehavior.all(),
    });

    // CloudFront distribution for serving app previews
    const previewsDistribution = new cloudfront.Distribution(this, 'PreviewsDistribution', {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(previewsBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: previewsCachePolicy,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        functionAssociations: [
          {
            function: spaRoutingFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      comment: `${projectName} app previews`,
    });

    // Grant AgentCore execution role write access to previews bucket (for future inline builds)
    previewsBucket.grantWrite(
      iam.Role.fromRoleName(
        this,
        'AgentCoreExecutionRoleForPreviews',
        'AmazonBedrockAgentCoreSDKRuntime-us-west-2-f3ae55dcc2'
      )
    );

    // IAM Role for GitHub Actions Preview Deployment
    const githubPreviewDeployRole = new iam.Role(this, 'GitHubPreviewDeployRole', {
      roleName: `${projectName}-github-preview-deploy`,
      description: 'Role for GitHub Actions to deploy app previews to S3/CloudFront',
      assumedBy: new iam.AccountPrincipal(cdk.Stack.of(this).account),
      maxSessionDuration: cdk.Duration.hours(1),
    });

    githubPreviewDeployRole.assumeRolePolicy?.addStatements(
      new iam.PolicyStatement({
        effect: iam.Effect.ALLOW,
        principals: [new iam.AccountPrincipal(cdk.Stack.of(this).account)],
        actions: ['sts:TagSession'],
      })
    );

    // S3 permissions for preview deployment
    githubPreviewDeployRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: [
        's3:PutObject',
        's3:DeleteObject',
        's3:ListBucket',
        's3:GetObject',
      ],
      resources: [
        previewsBucket.bucketArn,
        `${previewsBucket.bucketArn}/*`,
      ],
    }));

    // CloudFront invalidation permission for preview deployment
    githubPreviewDeployRole.addToPolicy(new iam.PolicyStatement({
      effect: iam.Effect.ALLOW,
      actions: ['cloudfront:CreateInvalidation'],
      resources: [
        `arn:aws:cloudfront::${this.account}:distribution/${previewsDistribution.distributionId}`,
      ],
    }));

    // Grant the GitHub Actions deployer user permission to assume the preview deploy role
    const githubActionsUser = iam.User.fromUserName(
      this,
      'GitHubActionsUser',
      'github-actions-deployer'
    );

    new iam.Policy(this, 'GitHubActionsUserPreviewDeployPolicy', {
      policyName: 'AllowAssumePreviewDeployRole',
      users: [githubActionsUser],
      statements: [
        new iam.PolicyStatement({
          sid: 'AllowAssumePreviewDeployRole',
          effect: iam.Effect.ALLOW,
          actions: ['sts:AssumeRole', 'sts:TagSession'],
          resources: [githubPreviewDeployRole.roleArn],
        }),
      ],
    });

    // ========================================================================
    // CloudWatch Dashboard - Agent Monitoring for re:Invent Demo
    // ========================================================================
    // Note: AgentCore logs go to /aws/bedrock-agentcore/runtimes/{runtime-id}
    // Specify the exact log group name (wildcards not supported in dashboard widgets)
    const agentLogGroupName = '/aws/bedrock-agentcore/runtimes/antodo_agent-0UyfaL5NVq-DEFAULT';

    // Dashboard variable for filtering by Issue Number
    // Use fromSearch with explicit search string that includes ALL dimensions
    const issueVariable = new cloudwatch.DashboardVariable({
      id: 'issueNumber',
      type: cloudwatch.VariableType.PROPERTY,
      label: 'Issue Number',
      inputType: cloudwatch.VariableInputType.SELECT,
      value: 'IssueNumber',
      values: cloudwatch.Values.fromSearch(
        '{ClaudeCodeAgent,Environment,IssueNumber} MetricName="APICallCount"',
        'IssueNumber'
      ),
      defaultValue: cloudwatch.DefaultValue.FIRST,
      visible: true,
    });

    const dashboard = new cloudwatch.Dashboard(this, 'AgentDashboard', {
      dashboardName: `${projectName}-${environment}-agent-dashboard`,
      defaultInterval: cdk.Duration.hours(12),
      variables: [issueVariable],
    });

    // Row 1: Hero Metrics (Big Numbers) - Custom Metrics from agent
    dashboard.addWidgets(
      new cloudwatch.SingleValueWidget({
        title: 'API Calls',
        metrics: [new cloudwatch.Metric({
          namespace: 'ClaudeCodeAgent',
          metricName: 'APICallCount',
          dimensionsMap: { Environment: environment, IssueNumber: '${issueNumber}' },
          statistic: 'Maximum',
          period: cdk.Duration.minutes(1),
        })],
        width: 8,
        height: 4,
      }),
      new cloudwatch.SingleValueWidget({
        title: 'Total Commits',
        metrics: [new cloudwatch.Metric({
          namespace: 'ClaudeCodeAgent',
          metricName: 'TotalCommits',
          dimensionsMap: { Environment: environment, IssueNumber: '${issueNumber}' },
          statistic: 'Maximum',
          period: cdk.Duration.minutes(1),
        })],
        width: 8,
        height: 4,
      }),
      new cloudwatch.SingleValueWidget({
        title: 'Cost (cents)',
        metrics: [new cloudwatch.Metric({
          namespace: 'ClaudeCodeAgent',
          metricName: 'TotalCostCents',
          dimensionsMap: { Environment: environment, IssueNumber: '${issueNumber}' },
          statistic: 'Maximum',
          period: cdk.Duration.minutes(1),
        })],
        width: 8,
        height: 4,
      }),
    );

    // Row 2: Token Usage Over Time (Line Graph)
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Token Usage Over Time',
        left: [
          new cloudwatch.Metric({
            namespace: 'ClaudeCodeAgent',
            metricName: 'InputTokens',
            dimensionsMap: { Environment: environment, IssueNumber: '${issueNumber}' },
            statistic: 'Maximum',
            period: cdk.Duration.minutes(5),
            label: 'Input Tokens',
          }),
          new cloudwatch.Metric({
            namespace: 'ClaudeCodeAgent',
            metricName: 'OutputTokens',
            dimensionsMap: { Environment: environment, IssueNumber: '${issueNumber}' },
            statistic: 'Maximum',
            period: cdk.Duration.minutes(5),
            label: 'Output Tokens',
          }),
        ],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'Session Progress',
        left: [
          new cloudwatch.Metric({
            namespace: 'ClaudeCodeAgent',
            metricName: 'ElapsedHours',
            dimensionsMap: { Environment: environment, IssueNumber: '${issueNumber}' },
            statistic: 'Maximum',
            period: cdk.Duration.minutes(5),
            label: 'Elapsed Hours',
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'ClaudeCodeAgent',
            metricName: 'RemainingHours',
            dimensionsMap: { Environment: environment, IssueNumber: '${issueNumber}' },
            statistic: 'Maximum',
            period: cdk.Duration.minutes(5),
            label: 'Remaining Hours',
          }),
        ],
        width: 12,
        height: 6,
      }),
    );

    // Row 3: Git Activity & Screenshots
    dashboard.addWidgets(
      new cloudwatch.GraphWidget({
        title: 'Git Activity',
        left: [
          new cloudwatch.Metric({
            namespace: 'ClaudeCodeAgent',
            metricName: 'CommitsPushed',
            dimensionsMap: { Environment: environment, IssueNumber: '${issueNumber}' },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Commits Pushed',
          }),
        ],
        right: [
          new cloudwatch.Metric({
            namespace: 'ClaudeCodeAgent',
            metricName: 'ScreenshotsUploaded',
            dimensionsMap: { Environment: environment, IssueNumber: '${issueNumber}' },
            statistic: 'Sum',
            period: cdk.Duration.minutes(5),
            label: 'Screenshots',
          }),
        ],
        width: 12,
        height: 6,
      }),
      new cloudwatch.GraphWidget({
        title: 'Cost Over Time (cents)',
        left: [
          new cloudwatch.Metric({
            namespace: 'ClaudeCodeAgent',
            metricName: 'TotalCostCents',
            dimensionsMap: { Environment: environment, IssueNumber: '${issueNumber}' },
            statistic: 'Maximum',
            period: cdk.Duration.minutes(5),
            label: 'Cumulative Cost',
          }),
        ],
        width: 12,
        height: 6,
      }),
    );

    // Row 4: Logs Insights - Tool Usage Distribution (Pie Chart)
    // These queries filter by issue number using the [issue:N] tag added to Tool Call logs
    // and the "issue_number": N field in PROGRESS_METRIC/TOKEN_METRIC JSON logs
    dashboard.addWidgets(
      new cloudwatch.LogQueryWidget({
        title: 'Tool Usage Distribution',
        logGroupNames: [agentLogGroupName],
        queryString: `
          fields @message
          | filter @message like /\\[Tool Call\\]/ and @message like /\\[issue:\${issueNumber}\\]/
          | parse @message "[Tool Call] *" as tool_name
          | stats count() as calls by tool_name
          | sort calls desc
          | limit 15
        `,
        view: cloudwatch.LogQueryVisualizationType.PIE,
        width: 12,
        height: 6,
      }),
      new cloudwatch.LogQueryWidget({
        title: 'Activity Timeline (events/min)',
        logGroupNames: [agentLogGroupName],
        queryString: `
          fields @timestamp
          | filter @message like /\\[issue:\${issueNumber}\\]/ or @message like /"issue_number":\\s*\${issueNumber}[,}]/
          | stats count() as activity by bin(1m)
          | sort @timestamp desc
          | limit 60
        `,
        view: cloudwatch.LogQueryVisualizationType.BAR,
        width: 12,
        height: 6,
      }),
    );

    // Row 5: Live Agent Logs
    dashboard.addWidgets(
      new cloudwatch.LogQueryWidget({
        title: 'Recent Agent Activity',
        logGroupNames: [agentLogGroupName],
        queryString: `
          fields @timestamp, @message
          | filter @message like /\\[issue:\${issueNumber}\\]/ or @message like /"issue_number":\\s*\${issueNumber}[,}]/
          | sort @timestamp desc
          | limit 50
        `,
        width: 24,
        height: 8,
      }),
    );

    // ========================================================================
    // Outputs
    // ========================================================================
    new cdk.CfnOutput(this, 'EcrRepositoryUri', {
      value: repository.repositoryUri,
      description: 'ECR repository URI for pushing Docker images',
      exportName: `${projectName}-${environment}-ecr-uri`,
    });

    new cdk.CfnOutput(this, 'EfsFileSystemId', {
      value: fileSystem.fileSystemId,
      description: 'EFS file system ID',
      exportName: `${projectName}-${environment}-efs-id`,
    });

    new cdk.CfnOutput(this, 'EfsAccessPointId', {
      value: accessPoint.accessPointId,
      description: 'EFS access point ID',
      exportName: `${projectName}-${environment}-efs-ap`,
    });

    new cdk.CfnOutput(this, 'LogGroupName', {
      value: logGroup.logGroupName,
      description: 'CloudWatch log group name',
      exportName: `${projectName}-${environment}-logs`,
    });

    new cdk.CfnOutput(this, 'AnthropicApiKeySecretArn', {
      value: anthropicApiKey.secretArn,
      description: 'Anthropic API key secret ARN (set value manually)',
      exportName: `${projectName}-${environment}-api-key-arn`,
    });

    new cdk.CfnOutput(this, 'GitHubAgentCoreRoleArn', {
      value: githubAgentCoreRole.roleArn,
      description: 'IAM role ARN for GitHub Actions AgentCore invocation',
      exportName: `${projectName}-github-agentcore-role`,
    });

    new cdk.CfnOutput(this, 'VpcId', {
      value: vpc.vpcId,
      description: 'VPC ID',
      exportName: `${projectName}-${environment}-vpc-id`,
    });

    new cdk.CfnOutput(this, 'ScreenshotsBucketName', {
      value: screenshotsBucket.bucketName,
      description: 'S3 bucket for agent screenshots',
      exportName: `${projectName}-${environment}-screenshots-bucket`,
    });

    new cdk.CfnOutput(this, 'ScreenshotsCdnDomain', {
      value: screenshotsDistribution.distributionDomainName,
      description: 'CloudFront domain for screenshot URLs',
      exportName: `${projectName}-${environment}-screenshots-cdn`,
    });

    new cdk.CfnOutput(this, 'PreviewsBucketName', {
      value: previewsBucket.bucketName,
      description: 'S3 bucket for app previews',
      exportName: `${projectName}-${environment}-previews-bucket`,
    });

    new cdk.CfnOutput(this, 'PreviewsCdnDomain', {
      value: previewsDistribution.distributionDomainName,
      description: 'CloudFront domain for preview URLs',
      exportName: `${projectName}-${environment}-previews-cdn`,
    });

    new cdk.CfnOutput(this, 'PreviewsDistributionId', {
      value: previewsDistribution.distributionId,
      description: 'CloudFront distribution ID for cache invalidation',
      exportName: `${projectName}-${environment}-previews-distribution-id`,
    });

    new cdk.CfnOutput(this, 'GitHubPreviewDeployRoleArn', {
      value: githubPreviewDeployRole.roleArn,
      description: 'IAM role ARN for GitHub Actions preview deployment',
      exportName: `${projectName}-github-preview-deploy-role`,
    });

    new cdk.CfnOutput(this, 'DashboardUrl', {
      value: `https://${this.region}.console.aws.amazon.com/cloudwatch/home?region=${this.region}#dashboards:name=${projectName}-${environment}-agent-dashboard`,
      description: 'CloudWatch Dashboard URL for agent monitoring',
      exportName: `${projectName}-${environment}-dashboard-url`,
    });

    // ========================================================================
    // X-Ray Resource Policy - For AgentCore observability trace delivery
    // ========================================================================
    // CDK doesn't have native support for X-Ray resource policies, so we use
    // AwsCustomResource to call the X-Ray API directly.
    // This policy allows CloudWatch Logs delivery service to send traces to X-Ray.
    new cr.AwsCustomResource(this, 'XRayResourcePolicy', {
      onCreate: {
        service: 'XRay',
        action: 'putResourcePolicy',
        parameters: {
          PolicyName: 'BedrockAgentCoreTraceAccess',
          PolicyDocument: JSON.stringify({
            Version: '2012-10-17',
            Statement: [{
              Sid: 'AllowLogDeliveryToSendTraces',
              Effect: 'Allow',
              Principal: {
                Service: 'delivery.logs.amazonaws.com'
              },
              Action: 'xray:PutTraceSegments',
              Resource: '*',
              Condition: {
                StringEquals: {
                  'aws:SourceAccount': this.account
                },
                ArnLike: {
                  'aws:SourceArn': `arn:aws:logs:${this.region}:${this.account}:delivery-source:*`
                }
              }
            }]
          })
        },
        physicalResourceId: cr.PhysicalResourceId.of('XRayResourcePolicy'),
      },
      onUpdate: {
        service: 'XRay',
        action: 'putResourcePolicy',
        parameters: {
          PolicyName: 'BedrockAgentCoreTraceAccess',
          PolicyDocument: JSON.stringify({
            Version: '2012-10-17',
            Statement: [{
              Sid: 'AllowLogDeliveryToSendTraces',
              Effect: 'Allow',
              Principal: {
                Service: 'delivery.logs.amazonaws.com'
              },
              Action: 'xray:PutTraceSegments',
              Resource: '*',
              Condition: {
                StringEquals: {
                  'aws:SourceAccount': this.account
                },
                ArnLike: {
                  'aws:SourceArn': `arn:aws:logs:${this.region}:${this.account}:delivery-source:*`
                }
              }
            }]
          })
        },
        physicalResourceId: cr.PhysicalResourceId.of('XRayResourcePolicy'),
      },
      onDelete: {
        service: 'XRay',
        action: 'deleteResourcePolicy',
        parameters: {
          PolicyName: 'BedrockAgentCoreTraceAccess',
        },
      },
      policy: cr.AwsCustomResourcePolicy.fromStatements([
        new iam.PolicyStatement({
          actions: ['xray:PutResourcePolicy', 'xray:DeleteResourcePolicy'],
          resources: ['*'],
        }),
      ]),
    });

  }
}
