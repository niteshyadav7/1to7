# Task List

## Sprint 0: Project Setup
- [x] Initialize Next.js 14 project (Done)
- [x] Install shadcn/ui and dependencies (Done)
- [x] Create Supabase project (User Action required)
- [x] Create SQL Schema (tables, indexes, RLS, policies)
- [x] Setup [lib/supabase.ts](file:///d:/yash-android-projects/influencer/1to7/lib/supabase.ts)
- [x] Setup [middleware.ts](file:///d:/yash-android-projects/influencer/1to7/middleware.ts)
- [x] Create placeholder [page.tsx](file:///d:/yash-android-projects/influencer/1to7/app/page.tsx) files for all routes
- [x] Setup [.env.local](file:///d:/yash-android-projects/influencer/1to7/.env.local)
- [x] Deploy to Vercel and verify (Build verified locally)
- [ ] Debug: Perform Clean Reset of Supabase schema (Drop and Rebuild)

## Sprint 1: Auth System
- [x] Backend: POST `/api/auth/login` (Email/Mobile/ID + Password)
- [x] Backend: POST `/api/auth/send-email-otp`
- [x] Backend: POST `/api/auth/verify-email-otp`
- [x] Backend: POST `/api/auth/signup` (Now with Password Hashing)
- [x] Backend: POST `/api/auth/logout`
- [x] Middleware: Protect routes
- [x] Frontend: [AuthContext](file:///d:/yash-android-projects/influencer/1to7/components/providers/AuthProvider.tsx#15-21)
- [x] Frontend: Signup Page (`/signup`) (Premium SaaS UI Redesign)
- [x] Frontend: Login Page (`/login`) (Premium SaaS UI)
- [x] Frontend: Navbar updates based on auth state

## Sprint 2: Campaign Listing + Apply Flow
- [x] Backend: GET `/api/campaigns`
- [x] Backend: GET `/api/campaigns/[id]`
- [x] Backend: GET `/api/apply/form-config/[campaign_code]`
- [x] Backend: POST `/api/apply`
- [x] Frontend: Homepage (`/`)
- [x] Frontend: [CampaignCard](file:///d:/yash-android-projects/influencer/1to7/components/campaigns/CampaignCard.tsx#56-131) component
- [x] Frontend: [CampaignDetailModal](file:///d:/yash-android-projects/influencer/1to7/components/campaigns/CampaignDetailModal.tsx#40-189)
- [x] Frontend: `QuickApplyModal` (merged into ApplicationFormModal)
- [x] Frontend: [ApplicationFormModal](file:///d:/yash-android-projects/influencer/1to7/components/campaigns/ApplicationFormModal.tsx#28-243)

## Sprint 3: Influencer Dashboard + Profile
- [x] Backend: GET `/api/dashboard/stats`
- [x] Backend: GET `/api/dashboard/applications`
- [x] Backend: GET/PUT `/api/dashboard/profile`
- [x] Frontend: Dashboard Layout & Sidebar
- [x] Frontend: Dashboard Page (`/dashboard`)
- [x] Frontend: Applied Campaigns Page (`/dashboard/campaigns`)
- [x] Frontend: Approved Campaigns Page (`/dashboard/approved`)
- [x] Frontend: Profile Page (`/dashboard/profile`)

## Sprint 4: Admin Panel
- [ ] Backend: POST `/api/admin/auth`
- [ ] Backend: GET `/api/admin/campaigns`
- [ ] Backend: POST `/api/admin/campaigns`
- [ ] Backend: PUT `/api/admin/campaigns/[id]`
- [ ] Backend: GET `/api/admin/applications/[campaign_id]`
- [ ] Backend: PUT `/api/admin/applications/[id]`
- [ ] Backend: GET `/api/admin/dashboard/stats`
- [ ] Frontend: Admin Login Page (`/admin`)
- [ ] Frontend: Admin Sidebar
- [ ] Frontend: Admin Dashboard (`/admin/dashboard`)
- [ ] Frontend: Admin Campaigns List (`/admin/campaigns`)
- [ ] Frontend: Admin Create Campaign (`/admin/campaigns/create`)
- [ ] Frontend: Admin Edit Campaign (`/admin/campaigns/[id]`)
- [ ] Frontend: Admin Applications (`/admin/applications/[campaign_id]`)

## Sprint 5: Data Migration + Polish + Deploy
- [ ] Migration: `/scripts/migrate-campaigns.ts`
- [ ] Migration: `/scripts/migrate-users.ts`
- [ ] Migration: `/scripts/migrate-applications.ts`
- [ ] Migration: `/scripts/migrate-apply-form-config.ts`
- [ ] Migration: `/scripts/migrate-profile-logs.ts`
- [ ] Polish: Loading states, error handling, empty states, mobile responsive pass, SEO
- [ ] Deploy: Final Vercel deploy, admin account setup
