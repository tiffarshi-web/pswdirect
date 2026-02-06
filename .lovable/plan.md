
# Plan: Add Rejected & Removed PSWs Archive Section

## Overview

Add a new subsection under the "Pending Review" tab in the Admin Portal to display:
1. **Rejected Applicants** - PSWs who were pending but rejected during the review process
2. **Removed/Deactivated PSWs** - PSWs who were previously active but have been deactivated

This archive provides a permanent record of all rejected and removed caregivers for administrative oversight and compliance.

## Current State Analysis

| Status | Current Location | UI Visibility |
|--------|------------------|---------------|
| `pending` | PendingPSWSection | Visible in "Pending Review" tab |
| `approved` | PSWOversightSection | Visible in "Active PSWs" tab |
| `flagged` | PSWOversightSection | Visible in "Active PSWs" tab (with warning badge) |
| `deactivated` | PSWOversightSection | Visible in "Active PSWs" tab (grayed out) |
| `rejected` | Database only | **NOT VISIBLE** (disappears after rejection) |

## Proposed Changes

### 1. Update PendingPSWSection.tsx

Transform the component to include two views:
- **Pending Applications** (existing) - Shows PSWs awaiting review
- **Archived Records** (new) - Shows rejected and deactivated PSWs

The layout will use tabs within the section:

```text
+--------------------------------------------------+
| Pending Review                                    |
+--------------------------------------------------+
| [ Awaiting Review (3) ] | [ Archived (7) ]       |
+--------------------------------------------------+
|                                                   |
|  (Tab content based on selection)                |
|                                                   |
+--------------------------------------------------+
```

### 2. Archived Records Table Structure

For the "Archived" tab, display a table with:

| Column | Description |
|--------|-------------|
| Photo | Profile photo or initials avatar |
| Name | Full name (First + Last) |
| Status | Badge: "Rejected" (red) or "Deactivated" (gray) |
| Email | Contact email |
| Phone | Click-to-call |
| Date | Rejection/Deactivation date |
| Reason | Vetting notes explaining why |
| Actions | View Details, Reinstate (for deactivated only) |

### 3. Status Badges

- **Rejected**: Red badge with X icon - "Application Rejected"
- **Deactivated**: Gray badge with Ban icon - "Account Removed"

### 4. Audit Trail Enhancement

When rejecting an applicant, log the action to `psw_status_audit` table (currently missing for rejections):

```typescript
await supabase.from("psw_status_audit").insert({
  psw_id: selectedPSW.id,
  psw_name: `${selectedPSW.firstName} ${selectedPSW.lastName}`,
  psw_email: selectedPSW.email,
  action: "rejected",
  reason: "Application rejected",
  performed_by: "admin",
});
```

### 5. Reinstatement Flow

For deactivated PSWs only:
- Add "Reinstate" button that moves them back to `approved` status
- Rejected applicants can be moved back to `pending` for re-review

---

## Technical Implementation

### File Changes

**1. src/components/admin/PendingPSWSection.tsx**
- Add sub-tabs for "Awaiting Review" and "Archived"
- Fetch rejected and deactivated profiles from Supabase
- Add new `ArchivedPSWList` component within the file
- Update the `confirmReject` function to log to audit trail
- Add reinstatement capability for deactivated PSWs

**2. src/lib/pswProfileStore.ts**
- No changes needed (status types already support "rejected" and "deactivated")

**3. Database**
- No schema changes needed (all statuses already exist in psw_profiles)

### Data Flow

```text
Pending Review Tab
    |
    +-- Awaiting Review (sub-tab)
    |       |
    |       +-- Fetches: vetting_status = 'pending'
    |
    +-- Archived (sub-tab)
            |
            +-- Fetches: vetting_status IN ('rejected', 'deactivated')
            |
            +-- Actions:
                  - View Details
                  - Reinstate to Pending (rejected)
                  - Reinstate to Approved (deactivated)
```

### UI Component Structure

```text
PendingPSWSection
  |
  +-- <Tabs>
        |
        +-- TabsTrigger: "Awaiting Review" (count badge)
        +-- TabsTrigger: "Archived" (count badge)
        |
        +-- TabsContent: "awaiting-review"
        |     (existing pending applications list)
        |
        +-- TabsContent: "archived"
              |
              +-- Stats cards: Rejected count, Deactivated count
              +-- Search bar
              +-- Table with archived PSWs
              +-- Reinstate dialog
```

### Key Functions to Add

```typescript
// Fetch archived profiles (rejected + deactivated)
const loadArchivedProfiles = async () => {
  const { data, error } = await supabase
    .from("psw_profiles")
    .select("*")
    .in("vetting_status", ["rejected", "deactivated"])
    .order("vetting_updated_at", { ascending: false });
  // Map to PSWProfile interface
};

// Reinstate a rejected applicant back to pending
const reinstateToReview = async (psw: PSWProfile) => {
  await supabase.from("psw_profiles").update({
    vetting_status: "pending",
    vetting_notes: "Reinstated for re-review",
    vetting_updated_at: new Date().toISOString(),
  }).eq("id", psw.id);
  
  await supabase.from("psw_status_audit").insert({
    psw_id: psw.id,
    psw_name: `${psw.firstName} ${psw.lastName}`,
    psw_email: psw.email,
    action: "reinstated_to_pending",
    performed_by: "admin",
  });
};
```

---

## Summary of Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `PendingPSWSection.tsx` | Major Update | Add sub-tabs, archived list, reinstatement |
| `PSWStatusDialog.tsx` | Minor Update | Add "rejected" action type for audit logging |

This implementation keeps all PSW management within the existing tab structure while providing full visibility into rejected applications and removed accounts.
