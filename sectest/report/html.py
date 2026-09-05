"""
Self-contained, animated interactive HTML & CSS reporter for SecTest findings.
"""

from datetime import datetime, timezone
import html
import json
from pathlib import Path
from typing import Optional
from sectest.core.schema import EnrichedFinding, TargetConfig

SEVERITY_ORDER = ["critical", "high", "medium", "low", "info"]

SEVERITY_META = {
    "critical": {
        "color": "#ef4444",
        "bg": "rgba(239, 68, 68, 0.12)",
        "border": "rgba(239, 68, 68, 0.35)",
        "glow": "rgba(239, 68, 68, 0.25)",
        "text": "#fca5a5",
        "badge_bg": "#ef4444",
        "badge_text": "#ffffff",
        "weight": 25,
    },
    "high": {
        "color": "#f97316",
        "bg": "rgba(249, 115, 22, 0.12)",
        "border": "rgba(249, 115, 22, 0.35)",
        "glow": "rgba(249, 115, 22, 0.25)",
        "text": "#fdba74",
        "badge_bg": "#f97316",
        "badge_text": "#ffffff",
        "weight": 15,
    },
    "medium": {
        "color": "#eab308",
        "bg": "rgba(234, 179, 8, 0.12)",
        "border": "rgba(234, 179, 8, 0.35)",
        "glow": "rgba(234, 179, 8, 0.25)",
        "text": "#fde047",
        "badge_bg": "#eab308",
        "badge_text": "#0f172a",
        "weight": 8,
    },
    "low": {
        "color": "#3b82f6",
        "bg": "rgba(59, 130, 246, 0.12)",
        "border": "rgba(59, 130, 246, 0.35)",
        "glow": "rgba(59, 130, 246, 0.25)",
        "text": "#93c5fd",
        "badge_bg": "#3b82f6",
        "badge_text": "#ffffff",
        "weight": 3,
    },
    "info": {
        "color": "#64748b",
        "bg": "rgba(100, 116, 139, 0.12)",
        "border": "rgba(100, 116, 139, 0.35)",
        "glow": "rgba(100, 116, 139, 0.20)",
        "text": "#cbd5e1",
        "badge_bg": "#64748b",
        "badge_text": "#ffffff",
        "weight": 0,
    },
}


def calculate_health_score(counts: dict[str, int]) -> tuple[int, str, str]:
    """
    Calculate an overall security health score (0-100), letter grade, and grade color.
    """
    penalty = (
        counts.get("critical", 0) * 25
        + counts.get("high", 0) * 15
        + counts.get("medium", 0) * 8
        + counts.get("low", 0) * 3
    )
    score = max(0, 100 - penalty)

    if score >= 90:
        return score, "A+", "#10b981"
    elif score >= 75:
        return score, "B", "#3b82f6"
    elif score >= 60:
        return score, "C", "#f59e0b"
    elif score >= 40:
        return score, "D", "#f97316"
    else:
        return score, "F", "#ef4444"


