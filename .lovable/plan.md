
# Fix: Admin Page Stuck in Loading Spinner

## Root Cause Analysis

The admin portal (`/admin`) gets stuck in an infinite loading spinner. After thorough investigation, I've identified **two compounding issues**:

### Issue 1: `useAsapPricingSettings` Hook - No Timeout/Fallback
The `useAsapPricingSettings` hook in `src/hooks/useAsapPricingSettings.ts`:
- Sets `isLoading = true` on mount
- Makes a Supabase query to `app_settings`
- **If the query throws or hangs, `isLoading` stays `true` forever**
- The hook does `if (error) throw error` inside a try/catch, which means the finally block does correctly set `isLoading = false`... BUT the AdminPortal itself doesn't gate on this isLoading — it renders immediately

The real deeper issue: **The AdminPortal has an auth check guard at line 78**:
```tsx
if (!isAuthenticated || user?.role !== "admin") {
  return <Navigate to="/" replace />;
}
```
This runs **before** `isLoading` from `AuthContext` is checked. When the page first loads, if Supabase session resolution is async, `user` may briefly be `null` → redirect fires → user is sent away from `/admin` before their session is confirmed.

### Issue 2: Missing `isLoading` Guard in AdminPortal
Looking at `AdminPortal.tsx` line 78, the admin portal **does not** check `isLoading` from `AuthContext`. The `App.tsx` `AdminRoute` component correctly handles `isLoading`, but if users navigate directly to `/admin` (which `App.tsx` says they can), the `AdminRoute` wrapper handles it. However, `AdminPortal.tsx` also has its own redirect guard that fires without checking `isLoading`.

### Issue 3: PSW Signup Side Effect (from previous fix)
The previous fix to `PSWSignup.tsx` removed the pre-auth profile check. But when a PSW signs up and a Supabase auth session is created via `signUp()`, the `AuthContext`'s `onAuthStateChange` listener fires a `SIGNED_IN` event. The `handleSupabaseUser` function then checks `user_roles` — and since the master admin has BOTH `admin` and `psw` roles, on a fresh login the auth context correctly hits the master admin bypass. But for other admin users invited via the system, the `user_roles` check uses `.maybeSingle()` which is correct.

### The Real Confirmed Bug
The `AdminPortal.tsx` redirect at line 78 runs synchronously during render — if `AuthContext.isLoading` is still `true` (session not yet verified), `isAuthenticated` is `false` and `user` is `null`, causing an immediate redirect to `/`. This is a **race condition** between auth initialization and component render.

Looking at `App.tsx`, the `AdminRoute` wrapper does handle `isLoading`:
```tsx
const AdminRoute = ({ children }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  if (isLoading) return <LoadingSpinner />;
  if (!isAuthenticated || user?.role !== "admin") return <Navigate to="/office-login" />;
  return <>{children}</>;
};
```

BUT `AdminPortal.tsx` itself has a **second redundant guard** at line 78 that does NOT check `isLoading`. When React re-renders the component after auth resolves, if something triggers a re-render before auth is done, this second guard kicks in and redirects the user away.

## Fix Plan

### File 1: `src/pages/AdminPortal.tsx`
**Change**: Add `isLoading` check to the auth guard at line 78. Instead of immediately redirecting when `!isAuthenticated`, show a loading spinner while auth is resolving.

```tsx
// Current (broken):
if (!isAuthenticated || user?.role !== "admin") {
  return <Navigate to="/" replace />;
}

// Fixed:
const { user, isAuthenticated, isLoading: authLoading, logout } = useAuth();

// While auth is resolving, show spinner (don't redirect yet)
if (authLoading) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}

if (!isAuthenticated || user?.role !== "admin") {
  return <Navigate to="/office-login" replace />;
}
```

### File 2: `src/hooks/useAsapPricingSettings.ts`
**Change**: Add a defensive fallback so if `isLoading` never resolves (network issue, RLS block), it defaults to `false` after a timeout.

```tsx
// Add a safety timeout to prevent perpetual loading
useEffect(() => {
  const timeout = setTimeout(() => {
    setIsLoading(false);
  }, 5000); // 5-second fallback
  
  return () => clearTimeout(timeout);
}, []);
```

### File 3: `src/App.tsx` - AdminRoute redirect
**Change**: The `AdminRoute` currently redirects to `/office-login` — ensure this is consistent with the `AdminPortal.tsx` redirect target (currently `/` which sends user to home, not login).

```tsx
// Fix redirect target to be consistent
if (!isAuthenticated || user?.role !== "admin") {
  return <Navigate to="/office-login" replace />;
}
```

## Technical Summary

```text
User navigates to /admin
         |
         v
   App.tsx AdminRoute
   - checks isLoading → shows spinner ✓
   - checks auth role → passes ✓
         |
         v
   AdminPortal.tsx renders
   - SECOND auth check fires without isLoading guard ← BUG
   - If auth not yet resolved → redirects to "/" ← WRONG
         |
         v
   Fix: Add isLoading guard + redirect to /office-login
```

## Files to Modify

| File | Change |
|------|--------|
| `src/pages/AdminPortal.tsx` | Add `isLoading` check before redirect guard; change redirect target from `/` to `/office-login` |
| `src/hooks/useAsapPricingSettings.ts` | Add 5-second safety timeout to prevent perpetual loading state |
| `src/App.tsx` | Confirm AdminRoute redirect is `/office-login` (already correct, verify) |

## Expected Outcome

- Admin page loads reliably without getting stuck on the spinner
- If auth session is still resolving, spinner shows briefly then page loads
- If truly unauthenticated, user is sent to `/office-login` (not home page)
- ASAP pricing settings load with a safe fallback if query is slow
