

# Add Dev Bypass Button to PSW Pending Status Screen

## Summary

Add a temporary "Bypass Approval (Dev Only)" button to the PSW Pending Status page (`/psw-pending`) that allows you to force your PSW profile status to "approved" so you can access the PSW dashboard and test Progressier notifications.

---

## What Will Be Built

A clearly-labeled development-only button on the pending approval screen that:
1. Updates your PSW profile's `vetting_status` to `approved` in the database
2. Refreshes the authentication context with the new status
3. Redirects you to the PSW dashboard (`/psw`)

The button will be visually distinct (amber/warning styling) with "Dev Only" labeling so it's obvious this is for testing purposes.

---

## Changes Required

### 1. Update PSWPendingStatus.tsx

Add a new section at the bottom of the page with:

- **Bypass Button**: Amber-styled button labeled "Bypass Approval (Dev Only)"
- **Visual Warning**: Clear indication this is a development feature
- **Functionality**: 
  - Fetches the current user's email from auth context
  - Looks up their PSW profile in the database
  - Updates `vetting_status` to `approved`
  - Updates auth context
  - Navigates to `/psw` dashboard

```
┌─────────────────────────────────────────┐
│     ⚠️ DEVELOPMENT ONLY                │
│  ┌─────────────────────────────────┐   │
│  │  Bypass Approval (Dev Only)     │   │
│  └─────────────────────────────────┘   │
│  Skip vetting for Progressier testing  │
└─────────────────────────────────────────┘
```

---

## Technical Details

### Database Update
The bypass will call `updateVettingStatusInDB()` from `pswDatabaseStore.ts` which executes:
```sql
UPDATE psw_profiles 
SET vetting_status = 'approved',
    approved_at = NOW(),
    vetting_updated_at = NOW()
WHERE id = [profile_id]
```

### Auth Context Update
After the database update, the auth context is refreshed using the existing `login()` function with the updated profile data.

### Imports Added
- `updateVettingStatusInDB` from `@/lib/pswDatabaseStore`
- `useState` for loading state
- `Bug` icon from lucide-react for dev indicator

---

## Removal Before Go-Live

Before launching to production, you will need to:
1. Remove or comment out the entire "Dev Bypass" section from `PSWPendingStatus.tsx`
2. The section is self-contained and clearly marked with comments for easy removal

---

## Files Modified

| File | Change |
|------|--------|
| `src/pages/PSWPendingStatus.tsx` | Add dev bypass button section with database update logic |

