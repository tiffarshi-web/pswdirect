import { Helmet } from "react-helmet-async";

const UPDATED = "September 9, 2026";

const SECTIONS: Array<{ heading: string; body: string[] }> = [
  {
    heading: "Who we are",
    body: [
      "PSW Direct Inc. operates the PSW Direct website and the PSW Direct Worker mobile application for personal support workers. Our office is at 239 Grove St E, Barrie, Ontario L4M 2R1, and you can reach us at (249) 288-4787 or admin@psadirect.ca.",
      "This policy explains what information we collect, why we collect it, and the choices you have. It covers both the website and the PSW Direct Worker app for Android and iPhone.",
    ],
  },
  {
    heading: "Information we collect from care professionals",
    body: [
      "Account details: your name, email address, phone number, and the sign-in credentials you create.",
      "Professional credentials: certificates, police and vulnerable sector checks, identification and other documents you upload so we can verify you.",
      "Assignment information: the visits you are offered, accept, attend and complete, including the times you check in and out.",
      "Location: when you check in or check out of a visit, we record a single location reading at that moment to confirm you were at the address. We do not track your location in the background or between visits.",
      "Care reports: the notes you complete after a visit, and any doctor's note photograph you choose to attach.",
      "Earnings and payout information: hours approved, pay rates, payments issued, and the banking details you provide for payouts.",
      "Device information: your device model, app version, and the notification token used to send you shift alerts.",
      "Diagnostics: error and crash information used to fix problems in the app.",
    ],
  },
  {
    heading: "Information about clients that you see",
    body: [
      "Before you accept a visit, you see the service street address, the service type, the time and the pay. Client names and entry details are hidden.",
      "After you accept a visit, you see the information needed to provide care, including the client's name, entry instructions and relevant care conditions. This information belongs to the client. Use it only for that visit, and do not copy, share or keep it.",
    ],
  },
  {
    heading: "Why we use it",
    body: [
      "To verify that you are approved to provide care, to offer you eligible work, to confirm attendance, to produce care records, to pay you, to send you shift notifications and service messages, to keep the platform secure, and to meet our legal and insurance obligations.",
      "We do not sell your personal information, and we do not use it for advertising.",
    ],
  },
  {
    heading: "Who we share it with",
    body: [
      "Clients and their substitute decision makers see the first name and professional details of the caregiver attending their visit.",
      "Our service providers process information on our behalf: our cloud database and file storage provider, our email delivery provider, our payment processor for client payments, our push notification provider, and mapping services used to locate service addresses.",
      "We disclose information when required by law, or to protect the safety of a client, a caregiver or the public.",
    ],
  },
  {
    heading: "Location, notifications and permissions",
    body: [
      "The app asks for location only when you use check-in or check-out, and it explains why before the phone's permission prompt appears. You can decline; you will then need to contact the office to record your attendance.",
      "The app asks for notification permission so you can be alerted to new available shifts and upcoming visits. Notification text on your lock screen never contains a client's name, address or health information.",
      "The app may ask to use your camera or files only when you choose to upload a document or a doctor's note.",
      "You can withdraw any of these permissions at any time in your phone settings.",
    ],
  },
  {
    heading: "Information stored on your phone",
    body: [
      "Your sign-in session and any care report you have not yet submitted are stored in the app's private storage on your device, so unfinished work is not lost if you lose connection. Client addresses and health details are not stored in these drafts.",
      "When you sign out, or when your account is deleted, this locally stored information is removed from your device.",
    ],
  },
  {
    heading: "How long we keep it",
    body: [
      "Care records, invoices and payout records are kept as long as required for legal, tax and insurance purposes. Credential documents are kept while your account is active and for a reasonable period afterwards. Notification delivery logs are kept for 60 days.",
    ],
  },
  {
    heading: "Your choices and deleting your account",
    body: [
      "You may ask us for a copy of your information, ask us to correct it, or ask us to delete your account. You can request deletion in the app under Account, or by emailing admin@psadirect.ca from the address on your account.",
      "We will confirm your request, remove your profile and stop offering you work. Records we are legally required to keep, such as completed care reports and payment records, are retained for the required period and then destroyed.",
    ],
  },
  {
    heading: "Security",
    body: [
      "Information is transmitted over encrypted connections and stored with access rules that prevent one caregiver from seeing another caregiver's records or a client's information outside an accepted visit. Access by our staff is limited to what their role requires.",
    ],
  },
  {
    heading: "Changes and contact",
    body: [
      "If we change this policy we will update the date above and, where the change is significant, notify you in the app. Questions or complaints can be sent to admin@psadirect.ca or (249) 288-4787.",
    ],
  },
];

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-12">
      <Helmet>
        <title>Privacy Policy | PSW Direct</title>
        <meta
          name="description"
          content="How PSW Direct collects, uses and protects information on the website and the PSW Direct Worker mobile app."
        />
        <link rel="canonical" href="https://pswdirect.ca/privacy" />
      </Helmet>

      <h1 className="mb-2 text-3xl font-bold">Privacy Policy</h1>
      <p className="mb-8 text-sm text-muted-foreground">Last updated {UPDATED}</p>

      {SECTIONS.map((section) => (
        <section key={section.heading} className="mb-8">
          <h2 className="mb-3 text-xl font-semibold">{section.heading}</h2>
          {section.body.map((paragraph) => (
            <p key={paragraph} className="mb-3 text-sm leading-relaxed text-muted-foreground">
              {paragraph}
            </p>
          ))}
        </section>
      ))}
    </main>
  );
}
