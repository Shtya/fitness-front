# Reflect — Landing Page Summary & System Modules

This file lists the sections to add to the landing page for the Reflect system, what each section will contain, and a complete module breakdown of the system (backend + frontend) with responsibilities and main components.

---

## Landing Page Sections (to add)

1. Hero
   - Purpose: Immediate value proposition and primary CTA.
   - Content: Brand badge, headline, short subheading, 2 primary CTAs (Start Free, See How It Works), hero visual showing Today's Reminders widget, trust badges (users, uptime).
   - Behavior: Smooth scroll to sections, responsive layout, accessible buttons.

2. Key Features
   - Purpose: Highlight top capabilities for both coaches and individuals.
   - Content: Cards with icons and short descriptions (Client Management, Smart Scheduling, In-app Messaging, Plans, Progress Tracking, Video Sessions, Reminders, Analytics).
   - Behavior: Hover states, 3-column grid on desktop, stacked on mobile.

3. How It Works
   - Purpose: Short 3-step onboarding flow to reduce friction.
   - Content: Steps (Create Goals, Set Schedule, Track & Improve) with short descriptions and small illustrations.
   - Behavior: CTA to start assessment.

4. Assessment (Onboarding Form)
   - Purpose: Collect user data to produce a personalized plan (front-and-center conversion point).
   - Content: Sticky card form with fields: Full name, Email, Age, Gender, Fitness level (radio), Main goals (checkboxes), Phone (optional), Consent checkbox. Short benefits on left column (Smart Fitness Analysis, Health Goals, Customized Schedule). Trust line: "Takes only 5 minutes. No credit card required." 
   - Behavior: Client-side validation, show error/success states, call `POST /forms/:id/submit` backend endpoint, analytics event on submission.

5. Pricing
   - Purpose: Show plan tiers and value props.
   - Content: Cards for Free, Basic, Professional, Enterprise (features list, CTA). Indicate most popular plan.
   - Behavior: Link to signup or contact sales for Enterprise.

6. Testimonials / Social Proof
   - Purpose: Build trust and conversion.
   - Content: 3–5 user testimonials with photo/initials, role, quote, star rating, overall metrics (5k+ users, 50+ countries).

7. Logos / Trust Bar
   - Purpose: Quickly convey adoption and reliability.
   - Content: Small icons/text showing uptime, enterprise security, global presence, user count.

8. FAQ
   - Purpose: Reduce objections.
   - Content: Frequently asked questions about prayer-time reminders, privacy, device compatibility, refunds, cancellations.
   - Behavior: Accordion style with single open item default.

9. Contact / Support
   - Purpose: Capture leads and provide support channel.
   - Content: Support email, live chat hours, location, short contact form (name, email, message).
   - Behavior: Submit to backend endpoint or mail/CRM integration.

10. CTA / Final Pitch
    - Purpose: Final conversion push.
    - Content: Headline, short paragraph, primary CTA (Start Free Today) and secondary CTA (View Pricing).

11. Footer
    - Purpose: Navigation, legal, social links.
    - Content: Product links, company links, legal, social icons, copyright.

---

## Landing Page Content Notes
- Use consistent design system components (`Button`, `Card`, `Badge`, `Input`, `Textarea`).
- All CTAs should use `href="/auth"` or call signup flow; assessment form posts to backend form API.
- Accessibility: labels for inputs, focus-visible styles, semantic HTML.
- Performance: load images lazily, avoid heavy hero animations.

---

## Full System Module List & Responsibilities

> The list below maps system modules observed in the repository and expanded responsibilities for each module.

### Backend Modules (`backend/src`)

1. Auth
   - Files: `auth.controller.ts`, `auth.service.ts`, `jwt.strategy.ts`
   - Responsibilities: Sign-up, login, JWT issuance/validation, password reset, OAuth if enabled, role-based guard integration.

2. Users
   - Files: `user.entity.ts`, `user.service.ts`, `user.controller.ts`
   - Responsibilities: User profile, settings, preferences, user management for admin, profile pictures/uploads.

3. Clients
   - Files: `client.entity.ts`, `client.service.ts`, `client.controller.ts`
   - Responsibilities: Client records for professionals, assignments, client history, notes, measurements.

4. Plans (Workout & Meal)
   - Files: `plan.entity.ts`, `plan.service.ts`, `plan.controller.ts`
   - Responsibilities: Create/edit plans, templates, assign plans to clients, versioning, exporting.

5. Reminders
   - Files: `reminder.entity.ts`, `reminder.service.ts`, `reminder.queue.ts`, `reminder.controller.ts`
   - Responsibilities: Schedule reminders, compute prayer times (via API or library), enqueue notifications, handle retries, snooze logic.

6. Forms
   - Files: `form.entity.ts`, `form.service.ts`, `form.controller.ts`
   - Responsibilities: Dynamic form builder (create forms, fields), public form retrieval, submission handling, storage of responses, submission assignment to users.

7. Billing
   - Files: `billing.service.ts`, `billing.controller.ts`
   - Responsibilities: Integrate with Stripe, manage subscriptions, invoices, refunds, webhooks handling.

