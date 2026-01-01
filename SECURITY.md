# Security Policy & Architecture

> [!IMPORTANT]
> This document outlines the mandatory security standards for the NexusAI platform. All contributors must adhere to these protocols.

## 1. Authentication & Authorization
*   **Zero Trust Architecture**: All requests must be authenticated and authorized. No implicit trust for internal services.
*   **JWT Standards**: Access tokens must be signed (RS256) and have a lifespan < 1 hour. Refresh tokens must be rotated.
*   **Role-Based Access Control (RBAC)**:
    *   `ADMIN`: Full system access.
    *   `USER`: Data read/analysis only.
    *   `VIEWER`: Read-only, no upload.

## 2. API Security
*   **Input Validation**: All API endpoints must sanitize input. No raw SQL or shell command execution.
*   **Rate Limiting**: Public endpoints must be rate-limited (Token Bucket algorithm).
*   **CORS**: Strict CORS policy allowing only trusted domains.

## 3. Data Protection
*   **Encryption at Rest**: Sensitive data (PII, financial records) must be AES-256 encrypted.
*   **Encryption in Transit**: TLS 1.3 required for all communications.
*   **Banking Core Specifics**:
    *   Transaction streams must be tokenized.
    *   Account numbers must be masked in logs.
*   **Token Streams**: Secure handling of generative AI tokens; no leaking of prompt contexts.

## 4. Secure Development Lifecycle
*   **Code Review**: All PRs must have a security review.
*   **Dependency Scanning**: Automated checks for CVEs in dependencies.
*   **Secrets Management**: No hardcoded API keys. Use environment variables or a secrets vault.

## 5. Incident Response
*   **Logging**: Centralized audit logs for all security events (login failures, permission denied).
*   **Reporting**: Security incidents must be reported immediately to the security team.
