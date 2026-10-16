# Workspace Rules for 1to7 Influencer Platform

## 1. Automatic Production Problem & Interview Case Studies Logging
Whenever you audit, troubleshoot, debug, or implement fixes for:
- Database bugs, query limits, or performance issues
- API crashes, 500 errors, or type casting failures
- Missing data or UI filtering discrepancies
- Concurrency, race conditions, or authentication failures
- Significant business logic (e.g. ghosting, payments, double-approval)

**Action:**
You MUST automatically append the case study to `problems/PRODUCTION_INTERVIEW_CASE_STUDIES.txt` with:
- Case Study Title & Category
- Interview Question
- [SITUATION]
- [ROOT CAUSE]
- [SOLUTION & ARCHITECTURE]
- [INTERVIEW STAR TAKEAWAY]

Do NOT wait for the user to prompt or remind you. Maintain the index at the top of the file.
