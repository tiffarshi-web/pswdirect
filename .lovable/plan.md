

## Add Clickable Full Terms of Service Agreement

### Overview
Add a clickable link below the existing cancellation policy checkbox that opens a dialog displaying the complete End-User Terms of Service document. The link will be styled in a darker color to stand out, and clicking it will reveal the full legal terms in a scrollable dialog.

### Files to Create

**1. `src/components/client/TermsOfServiceDialog.tsx`** (New Component)
A reusable dialog component that displays the full Terms of Service:
- Uses existing Dialog UI components from the design system
- Contains the complete parsed legal text from the uploaded document
- Scrollable content area for the lengthy terms
- Dark styled trigger link that says "View Full Terms of Service"
- Professional header with company name
- Close button for easy dismissal

### Files to Modify

**2. `src/components/client/GuestBookingFlow.tsx`**
- Import the new TermsOfServiceDialog component
- Add the clickable terms link below the existing cancellation policy checkbox (around line 1490)
- The link will be styled with `text-foreground` for darker appearance to contrast with the muted policy text above

**3. `src/components/client/ClientBookingFlow.tsx`**
- Same changes as GuestBookingFlow to maintain consistency for returning clients
- Add terms link below line 1285

### UI Design

The policy agreement section will look like this:

```text
[x] I agree to the cancellation policy. Cancellations within 4 hours 
    and ASAP bookings are non-refundable.

    View Full Terms of Service  <-- New clickable link (darker color)
```

### Terms of Service Content Structure

The dialog will include all 15 sections from the uploaded document:
1. Role and Nature of PSW Direct Inc.
2. No Healthcare, Medical, or Professional Services
3. User Eligibility and Account Responsibility
4. User Responsibilities and Required Disclosures
5. Ontario-Specific Regulatory Disclosures
6. Relationship Between User and Personal Support Worker
7. Fees, Payments, and Platform Charges
8. User Conduct
9. Assumption of Risk
10. Disclaimer of Warranties
11. Limitation of Liability
12. Indemnification
13. Governing Law and Jurisdiction
14. Electronic Records and Acceptance
15. Entire Agreement
16. Acknowledgement

### Technical Details

- Uses existing `Dialog`, `DialogContent`, `DialogHeader`, `DialogTitle` components from `@/components/ui/dialog`
- Uses `ScrollArea` component for scrollable content within the dialog
- No database changes required
- No new dependencies needed
- The terms text is stored as a constant within the component for easy maintenance

