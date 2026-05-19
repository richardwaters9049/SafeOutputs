import re

from app.models import Assessment, CheckFinding, Decision, OutputSubmission


DIRECT_IDENTIFIER_PATTERNS = {
    "email": re.compile(r"\b[\w.+-]+@[\w-]+\.[\w.-]+\b", re.IGNORECASE),
    "phone": re.compile(r"\b(?:\+44\s?7\d{3}|\(?0\d{2,4}\)?)\s?\d{3}\s?\d{3,4}\b"),
    "nhs_number": re.compile(r"\b\d{3}\s?\d{3}\s?\d{4}\b"),
}

SENSITIVE_TERMS = {
    "participant",
    "patient",
    "rare disease",
    "genotype",
    "variant",
    "postcode",
    "date of birth",
}


def assess_submission(submission: OutputSubmission) -> Assessment:
    findings: list[CheckFinding] = []
    text = submission.preview_text.lower()

    findings.extend(_find_direct_identifiers(submission.preview_text))
    findings.extend(_find_small_cells(text))
    findings.extend(_find_sensitive_terms(text))
    findings.extend(_find_large_export(submission))

    risk_score = min(100, sum(finding.severity for finding in findings))
    decision = _decision_for_score(risk_score, findings)

    return Assessment(
        submission=submission,
        risk_score=risk_score,
        decision=decision,
        findings=findings,
    )


def _find_direct_identifiers(text: str) -> list[CheckFinding]:
    findings: list[CheckFinding] = []
    for identifier_type, pattern in DIRECT_IDENTIFIER_PATTERNS.items():
        if pattern.search(text):
            findings.append(
                CheckFinding(
                    check_id=f"direct_identifier.{identifier_type}",
                    title="Direct identifier detected",
                    severity=45,
                    evidence=f"Potential {identifier_type.replace('_', ' ')} found in preview text.",
                    recommendation="Remove direct identifiers before export.",
                )
            )
    return findings


def _find_small_cells(text: str) -> list[CheckFinding]:
    small_cell_patterns = [
        re.compile(r"\bn\s*[=:]\s*([1-4])\b"),
        re.compile(r"\bcount\s*[=:]\s*([1-4])\b"),
        re.compile(r"\bcell\s*[=:]\s*([1-4])\b"),
    ]
    if any(pattern.search(text) for pattern in small_cell_patterns):
        return [
            CheckFinding(
                check_id="statistical_disclosure.small_cell",
                title="Small cell count detected",
                severity=35,
                evidence="Preview includes a count below common disclosure thresholds.",
                recommendation="Suppress, aggregate, or round small cell counts.",
            )
        ]
    return []


def _find_sensitive_terms(text: str) -> list[CheckFinding]:
    matches = sorted(term for term in SENSITIVE_TERMS if term in text)
    if not matches:
        return []

    return [
        CheckFinding(
            check_id="context.sensitive_terms",
            title="Sensitive research context detected",
            severity=min(25, 5 * len(matches)),
            evidence=f"Matched terms: {', '.join(matches)}.",
            recommendation="Route for reviewer confirmation if combined with granular data.",
        )
    ]


def _find_large_export(submission: OutputSubmission) -> list[CheckFinding]:
    if submission.declared_rows > 100_000 or submission.declared_columns > 200:
        return [
            CheckFinding(
                check_id="export.volume",
                title="Large export requires review",
                severity=15,
                evidence=(
                    f"Declared shape is {submission.declared_rows} rows by "
                    f"{submission.declared_columns} columns."
                ),
                recommendation="Confirm the export contains only approved aggregate outputs.",
            )
        ]
    return []


def _decision_for_score(risk_score: int, findings: list[CheckFinding]) -> Decision:
    has_direct_identifier = any(
        finding.check_id.startswith("direct_identifier.") for finding in findings
    )
    if has_direct_identifier or risk_score >= 70:
        return Decision.BLOCKED
    if risk_score >= 25:
        return Decision.REVIEW_REQUIRED
    return Decision.APPROVED

