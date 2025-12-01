#!/usr/bin/env python3
"""
AgentCore Runtime Invocation Script

Invokes AWS Bedrock AgentCore agent via boto3 API instead of CLI.
This eliminates the dependency on .bedrock_agentcore.yaml configuration file.

Usage:
    python invoke_agent.py \
        --agent-arn <ARN> \
        --session-id <SESSION_ID> \
        --payload <JSON_PAYLOAD> \
        --region <AWS_REGION>
"""

import argparse
import boto3
import json
import sys
import time
from typing import Dict, Any, Optional
from botocore.exceptions import ClientError, BotoCoreError


class AgentInvoker:
    """Handles AgentCore Runtime invocation with retry logic and streaming."""

    def __init__(self, agent_arn: str, region: str = 'us-west-2', max_retries: int = 3):
        self.agent_arn = agent_arn
        self.region = region
        self.max_retries = max_retries
        self.client = boto3.client('bedrock-agentcore', region_name=region)

    def invoke(self, payload: Dict[str, Any], session_id: str) -> bool:
        """
        Invoke the agent with the given payload and session ID.

        Args:
            payload: JSON payload for the agent
            session_id: Unique session identifier

        Returns:
            True if invocation succeeded, False otherwise
        """
        print(f"🚀 Invoking AgentCore Runtime...")
        print(f"   Agent ARN: {self.agent_arn}")
        print(f"   Session ID: {session_id}")
        print(f"   Region: {self.region}")
        print(f"   Payload: {json.dumps(payload, indent=2)}")
        print()

        for attempt in range(1, self.max_retries + 1):
            try:
                print(f"⏳ Attempt {attempt}/{self.max_retries}...")

                # Convert payload to bytes
                payload_bytes = json.dumps(payload).encode('utf-8')

                # Invoke agent runtime
                response = self.client.invoke_agent_runtime(
                    agentRuntimeArn=self.agent_arn,
                    runtimeSessionId=session_id,
                    payload=payload_bytes
                )

                print(f"✅ Agent invocation initiated successfully")
                print()

                # Process streaming response
                self._process_response(response)

                return True

            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', 'Unknown')
                error_message = e.response.get('Error', {}).get('Message', str(e))

                print(f"❌ AWS ClientError (attempt {attempt}/{self.max_retries})")
                print(f"   Error Code: {error_code}")
                print(f"   Error Message: {error_message}")

                # Handle specific error types
                if error_code == 'ThrottlingException':
                    if attempt < self.max_retries:
                        delay = 5 * (2 ** (attempt - 1))  # Exponential backoff
                        print(f"   ⏱️  Retrying in {delay} seconds...")
                        time.sleep(delay)
                        continue
                elif error_code == 'ValidationException':
                    print(f"   ⚠️  Validation error - check payload format")
                    return False
                elif error_code in ['AccessDeniedException', 'UnauthorizedException']:
                    print(f"   ⚠️  Permission denied - check IAM role permissions")
                    return False
                elif error_code == 'ResourceNotFoundException':
                    print(f"   ⚠️  Agent not found - check agent ARN")
                    return False

                # For other errors, retry if attempts remain
                if attempt < self.max_retries:
                    delay = 5 * (2 ** (attempt - 1))
                    print(f"   ⏱️  Retrying in {delay} seconds...")
                    time.sleep(delay)
                else:
                    print(f"   ❌ Max retries exceeded")
                    return False

            except BotoCoreError as e:
                print(f"❌ BotoCore Error (attempt {attempt}/{self.max_retries})")
                print(f"   {str(e)}")

                if attempt < self.max_retries:
                    delay = 5
                    print(f"   ⏱️  Retrying in {delay} seconds...")
                    time.sleep(delay)
                else:
                    return False

            except Exception as e:
                print(f"❌ Unexpected error: {str(e)}")
                print(f"   Type: {type(e).__name__}")
                return False

        return False

    def _process_response(self, response: Dict[str, Any]) -> None:
        """
        Process streaming response from AgentCore Runtime.

        Args:
            response: Response from invoke_agent_runtime
        """
        print("📡 Processing streaming response...")
        print("-" * 80)

        try:
            # The response contains a streaming body
            # Note: AgentCore uses async operations, so the response
            # may be immediate while the agent runs in the background

            response_metadata = response.get('ResponseMetadata', {})
            http_status = response_metadata.get('HTTPStatusCode', 'unknown')
            request_id = response_metadata.get('RequestId', 'unknown')

            print(f"HTTP Status: {http_status}")
            print(f"Request ID: {request_id}")

            # Check for immediate response body
            if 'response' in response:
                print("\n📨 Response body:")
                response_stream = response['response']

                # Process streaming events
                for event in response_stream:
                    if 'chunk' in event:
                        chunk = event['chunk']
                        chunk_data = chunk.get('bytes', b'')
                        if chunk_data:
                            decoded = chunk_data.decode('utf-8')
                            print(decoded)

                    if 'trace' in event:
                        trace = event['trace']
                        print(f"\n🔍 Trace: {json.dumps(trace, indent=2)}")
            else:
                print("\n✅ Invocation accepted - agent running asynchronously")
                print("   The agent will process the request in the background.")
                print("   Monitor CloudWatch logs for execution progress:")
                print(f"   https://us-west-2.console.aws.amazon.com/cloudwatch/home?region=us-west-2#gen-ai-observability")

            print("-" * 80)

        except Exception as e:
            print(f"⚠️  Warning: Error processing response stream: {str(e)}")
            print("   Invocation may have succeeded but streaming failed")


def parse_args():
    """Parse command line arguments."""
    parser = argparse.ArgumentParser(
        description='Invoke AWS Bedrock AgentCore Runtime via boto3'
    )

    parser.add_argument(
        '--agent-arn',
        required=True,
        help='AgentCore Runtime ARN (e.g., arn:aws:bedrock-agentcore:us-west-2:123456789012:runtime/agent-id)'
    )

    parser.add_argument(
        '--session-id',
        required=True,
        help='Unique session identifier (e.g., gh-123-20250122120000)'
    )

    parser.add_argument(
        '--payload',
        required=True,
        help='JSON payload for the agent (as string)'
    )

    parser.add_argument(
        '--region',
        default='us-west-2',
        help='AWS region (default: us-west-2)'
    )

    parser.add_argument(
        '--max-retries',
        type=int,
        default=3,
        help='Maximum number of retry attempts (default: 3)'
    )

    return parser.parse_args()


def main():
    """Main entry point."""
    args = parse_args()

    try:
        # Parse payload JSON
        payload = json.loads(args.payload)
    except json.JSONDecodeError as e:
        print(f"❌ Error: Invalid JSON payload: {str(e)}")
        sys.exit(1)

    # Create invoker and invoke agent
    invoker = AgentInvoker(
        agent_arn=args.agent_arn,
        region=args.region,
        max_retries=args.max_retries
    )

    success = invoker.invoke(payload, args.session_id)

    if success:
        print()
        print("✅ Agent invocation completed successfully")
        sys.exit(0)
    else:
        print()
        print("❌ Agent invocation failed")
        sys.exit(1)


if __name__ == '__main__':
    main()
