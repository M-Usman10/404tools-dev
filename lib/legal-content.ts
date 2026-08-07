// The legal pages Paddle requires before it will approve 404tools.dev as a
// checkout domain: terms of service, privacy notice and refund policy. Paddle
// checks that the site links through to all three, so they live at stable
// top-level routes and are linked from the footer of every page.
//
// Content is held as data rather than JSX so the three documents share one
// renderer and stay structurally identical. Editing the wording here is the
// only thing needed to revise a policy.

export type LegalSection = {
  title: string
  paragraphs: string[]
  bullets?: string[]
}

export type LegalDocument = {
  eyebrow: string
  title: string
  description: string
  summaryPoints: string[]
  sections: LegalSection[]
}

export const LEGAL_LAST_UPDATED = "August 6, 2026"

// Paddle is the merchant of record for every paid transaction on this site,
// which changes who the customer's contract for the purchase is actually with.
// Saying so explicitly is part of what Paddle looks for during domain review.
const MERCHANT_NOTE =
  "Payments for 404tools.dev are processed by Paddle.com Market Ltd, which acts as the merchant of record for the transaction. Your purchase receipt, invoice and payment method are handled by Paddle, and their terms apply to the payment itself."

const CONTACT_NOTE =
  "Questions about this page can be sent to support@404tools.dev. For anything relating to a specific charge, include the order or transaction reference from your Paddle receipt so we can find it quickly."

