
## Remove QR Code from Main Homepage

### Overview
Remove the QR code from the main landing page. The app install QR code will continue to be included in client booking confirmation emails as the primary distribution method.

### Change Required

**File: `src/pages/HomePage.tsx`**

Remove the QR code section (lines 160-166):
```tsx
// DELETE THIS ENTIRE BLOCK:
<Link to="/install?type=client" className="flex flex-col items-center gap-2 mb-4 group cursor-pointer">
  <img alt="Scan to install PSA Direct app" className="w-56 h-56 object-contain" src="/lovable-uploads/a6e05da5-a71c-4e12-8d31-63ac338a2a17.png" />
  <p className="text-xs text-muted-foreground group-hover:text-primary transition-colors">
    Tap or scan to install • <span className="font-medium">{getDomainConfig().displayName}</span>
  </p>
</Link>
```

### Result
- The homepage will show the heading, subheading, and booking flow without the QR code
- Client emails will continue to include the QR code for app installation
- Cleaner, more focused booking experience on the main page

### Cleanup Note
The `getDomainConfig` import can also be removed since it will no longer be used on this page.
