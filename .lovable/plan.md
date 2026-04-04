

# Grant Admin Access & Admin Icon

## What This Does
1. **Insert your admin role** — adds a row to `user_roles` table for your user ID (`92cf2658-fbfa-4d5a-bdb3-27cda6a93771`) with role `admin`
2. **Verify navbar already shows admin icon** — the existing `Navbar.tsx` already has a Shield icon that appears for admin users (it checks `user_roles` table), so no UI changes needed

## Technical Steps

### Step 1: Database Migration
Run a single SQL migration:
```sql
INSERT INTO public.user_roles (user_id, role)
VALUES ('92cf2658-fbfa-4d5a-bdb3-27cda6a93771', 'admin')
ON CONFLICT (user_id, role) DO NOTHING;
```

### Step 2: Verify
- The Navbar component already calls `checkAdmin()` on login, which queries `user_roles` for the admin role
- The Shield icon linking to `/admin` already conditionally renders for admin users
- No code changes required

## Result
After the migration runs, log out and back in (or refresh) — the Shield admin icon will appear in your navbar, and you'll have full access to `/admin`.