def generate_html_report(
    findings: list[EnrichedFinding],
    errors: list[str],
    target: TargetConfig,
) -> str:
    """
    Generate a full-featured, animated, self-contained single-file HTML report.
    """
    scanned_time = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")

    counts = {s: 0 for s in SEVERITY_ORDER}
    for f in findings:
        sev = f.severity.lower()
        if sev in counts:
            counts[sev] += 1
        else:
            counts["info"] += 1

    total = len(findings)
    health_score, grade, grade_color = calculate_health_score(counts)

    # Distinct modules tested
    modules_detected: dict[str, int] = {}
    for f in findings:
        mod = f.module
        modules_detected[mod] = modules_detected.get(mod, 0) + 1

    # Findings cards HTML
    cards_html_list = []
    for idx, item in enumerate(findings):
        sev = item.severity.lower() if item.severity.lower() in SEVERITY_ORDER else "info"
        title_escaped = html.escape(item.title)
        module_escaped = html.escape(item.module)
        evidence_escaped = html.escape(item.evidence)
        explanation_escaped = html.escape(item.explanation)
        remediation_escaped = html.escape(item.remediation)

        meta_html = ""
        if item.meta:
            meta_tags = "".join(
                f'<span class="meta-badge"><span class="meta-k">{html.escape(str(k))}:</span> <span class="meta-v">{html.escape(str(v))}</span></span>'
                for k, v in item.meta.items()
            )
            meta_html = f'<div class="meta-row"><span class="section-label">🏷️ Attributes</span><div class="meta-tags">{meta_tags}</div></div>'

        # Card HTML with clean collapsible details and copy actions
        card = f"""
        <div class="finding-card finding-{sev}" data-severity="{sev}" data-module="{module_escaped.lower()}" style="animation-delay: {min(idx * 0.04, 0.6):.2f}s;">
            <div class="card-header" onclick="toggleCard(this)">
                <div class="header-left">
                    <span class="severity-pill pill-{sev}">{sev.upper()}</span>
                    <span class="module-chip">{module_escaped}</span>
                    <h3 class="finding-title">{title_escaped}</h3>
                </div>
                <div class="header-right">
                    <button class="expand-btn" aria-label="Toggle details">
                        <svg class="chevron-icon" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                        </svg>
                    </button>
                </div>
            </div>
            <div class="card-content">
                <div class="card-inner">
                    <div class="section-block">
                        <div class="section-head">
                            <span class="section-label">📌 Observed Evidence</span>
                            <button class="copy-btn" onclick="copySnippet(this, 'evidence-{idx}')" title="Copy evidence to clipboard">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                                <span>Copy</span>
                            </button>
                        </div>
                        <pre class="code-box"><code id="evidence-{idx}">{evidence_escaped}</code></pre>
                    </div>

                    <div class="section-block">
                        <div class="section-head">
                            <span class="section-label">🧠 AI Analysis & Security Impact</span>
                        </div>
                        <div class="analysis-box">
                            <div class="analysis-icon">⚡</div>
                            <div class="analysis-text">{explanation_escaped}</div>
                        </div>
                    </div>

                    <div class="section-block">
                        <div class="section-head">
                            <span class="section-label">🛠️ Remediation Guidance</span>
                            <button class="copy-btn" onclick="copySnippet(this, 'remediation-{idx}')" title="Copy remediation to clipboard">
                                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                                </svg>
                                <span>Copy</span>
                            </button>
                        </div>
                        <div class="remediation-box">
                            <div class="remediation-icon">🛡️</div>
                            <div class="remediation-text" id="remediation-{idx}">{remediation_escaped}</div>
                        </div>
                    </div>

                    {meta_html}
                </div>
            </div>
        </div>
        """
        cards_html_list.append(card)

    all_cards_html = "\n".join(cards_html_list)

    if not all_cards_html:
        all_cards_html = """
        <div class="empty-state">
            <div class="empty-icon-shield">
                <svg viewBox="0 0 24 24" width="64" height="64" fill="none" stroke="#10b981" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                    <polyline points="9 12 11 14 15 10"></polyline>
                </svg>
            </div>
            <h3 class="empty-title">Clean Audit: No Vulnerabilities Detected</h3>
            <p class="empty-desc">The scanned target passed all active security modules without flagging security weaknesses.</p>
        </div>
        """

    # Warnings / Pipeline errors
    errors_html = ""
    if errors:
        error_items = "".join(f"<li>{html.escape(e)}</li>" for e in errors)
        errors_html = f"""
        <div class="errors-banner">
            <div class="errors-header">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#f87171" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path>
                    <line x1="12" y1="9" x2="12" y2="13"></line>
                    <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
                <span>Pipeline Execution Warnings ({len(errors)})</span>
            </div>
            <ul class="errors-list">{error_items}</ul>
        </div>
        """

    # Serialize JSON payload for raw download or client-side operations
    findings_json = json.dumps(
        {
            "target": target.url,
            "timestamp": scanned_time,
            "health_score": health_score,
            "grade": grade,
            "summary": {"total": total, **counts},
            "findings": [
                {
                    "module": f.module,
                    "title": f.title,
                    "severity": f.severity,
                    "evidence": f.evidence,
                    "explanation": f.explanation,
                    "remediation": f.remediation,
                    "meta": f.meta,
                }
                for f in findings
            ],
            "errors": errors,
        },
        indent=2,
    )

    # Gauge stroke dash offset (circumference ~ 283 for r=45)
    dash_offset = 282.74 * (1 - (health_score / 100))

    html_template = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>SecTest Security Report — {html.escape(target.url)}</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
    <style>
        :root {{
            --bg-body: #06090e;
            --bg-surface: #0c121d;
            --bg-card: #111927;
            --bg-card-hover: #162032;
            --bg-elevated: #1a253a;
            
            --border-subtle: #1e293b;
            --border-card: rgba(255, 255, 255, 0.08);
            --border-focus: #06b6d4;
            
            --text-main: #f8fafc;
            --text-dim: #94a3b8;
            --text-muted: #64748b;
            
            --cyan-accent: #06b6d4;
            --blue-accent: #3b82f6;
            --purple-accent: #8b5cf6;
            --emerald-accent: #10b981;
            
            --crit-color: #ef4444;
            --high-color: #f97316;
            --med-color: #eab308;
            --low-color: #3b82f6;
            --info-color: #64748b;
            
            --radius-sm: 6px;
            --radius-md: 10px;
            --radius-lg: 16px;
            --radius-xl: 20px;
            
            --shadow-card: 0 4px 20px -2px rgba(0, 0, 0, 0.5);
            --shadow-glow: 0 0 25px -5px rgba(6, 182, 212, 0.2);
            --transition-smooth: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }}

        * {{
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }}

        body {{
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            background-color: var(--bg-body);
            background-image: 
                radial-gradient(at 0% 0%, rgba(6, 182, 212, 0.08) 0px, transparent 50%),
                radial-gradient(at 100% 0%, rgba(139, 92, 246, 0.08) 0px, transparent 50%),
                radial-gradient(at 50% 100%, rgba(16, 185, 129, 0.05) 0px, transparent 50%);
            background-attachment: fixed;
            color: var(--text-main);
            line-height: 1.5;
            padding: 32px 20px;
            min-height: 100vh;
            -webkit-font-smoothing: antialiased;
        }}

        .wrapper {{
            max-width: 1180px;
            margin: 0 auto;
            animation: fadeIn 0.5s ease-out;
        }}

        /* Header Navigation & Banner */
        .top-navbar {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            background: rgba(12, 18, 29, 0.75);
            backdrop-filter: blur(16px);
            border: 1px solid var(--border-card);
            border-radius: var(--radius-lg);
            padding: 16px 24px;
            margin-bottom: 24px;
            box-shadow: var(--shadow-card);
        }}

        .brand-cluster {{
            display: flex;
            align-items: center;
            gap: 14px;
        }}

        .brand-logo {{
            width: 44px;
            height: 44px;
            background: linear-gradient(135deg, #0891b2 0%, #3b82f6 50%, #7c3aed 100%);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 0 16px rgba(6, 182, 212, 0.4);
            animation: logoFloat 4s ease-in-out infinite;
        }}

        .brand-titles {{
            display: flex;
            flex-direction: column;
        }}

        .brand-name {{
            font-size: 20px;
            font-weight: 800;
            letter-spacing: -0.5px;
            display: flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(90deg, #ffffff 0%, #cbd5e1 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }}

        .brand-badge {{
            font-size: 10px;
            text-transform: uppercase;
            font-weight: 800;
            background: rgba(6, 182, 212, 0.15);
            color: var(--cyan-accent);
            border: 1px solid rgba(6, 182, 212, 0.3);
            padding: 2px 6px;
            border-radius: 4px;
            letter-spacing: 0.5px;
            -webkit-text-fill-color: initial;
        }}

        .brand-tagline {{
            font-size: 12px;
            color: var(--text-dim);
            font-weight: 500;
        }}

        .nav-actions {{
            display: flex;
            align-items: center;
            gap: 10px;
        }}

        .btn-action {{
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: var(--bg-card);
            border: 1px solid var(--border-card);
            color: var(--text-dim);
            font-size: 13px;
            font-weight: 600;
            padding: 8px 14px;
            border-radius: var(--radius-sm);
            cursor: pointer;
            transition: var(--transition-smooth);
            text-decoration: none;
        }}

        .btn-action:hover {{
            background: var(--bg-elevated);
            color: var(--text-main);
            border-color: var(--cyan-accent);
            transform: translateY(-1px);
        }}

        .btn-action svg {{
            stroke: currentColor;
        }}

        /* Hero Overview Card */
        .hero-panel {{
            display: grid;
            grid-template-columns: 1.4fr 1fr;
            gap: 24px;
            background: linear-gradient(135deg, rgba(17, 25, 39, 0.9) 0%, rgba(12, 18, 29, 0.95) 100%);
            backdrop-filter: blur(12px);
            border: 1px solid var(--border-card);
            border-radius: var(--radius-xl);
            padding: 28px;
            margin-bottom: 24px;
            box-shadow: var(--shadow-card);
            position: relative;
            overflow: hidden;
        }}

        .hero-panel::before {{
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 2px;
            background: linear-gradient(90deg, #06b6d4, #3b82f6, #8b5cf6, #10b981);
        }}

        .hero-left {{
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }}

        .target-bar {{
            margin-bottom: 20px;
        }}

        .target-subhead {{
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1px;
            color: var(--cyan-accent);
            font-weight: 700;
            margin-bottom: 4px;
        }}

        .target-url {{
            font-size: 22px;
            font-weight: 700;
            color: #ffffff;
            word-break: break-all;
            display: flex;
            align-items: center;
            gap: 8px;
        }}

        .pulse-live {{
            width: 10px;
            height: 10px;
            background-color: var(--emerald-accent);
            border-radius: 50%;
            display: inline-block;
            box-shadow: 0 0 10px var(--emerald-accent);
            animation: pulseGlow 2s infinite;
        }}

        .meta-stats {{
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
            gap: 12px;
            background: rgba(6, 9, 14, 0.5);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-md);
            padding: 14px 16px;
        }}

        .meta-stat-item {{
            display: flex;
            flex-direction: column;
        }}

        .meta-stat-label {{
            font-size: 11px;
            color: var(--text-muted);
            text-transform: uppercase;
            font-weight: 600;
            letter-spacing: 0.5px;
        }}

        .meta-stat-val {{
            font-size: 13px;
            font-weight: 600;
            color: var(--text-main);
            margin-top: 2px;
            font-family: 'JetBrains Mono', monospace;
        }}

        /* Gauge & Score */
        .hero-right {{
            display: flex;
            align-items: center;
            justify-content: center;
            background: rgba(6, 9, 14, 0.4);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-lg);
            padding: 20px;
            position: relative;
        }}

        .gauge-wrapper {{
            display: flex;
            align-items: center;
            gap: 24px;
        }}

        .gauge-container {{
            position: relative;
            width: 120px;
            height: 120px;
        }}

        .gauge-svg {{
            transform: rotate(-90deg);
            width: 120px;
            height: 120px;
        }}

        .gauge-bg {{
            fill: none;
            stroke: rgba(255, 255, 255, 0.06);
            stroke-width: 9;
        }}

        .gauge-fill {{
            fill: none;
            stroke: {grade_color};
            stroke-width: 9;
            stroke-linecap: round;
            stroke-dasharray: 282.74;
            stroke-dashoffset: 282.74;
            animation: drawGauge 1.4s cubic-bezier(0.16, 1, 0.3, 1) forwards 0.2s;
            filter: drop-shadow(0 0 6px {grade_color});
        }}

        @keyframes drawGauge {{
            to {{
                stroke-dashoffset: {dash_offset:.2f};
            }}
        }}

        .gauge-center {{
            position: absolute;
            inset: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
        }}

        .gauge-number {{
            font-size: 26px;
            font-weight: 800;
            color: #ffffff;
            line-height: 1;
        }}

        .gauge-label {{
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: var(--text-dim);
            margin-top: 2px;
        }}

        .score-details {{
            display: flex;
            flex-direction: column;
            gap: 4px;
        }}

        .grade-badge {{
            display: inline-flex;
            align-items: center;
            gap: 6px;
            font-size: 18px;
            font-weight: 800;
            color: {grade_color};
        }}

        .grade-text {{
            font-size: 12px;
            color: var(--text-dim);
            font-weight: 500;
            max-width: 150px;
            line-height: 1.4;
        }}

        /* Summary Stat Cards Grid */
        .stat-cards-grid {{
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 14px;
            margin-bottom: 28px;
        }}

        .stat-card {{
            background: var(--bg-surface);
            border: 1px solid var(--border-card);
            border-radius: var(--radius-md);
            padding: 16px;
            text-align: center;
            cursor: pointer;
            transition: var(--transition-smooth);
            position: relative;
            overflow: hidden;
        }}

        .stat-card:hover {{
            transform: translateY(-3px);
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
        }}

        .stat-card::after {{
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 3px;
            opacity: 0.8;
        }}

        .stat-total::after {{ background: var(--cyan-accent); }}
        .stat-critical::after {{ background: var(--crit-color); }}
        .stat-high::after {{ background: var(--high-color); }}
        .stat-medium::after {{ background: var(--med-color); }}
        .stat-low::after {{ background: var(--low-color); }}
        .stat-info::after {{ background: var(--info-color); }}

        .stat-card.active-filter {{
            border-color: var(--cyan-accent);
            box-shadow: 0 0 16px rgba(6, 182, 212, 0.25);
            background: var(--bg-card);
        }}

        .stat-count {{
            font-size: 28px;
            font-weight: 800;
            line-height: 1.1;
            margin-bottom: 4px;
            font-family: 'JetBrains Mono', monospace;
        }}

        .stat-total .stat-count {{ color: #ffffff; }}
        .stat-critical .stat-count {{ color: var(--crit-color); }}
        .stat-high .stat-count {{ color: var(--high-color); }}
        .stat-medium .stat-count {{ color: var(--med-color); }}
        .stat-low .stat-count {{ color: var(--low-color); }}
        .stat-info .stat-count {{ color: var(--text-dim); }}

        .stat-label {{
            font-size: 11px;
            text-transform: uppercase;
            font-weight: 700;
            letter-spacing: 0.8px;
            color: var(--text-dim);
        }}

        /* Toolbar & Filters */
        .controls-toolbar {{
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 14px;
            background: var(--bg-surface);
            border: 1px solid var(--border-card);
            border-radius: var(--radius-lg);
            padding: 14px 20px;
            margin-bottom: 24px;
        }}

        .search-box {{
            display: flex;
            align-items: center;
            gap: 10px;
            background: var(--bg-body);
            border: 1px solid var(--border-subtle);
            border-radius: var(--radius-sm);
            padding: 8px 14px;
            flex: 1;
            min-width: 240px;
            max-width: 400px;
            transition: var(--transition-smooth);
        }}

        .search-box:focus-within {{
            border-color: var(--cyan-accent);
            box-shadow: 0 0 12px rgba(6, 182, 212, 0.2);
        }}

        .search-box input {{
            background: transparent;
            border: none;
            outline: none;
            color: var(--text-main);
            font-size: 13px;
            font-family: inherit;
            width: 100%;
        }}

        .filter-pills {{
            display: flex;
            align-items: center;
            gap: 6px;
            flex-wrap: wrap;
        }}

        .filter-pill {{
            background: var(--bg-card);
            border: 1px solid var(--border-card);
            color: var(--text-dim);
            font-size: 12px;
            font-weight: 600;
            padding: 6px 12px;
            border-radius: var(--radius-sm);
            cursor: pointer;
            transition: var(--transition-smooth);
            display: inline-flex;
            align-items: center;
            gap: 6px;
        }}

        .filter-pill:hover {{
            background: var(--bg-elevated);
            color: var(--text-main);
        }}

        .filter-pill.active {{
            background: var(--cyan-accent);
            color: #080c14;
            border-color: var(--cyan-accent);
            font-weight: 700;
        }}

        .pill-badge {{
            font-size: 10px;
            padding: 1px 6px;
            border-radius: 10px;
            background: rgba(255, 255, 255, 0.15);
        }}

        .filter-pill.active .pill-badge {{
            background: rgba(0, 0, 0, 0.2);
            color: #080c14;
        }}

        .toggle-all-btn {{
            background: transparent;
            border: 1px dashed var(--border-subtle);
            color: var(--text-dim);
            font-size: 12px;
            font-weight: 600;
            padding: 6px 12px;
            border-radius: var(--radius-sm);
            cursor: pointer;
            transition: var(--transition-smooth);
        }}

        .toggle-all-btn:hover {{
            border-color: var(--cyan-accent);
            color: var(--cyan-accent);
        }}

        /* Finding Cards */
        .findings-stream {{
            display: flex;
            flex-direction: column;
            gap: 14px;
            margin-bottom: 40px;
        }}

        .finding-card {{
            background: var(--bg-surface);
            border: 1px solid var(--border-card);
            border-radius: var(--radius-md);
            overflow: hidden;
            transition: var(--transition-smooth);
            animation: slideInUp 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
            box-shadow: var(--shadow-card);
        }}

        .finding-card:hover {{
            border-color: rgba(255, 255, 255, 0.15);
            background: var(--bg-card);
        }}

        .finding-card.finding-critical {{ border-left: 4px solid var(--crit-color); }}
        .finding-card.finding-high {{ border-left: 4px solid var(--high-color); }}
        .finding-card.finding-medium {{ border-left: 4px solid var(--med-color); }}
        .finding-card.finding-low {{ border-left: 4px solid var(--low-color); }}
        .finding-card.finding-info {{ border-left: 4px solid var(--info-color); }}

        .card-header {{
            padding: 16px 20px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            cursor: pointer;
            user-select: none;
            background: rgba(255, 255, 255, 0.01);
            transition: background 0.2s ease;
        }}

        .card-header:hover {{
            background: rgba(255, 255, 255, 0.03);
        }}

        .header-left {{
            display: flex;
            align-items: center;
            gap: 12px;
            flex: 1;
            min-width: 0;
        }}

        .severity-pill {{
            font-size: 11px;
            font-weight: 800;
            padding: 3px 8px;
            border-radius: 4px;
            letter-spacing: 0.6px;
            text-transform: uppercase;
            flex-shrink: 0;
        }}

        .pill-critical {{ background: var(--crit-color); color: #ffffff; }}
        .pill-high {{ background: var(--high-color); color: #ffffff; }}
        .pill-medium {{ background: var(--med-color); color: #0f172a; }}
        .pill-low {{ background: var(--low-color); color: #ffffff; }}
        .pill-info {{ background: var(--info-color); color: #ffffff; }}

        .module-chip {{
            font-size: 11px;
            background: var(--bg-body);
            border: 1px solid var(--border-subtle);
            color: var(--cyan-accent);
            padding: 3px 8px;
            border-radius: 4px;
            font-family: 'JetBrains Mono', monospace;
            flex-shrink: 0;
        }}

        .finding-title {{
            font-size: 15px;
            font-weight: 600;
            color: var(--text-main);
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }}

        .header-right {{
            display: flex;
            align-items: center;
            gap: 8px;
            flex-shrink: 0;
        }}

        .expand-btn {{
            background: transparent;
            border: none;
            color: var(--text-dim);
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 4px;
            border-radius: 4px;
            transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }}

        .finding-card.is-open .chevron-icon {{
            transform: rotate(180deg);
        }}

        .card-content {{
            display: grid;
            grid-template-rows: 0fr;
            transition: grid-template-rows 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        }}

        .finding-card.is-open .card-content {{
            grid-template-rows: 1fr;
        }}

        .card-inner {{
            overflow: hidden;
            padding: 0 20px 20px 20px;
            display: flex;
            flex-direction: column;
            gap: 16px;
            border-top: 1px solid rgba(255, 255, 255, 0.05);
            background: rgba(0, 0, 0, 0.2);
        }}

        .finding-card.is-open .card-inner {{
            padding-top: 18px;
        }}

        /* Section Blocks */
        .section-block {{
            display: flex;
            flex-direction: column;
            gap: 8px;
        }}

        .section-head {{
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}

        .section-label {{
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            color: var(--text-dim);
            display: flex;
            align-items: center;
            gap: 6px;
        }}

        .copy-btn {{
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid var(--border-card);
            color: var(--text-dim);
            font-size: 11px;
            font-weight: 600;
            padding: 3px 8px;
            border-radius: 4px;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 5px;
            transition: var(--transition-smooth);
        }}

        .copy-btn:hover {{
            background: var(--bg-elevated);
            color: var(--text-main);
            border-color: var(--cyan-accent);
        }}

        .copy-btn.copied {{
            background: rgba(16, 185, 129, 0.2);
            color: #10b981;
            border-color: #10b981;
        }}

        .code-box {{
            background-color: #04070e;
            border: 1px solid #1e293b;
            border-radius: var(--radius-sm);
            padding: 12px 14px;
            font-family: 'JetBrains Mono', monospace;
            font-size: 13px;
            color: #38bdf8;
            overflow-x: auto;
            white-space: pre-wrap;
            word-break: break-word;
            line-height: 1.5;
        }}

        .analysis-box {{
            background: rgba(30, 41, 59, 0.35);
            border-left: 3px solid var(--blue-accent);
            border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
            padding: 12px 16px;
            font-size: 14px;
            color: #e2e8f0;
            display: flex;
            gap: 12px;
            align-items: flex-start;
        }}

        .analysis-icon {{
            font-size: 16px;
            line-height: 1.4;
        }}

        .analysis-text {{
            flex: 1;
            line-height: 1.6;
        }}

        .remediation-box {{
            background: rgba(16, 185, 129, 0.08);
            border-left: 3px solid var(--emerald-accent);
            border-radius: 0 var(--radius-sm) var(--radius-sm) 0;
            padding: 12px 16px;
            font-size: 14px;
            color: #d1fae5;
            display: flex;
            gap: 12px;
            align-items: flex-start;
        }}

        .remediation-icon {{
            font-size: 16px;
            line-height: 1.4;
        }}

        .remediation-text {{
            flex: 1;
            white-space: pre-wrap;
            line-height: 1.6;
        }}

        .meta-row {{
            display: flex;
            flex-direction: column;
            gap: 8px;
            padding-top: 4px;
        }}

        .meta-tags {{
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
        }}

        .meta-badge {{
            font-size: 11px;
            background: #090e17;
            border: 1px solid #1e293b;
            padding: 3px 8px;
            border-radius: 4px;
            font-family: 'JetBrains Mono', monospace;
        }}

        .meta-k {{
            color: var(--cyan-accent);
            font-weight: 600;
        }}

        .meta-v {{
            color: var(--text-dim);
        }}

        /* Empty State */
        .empty-state {{
            text-align: center;
            padding: 60px 20px;
            background: var(--bg-surface);
            border: 1px dashed var(--border-subtle);
            border-radius: var(--radius-lg);
        }}

        .empty-icon-shield {{
            margin-bottom: 16px;
        }}

        .empty-title {{
            font-size: 20px;
            font-weight: 700;
            color: #ffffff;
            margin-bottom: 6px;
        }}

        .empty-desc {{
            color: var(--text-dim);
            font-size: 14px;
            max-width: 480px;
            margin: 0 auto;
        }}

        /* Errors Banner */
        .errors-banner {{
            background: rgba(239, 68, 68, 0.08);
            border: 1px solid rgba(239, 68, 68, 0.3);
            border-radius: var(--radius-md);
            padding: 16px 20px;
            margin-bottom: 24px;
        }}

        .errors-header {{
            display: flex;
            align-items: center;
            gap: 10px;
            font-size: 14px;
            font-weight: 700;
            color: #f87171;
            margin-bottom: 8px;
        }}

        .errors-list {{
            padding-left: 28px;
            font-size: 13px;
            color: #fca5a5;
        }}

        /* Footer */
        .footer {{
            text-align: center;
            padding: 24px 0 12px 0;
            color: var(--text-muted);
            font-size: 12px;
            border-top: 1px solid var(--border-card);
        }}

        .footer strong {{
            color: var(--text-dim);
        }}

        /* Keyframes */
        @keyframes fadeIn {{
            from {{ opacity: 0; transform: translateY(6px); }}
            to {{ opacity: 1; transform: translateY(0); }}
        }}

        @keyframes slideInUp {{
            from {{ opacity: 0; transform: translateY(12px); }}
            to {{ opacity: 1; transform: translateY(0); }}
        }}

        @keyframes logoFloat {{
            0%, 100% {{ transform: translateY(0); }}
            50% {{ transform: translateY(-3px); }}
        }}

        @keyframes pulseGlow {{
            0%, 100% {{ box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7); }}
            50% {{ box-shadow: 0 0 0 6px rgba(16, 185, 129, 0); }}
        }}

        /* Responsive Breakpoints */
        @media (max-width: 900px) {{
            .hero-panel {{
                grid-template-columns: 1fr;
            }}
            .stat-cards-grid {{
                grid-template-columns: repeat(3, 1fr);
            }}
        }}

        @media (max-width: 600px) {{
            .top-navbar {{
                flex-direction: column;
                gap: 16px;
                align-items: flex-start;
            }}
            .stat-cards-grid {{
                grid-template-columns: repeat(2, 1fr);
            }}
            .controls-toolbar {{
                flex-direction: column;
                align-items: stretch;
            }}
            .search-box {{
                max-width: 100%;
            }}
        }}

        /* Print Mode */
        @media print {{
            body {{
                background: #ffffff !important;
                color: #000000 !important;
                padding: 0;
            }}
            .top-navbar, .controls-toolbar, .btn-action, .copy-btn, .expand-btn {{
                display: none !important;
            }}
            .finding-card {{
                break-inside: avoid;
                border: 1px solid #cccccc !important;
                background: #ffffff !important;
                margin-bottom: 16px;
            }}
            .card-content {{
                grid-template-rows: 1fr !important;
            }}
            .code-box {{
                background: #f1f5f9 !important;
                color: #0f172a !important;
            }}
            .analysis-box, .remediation-box {{
                color: #0f172a !important;
            }}
        }}
    </style>
</head>
<body>
    <div class="wrapper">
        <!-- Top Navbar -->
        <nav class="top-navbar">
            <div class="brand-cluster">
                <div class="brand-logo">
                    <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        <path d="m9 12 2 2 4-4"></path>
                    </svg>
                </div>
                <div class="brand-titles">
                    <div class="brand-name">
                        <span>SecTest Security Report</span>
                        <span class="brand-badge">Security Audit</span>
                    </div>
                    <span class="brand-tagline">SecTest Security Audit Suite • Automated Vulnerability Scanner & LLM Engine</span>
                </div>
            </div>
            <div class="nav-actions">
                <button class="btn-action" onclick="window.print()" title="Print or export as PDF">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="6 9 6 2 18 2 18 9"></polyline>
                        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                        <rect x="6" y="14" width="12" height="8"></rect>
                    </svg>
                    <span>Print / PDF</span>
                </button>
                <button class="btn-action" onclick="downloadJSON()" title="Download raw JSON audit report">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    <span>JSON Report</span>
                </button>
            </div>
        </nav>

        {errors_html}

        <!-- Hero Overview Panel -->
        <header class="hero-panel">
            <div class="hero-left">
                <div class="target-bar">
                    <div class="target-subhead">Target Under Inspection</div>
                    <div class="target-url">
                        <span class="pulse-live" title="Local Server Scanned"></span>
                        <span>{html.escape(target.url)}</span>
                    </div>
                </div>

                <div class="meta-stats">
                    <div class="meta-stat-item">
                        <span class="meta-stat-label">Audit Timestamp</span>
                        <span class="meta-stat-val">{scanned_time}</span>
                    </div>
                    <div class="meta-stat-item">
                        <span class="meta-stat-label">Modules Tested</span>
                        <span class="meta-stat-val">{len(modules_detected) if modules_detected else 'Active'}</span>
                    </div>
                    <div class="meta-stat-item">
                        <span class="meta-stat-label">Execution Status</span>
                        <span class="meta-stat-val" style="color: #10b981;">Complete ✔</span>
                    </div>
                </div>
            </div>

            <div class="hero-right">
                <div class="gauge-wrapper">
                    <div class="gauge-container">
                        <svg class="gauge-svg" viewBox="0 0 100 100">
                            <circle class="gauge-bg" cx="50" cy="50" r="45"></circle>
                            <circle class="gauge-fill" cx="50" cy="50" r="45"></circle>
                        </svg>
                        <div class="gauge-center">
                            <span class="gauge-number" id="animated-score">{health_score}</span>
                            <span class="gauge-label">Score</span>
                        </div>
                    </div>
                    <div class="score-details">
                        <div class="grade-badge">
                            <span>Grade {grade}</span>
                        </div>
                        <p class="grade-text">Security posture rating derived from severity metrics.</p>
                    </div>
                </div>
            </div>
        </header>

        <!-- Summary Metric Cards -->
        <div class="stat-cards-grid">
            <div class="stat-card stat-total active-filter" onclick="filterSeverity('all', this)">
                <div class="stat-count">{total}</div>
                <div class="stat-label">Total Findings</div>
            </div>
            <div class="stat-card stat-critical" onclick="filterSeverity('critical', this)">
                <div class="stat-count">{counts['critical']}</div>
                <div class="stat-label">Critical</div>
            </div>
            <div class="stat-card stat-high" onclick="filterSeverity('high', this)">
                <div class="stat-count">{counts['high']}</div>
                <div class="stat-label">High</div>
            </div>
            <div class="stat-card stat-medium" onclick="filterSeverity('medium', this)">
                <div class="stat-count">{counts['medium']}</div>
                <div class="stat-label">Medium</div>
            </div>
            <div class="stat-card stat-low" onclick="filterSeverity('low', this)">
                <div class="stat-count">{counts['low']}</div>
                <div class="stat-label">Low</div>
            </div>
            <div class="stat-card stat-info" onclick="filterSeverity('info', this)">
                <div class="stat-count">{counts['info']}</div>
                <div class="stat-label">Info</div>
            </div>
        </div>

        <!-- Controls Toolbar -->
        <div class="controls-toolbar">
            <div class="search-box">
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="var(--text-muted)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
                <input type="text" id="searchInput" placeholder="Filter by title, module, or evidence..." oninput="handleSearch(this.value)">
            </div>

            <div class="filter-pills">
                <button class="filter-pill active" data-filter="all" onclick="filterSeverity('all', this)">
                    <span>All</span>
                    <span class="pill-badge">{total}</span>
                </button>
                <button class="filter-pill" data-filter="critical" onclick="filterSeverity('critical', this)">
                    <span>Critical</span>
                    <span class="pill-badge">{counts['critical']}</span>
                </button>
                <button class="filter-pill" data-filter="high" onclick="filterSeverity('high', this)">
                    <span>High</span>
                    <span class="pill-badge">{counts['high']}</span>
                </button>
                <button class="filter-pill" data-filter="medium" onclick="filterSeverity('medium', this)">
                    <span>Medium</span>
                    <span class="pill-badge">{counts['medium']}</span>
                </button>
                <button class="filter-pill" data-filter="low" onclick="filterSeverity('low', this)">
                    <span>Low</span>
                    <span class="pill-badge">{counts['low']}</span>
                </button>
                <button class="filter-pill" data-filter="info" onclick="filterSeverity('info', this)">
                    <span>Info</span>
                    <span class="pill-badge">{counts['info']}</span>
                </button>
            </div>

            <button class="toggle-all-btn" id="toggleAllBtn" onclick="toggleAllCards()">
                <span>Expand All</span>
            </button>
        </div>

        <!-- Findings List -->
        <main class="findings-stream" id="findingsStream">
            {all_cards_html}
        </main>

        <!-- Footer -->
        <footer class="footer">
            Generated by <strong>SecTest CLI</strong> • Automated Local Vulnerability Scanner & LLM Engine
        </footer>
    </div>

    <!-- Embedded Raw Findings JSON for Offline Export -->
    <script id="sec-findings-data" type="application/json">
{findings_json}
    </script>

    <!-- Interactive Client Script -->
    <script>
        let currentFilter = 'all';
        let searchQuery = '';
        let allExpanded = false;

        // Automatically open first 5 cards on load
        document.addEventListener('DOMContentLoaded', () => {{
            const cards = document.querySelectorAll('.finding-card');
            cards.forEach((card, i) => {{
                if (i < 5) {{
                    card.classList.add('is-open');
                }}
            }});
        }});

        function toggleCard(headerEl) {{
            const card = headerEl.closest('.finding-card');
            card.classList.toggle('is-open');
        }}

        function toggleAllCards() {{
            allExpanded = !allExpanded;
            const cards = document.querySelectorAll('.finding-card');
            cards.forEach(card => {{
                if (allExpanded) {{
                    card.classList.add('is-open');
                }} else {{
                    card.classList.remove('is-open');
                }}
            }});
            document.getElementById('toggleAllBtn').innerText = allExpanded ? 'Collapse All' : 'Expand All';
        }}

        function filterSeverity(sev, el) {{
            currentFilter = sev;
            
            // Sync pill buttons
            document.querySelectorAll('.filter-pill').forEach(btn => {{
                if (btn.dataset.filter === sev || (sev === 'all' && btn.dataset.filter === 'all')) {{
                    btn.classList.add('active');
                }} else {{
                    btn.classList.remove('active');
                }}
            }});

            // Sync stat cards
            document.querySelectorAll('.stat-card').forEach(card => {{
                card.classList.remove('active-filter');
            }});
            if (el && el.classList.contains('stat-card')) {{
                el.classList.add('active-filter');
            }}

            applyFilters();
        }}

        function handleSearch(val) {{
            searchQuery = val.trim().toLowerCase();
            applyFilters();
        }}

        function applyFilters() {{
            const cards = document.querySelectorAll('.finding-card');
            cards.forEach(card => {{
                const sev = card.dataset.severity;
                const text = card.innerText.toLowerCase();

                const matchesSev = (currentFilter === 'all' || sev === currentFilter);
                const matchesSearch = (!searchQuery || text.includes(searchQuery));

                if (matchesSev && matchesSearch) {{
                    card.style.display = 'block';
                }} else {{
                    card.style.display = 'none';
                }}
            }});
        }}

        function copySnippet(btn, elementId) {{
            const el = document.getElementById(elementId);
            if (!el) return;

            const text = el.innerText || el.textContent;
            navigator.clipboard.writeText(text).then(() => {{
                const originalHtml = btn.innerHTML;
                btn.classList.add('copied');
                btn.innerHTML = `
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <polyline points="20 6 9 17 4 12"></polyline>
                    </svg>
                    <span>Copied!</span>
                `;
                setTimeout(() => {{
                    btn.classList.remove('copied');
                    btn.innerHTML = originalHtml;
                }}, 2000);
            }}).catch(err => {{
                console.error("Clipboard copy error:", err);
            }});
        }}

        function downloadJSON() {{
            const dataEl = document.getElementById('sec-findings-data');
            if (!dataEl) return;
            const blob = new Blob([dataEl.textContent.trim()], {{ type: 'application/json' }});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `sectest-report-${{new Date().toISOString().split('T')[0]}}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }}
    </script>
</body>
</html>
"""
    return html_template


def write_html_report(
    findings: list[EnrichedFinding],
    errors: list[str],
    target: TargetConfig,
    out_path: str,
) -> None:
    """
    Generate and save a self-contained, single-file HTML audit report with clean CSS animations.
    """
    html_content = generate_html_report(findings, errors, target)
    target_file = Path(out_path)
    target_file.parent.mkdir(parents=True, exist_ok=True)

    with open(target_file, "w", encoding="utf-8") as f:
        f.write(html_content)
