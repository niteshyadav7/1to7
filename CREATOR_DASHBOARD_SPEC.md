# 🎨 Creator Dashboard Design Specification & AI Agent Prompt

This document contains the complete visual design system, layout specifications, color tokens, and a ready-to-use master prompt to feed into any AI coding agent to generate the Creator / Influencer Dashboard.

---

## 1. 🌈 Color System & Visual Tokens

| UI Element | HEX / Token | Tailwind Class | Description |
| :--- | :--- | :--- | :--- |
| **Sidebar Background** | `#2d3132` | `bg-[#2d3132]` | Dark charcoal slate for deep contrast |
| **Sidebar Active Link** | `#febd1c` | `bg-[#febd1c]` | Brand golden yellow / amber |
| **Sidebar Active Text** | `#000000` | `text-black font-semibold` | Crisp contrast over yellow pill |
| **Sidebar Inactive Text** | `#cbd5e1` | `text-slate-300` | Subtle readable slate |
| **Sidebar Hover State** | `rgba(255, 255, 255, 0.1)` | `hover:bg-white/10` | Translucent hover background |
| **App Canvas / Page BG** | `#f9f9f9` | `bg-[#f9f9f9]` | Ultra-clean neutral light background |
| **Cards & Surfaces** | `#ffffff` | `bg-white` | Pure white container cards |
| **Card Borders** | `#e2e8f0` / `#E0E0E0` | `border border-slate-200/80` | Clean subtle borders |
| **Primary Headings** | `#1a1c1c` | `text-[#1a1c1c]` | Charcoal black for headers and metrics |
| **Muted Text / Labels** | `#5e5e5e` / `#64748b`| `text-slate-500` / `text-secondary` | Descriptive subtitles and helper text |
| **Accent Action Button** | `#f50057` | `text-[#f50057]` / `hover:text-[#d8004c]` | Vibrant pink/rose for secondary actions |

### Status Badges & Pill Colors
- **Applied / Under Review**: `bg-blue-50 text-blue-700 border-blue-200`
- **Approved**: `bg-emerald-50 text-emerald-700 border-emerald-200`
- **Pending**: `bg-amber-50 text-amber-700 border-amber-200`
- **Completed**: `bg-purple-50 text-purple-700 border-purple-200`
- **Rejected**: `bg-red-50 text-red-700 border-red-200`

---

