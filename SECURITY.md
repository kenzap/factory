# Security Policy

## Supported Versions

Security fixes are provided for the current active branch used in production deployments.

| Version | Supported |
| --- | --- |
| `main` (current) | :white_check_mark: |
| older snapshots/forks | :x: |

## Reporting a Vulnerability

Do not open public issues for security vulnerabilities.

Report privately to the project maintainers through your internal/private support channel used for this deployment, and include:

1. A clear description of the issue and potential impact.
2. Exact reproduction steps (request samples, payloads, affected endpoints/pages).
3. Environment details (`SID`, deployment type, relevant config flags).
4. Any temporary mitigation already tested.

If needed, include a minimal proof-of-concept. Avoid sharing production secrets or personal data in the report.

## Response Expectations

After a valid report is received:

1. Triage and severity assessment are performed.
2. A mitigation/fix plan is prepared.
3. A patch is delivered and deployment guidance is provided.
4. Follow-up validation is completed.

## Security Baseline for Contributors

When changing code in this repository:

1. Never commit secrets, API keys, or credentials.
2. Validate and sanitize all external input.
3. Use least-privilege defaults for access and config.
4. Flag authentication/authorization/data-access risks in handoff notes.
5. Re-run build and relevant checks before release.