export const termsDocument: LegalDocument = {
  eyebrow: "Terms of Service",
  title: "Terms for using 404tools.dev",
  description:
    "These terms explain how you may use the free developer tools on 404tools.dev, how the paid OCR API works, and the responsibilities we each take on.",
  summaryPoints: [
    "The browser-based developer tools are free and need no account.",
    "The OCR API is paid, prepaid by the page, and needs an API key.",
    "Page packs are one-time purchases. There is no subscription and nothing auto-renews.",
  ],
  sections: [
    {
      title: "1. Acceptance of these terms",
      paragraphs: [
        "By accessing or using 404tools.dev, including the free browser tools and the paid OCR API, you agree to be bound by these Terms of Service together with the Privacy Policy and Refund Policy linked from this site.",
        "If you do not agree with these terms, please do not use the service.",
      ],
    },
    {
      title: "2. What the service provides",
      paragraphs: [
        "404tools.dev offers two distinct things. The first is a collection of free, client-side developer utilities that run in your browser and require no account.",
        "The second is the OCR API, a paid HTTP service that extracts text from documents and images you submit to it. The OCR API is metered per page and is accessed with an API key issued from your dashboard.",
        "We may add, change or retire features as part of normal product development. Where a change materially reduces what a paid balance can do, we will say so before it takes effect.",
      ],
    },
    {
      title: "3. Accounts and API keys",
      paragraphs: [
        "An account is required only for the OCR API. You are responsible for keeping your password and your API keys secure, and for all activity carried out with them.",
        "An API key is a bearer credential: anyone holding it can spend your page balance. Treat it like a password.",
      ],
      bullets: [
        "You must be legally able to enter into a binding agreement.",
        "You must provide an accurate email address and keep it current, because it is how we reach you about your account and your purchases.",
        "Revoke a key immediately from your dashboard if you believe it has been exposed, and contact us if you believe your account has been accessed without permission.",
        "We do not store your API keys in a recoverable form, so a lost key cannot be retrieved. Create a new one and revoke the old.",
      ],
    },
    {
      title: "4. Acceptable use",
      paragraphs: [
        "You agree to use the service lawfully and in a way that does not interfere with the platform, other users, or the third-party infrastructure the OCR API depends on.",
      ],
      bullets: [
        "Do not submit documents you do not have the legal right to process.",
        "Do not use the OCR API to process content that is unlawful, or to extract data in violation of another party's rights.",
        "Do not attempt to reverse engineer, disrupt or overload the service, or circumvent rate limits and page metering.",
        "Do not resell or redistribute raw access to the OCR API in a way that lets a third party consume your balance anonymously at scale without accepting these terms themselves.",
      ],
    },
    {
      title: "5. Page packs, billing and metering",
      paragraphs: [
        "The OCR API is prepaid. You buy a page pack, the pages are added to your account balance, and each successful OCR request deducts the number of pages the submitted document actually contained.",
        "There is no subscription, no recurring charge and no automatic renewal. Your balance is only reduced by usage, and only increased when you choose to buy another pack.",
        "Prices for each pack are shown before checkout. A request that fails before the document is analysed is not charged. Purchased pages do not expire.",
        MERCHANT_NOTE,
      ],
    },
    {
      title: "6. Refunds",
      paragraphs: [
        "Page packs are non-refundable. Pages are delivered to your account the moment payment completes, and all sales are final.",
        "Our Refund Policy sets this out in full and forms part of these terms. Where a refund right exists under the consumer law that applies to you, that right applies regardless of this section.",
      ],
    },
    {
      title: "7. Your content",
      paragraphs: [
        "You keep all rights in the documents and images you submit to the OCR API. We claim no ownership over them and we do not use your documents to train models.",
        "You grant us only the limited, temporary permission needed to transmit your document to our OCR processor, extract the text, and return that text to you. How long anything is held is described in the Privacy Policy.",
      ],
    },
    {
      title: "8. Intellectual property",
      paragraphs: [
        "The 404tools.dev website, branding, software and documentation are owned by us or our licensors and are protected by applicable intellectual property laws.",
        "We grant you a limited, non-exclusive, non-transferable right to use the service for your own personal or business purposes while your account remains in good standing.",
      ],
    },
    {
      title: "9. Third-party services and disclaimers",
      paragraphs: [
        "The OCR API is built on Microsoft Azure AI Document Intelligence. We are not responsible for outages, policy changes or availability of that or any other third-party platform.",
        "OCR is a statistical process. We do not warrant that extracted text will be complete or free of recognition errors, and you should not rely on it as the sole source of truth for decisions with legal, financial or safety consequences without human review.",
        "To the maximum extent permitted by law, the service is provided on an 'as is' and 'as available' basis without warranties of any kind.",
      ],
    },
    {
      title: "10. Suspension and termination",
      paragraphs: [
        "We may suspend or terminate access if we reasonably believe you have violated these terms, created risk for the service, or used the product unlawfully.",
        "Where we terminate an account for breach of these terms, any unused page balance is forfeited. If we retire the OCR API entirely, we will give reasonable notice beforehand so you have time to spend a remaining balance.",
        "You may stop using the service at any time. Because nothing recurs, there is no cancellation step. Sections that by their nature should survive termination will continue to apply after your access ends.",
      ],
    },
    {
      title: "11. Limitation of liability",
      paragraphs: [
        "To the maximum extent permitted by law, we will not be liable for indirect, incidental, special, consequential or punitive damages, or for lost profits, revenue, data, goodwill or business opportunities arising from your use of the service.",
        "To the maximum extent permitted by law, our total aggregate liability arising out of or relating to the service will not exceed the total amount you paid us in the twelve months preceding the event giving rise to the claim.",
      ],
    },
    {
      title: "12. Changes to these terms",
      paragraphs: [
        "We may update these terms from time to time to reflect product, legal or operational changes.",
        "When we make material updates we will revise the effective date on this page and, where appropriate, give additional notice by email or inside the product.",
      ],
    },
    {
      title: "13. Contact",
      paragraphs: [CONTACT_NOTE],
    },
  ],
}

