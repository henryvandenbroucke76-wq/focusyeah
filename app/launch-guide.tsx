"use client";
import { useLanguage, localize } from "@/lib/i18n";
export function LaunchGuide({ settings, userId }: { settings: any; userId?: string }) {
  const { lang } = useLanguage();
  return localize(
    <article className="info-page">
      <span className="eyebrow">MISEORA · LAUNCH REVIEW</span>
      <h1>Your launch checklist.</h1>
      <p>Complete the connections below before inviting customers.</p>
      <div className="launch-status">
        {[
          ["Accounts", settings.auth],
          ["Stripe", settings.billing],
          ["Recipe ideas", settings.ai],
        ].map(([name, ready]) => (
          <div key={String(name)}>
            <strong>{name}</strong>
            <span>{ready ? "Configured · live testing required" : "Connection needed"}</span>
          </div>
        ))}
      </div>
      <h2>1. Connect Supabase</h2>
      <ol>
        <li>
          Create a Supabase project. Open Project Settings → API Keys and copy the publishable key. A legacy
          anon key also works. Never use a service_role or secret key in the browser.
        </li>
        <li>Copy the Project URL from the Connect dialog. It looks like https://your-project.supabase.co.</li>
        <li>
          Set the site variables below. These values belong to your own project; Miseora cannot invent them.
        </li>
      </ol>
      <table>
        <thead>
          <tr>
            <th>Variable</th>
            <th>Value</th>
          </tr>
        </thead>
        <tbody>
          {[
            ["SUPABASE_URL", "Your project URL"],
            ["SUPABASE_PUBLISHABLE_KEY", "sb_publishable_… (recommended)"],
            ["SUPABASE_ANON_KEY", "Legacy anon key (only if not using a publishable key)"],
            ["SITE_URL", "https://your-domain.com (optional)"],
            ["AUTH_GOOGLE_ENABLED", "true after configuring Google"],
            ["AUTH_APPLE_ENABLED", "true after configuring Apple"],
          ].map(([k, v]) => (
            <tr key={k}>
              <td>
                <code>{k}</code>
              </td>
              <td>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <ol start={4}>
        <li>
          In Authentication → URL Configuration, set Site URL to the site address. Add both callback URLs
          below to the redirect allowlist.
        </li>
      </ol>
      <p>
        <code>https://your-domain.com/auth/finish</code>
        <br />
        <code>https://your-domain.com/auth/finish?next=/reset-password</code>
      </p>
      <ol start={5}>
        <li>
          Enable email confirmation, configure production SMTP, and test registration, email confirmation,
          sign-in, password recovery, and sign-out.
        </li>
        <li>
          Enable Google and Apple in Supabase Auth providers. Enter their provider credentials there, then
          enable the matching site switches. Each provider needs its own developer setup.
        </li>
      </ol>
      <p>
        Supabase manages sign-in. Recipes and photos are stored in your Cloudflare D1 database and R2 bucket.
      </p>
      <h2>2. Connect Stripe</h2>
      <ol>
        <li>
          Create and verify your Stripe account. Connect the bank account for payouts. If you are under 18,
          arrange the required adult account representative with Stripe before accepting payments.
        </li>
        <li>
          Start in Stripe test mode. Create a recurring Miseora Plus product and choose the price, currency,
          and billing interval.
        </li>
        <li>
          Set STRIPE_SECRET_KEY, STRIPE_PRICE_ID, STRIPE_WEBHOOK_SECRET, and PLUS_PRICE_LABEL. Store secrets
          only in protected server settings, never in chat or browser code.
        </li>
        <li>
          Create a webhook destination for the URL below. Subscribe to checkout.session.completed,
          customer.subscription.created, customer.subscription.updated, customer.subscription.deleted,
          invoice.paid, and invoice.payment_failed.
        </li>
      </ol>
      <p>
        <code>https://your-domain.com/api/billing/webhook</code>
      </p>
      <ol start={5}>
        <li>
          Enable the Stripe customer portal for cancellation, payment methods, and invoices. Set
          BILLING_ENABLED=true only after the connections are ready.
        </li>
        <li>
          Test checkout, duplicate clicks, renewal, failed payment, cancellation, and the free daily limit.
          Plus access comes from verified Stripe subscription events, never from the success URL.
        </li>
        <li>
          After the tests and your review, switch to live keys and a live price. Verify the live webhook
          signing secret. Stripe sends available funds to your bank according to your account payout schedule.
        </li>
      </ol>
      <h2>3. AI and owner tools</h2>
      <p>
        Optional: set OPENAI_API_KEY to turn on AI recipe ideas. Always review a generated recipe before
        saving it.
      </p>
      <p>Set ADMIN_USER_ID to your verified account identifier after choosing the final login provider.</p>
      {userId && (
        <p>
          <code>{userId}</code>
        </p>
      )}
      <h2>4. Before public launch</h2>
      <ul>
        <li>
          Set SUPPORT_EMAIL and complete your business identity, privacy notice, terms, retention policy, and
          account deletion process.
        </li>
        <li>Review community moderation, image rights, translations, and dietary instructions.</li>
        <li>
          Finish real-device and live-provider tests. Configuration alone is not proof that payments or
          sign-in work.
        </li>
      </ul>
      <p>
        <a href="https://supabase.com/docs/guides/getting-started/api-keys" target="_blank" rel="noreferrer">
          Supabase key guide
        </a>{" "}
        ·{" "}
        <a
          href="https://docs.stripe.com/billing/subscriptions/build-subscriptions"
          target="_blank"
          rel="noreferrer"
        >
          Stripe subscription guide
        </a>
      </p>
    </article>,
    lang,
  );
}
export function PublicInfo({
  route,
  go,
  supportEmail = "",
}: {
  route: string;
  go: (r: string) => void;
  supportEmail?: string;
}) {
  const { lang } = useLanguage();
  const titles: Record<string, string> = {
    about: "Everyone has a place in the kitchen.",
    contact: "Let’s talk food.",
    faq: "A few good things to know.",
    privacy: "Privacy policy",
    terms: "Terms of service",
  };
  const privacy = [
    [
      "What we store",
      "Account identifiers, profile preferences, recipes, favourites, cooking history, reviews, and uploaded images support your kitchen. Language, theme, motion settings, and guest cooking preferences are stored on your device.",
    ],
    [
      "Sharing and AI",
      "Published recipes, display names, and reviews are shared in the community. When you ask for an AI recipe idea, the ingredients and wishes you enter are sent to the AI provider.",
    ],
    [
      "Your rights",
      "The operator must add their identity, contact details, retention periods, and data access and deletion process before launch.",
    ],
  ];
  const terms = [
    [
      "Cooking with care",
      "Check ingredient packaging, allergies, and safe cooking instructions. AI recipe ideas can contain mistakes, so review them before cooking.",
    ],
    [
      "Your recipes",
      "Upload only content you have permission to share. Keep reviews respectful. You can edit, unpublish, or delete recipes you create.",
    ],
    [
      "Accounts and payments",
      "Miseora is free to use. If paid plans are added, the price and renewal terms appear at checkout before you pay.",
    ],
    [
      "Recipe images",
      "Starter recipe pictures are AI-generated serving suggestions. Your finished meal may look different. Photos uploaded by cooks belong to their recipes.",
    ],
  ];
  return localize(
    <article className="info-page">
      <h1 className="policy-heading">{titles[route]}</h1>
      {route === "about" ? (
        <>
          <p>
            Follow clear step-by-step recipes, cook with what you have, and create and share your own recipes
            with the community.
          </p>
          <details className="legal-section">
            <summary>About our recipes</summary>
            <p>
              Our starter recipes are labelled Miseora kitchen. Community recipes are published by signed-in
              cooks. Likes and views come from real activity.
            </p>
            <p>Starter recipe pictures are AI-generated serving suggestions.</p>
          </details>
        </>
      ) : route === "contact" ? (
        <>
          {supportEmail ? (
            <p>
              Questions or feedback? Email us at{" "}
              <a data-no-translate href={"mailto:" + supportEmail}>
                {supportEmail}
              </a>
              .
            </p>
          ) : (
            <p>Questions or feedback? A support email address will be added here soon.</p>
          )}
          <button className="btn outline" onClick={() => go("faq")}>
            Visit the FAQ
          </button>
        </>
      ) : route === "faq" ? (
        <>
          {[
            [
              "How do the cooking tutorials work?",
              "Open a recipe and press “Let’s cook”. You get one step at a time with the amounts you need, a timer where needed, and a “ready when” check so you know when to move on.",
            ],
            [
              "Can I add ingredients myself?",
              "Yes. Type them in My fridge and pick a suggestion, or browse the full list and tap what you have.",
            ],
            [
              "What is included for free?",
              "Everything: step-by-step recipes, your fridge, saving, planning, and writing your own recipes.",
            ],
            [
              "Can I change the language?",
              "Choose English, Dutch, French, or Spanish from the language menu. Community recipes stay in the language their author used.",
            ],
            [
              "How do I publish a recipe?",
              "Create and save your recipe, then open it and choose Publish recipe. You can edit, unpublish, or delete your own recipes.",
            ],
            [
              "Where is my information saved?",
              "Your recipes, preferences, and activity belong to your signed-in account. Your fridge and private recipes are not shared with other cooks.",
            ],
          ].map(([q, a]) => (
            <details className="legal-section" key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </>
      ) : (
        <>
          <p className="policy-intro">
            {route === "privacy"
              ? "How your information supports your kitchen."
              : "A few simple rules for cooking and sharing."}
          </p>
          <p className="policy-status">Draft for private review. Complete before public launch.</p>
          {(route === "privacy" ? privacy : terms).map(([title, body]) => (
            <details className="legal-section" key={title}>
              <summary>{title}</summary>
              <p>{body}</p>
            </details>
          ))}
        </>
      )}
    </article>,
    lang,
  );
}
