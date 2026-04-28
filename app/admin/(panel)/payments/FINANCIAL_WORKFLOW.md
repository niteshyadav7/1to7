# Influencer Payment & Financial Workflow Documentation

This document outlines the secure, audit-proof payment system implemented for the 1to7 Media Admin Dashboard.

## 1. Financial Controls & Safeguards

### Total Deal & Pending Balance Sync
- **Automated Calculation**: The `Pending Amount` is automatically calculated as `Total Deal - Total Paid`.
- **Read-Only Protection**: The `Pending Amount` field is locked (read-only) for admins to prevent manual entry errors. It only updates when the `Total Deal` budget is modified or a payment is initiated.
- **Double-Check Security**: Any edit to the `Total Deal` requires a high-end, glassmorphism-styled `AlertDialog` confirmation before the edit mode is even entered.

### Payment Initiation Workflow
- **Single-Initiation Lock**: Global "Initiate Payment" and "Reject" buttons are hidden once a payment is in the `Payment Initiated` state.
- **Progress Visibility**: A "Payment Process Started" status indicator replaces the action buttons to clarify system progress.
- **Status Thresholds**: The system only displays "Fully Paid" when the pending balance reaches exactly ₹0.

## 2. Partial Payment Requests Lifecycle

### Influencer Side
- **Incremental Requests**: Influencers can submit multiple partial payment requests over time.
- **Balance Validation**: The system prevents influencers from requesting more than their current remaining balance.
- **Visibility**: Influencers see their real-time "Received" and "Balance Due" amounts.

### Admin Side (Processing)
- **Granular Handling**: Each partial request is handled individually. 
- **Auto-Cleaning List**: Once an admin clicks **Initiate** or **Reject** on a specific partial request, that request is marked as processed and **disappears** from the active "Partial Payment Requests" list.
- **Audit Trail**: Processed requests are stored in the `form_data.requests` array with timestamps and specific status updates (`approved` or `rejected`).

## 3. Technical Implementation Details

### Database Schema (Supabase)
- **Table**: `applications`
- **Key Fields**:
    - `partial_payment`: Cumulative amount of all partial payments.
    - `final_payment`: Final settlement amount.
    - `pending_amount`: Remaining balance.
    - `form_data.requests`: Array of request objects containing `type`, `amount`, `status`, and `submitted_at`.

### UI Components
- **EditableAmountCell**: Handles the secure editing logic for financial fields.
- **AlertDialog**: Custom premium modal for high-stakes confirmations.
- **PaymentRow**: Main table row containing expanded details for requests and bank info.

---
*Last Updated: April 28, 2026*
