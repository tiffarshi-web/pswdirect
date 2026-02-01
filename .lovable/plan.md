
# Plan: Add Rush/ASAP Booking Pricing Controls

## Summary
Add an admin toggle and customizable rate for Rush/ASAP booking pricing in the Pricing & Tasks section. Currently, ASAP pricing is hardcoded at 25% - this change will make it configurable and allow admins to enable/disable it entirely.

---

## Current State

**How it works now:**
- When a client checks "I need this ASAP" during booking, a 25% fee is automatically added
- This is hardcoded in `businessConfig.ts` with no way to change it
- Admins cannot turn off ASAP pricing or adjust the percentage

**Files involved:**
- `src/lib/businessConfig.ts` - Hardcoded `asapMultiplier = 1.25`
- `src/components/admin/PricingSection.tsx` - Missing ASAP controls
- `src/components/client/ClientBookingFlow.tsx` - Shows ASAP checkbox
- `src/components/client/GuestBookingFlow.tsx` - Shows ASAP checkbox

---

## What Will Be Added

### 1. New Admin Controls in Pricing Section
A new "Rush/ASAP Pricing" card will appear in the Pricing settings with:
- **Master toggle** - Enable/Disable ASAP pricing entirely
- **Percentage input** - Set the ASAP fee (e.g., 25%, 30%, 50%)
- **Live preview** - Shows what a $35 service would cost with ASAP

### 2. Updated Pricing Configuration
The `PricingConfig` interface will add:
- `asapPricingEnabled: boolean` - Master toggle
- `asapMultiplier: number` - Customizable multiplier (e.g., 1.25 = 25%)

### 3. Updated Pricing Calculation
The `calculateMultiServicePrice` function will:
- Check if ASAP pricing is enabled before applying the fee
- Use the admin-configured multiplier instead of hardcoded 1.25

### 4. Booking Flow Updates
When ASAP pricing is disabled:
- The ASAP checkbox will still appear (for dispatching priority)
- But no surge fee will be applied at checkout

---

## Implementation Steps

### Step 1: Update PricingConfig Interface
Modify `src/lib/businessConfig.ts`:
- Add `asapPricingEnabled` and `asapMultiplier` to the config
- Update `getPricing()` to include these from localStorage
- Update `calculateMultiServicePrice()` to respect the toggle

### Step 2: Add ASAP Controls to Admin UI
Modify `src/components/admin/PricingSection.tsx`:
- Add a new Card for "Rush/ASAP Pricing"
- Include enable/disable Switch
- Include percentage Input field
- Add callback props to parent for saving

### Step 3: Wire Up the Gearbox Panel
Modify `src/components/admin/GearBoxSection.tsx` or the parent settings page:
- Pass the new ASAP handlers to PricingSection
- Save to localStorage alongside other pricing settings

### Step 4: Update Booking Flow Display (Optional Enhancement)
When ASAP is disabled, optionally hide or gray out the ASAP checkbox in:
- `ClientBookingFlow.tsx`
- `GuestBookingFlow.tsx`

---

## UI Preview

**New Admin Card (in Pricing Settings):**
```text
┌─────────────────────────────────────────┐
│ ⚡ Rush/ASAP Pricing                    │
├─────────────────────────────────────────┤
│ [Toggle ON/OFF]  ENABLED                │
│                                         │
│ ASAP Fee:  [25] %                       │
│                                         │
│ Preview: $35 base → $43.75 with ASAP    │
└─────────────────────────────────────────┘
```

---

## Technical Details

**Files to Modify:**
1. `src/lib/businessConfig.ts`
   - Add `asapPricingEnabled` and `asapMultiplier` to interface
   - Update `buildDefaultPricing()` with defaults
   - Update `getPricing()` to merge from localStorage
   - Update `calculateMultiServicePrice()` to check toggle

2. `src/components/admin/PricingSection.tsx`
   - Add new Card component for ASAP settings
   - Add props: `onAsapToggle`, `onAsapMultiplierChange`

3. Parent component (likely `GearBoxSection.tsx` or `AdminPortal.tsx`)
   - Pass ASAP handlers to PricingSection
   - Include in `savePricing()` call

**Default Values:**
- `asapPricingEnabled: true` (maintain current behavior)
- `asapMultiplier: 1.25` (25% fee, same as current)

---

## Testing Flow
After implementation:
1. Navigate to Admin Portal → Settings → Pricing & Tasks
2. Look for the new "Rush/ASAP Pricing" card
3. Toggle it OFF and book a service with ASAP checked - verify no fee is added
4. Toggle it ON and set to 30% - verify a 30% fee is applied
5. Create a test booking as a client to confirm the flow works end-to-end