export const privacyDocument: LegalDocument = {
  eyebrow: "Privacy Policy",
  title: "How we handle your information",
  description:
    "What 404tools.dev collects, how it is used, who it is shared with, and specifically what happens to the documents you send to the OCR API.",
  summaryPoints: [
    "The free browser tools run entirely on your device and send us nothing.",
    "Documents sent to the OCR API are processed and discarded, never stored.",
    "We never see your card details. Paddle handles payment information.",
  ],
  sections: [
    {
      title: "1. The free tools collect nothing",
      paragraphs: [
        "The cron, regex, confusion matrix and other browser utilities on this site run entirely in your browser. Whatever you paste into them stays on your device and is never transmitted to us.",
        "This section is first because it covers most visitors. Everything below applies only if you create an account and use the paid OCR API.",
      ],
    },
    {
      title: "2. Information we collect",
      paragraphs: [
        "For OCR API accounts we collect information you provide directly, information created while you use the API, and limited technical information needed to run the service securely.",
      ],
      bullets: [
        "Account details: your name, email address and a securely hashed password. Authentication is handled by Supabase on our behalf.",
        "API key metadata: a name you choose, a one-way hash of the key, its display prefix, when it was last used and how many requests it has served. We do not store the key itself in a form we can read.",
        "Usage records: per request, the timestamp, the file name you supplied, the file size, the page count, whether it succeeded, how long it took, and any error. This is what your usage dashboard is built from.",
        "Purchase records: which page pack you bought, the number of pages, the amount, and the Paddle transaction reference.",
        "Standard server logs including IP address, used for security, abuse prevention and diagnostics.",
      ],
    },
    {
      title: "3. What happens to documents you send to the OCR API",
      paragraphs: [
        "This is the part most people want to know about, so it is stated plainly. Your document is received by our API, forwarded to Microsoft Azure AI Document Intelligence for text extraction, and the extracted text is returned to you in the HTTP response.",
        "We do not write the document, or the text extracted from it, to our database or to any persistent storage of ours. Once the response has been returned, our copy exists only in memory and is released.",
        "What we do keep is the metadata listed above: the file name you supplied, its size in bytes, and the page count. We keep those because they are what your usage log and your bill are made of. We do not keep the contents.",
        "We do not use your documents or extracted text to train any model, and we do not permit our processor to do so.",
      ],
    },
    {
      title: "4. How we use information",
      paragraphs: [
        "We use personal information to run the service, meter usage accurately, communicate with you, prevent abuse, and meet legal or operational obligations.",
      ],
      bullets: [
        "Create and manage your account and API keys.",
        "Authenticate API requests and deduct pages from the correct balance.",
        "Show you your own usage history and remaining balance.",
        "Process purchases and handle billing support.",
        "Monitor performance, troubleshoot failures and protect the service from abuse.",
        "Comply with legal obligations and enforce our terms.",
      ],
    },
    {
      title: "5. Sub-processors and sharing",
      paragraphs: [
        "We do not sell your personal information. We share data only with the providers needed to operate the product, and only to the extent needed.",
      ],
      bullets: [
        "Microsoft Azure AI Document Intelligence: receives the documents you submit, in order to perform the text extraction you asked for.",
        "Supabase: hosts our database and handles authentication, so it stores your account record, API key hashes, usage metadata and purchase records.",
        "Paddle: acts as merchant of record and processes all payments. Paddle collects your payment details directly. We never receive or store your card number.",
        "Vercel: hosts the application and processes request traffic.",
        "We may also disclose information if required by law, regulation, legal process or a valid government request, or as part of a merger, acquisition or sale of business assets, subject to appropriate safeguards.",
      ],
    },
    {
      title: "6. Data retention",
      paragraphs: [
        "Document contents are not retained at all, as described in section 3.",
        "Usage and purchase records are kept for as long as your account exists, and afterwards for as long as needed for accounting, tax and dispute-resolution purposes.",
        "Deleting your account removes your profile, API keys and usage history. Purchase records may be retained where we are legally required to keep them.",
      ],
    },
    {
      title: "7. Security",
      paragraphs: [
        "API keys are stored only as SHA-256 hashes, so a copy of our database cannot be replayed against the API. Row-level security is enforced in the database so one account cannot read another's keys, usage or purchases.",
        "All traffic is served over HTTPS. No system can be guaranteed perfectly secure, so please also use a strong, unique password and rotate any API key you suspect has been exposed.",
      ],
    },
    {
      title: "8. Your choices and rights",
      paragraphs: [
        "Depending on where you live, you may have rights to access, correct, export, delete or object to certain uses of your personal information.",
      ],
      bullets: [
        "You can review and update your name and password from your account settings.",
        "You can revoke any API key at any time from your dashboard.",
        "You can request access to, correction of, or deletion of your data by contacting us.",
        "Because nothing auto-renews, you can simply stop using the service at any time without cancelling anything.",
      ],
    },
    {
      title: "9. International transfers",
      paragraphs: [
        "Our providers operate infrastructure in multiple countries, so your information may be processed outside the country where you live. Where required, transfers rely on the safeguards those providers have in place, such as standard contractual clauses.",
      ],
    },
    {
      title: "10. Children's privacy",
      paragraphs: [
        "404tools.dev is not directed to children, and we do not knowingly collect personal information from anyone below the age required by applicable law to use the service independently.",
      ],
    },
    {
      title: "11. Policy updates",
      paragraphs: [
        "We may update this policy to reflect changes to the service, our sub-processors or legal requirements. Material updates will be reflected in the effective date on this page and, where appropriate, notified by email.",
      ],
    },
    {
      title: "12. Contact",
      paragraphs: [CONTACT_NOTE],
    },
  ],
}

