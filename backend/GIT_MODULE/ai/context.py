import json
import re


def build_commit_ai_prompt(
    diffs: list[dict],
    data: dict,
    max_diff_chars: int = 10_000,
    context_lines: int = 2,
) -> str:
    """
    Build a compact AI context from structured commit diffs
    and raw deterministic commit analysis.

    The complete raw analysis is preserved.
    Only code relevant to the detected findings is included.
    """

    findings = data.get("findings", [])

    # ---------------------------------------------------------
    # Files explicitly mentioned by findings
    # ---------------------------------------------------------

    finding_paths = {
        finding.get("path")
        for finding in findings
        if finding.get("path")
    }

    # ---------------------------------------------------------
    # Generic security keywords.
    #
    # Used mainly for findings without a path.
    # ---------------------------------------------------------

    relevant_pattern = re.compile(
        r"""
        auth|authoriz|permission|role|token|jwt|password|secret|
        credential|api[_-]?key|session|cookie|csrf|cors|
        tls|ssl|verify\s*=\s*false|cert_none|
        sql|query|execute|injection|
        subprocess|os\.system|shell|eval|exec|
        pickle|yaml\.load|
        docker|kubernetes|k8s|rbac|
        github|workflow|ci|cd|
        redirect|proxy|admin|login|signup|
        encrypt|decrypt|hash|crypto|
        database|db|sqlite
        """,
        re.IGNORECASE | re.VERBOSE,
    )

    # ---------------------------------------------------------
    # Files we never need to send to AI
    # ---------------------------------------------------------

    ignored_extensions = {
        ".pyc",
        ".pyo",
        ".map",
        ".min.js",
        ".min.css",
    }

    ignored_directories = {
        ".git",
        "__pycache__",
        "node_modules",
        "dist",
        "build",
    }

    def should_ignore(path: str | None) -> bool:
        if not path:
            return True

        path = path.replace("\\", "/")
        parts = path.split("/")

        if any(
            part in ignored_directories
            for part in parts
        ):
            return True

        return any(
            path.lower().endswith(ext)
            for ext in ignored_extensions
        )

    # ---------------------------------------------------------
    # Find the actual code relevant to a finding
    # ---------------------------------------------------------

    def finding_matches(
        finding: dict,
        path: str,
        text: str,
    ) -> bool:
        """
        Decide whether a piece of diff is relevant to a finding.
        """

        finding_path = finding.get("path")

        # If finding points to another file, skip it.
        if finding_path and finding_path not in {
            path,
            finding.get("_old_path"),
        }:
            return False

        title = finding.get("title", "")
        evidence = finding.get("evidence", "")

        # -----------------------------------------------------
        # First try the finding evidence.
        # -----------------------------------------------------

        if evidence:
            clean_evidence = evidence.replace(
                "[REDACTED]",
                "",
            ).strip()

            if (
                clean_evidence
                and len(clean_evidence) >= 4
                and clean_evidence.lower() in text.lower()
            ):
                return True

        # -----------------------------------------------------
        # Match the finding title directly against code.
        # -----------------------------------------------------

        title_pattern = {
            "TLS verification disabled": (
                r"verify\s*=\s*False|CERT_NONE"
            ),
            "TLS verification bypass": (
                r"verify\s*=\s*False|CERT_NONE"
            ),
            "Authentication bypass pattern": (
                r"(?:skip|disable|bypass).{0,60}"
                r"(?:auth|authentication|authorization)"
            ),
            "SQL injection risk": (
                r"execute|query|cursor|format"
            ),
            "Command injection risk": (
                r"os\.system|os\.popen|"
                r"subprocess\.(?:run|Popen|call)"
            ),
            "Unsafe deserialization": (
                r"pickle\.loads?|yaml\.load"
            ),
            "Dynamic code execution": (
                r"\beval\s*\(|\bexec\s*\("
            ),
            "Weak hashing": (
                r"\b(?:md5|sha1)\s*\("
            ),
            "Debug mode enabled": (
                r"\bdebug\s*[:=]\s*(?:True|true|1)"
            ),
            "Wildcard CORS": (
                r"allow_origins|origins"
            ),
            "Hard-coded authorization": (
                r"is_admin|role"
            ),
            "Unpinned GitHub Action": (
                r"uses:\s*[^@\s]+@(?:main|master|latest)"
            ),
            "Broad workflow permissions": (
                r"permissions:\s*write-all"
            ),
            "Potential secret exposure": (
                r"secrets\."
            ),
            "Privileged container": (
                r"privileged\s*:\s*true"
            ),
            "Docker runs as root": (
                r"^\s*USER\s+root\s*$"
            ),
            "Host filesystem mount": (
                r"/var/run/docker.sock|/etc|/root"
            ),
            "Privileged Kubernetes container": (
                r"privileged\s*:\s*true"
            ),
            "Host network enabled": (
                r"hostNetwork\s*:\s*true"
            ),
            "Host PID enabled": (
                r"hostPID\s*:\s*true"
            ),
            "Host path mount": (
                r"hostPath\s*:"
            ),
            "Cluster-admin RBAC": (
                r"cluster-admin"
            ),
        }

        pattern = title_pattern.get(title)

        if pattern and re.search(
            pattern,
            text,
            re.IGNORECASE | re.MULTILINE,
        ):
            return True

        # -----------------------------------------------------
        # Generic fallback for unknown finding titles.
        # -----------------------------------------------------

        return bool(
            relevant_pattern.search(text)
        )

    # ---------------------------------------------------------
    # Extract relevant pieces from each file
    # ---------------------------------------------------------

    selected = []

    for item in diffs:
        old_path = item.get("old_path")
        new_path = item.get("new_path")

        path = new_path or old_path

        if should_ignore(path):
            continue

        patch = item.get("diff") or ""

        if not patch.strip():
            continue

        # -----------------------------------------------------
        # Findings belonging to this file.
        # -----------------------------------------------------

        file_findings = []

        for finding in findings:
            finding_copy = dict(finding)
            finding_copy["_old_path"] = old_path

            finding_path = finding.get("path")

            if (
                finding_path == path
                or finding_path == old_path
            ):
                file_findings.append(
                    finding_copy
                )

        # -----------------------------------------------------
        # Split diff into hunks.
        # -----------------------------------------------------

        hunks = re.split(
            r"(?=^@@ )",
            patch,
            flags=re.MULTILINE,
        )

        relevant_hunks = []

        for hunk in hunks:
            if not hunk.startswith("@@"):
                continue

            lines = hunk.splitlines()

            changed_indexes = []

            for index, line in enumerate(lines):
                if (
                    line.startswith("+")
                    and not line.startswith("+++")
                ) or (
                    line.startswith("-")
                    and not line.startswith("---")
                ):
                    changed_indexes.append(index)

            if not changed_indexes:
                continue

            changed_text = "\n".join(
                lines[index]
                for index in changed_indexes
            )

            # -------------------------------------------------
            # Determine whether this hunk is relevant.
            # -------------------------------------------------

            relevant = False

            # Findings explicitly associated with this file.
            for finding in file_findings:
                if finding_matches(
                    finding,
                    path,
                    changed_text,
                ):
                    relevant = True
                    break

            # Findings without a path.
            if not relevant:
                pathless_findings = [
                    finding
                    for finding in findings
                    if not finding.get("path")
                ]

                for finding in pathless_findings:
                    if finding_matches(
                        finding,
                        path,
                        changed_text,
                    ):
                        relevant = True
                        break

            if not relevant:
                continue

            # -------------------------------------------------
            # Keep changed lines + tiny surrounding context.
            # -------------------------------------------------

            keep_indexes = set()

            for index in changed_indexes:
                start = max(
                    0,
                    index - context_lines,
                )

                end = min(
                    len(lines),
                    index + context_lines + 1,
                )

                keep_indexes.update(
                    range(start, end)
                )

            compact = [
                lines[index]
                for index in sorted(keep_indexes)
            ]

            relevant_hunks.append(
                "\n".join(compact)
            )

        if relevant_hunks:
            selected.append(
                {
                    "path": path,
                    "change_type": item.get(
                        "change_type"
                    ),
                    "diff": "\n\n".join(
                        relevant_hunks
                    ),
                }
            )

    # ---------------------------------------------------------
    # Build compact diff
    # ---------------------------------------------------------

    relevant_diff = "\n\n".join(
        f"FILE: {item['path']}\n"
        f"CHANGE: {item['change_type']}\n"
        f"{item['diff']}"
        for item in selected
    )

    # ---------------------------------------------------------
    # Final hard limit
    # ---------------------------------------------------------

    if len(relevant_diff) > max_diff_chars:
        relevant_diff = (
            relevant_diff[:max_diff_chars]
            + "\n[DIFF TRUNCATED]"
        )

    # ---------------------------------------------------------
    # Raw analysis
    # ---------------------------------------------------------

    raw_analysis = json.dumps(
        data,
        ensure_ascii=False,
        separators=(",", ":"),
    )

    # ---------------------------------------------------------
    # Final AI prompt
    # ---------------------------------------------------------

    return f"""Analyze this Git commit for security risk.

RAW_ANALYSIS:
{raw_analysis}

RELEVANT_DIFF:
{relevant_diff}

Verify the existing findings against the diff, identify false positives and important missing risks, and return the final security analysis."""
