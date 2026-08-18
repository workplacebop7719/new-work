# ADR-0004 — Evidence file pipeline

- **Status:** Accepted (CC-01)
- **Date:** 2026-08-18
- **Deciders:** Engineering lead, security/privacy lead
- **Blocks:** CC-04
- **PRD basis:** §9 Evidence vault; §16 Uploads, Data protection; §17 Files; §27 Files posture ("direct-to-quarantine upload, malware scan, classification, signed expiring access, immutable original and versioned derivatives")

## Context

Evidence is the most sensitive data the platform holds: internal policies, employee training records, contracts, screenshots of unremediated systems. It arrives as arbitrary user-supplied files from non-technical uploaders, must be shared with an external contractor under a narrow, expiring scope, and must be deletable on request with legal-hold handling (SEC-013).

The PRD's file posture is unusually specific and should be read as a set of hard constraints rather than suggestions.

## Decision

**A five-state pipeline with the original file immutable and never served directly.**

```
client browser --(direct-to-quarantine, presigned PUT)--> quarantine bucket
      -> [scan job] -> infected: isolate + alert + notify uploader
                    -> clean: copy to evidence bucket (immutable, versioned)
                            -> [classify job] -> derivatives bucket (previews, thumbnails)
```

1. **Direct-to-quarantine upload.** The browser uploads to a quarantine bucket via a short-lived presigned URL constrained by content type and maximum size. Application servers never proxy file bytes.
2. **Quarantine is inaccessible to all readers.** No preview, no download, no signed URL is issued for an object in quarantine. The UI shows an explicit "scanning" state (A-13).
3. **Malware scan** runs as a durable queue job (ARC-003) with retries and a dead-letter queue that is reviewed, not drained silently. Infected objects are isolated, never deleted immediately (evidence preservation, SEC-010), and generate an incident record (OPS-008).
4. **Type and size validation** happens twice — presign time and post-upload by content sniffing, not by extension. Executable and active-content formats are refused outright.
5. **Immutable original.** Once promoted, the original is write-once with object versioning and object-lock-style retention where the storage vendor supports it. Corrections create a new version; nothing overwrites.
6. **Derivatives are versioned separately** and regenerable; a derivative is never the source of truth for a client download.
7. **Access is always a signed, expiring URL** issued per request after a policy check (ADR-0002), with a short lifetime (default 5 minutes), scoped to a single object, bound to the requesting session, and recorded as an audit event (SEC-006 — download is an auditable action). Signed URLs are never embedded in emails, notifications or analytics payloads (ENG-003).
8. **Content-Disposition is forced to `attachment`** for client-supplied files, with a safe preview path (rendered derivative, not the original) for the formats we choose to preview. HTML and SVG are never previewed inline.
9. **Retention and legal hold.** Each evidence object carries a classification and a retention date. A legal hold flag suspends deletion and is visible to the client admin as a reason a delete request is pending.
10. **Residency.** Evidence storage is Canadian-region (Q-17 treats this as the non-negotiable half of the residency question).

## Alternatives considered

| Alternative | Why not |
|---|---|
| Upload through the application server, scan inline | Simple mental model; caps upload size, harms INP (ARC-005), and puts untrusted bytes through the application process. Rejected. |
| Single bucket with a `status` tag instead of quarantine/evidence separation | One misconfigured policy exposes unscanned files. Bucket separation makes the safe default a structural property. Rejected. |
| Scan on download instead of on upload | Leaves infected content resident and shifts cost to the read path. Rejected. |
| Long-lived signed URLs (hours/days) for convenience | A leaked URL is an unauthenticated grant for its whole lifetime, and it bypasses the audit trail on second use. Rejected; 5-minute default. |
| Client-side encryption with client-held keys | Strongest confidentiality; breaks server-side scanning, preview generation and contractor access entirely. Rejected for MVP; revisit only for a specific enterprise requirement. |
| Deleting infected uploads immediately | Loses incident evidence. Rejected — isolate instead. |

## Consequences

- **Positive:** application servers never handle untrusted bytes; a storage misconfiguration on the quarantine bucket cannot expose promoted evidence, and vice versa.
- **Positive:** immutable originals make finding-to-evidence traceability (CLP-014) durable — a finding cites a specific version.
- **Negative:** asynchronous scanning means the uploader waits. Mitigation: explicit progress state, and intake completion (CLP-003) does not block on scan results.
- **Negative:** three buckets and a job pipeline is more infrastructure than a small team wants at CC-04. It is nonetheless the minimum that satisfies §16 and §27.
- **Cost:** malware scanning is a per-file cost and a vendor dependency; the scanner sits behind an interface in `/packages/integrations` so it is replaceable (ARC-002).
- **Open:** preview generation for Office documents may require a third-party renderer, which becomes a new data-processing subprocessor (SEC-007). Flag at CC-04 rather than assuming.

## Requirements satisfied

CLP-004, CLP-012, CLP-014, SEC-004, SEC-005, SEC-006, SEC-013, ARC-003, ENG-003, DAT-006.

## Review triggers

Revisit if: evidence volume makes per-file scanning cost material; a client requires client-side encryption; or preview requirements expand beyond what a safe derivative pipeline can render.