## 2. 📐 Layout Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│  SIDEBAR (#2d3132)  │  STICKY TOPBAR (#ffffff / glassmorphism)        │
│  ──────────────────  │  ────────────────────────────────────────────── │
│  • Brand Logo        │  [Toggle] Search / Breadcrumbs   [PWA] [Notifs] │
│  • Creator Avatar    ├─────────────────────────────────────────────────┤
│  • Navigation Links  │  PAGE CONTENT (#f9f9f9)                         │
│    - Overview        │  ┌───────────────────────────────────────────┐  │
│    - Applied         │  │ Profile Notice (if incomplete)            │  │
│    - Approved        │  ├───────────────────────────────────────────┤  │
│    - Profile         │  │ Overview Title + 4 Horizontal Stat Tiles  │  │
│    - Feedback        │  │ [Applied]  [Approved] [Pending] [Done]    │  │
│                      │  ├───────────────────────────────────────────┤  │
│  • [Sign Out] Dialog │  │ Live Campaigns Bar (Search + Quick Links) │  │
│                      │  │ ┌───────────────┐ ┌───────────────┐       │  │
│                      │  │ │ Campaign Card │ │ Campaign Card │       │  │
│                      │  │ └───────────────┘ └───────────────┘       │  │
│                      │  └───────────────────────────────────────────┘  │
└──────────────────────┴─────────────────────────────────────────────────┘
```

### Key Components

1. **Collapsible Dark Sidebar**:
   - Width: `w-64` expanded, `w-20` collapsed (desktop). Slide-in drawer on mobile.
   - Creator mini-profile badge showing avatar image/initial, creator display name, and unique influencer ID.
   - Navigation links with Lucide icons (`LayoutDashboard`, `Send`, `CheckCircle2`, `User`, `MessageSquareHeart`).
   - Active route indication using the amber pill (`#febd1c`).
   - Sign Out trigger opening an accessible confirmation modal.

2. **Sticky Header**:
   - Glassmorphic translucent blur (`bg-white/80 backdrop-blur-lg border-b border-slate-200`).
   - Mobile hamburger button and desktop sidebar collapse button (`PanelLeft`).
   - Action triggers: Golden gradient "Install App" button + Notification Bell with count badge.

3. **Inline Metrics Strip**:
   - 4 compact horizontal stat tiles:
     - **Total Applied**: Blue tint icon (`Send`)
     - **Approved**: Emerald tint icon (`CheckCircle2`)
     - **Pending**: Amber tint icon (`Clock`)
     - **Completed**: Purple tint icon (`TrendingUp`)

4. **Live Campaigns Grid**:
   - Search box with dynamic instant filtering (by Brand name, Category, or Platform).
   - Card layout with:
     - Brand logo / fallback avatar
     - Platform tag (`Instagram`, `YouTube`, `Amazon`)
     - Deliverable type & payout/gifting terms
     - "View Details" button (opens detail modal)
     - "Apply Now" button (opens submission form modal)

---

## 3. 🤖 Master Prompt for Your AI Coding Agent

> **Copy and paste the prompt below directly into your AI coding assistant or cursor/agent:**

```markdown
Build a modern, high-converting Creator / Influencer Dashboard web application using Next.js (App Router), Tailwind CSS, Lucide React icons, and Framer Motion.

NOTE: Authentication will be handled separately with email and password. Please create an AuthContext placeholder with mock authenticated state and a protected route wrapper.

### 🎨 Visual Theme & Color Palette
- Sidebar Canvas: Dark charcoal slate `#2d3132`, border `border-white/10`.
- Sidebar Inactive Item: Text `text-slate-300`, hover `hover:bg-white/10 hover:text-white`.
- Sidebar Active Pill: Golden amber `#febd1c`, text `text-black font-semibold shadow-sm`.
- App Background: Ultra-clean off-white `#f9f9f9`.
- Card Background: Pure white `#ffffff`, border `border-slate-200/80`, rounded-xl (`rounded-xl`), soft shadow (`shadow-2xs` / `shadow-xs`).
- Text Hierarchy: Deep charcoal `#1a1c1c` for headings and metric numbers; muted `#5e5e5e` / `#64748b` for labels and metadata.
- Status Badges:
  - Applied: `bg-blue-50 text-blue-700 border-blue-200`
  - Approved: `bg-emerald-50 text-emerald-700 border-emerald-200`
  - Pending: `bg-amber-50 text-amber-700 border-amber-200`
  - Completed: `bg-purple-50 text-purple-700 border-purple-200`
  - Rejected: `bg-red-50 text-red-700 border-red-200`

### 📐 Required Pages & Layout Structure
1. Sidebar (`/dashboard/layout.tsx`):
   - Collapsible desktop state (`w-64` to `w-20`) and mobile drawer.
   - Creator mini-profile avatar + Name + ID tag.
   - Navigation links:
     - Overview (`/dashboard`)
     - Applied Campaigns (`/dashboard/campaigns`)
     - Approved Collaborations (`/dashboard/approved`)
     - Profile (`/dashboard/profile`)
     - Feedback (`/dashboard/feedback`)
   - Bottom: "Sign Out" button with confirmation alert dialog.

2. Sticky Header:
   - Mobile hamburger toggle, desktop collapse toggle.
   - Right: "Install App" button with amber gradient (`from-amber-400 to-amber-500`) and Notification Bell with counter badge.

3. Overview Dashboard Page (`/dashboard/page.tsx`):
   - Top strip: Page title ("Dashboard Overview") + 4 compact stat cards:
     - Total Applied (Icon: Send, Blue)
     - Approved (Icon: CheckCircle2, Emerald)
     - Pending (Icon: Clock, Amber)
     - Completed (Icon: TrendingUp, Purple)
   - Search bar with instant filtering by brand, platform, or category.
   - Live Campaigns Grid:
     - Card displaying brand name, category badge, platform icon (Instagram / YouTube / Amazon), compensation badge (e.g. Paid, Barter), and action buttons.
   - Modals:
     - Campaign Detail Modal (deliverables, guidelines, payout).
     - Application Form Modal (social handle, follower count, message, submit button).

Ensure all components are responsive, accessible, cleanly modularized, and visually polished.
```
