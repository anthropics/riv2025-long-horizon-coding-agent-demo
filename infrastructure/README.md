# Claude Code Infrastructure (AWS CDK)

This directory contains the AWS CDK infrastructure code for deploying the Claude Code Agent.

## Architecture

The CDK stack creates:

### Core Resources
- **ECS Fargate Cluster**: Managed container orchestration
- **ECS Service**: Always-on container (desiredCount: 1)
- **ECR Repository**: Container image storage
- **EFS File System**: Persistent file storage with daily backups

### Security
- **IAM Roles**: Task execution role and task role with least privilege
- **Secrets Manager**: Stores Anthropic API key securely
- **VPC**: Uses existing default VPC with security groups

### Observability
- **CloudWatch Log Group**: Container logs with configurable retention
- **CloudWatch Alarms**: CPU and memory utilization alerts
- **Container Insights**: Detailed ECS metrics

### Backup
- **AWS Backup**: Daily EFS snapshots (35-day retention)

## Quick Start

### Prerequisites

```bash
# Install dependencies
npm install

# Configure AWS credentials
aws configure

# Bootstrap CDK (first time only)
cdk bootstrap
```

### Deploy

```bash
# Preview changes
cdk diff

# Deploy to AWS
cdk deploy

# Deploy with custom configuration
cdk deploy -c projectName=my-agent -c environment=prod
```

### Configuration Options

Pass these via `-c` flag:

| Option | Default | Description |
|--------|---------|-------------|
| `projectName` | `claude-code` | Project name prefix |
| `environment` | `dev` | Environment (dev/staging/prod) |
| `cpu` | `2048` | CPU units (1024 = 1 vCPU) |
| `memory` | `8192` | Memory in MB |
| `useFargateSpot` | `false` | Use Spot instances (60% cheaper) |
| `logRetentionDays` | `7` | CloudWatch log retention |

Examples:

```bash
# Production deployment with more resources
cdk deploy \
  -c projectName=claude-code \
  -c environment=prod \
  -c cpu=4096 \
  -c memory=16384

# Cost-optimized deployment
cdk deploy \
  -c useFargateSpot=true \
  -c cpu=1024 \
  -c memory=4096 \
  -c logRetentionDays=3
```

## Useful Commands

```bash
# List all stacks
cdk list

# Show synthesized CloudFormation template
cdk synth

# Compare deployed stack with current state
cdk diff

# Deploy stack
cdk deploy

# Destroy stack (WARNING: deletes resources)
cdk destroy
```

## Stack Outputs

After deployment, CDK outputs these values:

- **EcrRepositoryUri**: Push Docker images here
- **EcsClusterName**: ECS cluster name
- **EcsServiceName**: ECS service name
- **EfsFileSystemId**: EFS filesystem ID
- **LogGroupName**: CloudWatch log group
- **AnthropicApiKeySecretArn**: Secret ARN (set value manually)

Save these outputs - you'll need them for deployment!

## Post-Deployment Steps

### 1. Set Anthropic API Key

```bash
# Get secret ARN from outputs
aws secretsmanager put-secret-value \
  --secret-id <AnthropicApiKeySecretArn> \
  --secret-string "your-api-key-here"
```

### 2. Build and Push Docker Image

```bash
# From project root
docker build -t claude-code-agent:latest .

# Tag for ECR
ECR_URI=<EcrRepositoryUri>
docker tag claude-code-agent:latest $ECR_URI:latest

# Login to ECR
aws ecr get-login-password --region us-east-1 | \
  docker login --username AWS --password-stdin $ECR_URI

# Push
docker push $ECR_URI:latest
```

### 3. Deploy Service

```bash
# Force new deployment to use the image
aws ecs update-service \
  --cluster <EcsClusterName> \
  --service <EcsServiceName> \
  --force-new-deployment
```

## Cost Estimation

### Default Configuration (2 vCPU, 8 GB)

| Resource | Monthly Cost |
|----------|-------------|
| ECS Fargate | ~$85 |
| EFS (50 GB) | ~$15 |
| CloudWatch Logs | ~$3 |
| Secrets Manager | ~$0.40 |
| Backup | ~$2 |
| **Total** | **~$105** |

### Optimized Configuration (1 vCPU, 4 GB, Spot)

| Resource | Monthly Cost |
|----------|-------------|
| ECS Fargate Spot | ~$35 |
| EFS (50 GB) | ~$15 |
| CloudWatch Logs (3 days) | ~$1 |
| Secrets Manager | ~$0.40 |
| Backup | ~$2 |
| **Total** | **~$53** |

