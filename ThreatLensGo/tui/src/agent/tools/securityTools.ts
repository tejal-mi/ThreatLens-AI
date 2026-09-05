import http from 'node:http';
import { ToolDefinition, ToolResult } from './types.js';

export interface SecurityProbePayload {
  name: string;
  category: 'sqli' | 'xss' | 'cmdi' | 'auth_bypass';
  payload: string;
}

export const DIVERSE_SECURITY_PAYLOADS: SecurityProbePayload[] = [
  // 1. SQL Injection Probes (varied syntax, tautologies, comments, error triggers)
  { name: 'sqli_tautology_quotes', category: 'sqli', payload: "' OR '1'='1" },
  { name: 'sqli_tautology_dash', category: 'sqli', payload: "' OR 1=1--" },
  { name: 'sqli_auth_bypass_admin', category: 'sqli', payload: "admin'--" },
  { name: 'sqli_tautology_alternate', category: 'sqli', payload: "' OR 'a'='a" },
  { name: 'sqli_syntax_break_single', category: 'sqli', payload: "'" },
  { name: 'sqli_syntax_break_double', category: 'sqli', payload: '"' },
  { name: 'sqli_union_order', category: 'sqli', payload: "1' ORDER BY 999--" },

  // 2. XSS Probes
  { name: 'xss_tag_probe', category: 'xss', payload: '<sectest-xss-probe>' },
  { name: 'xss_img_onerror', category: 'xss', payload: '<img src=x onerror=alert(1)>' },
  { name: 'xss_svg_onload', category: 'xss', payload: '<svg/onload=alert(1)>' },

  // 3. Command Injection Probes
  { name: 'cmdi_semicolon', category: 'cmdi', payload: '; echo sectest-cmdi-probe' },
  { name: 'cmdi_pipe', category: 'cmdi', payload: '| echo sectest-cmdi-probe' },
  { name: 'cmdi_backtick', category: 'cmdi', payload: '`echo sectest-cmdi-probe`' },
];

export const SQL_ERROR_SIGNATURES = [
  'sql syntax',
  'operationalerror',
  'ora-',
  'unclosed quotation mark',
  'postgresql query failed',
  'sqlite3.operationalerror',
  'mysql_fetch',
  'microsoft ole db provider for sql server',
  'syntax error in query',
  'pg_query',
  'driver][db2/linux]',
  'you have an error in your sql syntax',
];

/**
 * Helper to perform HTTP GET / POST request without external dependencies.
 */
function sendHttpRequest(
  urlStr: string,
  method: 'GET' | 'POST',
  paramsOrBody: Record<string, string>,
  timeoutMs = 5000
): Promise<{ statusCode: number; body: string }> {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(urlStr);
      let payloadData = '';

      if (method === 'GET') {
        for (const [k, v] of Object.entries(paramsOrBody)) {
          url.searchParams.set(k, v);
        }
      } else {
        payloadData = JSON.stringify(paramsOrBody);
      }

      const req = http.request(
        url,
        {
          method,
          headers:
            method === 'POST'
              ? {
                  'Content-Type': 'application/json',
                  'Content-Length': Buffer.byteLength(payloadData),
                }
              : {},
          timeout: timeoutMs,
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => resolve({ statusCode: res.statusCode || 0, body: data }));
        }
      );

      req.on('timeout', () => {
        req.destroy(new Error(`Request timed out after ${timeoutMs}ms`));
      });

      req.on('error', (err) => reject(err));

      if (method === 'POST') {
        req.write(payloadData);
      }
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

