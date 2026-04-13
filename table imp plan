# SaaS-Grade Applications Data Table

Upgrade the admin `/admin/applications` page from a basic card-list into a premium, full-featured data table — the kind you'd see in tools like Linear, Retool, or Stripe Dashboard.

## Current State

The existing page shows applications as expandable cards with:
- Status tab filters (All, Applied, Approved, Rejected, Completed, Payment Initiated)
- A search bar
- Bulk select + bulk approve/reject
- Expandable card details (influencer profile, campaign info, form data, payments)

## Proposed Features

### 1. Proper Data Table with Sortable Columns
A real `<table>` layout with these columns:

| Column | Sortable | Description |
|--------|----------|-------------|
| Checkbox | — | Bulk select |
| Influencer | ✅ (by name) | Avatar + Name + Influencer ID |
| Instagram | ✅ (by followers) | Username + follower count |
| Brand / Campaign | ✅ (by brand) | Brand name + campaign code badge |
| Location | ✅ (by state) | City, State |
| Status | ✅ | Color-coded pill |
| Applied On | ✅ | Relative date (e.g. "2 days ago") with tooltip for full date |
| Actions | — | Quick-action dropdown (Approve, Reject, View Details) |

Click column headers to sort ascending → descending → none.

### 2. Advanced Filters (Toolbar Dropdowns)
In addition to the existing status tabs and search, add dropdown popovers:
- **Gender** — Male, Female, Other (multi-select chips)
- **Location** — State dropdown (derived from data)
- **Followers** — Range presets (< 1K, 1K–10K, 10K–50K, 50K–100K, 100K+)
- **Platform** — Instagram, YouTube, etc. (from campaign data)
- **Date Range** — Quick picks (Today, Last 7 days, Last 30 days, Custom)
- Active filters shown as dismissible chips below the toolbar

### 3. Column Visibility Toggle
A "Columns" button that opens a popover checklist — hide/show any column.

### 4. Pagination
- Page size selector (10 / 25 / 50 / 100)
- Page navigation with current page indicator
- "Showing X–Y of Z results" label

### 5. Row Density Toggle
Compact / Default / Comfortable modes that adjust row padding.

### 6. Export
"Export" button with CSV and JSON options for the current filtered/sorted view.

### 7. Expandable Row Detail (Preserved)
Clicking a row (not a button) still expands an inline detail section identical to the current one — influencer profile, campaign info, form data, order details, payment info.

### 8. Premium Table UI
- Sticky header that stays visible while scrolling
- Alternating subtle row backgrounds
- Hover highlight with soft glow
- Smooth sort-direction indicator animations
- Glassmorphism toolbar
- Active filter count badge on the filter buttons
- Skeleton loading state for the table

## Proposed Changes

### Applications Page

#### [MODIFY] [page.tsx](file:///d:/yash-android-projects/influencer/1to7/app/admin/(panel)/applications/page.tsx)

Full rewrite of this file to implement:
- State management for sort (column + direction), filters (gender, location, followers, platform, date range), pagination (page, pageSize), column visibility, row density
- All sorting, filtering, pagination logic computed client-side from the fetched data
- Premium `<table>` layout replacing the card list
- Toolbar with search, filter dropdowns, column toggle, density, export
- Status tabs preserved as-is
- Expandable row detail preserved as-is
- Floating bulk action bar preserved as-is
- Skeleton loading state

> [!NOTE]
> No new npm dependencies required. Everything uses existing lucide-react icons, framer-motion animations, and built-in shadcn components (Button, Input, Dialog). Filter dropdowns are custom popover components built inline.

## What Won't Change
- **API routes** — No backend changes needed. The existing `GET /api/admin/applications` already returns all data, and sorting/filtering/pagination will be client-side.
- **Bulk action API** — Unchanged.
- **Single status update API** — Unchanged.
- **Admin layout/sidebar** — Unchanged.

## Verification Plan

### Manual Verification
1. Open `localhost:3000/admin/applications` and verify:
   - Table renders with all columns
   - Clicking column headers sorts correctly (asc/desc/none)
   - Filter dropdowns open and apply filters
   - Active filters show as chips and are dismissible
   - Pagination works with page size changes
   - Column visibility toggle hides/shows columns
   - Row density changes table spacing
   - Export downloads CSV/JSON
   - Row expansion shows full details
   - Bulk select + action bar works
   - Search still works
   - Status tabs still work
   - Responsive on mobile (horizontal scroll with sticky first column)
