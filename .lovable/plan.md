

# Update Default Domain to psadirect.ca

## Summary
Update the default domain configuration so all QR codes and URLs throughout the app use `https://psadirect.ca` instead of `https://pswdirect.lovable.app`.

---

## Change Required

**File:** `src/lib/domainConfig.ts`

Update the `DEFAULT_DOMAIN` constant:

```typescript
// Before
const DEFAULT_DOMAIN: DomainConfig = {
  baseUrl: "https://pswdirect.lovable.app",
  displayName: "pswdirect.lovable.app",
};

// After
const DEFAULT_DOMAIN: DomainConfig = {
  baseUrl: "https://psadirect.ca",
  displayName: "psadirect.ca",
};
```

---

## URLs That Will Be Updated

Once this change is made, all dynamically generated URLs will use the new domain:

| Purpose | New URL |
|---------|---------|
| PSA Login | `https://psadirect.ca/psw-login` |
| Client Portal | `https://psadirect.ca/client-portal` |
| Client Login | `https://psadirect.ca/client-login` |
| PWA Install (General) | `https://psadirect.ca/install` |
| PWA Install (Client) | `https://psadirect.ca/install?type=client` |
| Order Deep Links | `https://psadirect.ca/client-portal?order={id}` |

---

## Affected Features

All of these will automatically use the new domain:
- PSA approval email QR codes
- Client booking confirmation email QR codes
- Email footer branding
- "Install App" links in headers
- Admin Domain Settings preview panel

---

## Scope

- **1 file** modified
- **2 lines** changed
- No database changes required
- No UI changes required

