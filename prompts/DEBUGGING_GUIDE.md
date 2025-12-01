# Debugging Guide for Autonomous Development

This guide provides systematic approaches to solve problems effectively. When stuck, return to this document.

## Core Principle: Think First, Act Second

**ALWAYS use the Think tool before attempting to solve any problem.** Thinking is not overhead - it's an investment that prevents cascading failures.

## The Systematic Debugging Framework

### Step 1: Stop and Analyze (Use Think Tool)
```
[Think]: "I'm encountering [specific issue]. Let me analyze:
- Expected behavior: [what should happen]
- Actual behavior: [what is happening]
- Hypothesis: [possible root causes]
- Debug strategy: [investigation steps]"
```

### Step 2: Root Cause Analysis

#### A. Reproduce Consistently
- Can you trigger the issue reliably?
- What are the EXACT steps?
- Document reproduction in claude-progress.txt

#### B. Isolate the Problem Domain
- Frontend, backend, or integration issue?
- Which specific component/file?
- What was the last working state? (`git log --oneline`)

#### C. Trace the Data Flow
```javascript
// Strategic console.log placement
console.log('[Component/Function] Input:', { param1, param2 });
console.log('[Component/Function] Processing:', intermediateResult);
console.log('[Component/Function] Output:', finalResult);
```

### Step 3: Debugging by Problem Type

#### Frontend Issues
- Component not rendering:
  ```javascript
  console.log('[ComponentName] Rendering with props:', props);
  console.log('[ComponentName] Current state:', state);
  ```
- State not updating:
  - Check if creating new objects vs mutating
  - Verify dependencies in useEffect
  - Look for missing state setters

#### Backend Issues
- API not responding:
  ```javascript
  console.log('[Endpoint] Request received:', {
    method: req.method,
    url: req.url,
    body: req.body,
    headers: req.headers
  });
  ```
- Database operations failing:
  - Log queries before execution
  - Check connection status
  - Verify data types match schema

#### Integration Issues
- Frontend can't reach backend:
  - Check CORS configuration
  - Verify ports (frontend: <frontend_port>, backend: <backend_port>)
  - Test endpoint with curl first
  - Check Network tab for exact error
- Data not displaying:
  - Log API response in frontend
  - Check data structure matches expectations
  - Verify async operations complete

### Step 4: The Console.log Strategy

#### Effective Logging
```javascript
// GOOD: Descriptive with context
console.log('[VirtualFileSystem.writeFile] Starting:', {
  path: filePath,
  contentLength: content.length,
  mode: this.mode
});

// BAD: No context
console.log('here');
console.log(data);
```

#### Where to Place Logs
1. Function entry points (inputs)
2. Before conditionals (decision data)
3. After transformations (results)
4. Before returns (outputs)
5. In catch blocks (errors)

### Step 5: Common Issues and Solutions

#### "Cannot read property of undefined"
- Add existence checks
- Log the object before accessing
- Check async timing

#### "Port already in use"
- `lsof -i :<backend_port>` to check
- `pkill -f "node server"` to kill
- Restart server

#### "CORS blocked"
- Check backend CORS middleware
- Verify allowed origins include `http://localhost:<frontend_port>`
- Check preflight OPTIONS handling

#### React Errors
- "Too many re-renders":
  - Check for setState in render
  - Verify useEffect dependencies
  - Look for unconditional state updates
- "Invalid hook call":
  - Ensure hooks at top level
  - Check for conditional hooks
  - Verify inside functional component

### Step 6: The 15-Minute Rule

If stuck for 15 minutes:
1. **Think tool checkpoint**:
   ```
   [Think]: "I've tried X, Y, Z. Let me reconsider:
   - Assumptions I'm making?
   - What haven't I checked?
   - Can I simplify the problem?
   - Should I try a different approach?"
   ```

2. **Git checkpoint**:
   ```bash
   git add .
   git commit -m "WIP: Debugging [issue]"
   ```

3. **Alternative approach**:
   - Can the feature be implemented differently?
   - Is there a simpler solution?
   - Can you work around the issue temporarily?

### Step 7: Verification After Fixes

Never assume a fix worked:
1. Remove or comment debug logs
2. Test the specific issue
3. Test related functionality
4. Check for side effects
5. Run integration tests
6. Commit the working solution

## Anti-Patterns to Avoid

❌ **Making multiple changes at once** - Change one thing, test, repeat
❌ **Ignoring error messages** - Read the FULL stack trace
❌ **Assuming without verifying** - Always confirm with logs/tests
❌ **Fixing symptoms not causes** - Ask "why" until you find root cause
❌ **Skipping git commits** - Commit working states before risky changes

## Remember

- Every bug is solvable with systematic investigation
- Thinking time is not wasted time
- Console.logs are your friends - use them liberally
- Git is your safety net - commit often
- When truly stuck, simplify the problem

Return to this guide whenever you feel stuck or frustrated. The systematic approach will guide you to the solution.