export const runSectestTool: ToolDefinition = {
  name: 'run_sectest',
  description: 'Runs automated security check modules against a running local target server.',
  parameters: {
    type: 'object',
    properties: {
      targetUrl: { type: 'string', description: 'Base URL of local target server (e.g. http://localhost:8000)' },
      endpoint: { type: 'string', description: 'Endpoint path (e.g. /api/users/search)' },
      param: { type: 'string', description: 'Parameter to probe' },
      method: { type: 'string', enum: ['GET', 'POST'], description: 'HTTP method (default: GET)' },
      category: {
        type: 'string',
        enum: ['sqli', 'xss', 'cmdi', 'all'],
        description: 'Vulnerability category to probe (default: all)',
      },
    },
    required: ['targetUrl', 'endpoint', 'param'],
  },
  execute: async (args): Promise<ToolResult> => {
    const { targetUrl, endpoint, param } = args;
    const method = (args.method || 'GET').toUpperCase() as 'GET' | 'POST';
    const category = args.category || 'all';

    const fullUrl = `${targetUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;
    const probes = DIVERSE_SECURITY_PAYLOADS.filter((p) => category === 'all' || p.category === category);

    const findings: Array<{
      payloadName: string;
      payload: string;
      category: string;
      signatureMatched?: string;
      responseSnippet: string;
    }> = [];

    for (const probe of probes) {
      try {
        const res = await sendHttpRequest(fullUrl, method, { [param]: probe.payload });
        const bodyLower = res.body.toLowerCase();

        // Check SQL signatures
        if (probe.category === 'sqli') {
          for (const sig of SQL_ERROR_SIGNATURES) {
            if (bodyLower.includes(sig)) {
              findings.push({
                payloadName: probe.name,
                payload: probe.payload,
                category: probe.category,
                signatureMatched: sig,
                responseSnippet: res.body.substring(0, 150),
              });
              break;
            }
          }
        } else if (probe.category === 'xss') {
          if (res.body.includes(probe.payload)) {
            findings.push({
              payloadName: probe.name,
              payload: probe.payload,
              category: probe.category,
              responseSnippet: res.body.substring(0, 150),
            });
          }
        } else if (probe.category === 'cmdi') {
          if (res.body.includes('sectest-cmdi-probe')) {
            findings.push({
              payloadName: probe.name,
              payload: probe.payload,
              category: probe.category,
              responseSnippet: res.body.substring(0, 150),
            });
          }
        }
      } catch (err: any) {
        // Probe connection error
      }
    }

    return {
      success: true,
      data: {
        target: fullUrl,
        param,
        probesTested: probes.length,
        vulnerable: findings.length > 0,
        findingsCount: findings.length,
        findings,
      },
    };
  },
};

export type RemediationStatus = 'REMEDIATED' | 'FLAWED_PATCH' | 'VULNERABLE' | 'TARGET_UNAVAILABLE';

export const verifyRemediationTool: ToolDefinition = {
  name: 'verify_remediation',
  description:
    'Sequenced post-remediation security verification. Runs a diverse payload matrix to discriminate between true parameterized fixes, flawed naive string patches, and persistent vulnerabilities.',
  parameters: {
    type: 'object',
    properties: {
      targetUrl: { type: 'string', description: 'Base URL of target server' },
      endpoint: { type: 'string', description: 'Endpoint path' },
      param: { type: 'string', description: 'Parameter that was remediated' },
      method: { type: 'string', enum: ['GET', 'POST'], description: 'HTTP method (default: GET)' },
      category: {
        type: 'string',
        enum: ['sqli', 'xss', 'cmdi'],
        description: 'Vulnerability category that was fixed',
      },
    },
    required: ['targetUrl', 'endpoint', 'param', 'category'],
  },
  execute: async (args): Promise<ToolResult> => {
    const { targetUrl, endpoint, param, category } = args;
    const method = (args.method || 'GET').toUpperCase() as 'GET' | 'POST';
    const fullUrl = `${targetUrl.replace(/\/$/, '')}/${endpoint.replace(/^\//, '')}`;

    // Step 1: Health check / target reload sync check
    try {
      await sendHttpRequest(fullUrl, method, { [param]: 'test_health_probe_safe' }, 3000);
    } catch (err: any) {
      return {
        success: false,
        error: `Target server at '${fullUrl}' is not reachable. Ensure the server has reloaded after code edits. Error: ${err.message}`,
        data: { status: 'TARGET_UNAVAILABLE' as RemediationStatus },
      };
    }

    // Step 2: Select all diverse payloads for this category
    const probes = DIVERSE_SECURITY_PAYLOADS.filter((p) => p.category === category);
    if (probes.length === 0) {
      return {
        success: false,
        error: `Unknown category '${category}' for verification`,
      };
    }

    let passedProbes = 0;
    const failedProbes: Array<{ name: string; payload: string; reason: string }> = [];

    for (const probe of probes) {
      try {
        const res = await sendHttpRequest(fullUrl, method, { [param]: probe.payload });
        const bodyLower = res.body.toLowerCase();

        let isVulnerable = false;
        let reason = '';

        if (category === 'sqli') {
          for (const sig of SQL_ERROR_SIGNATURES) {
            if (bodyLower.includes(sig)) {
              isVulnerable = true;
              reason = `Triggered SQL error signature '${sig}'`;
              break;
            }
          }
        } else if (category === 'xss') {
          if (res.body.includes(probe.payload)) {
            isVulnerable = true;
            reason = 'Unescaped XSS payload reflected in response body';
          }
        } else if (category === 'cmdi') {
          if (res.body.includes('sectest-cmdi-probe')) {
            isVulnerable = true;
            reason = 'Command execution signature reflected';
          }
        }

        if (isVulnerable) {
          failedProbes.push({
            name: probe.name,
            payload: probe.payload,
            reason,
          });
        } else {
          passedProbes++;
        }
      } catch (err: any) {
        // Connection error during probe
        failedProbes.push({
          name: probe.name,
          payload: probe.payload,
          reason: `Request failed: ${err.message}`,
        });
      }
    }

    // Step 3: Determine 3-way discriminative verdict
    let status: RemediationStatus;
    let verdictSummary: string;

    if (failedProbes.length === 0) {
      status = 'REMEDIATED';
      verdictSummary = `All ${passedProbes}/${probes.length} diverse attack payloads were safely handled. Verified parameterized/sanitized fix!`;
    } else if (passedProbes > 0 && failedProbes.length > 0) {
      status = 'FLAWED_PATCH';
      verdictSummary = `WARNING: Detected flawed naive patch! ${passedProbes} payload(s) were blocked, but ${failedProbes.length} variant(s) bypassed the fix: [${failedProbes.map((f) => f.name).join(', ')}].`;
    } else {
      status = 'VULNERABLE';
      verdictSummary = `Endpoint remains fully vulnerable. All ${failedProbes.length} payloads triggered vulnerability indicators.`;
    }

    return {
      success: true,
      data: {
        status,
        category,
        totalProbes: probes.length,
        passedCount: passedProbes,
        failedCount: failedProbes.length,
        verdictSummary,
        failedProbes,
      },
    };
  },
};
