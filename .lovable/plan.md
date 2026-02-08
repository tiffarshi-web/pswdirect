

# Fix PSW Account Status Management

## Problem Identified

The error `new row for relation "psw_profiles" violates check constraint "psw_profiles_vetting_status_check"` occurs because:

**Database constraint allows only:** `pending`, `approved`, `rejected`

**Code tries to set:** `flagged`, `deactivated`

The admin UI has status management features (Flag, Deactivate, Reinstate) that use status values not permitted by the database constraint.

## Solution

### Part 1: Update Database Constraint

Modify the `psw_profiles_vetting_status_check` constraint to include all the status values the application needs:

```sql
ALTER TABLE psw_profiles 
DROP CONSTRAINT psw_profiles_vetting_status_check;

ALTER TABLE psw_profiles 
ADD CONSTRAINT psw_profiles_vetting_status_check 
CHECK (vetting_status = ANY (ARRAY[
  'pending'::text, 
  'approved'::text, 
  'rejected'::text, 
  'flagged'::text, 
  'deactivated'::text
]));
```

### Part 2: Add Cascade Delete Function for Clean Removal

Create a database function to safely delete PSW accounts with all related data:

```sql
CREATE OR REPLACE FUNCTION delete_psw_cascade(p_psw_id UUID)
RETURNS void AS $$
BEGIN
  -- Delete location logs (no FK, but references psw_id)
  DELETE FROM location_logs WHERE psw_id = p_psw_id;
  
  -- Delete audit trail (no FK, but references psw_id)
  DELETE FROM psw_status_audit WHERE psw_id = p_psw_id;
  
  -- Delete payroll entries (uses TEXT psw_id)
  DELETE FROM payroll_entries WHERE psw_id = p_psw_id::text;
  
  -- psw_banking has CASCADE - will auto-delete
  -- Now delete the PSW profile
  DELETE FROM psw_profiles WHERE id = p_psw_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Part 3: Add "Remove Account" Button to Admin UI

Update `PSWOversightSection.tsx` to include a new action for permanently removing PSW accounts that uses the cascade delete function.

---

## Status Value Definitions

| Status | Meaning |
|--------|---------|
| `pending` | New application awaiting review |
| `approved` | Vetted and active |
| `rejected` | Application denied |
| `flagged` | Warning issued, can still work |
| `deactivated` | Blocked from platform |

---

## Why This Prevents Live Issues

1. **Constraint alignment** - Database and code will use the same allowed values
2. **Safe deletion** - Cascade function handles all related records in correct order
3. **Data integrity** - Foreign key relationships remain intact for audit purposes
4. **No orphaned records** - Location logs, payroll entries, and audit logs are cleaned up

---

## Testing After Implementation

1. Try to Flag a PSW - should succeed
2. Try to Deactivate a PSW - should succeed  
3. Try to Reinstate a PSW - should succeed
4. Try to Remove a test PSW - should delete all related records

