# Complete Auth & Quick Apply Master Flow

This document details the exact step-by-step user journeys for the new Password-less architecture. This guarantees a high-conversion, highly secure platform.

## User Review Required

> [!CAUTION]
> Please review these 3 distinct step-by-step user journey flows. If they exactly match your vision, we are ready to build.

---

## Flow 1: Quick Apply (For Existing Users)
When a user who already exists in the database attempts a guest application:

**Step 1:** The user clicks "Apply" on a campaign page. 
**Step 2:** The application modal opens and asks for their **Mobile Number**.
**Step 3:** The user enters their 10-digit number. The system performs a live background check.
**Step 4:** The system finds the number in the database. Instead of just accepting it (which could allow impersonation), the modal dynamically expands and asks the user to uniquely verify their identity. It shows a hidden email hint: `"Confirm it's you. Enter your email (matching ni***@gmail.com):"`
**Step 5:** The user types their full email address to verify.
**Step 6:** The system validates the match. If correct, the application is successfully submitted and securely linked to their existing specific profile.

---

## Flow 2: Quick Apply (For Brand New Users)
When a completely new influencer attempts a guest application:

**Step 1:** The user clicks "Apply" on a campaign page.
**Step 2:** The application modal opens and asks for their **Mobile Number**.
**Step 3:** The user enters their 10-digit number. The system performs a live background check.
**Step 4:** The system sees this number is NOT in the database. 
**Step 5:** The modal dynamically expands into a "Profile Building" view, asking for the essential fields needed to create their account (e.g., **Full Name, Email**).
**Step 6:** The user fills in these details along with their application pitch and hits "Submit".
**Step 7:** The system silently generates an `HY` Influencer ID, saves their profile, links the application, and drops an authentication cookie into their browser—instantly logging them in!

---

## Flow 3: Unified Login / Signup (Google + Firebase OTP)
For users explicitly trying to log in or create a full account via the primary authentication page:

**Step 1:** The user navigates to `/login`. (The `/signup` page and all password options are completely deleted).
**Step 2:** The screen only provides one secure option: **"Continue with Google"**.
**Step 3:** The user clicks and grants permission via Google OAuth.
**Step 4:** They return to the platform. The system checks their database profile for the `is_mobile_verified` flag.

**Step 5a (Returning User):** They have logged in before, so their mobile is already verified. The system immediately redirects them to the Dashboard.

**Step 5b (First-Time User):** They are brand new, so we need to capture and verify their phone number for payments. The system redirects them to a "Verify Mobile" lock screen.
**Step 6b:** The user enters their mobile number. **Firebase Phone Auth** handles sending a secure SMS OTP.
**Step 7b:** The user enters the OTP. The system verifies it, saves their verified mobile number to their profile, and grants full access to the Dashboard. They never have to do this step again.

---

## Technical Action Items for Development
- [ ] Install and configure Supabase OAuth for Google.
- [ ] Install and configure Firebase Web SDK for Phone Auth.
- [ ] Refactor `/login` page and delete `/signup`.
- [ ] Create `/verify-mobile` page using Firebase `RecaptchaVerifier`.
- [ ] Update `ApplicationFormModal` to conditionally expand the Hidden Email Challenge or the Profile Building fields based on a live API validation call.
