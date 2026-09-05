import { AgentController, AgentEvent, DiffApprovalPayload } from './types.js';

export class MockAgentController implements AgentController {
  private listeners: Set<(event: AgentEvent) => void> = new Set();
  private pendingTimers: NodeJS.Timeout[] = [];
  private activeApproval: DiffApprovalPayload | null = null;
  private isRunning: boolean = false;

  public onEvent(listener: (event: AgentEvent) => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(event: AgentEvent): void {
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error('Error in agent event listener:', err);
      }
    }
  }

  private schedule(fn: () => void, delayMs: number): void {
    const timer = setTimeout(() => {
      this.pendingTimers = this.pendingTimers.filter((t) => t !== timer);
      fn();
    }, delayMs);
    this.pendingTimers.push(timer);
  }

  public clearTimers(): void {
    for (const timer of this.pendingTimers) {
      clearTimeout(timer);
    }
    this.pendingTimers = [];
  }

  public cancel(): void {
    this.clearTimers();
    this.isRunning = false;
    this.activeApproval = null;
    this.emit({ type: 'status', message: 'Agent execution paused/cancelled by user.' });
    this.emit({ type: 'done', summary: 'Run was cancelled.' });
  }

  public submitQuery(query: string): void {
    this.clearTimers();
    this.activeApproval = null;
    this.isRunning = true;

    this.emit({ type: 'status', message: 'Analyzing codebase index & AST...' });

    // Step 1: Simulated thinking tokens
    const tokens = [
      'I will investigate ',
      'the codebase for security flaws ',
      'related to your request: "',
      query,
      '".\nFirst, let me search for relevant database queries and controllers.',
    ];

    let delay = 300;
    tokens.forEach((tok, idx) => {
      this.schedule(() => {
        if (!this.isRunning) return;
        this.emit({ type: 'token', delta: tok });
      }, delay);
      delay += 250;
    });

    // Step 2: Tool call (search_code)
    this.schedule(() => {
      if (!this.isRunning) return;
      this.emit({
        type: 'tool_start',
        toolName: 'search_code',
        callId: 'call_search_1',
        args: { query: 'SELECT * FROM users WHERE', mode: 'text' },
      });
    }, delay + 300);

    // Step 3: Tool result
    this.schedule(() => {
      if (!this.isRunning) return;
      this.emit({
        type: 'tool_result',
        toolName: 'search_code',
        callId: 'call_search_1',
        result: {
          file: 'backend/src/controllers/auth.controller.ts',
          line: 42,
          snippet: "const query = `SELECT * FROM users WHERE username = '${username}' AND password = '${password}'`;",
        },
      });
    }, delay + 1000);

    // Step 4: Assistant diagnosis tokens
    const diagnosisTokens = [
      '\n\nFound unescaped string interpolation in ',
      '`backend/src/controllers/auth.controller.ts:42`.\n',
      'This is vulnerable to SQL Injection. ',
      'I will generate a parameterized query patch using prepared statements.',
    ];

    delay += 1200;
    diagnosisTokens.forEach((tok) => {
      this.schedule(() => {
        if (!this.isRunning) return;
        this.emit({ type: 'token', delta: tok });
      }, delay);
      delay += 200;
    });

    // Step 5: Trigger Diff Approval Gate
    this.schedule(() => {
      if (!this.isRunning) return;
      const approvalPayload: DiffApprovalPayload = {
        id: 'diff_sqli_patch_1',
        file: 'backend/src/controllers/auth.controller.ts',
        description: 'Parameterize authentication SQL query to remediate SQL Injection vulnerability',
        originalContent: `export async function authenticateUser(req, res) {
  const { username, password } = req.body;
  // Vulnerable unescaped query
  const query = \`SELECT * FROM users WHERE username = '\${username}' AND password = '\${password}'\`;
  const result = await db.query(query);
  return result;
}`,
        newContent: `export async function authenticateUser(req, res) {
  const { username, password } = req.body;
  // Secure parameterized query
  const query = 'SELECT * FROM users WHERE username = $1 AND password = $2';
  const result = await db.query(query, [username, password]);
  return result;
}`,
        patch: `--- a/backend/src/controllers/auth.controller.ts
+++ b/backend/src/controllers/auth.controller.ts
@@ -40,4 +40,4 @@ export async function authenticateUser(req, res) {
-  // Vulnerable unescaped query
-  const query = \`SELECT * FROM users WHERE username = '\${username}' AND password = '\${password}'\`;
-  const result = await db.query(query);
+  // Secure parameterized query
+  const query = 'SELECT * FROM users WHERE username = $1 AND password = $2';
+  const result = await db.query(query, [username, password]);
   return result;`,
      };

      this.activeApproval = approvalPayload;
      this.emit({ type: 'require_approval', payload: approvalPayload });
    }, delay + 400);
  }

  public approveDiff(payloadId: string): void {
    if (!this.activeApproval || this.activeApproval.id !== payloadId) return;
    this.activeApproval = null;

    this.emit({ type: 'status', message: 'Diff approved! Applying patch to disk...' });

    // Step 6: Tool call (run_sectest verification)
    this.schedule(() => {
      this.emit({
        type: 'tool_start',
        toolName: 'run_sectest',
        callId: 'call_sectest_1',
        args: { suite: 'sqli', targetUrl: 'http://localhost:8000/api/auth/login' },
      });
    }, 500);

    // Step 7: Tool result (probe passed)
    this.schedule(() => {
      this.emit({
        type: 'tool_result',
        toolName: 'run_sectest',
        callId: 'call_sectest_1',
        result: {
          status: 'PASSED',
          probesAttempted: 5,
          vulnerabilitiesFound: 0,
          details: 'All injection probes safely handled with 0 syntax errors or boolean bypasses.',
        },
      });
    }, 1500);

    // Step 8: Completion summary
    this.schedule(() => {
      this.emit({
        type: 'token',
        delta: '\n\n✅ Verification probe passed! The SQL Injection flaw in `auth.controller.ts` is fully remediated.',
      });
      this.emit({
        type: 'done',
        summary: 'Remediation completed and verified against active sectest probes.',
      });
      this.isRunning = false;
    }, 2000);
  }

  public rejectDiff(payloadId: string, reason?: string): void {
    if (!this.activeApproval || this.activeApproval.id !== payloadId) return;
    this.activeApproval = null;
    this.isRunning = false;

    this.emit({
      type: 'token',
      delta: `\n\n❌ Patch rejected by user${reason ? `: ${reason}` : ''}. No files were modified.`,
    });
    this.emit({
      type: 'done',
      summary: 'Diff was rejected by user. Agent run halted.',
    });
  }
}