## Updating the Stack

### Change Resources

1. Edit `lib/claude-code-stack.ts`
2. Run `cdk diff` to preview changes
3. Run `cdk deploy` to apply

### Add New Resources

```typescript
// In lib/claude-code-stack.ts

// Example: Add SNS topic for alerts
const alertTopic = new sns.Topic(this, 'AlertTopic', {
  topicName: `${projectName}-${environment}-alerts`,
});

// Update alarms to use the topic
memoryAlarm.addAlarmAction(new cdk.aws_cloudwatch_actions.SnsAction(alertTopic));
```

## Multi-Environment Deployment

Deploy separate stacks for dev/staging/prod:

```bash
# Development
cdk deploy -c environment=dev

# Staging
cdk deploy -c environment=staging -c cpu=2048 -c memory=8192

# Production
cdk deploy -c environment=prod -c cpu=4096 -c memory=16384
```

Each environment gets:
- Separate ECS cluster
- Separate EFS filesystem
- Separate log groups
- Isolated resources

## Troubleshooting

### CDK Deploy Fails

```bash
# Check CDK bootstrap
cdk bootstrap

# Verify AWS credentials
aws sts get-caller-identity

# Check CDK version
cdk --version  # Should be 2.115.0+

# Clear CDK cache
rm -rf cdk.out
cdk synth
```

### Stack Updates Fail

```bash
# View stack events
aws cloudformation describe-stack-events \
  --stack-name claude-code-dev

# Rollback if needed
aws cloudformation rollback-stack \
  --stack-name claude-code-dev
```

### Can't Delete Stack

```bash
# Some resources might be retained (EFS, ECR)
# Delete them manually first

# EFS
aws efs delete-file-system --file-system-id fs-XXXXX

# ECR (delete all images first)
aws ecr delete-repository \
  --repository-name claude-code-dev \
  --force

# Then retry
cdk destroy
```

## Best Practices

1. **Use Context Variables**: For configuration, not hardcoded values
2. **Tag Resources**: All resources are tagged with Project/Environment
3. **Enable Removal Protection**: For production EFS and ECR (RETAIN policy)
4. **Use Secrets Manager**: Never hardcode API keys
5. **Enable Container Insights**: For detailed metrics
6. **Set Up Alarms**: Monitor resource utilization
7. **Version Lock**: Pin CDK version in package.json

## Security

### IAM Roles

The stack creates two roles:

**Execution Role**: Pulls images, writes logs
- AmazonECSTaskExecutionRolePolicy
- secretsmanager:GetSecretValue

**Task Role**: Container permissions
- logs:CreateLogStream, logs:PutLogEvents
- cloudwatch:PutMetricData (scoped to ClaudeCodeAgent namespace)
- elasticfilesystem:Client* (scoped to specific EFS)

### Network

- Uses default VPC (simplest setup)
- EFS mount targets in private subnets
- ECS tasks can access internet (for Anthropic API)
- Security group restricts EFS access to ECS tasks only

## Monitoring

### CloudWatch Dashboards

Create custom dashboards:
- ECS CPU/Memory utilization
- EFS throughput and IOPS
- Custom metrics (SessionSuccess, SessionDuration)
- Log insights queries

### Alarms

Default alarms:
- High CPU (>90% for 2 periods)
- High Memory (>90% for 2 periods)

Add more as needed:
- EFS burst credits depleted
- Service unhealthy
- Task failures

## Cleanup

### Temporary Cleanup (keep data)

```bash
# Scale down to 0 (stop spending on compute)
aws ecs update-service \
  --cluster <ClusterName> \
  --service <ServiceName> \
  --desired-count 0
```

### Full Cleanup (delete everything)

```bash
# WARNING: This deletes all data!

# 1. Backup EFS if needed
aws backup start-backup-job \
  --backup-vault-name <VaultName> \
  --resource-arn <EfsArn>

# 2. Destroy stack
cdk destroy

# 3. Manual cleanup if needed
# - Empty ECR repository
# - Delete EFS manually (if RETAIN policy)
```

## Contributing

When modifying infrastructure:
1. Run `npm run build` to compile TypeScript
2. Run `cdk diff` to preview changes
3. Test in dev environment first
4. Document new resources/outputs
5. Update cost estimates

## Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [EFS User Guide](https://docs.aws.amazon.com/efs/latest/ug/)
- [Fargate Pricing](https://aws.amazon.com/fargate/pricing/)
