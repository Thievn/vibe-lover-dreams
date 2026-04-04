

# Enhance LustForge AI — Auth, Tokens, Stripe, and Polish

## Summary
Add password confirmation to signup, Google sign-in, user profiles with token tracking, Stripe subscription/top-up payments, and token deduction in chat. Fix auth to keep users logged in properly.

## Steps

### 1. Database: Create profiles table with token tracking
Migration to create `profiles` table:
- `id` (uuid, FK to auth.users, cascade delete)
- `display_name` (text, nullable)
- `tokens_balance` (integer, default 100 — free tier daily allowance concept replaced by token balance)
- `tier` (text, default 'free')
- `stripe_customer_id` (text, nullable)
- `lovense_uid` (text, nullable)
- `tokens_reset_at` (timestamptz, default now)
- `created_at` (timestamptz, default now)

Add a trigger to auto-create a profile on signup. Add RLS policies so users can read/update only their own profile.

### 2. Enable Stripe integration
Use the Stripe enablement tool to collect the user's Stripe secret key. This unlocks Stripe-specific tools for creating products, prices, and checkout sessions.

### 3. Auth improvements (Auth.tsx)
- Add password confirmation field on signup
- Add Google sign-in button using `lovable.auth.signInWithOAuth("google")`
- Add "Forgot password" link with password reset flow
- Add `/reset-password` route in App.tsx
- Use `onAuthStateChange` listener properly (already done in Navbar, replicate in Auth page for redirect)

### 4. Token balance display (Navbar)
- Fetch user profile on auth state change
- Show token balance badge next to settings icon when logged in (e.g., "🔥 9,450 tokens")

### 5. Token deduction in chat (Chat.tsx)
- Before sending a message, check `profiles.tokens_balance >= 15` (average cost)
- After successful AI response, deduct 15 tokens via Supabase update
- Show warning when tokens are low (<100)
- Block chat when tokens hit 0, show upgrade prompt

### 6. Stripe checkout edge function
- Create `create-checkout` edge function that:
  - Creates/retrieves Stripe customer
  - Creates a checkout session for subscription ($14.99/mo) or token top-up ($9.99 one-time for 5,000 tokens)
  - Returns checkout URL
- Create `stripe-webhook` edge function that:
  - Handles `checkout.session.completed` — update tier and/or add tokens
  - Handles `customer.subscription.deleted` — revert to free tier
  - Handles monthly renewal — reset tokens to 10,000

### 7. Pricing page upgrade
- Update `PricingTeaser.tsx` with working "Subscribe" and "Buy Tokens" buttons that call the checkout edge function
- Add a dedicated `/pricing` route

### 8. Monthly token reset
- Database function + pg_cron job to reset paid users' tokens to 10,000 on the 1st of each month

## Technical Notes
- Google OAuth uses Lovable Cloud's managed credentials — no setup needed from user
- Stripe secret key will be collected via the enable_stripe tool
- Token costs: regular message = 15 tokens, free tier gets 1,500 tokens (replenished concept)
- All new tables get RLS policies
- The `lovense_uid` column stores toy connection info securely per-user