export const refundDocument: LegalDocument = {
  eyebrow: "Refund Policy",
  title: "All sales are final",
  description:
    "Page packs are non-refundable. This page explains what that means in practice, why there is nothing to cancel, and how to try the service before you commit.",
  summaryPoints: [
    "Page packs are non-refundable once purchased.",
    "Nothing recurring, nothing to cancel, and pages never expire.",
    "Failed requests are never charged, so you only pay for pages actually extracted.",
  ],
  sections: [
    {
      title: "1. All sales are final",
      paragraphs: [
        "Page packs are a one-time, prepaid purchase of digital service credit that is delivered to your account immediately on payment. Because delivery is instant and irreversible, purchases are non-refundable.",
        "This applies whether or not you have used the pages. We do not refund unused balances, partially used balances, or purchases made by mistake, and we do not offer exchanges between packs.",
        "Please buy the pack you actually need. If you are unsure, the smallest pack exists precisely so you can evaluate the service at low cost first.",
      ],
    },
    {
      title: "2. There is nothing to cancel",
      paragraphs: [
        "The OCR API has no subscription, no recurring charge and no renewal date. Buying a pack does not sign you up for anything, so there is no cancellation step and no risk of being billed again.",
        "If you stop using the service you are simply not charged again. Your remaining pages stay on your account indefinitely, because purchased pages do not expire.",
      ],
    },
    {
      title: "3. You are only charged for pages actually extracted",
      paragraphs: [
        "Metering is not the same as refunding, and this is where most billing questions actually land. A request that fails authentication, is rejected as an unsupported file type, or errors before analysis completes deducts nothing from your balance.",
        "Your balance is reduced only by the real page count of documents that were successfully processed. Every request, charged or not, is recorded in your usage log so you can reconcile it yourself.",
        "OCR quality is not the same as OCR failure. A page that was processed but produced disappointing text has consumed a page, because the processing cost was incurred on our side either way. We would still like to hear about poor output so we can improve it, but it is not a billing error.",
      ],
    },
    {
      title: "4. Billing errors",
      paragraphs: [
        "A refund is different from correcting a mistake. If our systems charged you for pages that were never credited to your account, or your usage log shows pages deducted for a request that failed, that is a defect on our side and we will correct the balance.",
        "Write to support@404tools.dev with the Paddle transaction reference from your receipt, or the timestamp of the request in question, and we will investigate.",
      ],
    },
    {
      title: "5. Chargebacks",
      paragraphs: [
        "Please contact us before raising a chargeback with your bank. A chargeback locks the account while it is investigated and is slower than simply asking us to look at the problem.",
        MERCHANT_NOTE,
      ],
    },
    {
      title: "6. Your statutory rights",
      paragraphs: [
        "Nothing in this policy limits any right you have under the consumer law that applies where you live. Where such rights exist and are broader than this policy, they take precedence over it.",
        "Because page packs are digital content delivered immediately, in some jurisdictions completing a purchase constitutes a request for immediate delivery and an acknowledgement that any statutory cancellation period is waived once delivery has begun.",
      ],
    },
    {
      title: "7. Contact",
      paragraphs: [CONTACT_NOTE],
    },
  ],
}