8. Analytics
   - Files: `analytics.service.ts`, `analytics.controller.ts`
   - Responsibilities: Aggregate user and client metrics, build dashboards, exportable reports, scheduled aggregation.

9. Messaging
   - Files: Messaging modules & controllers
   - Responsibilities: In-app chat, message persistence, push notification triggers, attachments, real-time via WebSocket.

10. Nutrition
    - Files: nutrition module files
    - Responsibilities: Meal plans, food items, macro calculations, nutrition-specific reports.

11. Exercises / Media
    - Files: exercise entity/service/controller
    - Responsibilities: Exercise library, video hosting references, demonstration assets, categorization.

12. Billing & Payments (Stripe)
    - Files: billing resources, webhook handlers
    - Responsibilities: Payment flows, plan management, subscription lifecycle, receipts.

13. Common & Utilities
    - Files: `base.service.ts`, `crud.service.ts`, `guards`, `decorators`, `filters`, `interceptors`
    - Responsibilities: Shared utilities (pagination, error handling, permissions, guards, validators).

14. Config & Infrastructure
    - Files: database config, cache config, third-party keys
    - Responsibilities: Environment configuration, DB connections, Redis, queues.

15. Scheduler & Queue
    - Files: cron tasks, queue processors (Bull/Redis)
    - Responsibilities: Long-running jobs, notification processing, report generation, retries.

16. Tests & Seeds
    - Files: `test/`, `seeds/`, `migrations/`
    - Responsibilities: Unit/integration tests, sample data seeding, DB migrations.


### Frontend Modules (`frontend/src`)

1. Landing Page / Marketing (`app/[locale]/page.jsx`)
   - Responsibilities: Hero, features, pricing, assessment, testimonials, FAQ, contact, CTA, footer; localized content.

2. Authentication (`auth/`)
   - Files: login, signup, reset password flows
   - Responsibilities: UI for sign-in/up, magic links, social auth buttons.

3. Dashboard / App Shell (`dashboard/`)
   - Responsibilities: User home, quick actions, overview widgets, current reminders, streaks.

4. Client Management UI (`clients/`)
   - Responsibilities: Client list, client profiles, measurements, notes, plan assignment UI.

5. Plan Builder (`plans/`)
   - Responsibilities: Create/edit workout & nutrition plans, templates, preview, assign to clients.

6. Reminders UI (`reminder/`)
   - Responsibilities: Create reminders, sync with prayer times, view scheduled reminders, snooze/cancel actions.

7. Forms & Assessments (`form/`)
   - Responsibilities: Render dynamic forms from backend, submit responses, show public forms, admin form builder UI.

8. Messaging (`chat/`)
   - Responsibilities: In-app messaging UI, threads, attachments, notifications.

9. Analytics / Reports (`stats/`, `weekly-report/`)
   - Responsibilities: Charts, timeline views, export options, insights.

10. Settings & Profile (`settings/`, `profile/`)
    - Responsibilities: User preferences, notification channels, account settings, billing management.

11. Notifications / Push Integration (`notification/`)
    - Responsibilities: Manage push subscriptions, test notifications, settings control.

12. UI Component Library (`components/ui`) 
    - Files: Buttons, Inputs, Cards, Badge, Accordion, Dialog, etc.
    - Responsibilities: Design system primitives used across pages for consistent UI/UX.

13. Utilities & Services (`lib/`, `services/`) 
    - Responsibilities: API layer, auth token handling, helpers, date utilities, prayer-time calculations (if client-side), localization.

14. Hooks & Context (`hooks/`, `context/`)
    - Responsibilities: Reusable React hooks, app-level providers (auth, theme, i18n).

15. i18n & Localization (`i18n/`)
    - Responsibilities: Locale files, translations, language switching.

16. Public Assets (`public/`)
    - Responsibilities: Static images, icons, manifest, robots, seo assets.

---

## How modules map to landing page content
- The **Hero** and **Features** sections are driven by the `components/ui` and `app/[locale]/page.jsx` (marketing copy). Icons and feature summaries come from `frontend/src/components/ui` and `features` arrays.
- The **Assessment** section uses the `form` frontend module to render fields and `forms` backend module to store submissions.
- **Reminders** examples on the landing page map to the `reminder` frontend module (UI) and `reminders` backend module (scheduling & delivery).
- **Pricing** info ties to `billing` backend module and `billing` frontend UI for subscription signup.
- **Testimonials** and **Trust** elements are static content (marketing) but can be connected to `analytics` backend if showing counts/dynamic metrics.

---

## Recommended landing page implementation checklist
1. Implement each section using design system components for consistency.
2. Wire `Assessment` form to backend `POST /forms/:id/submit` and handle errors, show confirmations.
3. Add GA / event tracking for CTA clicks and form submissions.
4. Use responsive grid utilities and ensure accessibility (labels, focus styles).
5. Lazy-load non-critical assets (images, videos) to improve LCP.

---

## File to create
- Save this file as: `frontend/summary.md` (already created here)

---

If you want, I can now: add this content to `frontend/README_SUMMARY.md` instead, or insert summarized bullets into `app/[locale]/page.jsx` as comments near each landing section to guide developers. Which would you prefer next?