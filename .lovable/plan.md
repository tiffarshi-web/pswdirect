

# Remove Data Reset Functions from Gear Box

## Summary
Remove the "Data Reset (GCC Pitch Mode)" section from the Admin Gear Box panel. You will manage data manually through the backend instead.

---

## Changes Required

### File: `src/components/admin/GearBoxSection.tsx`

**Remove the following:**

1. **Imports** (line 5): Remove `Trash2`, `AlertTriangle`, `Loader2` icons (keep other icons)
2. **Imports** (lines 30-40): Remove the entire `AlertDialog` import block 
3. **State** (line 69): Remove `resetting` state variable
4. **Functions** (lines 71-171): Remove all four data reset handler functions:
   - `handleResetBookings`
   - `handleResetPSWs`
   - `handleResetPayroll`
   - `handleResetClients`
5. **UI Card** (lines 251-401): Remove the entire "Data Reset (GCC Pitch Mode)" card component

**Update file comment** (line 1): Change from:
```typescript
// Admin Gear Box Section - QR Code Management, Infrastructure Status, Data Reset
```
To:
```typescript
// Admin Gear Box Section - QR Code Management & Infrastructure Status
```

---

## Result

The Gear Box section will contain only:
- Infrastructure Status Card (showing email, payments, PWA, domain status)
- QR Code Management (client and PSW verification QR codes)

No data deletion functionality will be present in the admin panel.

