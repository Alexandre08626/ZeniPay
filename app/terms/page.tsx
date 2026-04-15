"use client";
import { useT, LangToggleLight } from "../../modules/zenipay/i18n";

export default function TermsPage() {
  const gradient = "linear-gradient(135deg, #2DBE60 0%, #15B8C9 50%, #7B4FBF 100%)";
  const { t } = useT();

  return (
    <div style={{ backgroundColor: "#ffffff", minHeight: "100vh", fontFamily: "'Segoe UI', system-ui, -apple-system, sans-serif" }}>
      <style>{`
        @media (max-width: 768px) {
          .zp-legal-main { padding: 28px 16px 48px !important; }
          .zp-legal-h1 { font-size: 28px !important; }
          .zp-legal-header { padding: 0 16px !important; }
        }
      `}</style>
      {/* Header */}
      <header style={{ borderBottom: "1px solid #E5E7EB", padding: "20px 0" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <a href="/" style={{ textDecoration: "none" }}>
            <span style={{ fontSize: 28, fontWeight: 800, background: gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>
              ZeniPay
            </span>
          </a>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <LangToggleLight />
            <a href="/" style={{ color: "#6B7280", textDecoration: "none", fontSize: 14 }}>{t("common.backToHome")}</a>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="zp-legal-main" style={{ maxWidth: 800, margin: "0 auto", padding: "48px 24px 80px" }}>
        <h1 className="zp-legal-h1" style={{ fontSize: 36, fontWeight: 800, background: gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", marginBottom: 8 }}>
          {t("terms.title")}
        </h1>
        <p style={{ color: "#6B7280", fontSize: 14, marginBottom: 40 }}>{t("common.effectiveDate")}</p>

        {/* Section 1 */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 12 }}>{t("terms.section1")}</h2>
          <p style={{ color: "#374151", lineHeight: 1.7, fontSize: 15 }}>
            By accessing or using the ZeniPay platform, website, APIs, or any related services (collectively, the &quot;Services&quot;), you agree to be bound by these Terms &amp; Conditions (&quot;Terms&quot;). If you do not agree to these Terms, you must not access or use the Services. These Terms constitute a legally binding agreement between you and International Luxury Management Inc., operating as &quot;ZeniPay&quot; (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;). We reserve the right to update or modify these Terms at any time, and your continued use of the Services after any changes constitutes acceptance of the revised Terms.
          </p>
        </section>

        {/* Section 2 */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 12 }}>{t("terms.section2")}</h2>
          <p style={{ color: "#374151", lineHeight: 1.7, fontSize: 15 }}>
            ZeniPay is a payment technology platform designed specifically for small online businesses. Our Services enable merchants to accept payments, manage transactions, and streamline their payment workflows through a modern, developer-friendly interface. ZeniPay provides payment processing infrastructure, merchant dashboards, analytics, and related tools to facilitate electronic commerce. We act as a technology provider and facilitate payment processing through our third-party payment partners. ZeniPay is not a bank and does not hold or manage funds directly.
          </p>
        </section>

        {/* Section 3 */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 12 }}>{t("terms.section3")}</h2>
          <p style={{ color: "#374151", lineHeight: 1.7, fontSize: 15 }}>
            To use ZeniPay&apos;s Services as a merchant, you must meet the following eligibility requirements:
          </p>
          <ul style={{ color: "#374151", lineHeight: 1.9, fontSize: 15, paddingLeft: 24, marginTop: 8 }}>
            <li>You must be a registered business entity in good standing within your jurisdiction.</li>
            <li>You must complete our Know Your Customer (KYC) and Know Your Business (KYB) verification processes, which may include providing government-issued identification, business registration documents, and proof of address.</li>
            <li>You must agree to and comply with the payment processing terms of Finix Payments, our payment processing partner.</li>
            <li>You must be at least 18 years of age or the age of majority in your jurisdiction.</li>
            <li>You must provide accurate, current, and complete information during the registration process and keep such information updated.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 12 }}>{t("terms.section4")}</h2>
          <p style={{ color: "#374151", lineHeight: 1.7, fontSize: 15 }}>
            By using ZeniPay&apos;s Services, you agree to the following fee structure:
          </p>
          <ul style={{ color: "#374151", lineHeight: 1.9, fontSize: 15, paddingLeft: 24, marginTop: 8 }}>
            <li><strong>Transaction Fee:</strong> 2.9% + $0.30 per transaction processed through the platform.</li>
            <li><strong>Monthly Platform Fee:</strong> No monthly fee. The ZeniPay platform, dashboard, and support services are included at no additional cost.</li>
            <li><strong>One-Time Setup Fee:</strong> $299 one-time fee for account setup, onboarding, and initial configuration.</li>
          </ul>
          <p style={{ color: "#374151", lineHeight: 1.7, fontSize: 15, marginTop: 12 }}>
            All fees are in Canadian dollars (CAD) unless otherwise specified. Fees are non-refundable unless otherwise stated. We reserve the right to modify our pricing with 30 days&apos; written notice to merchants. Additional fees may apply for chargebacks, refunds, or premium features.
          </p>
        </section>

        {/* Section 5 */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 12 }}>{t("terms.section5")}</h2>
          <p style={{ color: "#374151", lineHeight: 1.7, fontSize: 15 }}>
            You agree to use ZeniPay&apos;s Services only for lawful purposes. The following activities are strictly prohibited:
          </p>
          <ul style={{ color: "#374151", lineHeight: 1.9, fontSize: 15, paddingLeft: 24, marginTop: 8 }}>
            <li>Processing transactions related to illegal activities, including but not limited to money laundering, fraud, or the sale of illegal goods and services.</li>
            <li>Operating as a high-risk prohibited merchant category, including but not limited to: illegal gambling, unlicensed pharmaceutical sales, counterfeit goods, weapons trafficking, or adult content without proper licensing.</li>
            <li>Violating card network rules and regulations established by Visa, Mastercard, American Express, or other applicable payment networks.</li>
            <li>Engaging in deceptive business practices, unauthorized recurring charges, or any activity that generates excessive chargebacks.</li>
            <li>Attempting to circumvent security measures, reverse-engineer the platform, or access the Services through unauthorized means.</li>
          </ul>
          <p style={{ color: "#374151", lineHeight: 1.7, fontSize: 15, marginTop: 12 }}>
            Violation of this Acceptable Use Policy may result in immediate suspension or termination of your account without notice.
          </p>
        </section>

        {/* Section 6 */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 12 }}>{t("terms.section6")}</h2>
          <p style={{ color: "#374151", lineHeight: 1.7, fontSize: 15 }}>
            Payment processing on ZeniPay is facilitated through Finix Payments, our third-party payment processing partner. By using our Services, you acknowledge and agree to the following:
          </p>
          <ul style={{ color: "#374151", lineHeight: 1.9, fontSize: 15, paddingLeft: 24, marginTop: 8 }}>
            <li>Funds from processed transactions are settled according to the standard settlement schedule, typically within 2-3 business days, subject to risk reviews and compliance checks.</li>
            <li>ZeniPay and Finix reserve the right to hold, delay, or suspend settlements if suspicious activity is detected or if additional verification is required.</li>
            <li>You are responsible for managing chargebacks and disputes. Chargeback fees may apply as determined by the card networks and our processing partner. Excessive chargebacks may result in account review or termination.</li>
            <li>Refunds must be processed through the ZeniPay platform and are subject to our refund policies and applicable fees.</li>
          </ul>
        </section>

        {/* Section 7 */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 12 }}>{t("terms.section7")}</h2>
          <p style={{ color: "#374151", lineHeight: 1.7, fontSize: 15 }}>
            Your privacy is important to us. Please review our <a href="/privacy" style={{ color: "#15B8C9", textDecoration: "underline" }}>Privacy Policy</a> for detailed information on how we collect, use, and protect your data. ZeniPay is committed to maintaining PCI DSS (Payment Card Industry Data Security Standard) compliance. Cardholder data is handled securely through our PCI-compliant payment processing infrastructure via Finix. We never store raw card data on our servers.
          </p>
        </section>

        {/* Section 8 */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 12 }}>{t("terms.section8")}</h2>
          <p style={{ color: "#374151", lineHeight: 1.7, fontSize: 15 }}>
            Either party may terminate this agreement at any time by providing 30 days&apos; written notice to the other party. Upon termination, you must cease all use of the Services. Any outstanding fees or obligations will remain due and payable. We reserve the right to terminate or suspend your account immediately, without prior notice, if you breach these Terms, violate the Acceptable Use Policy, or if required by law or our payment processing partners. Following termination, we will process any remaining settlements owed to you, subject to applicable holds and reserves.
          </p>
        </section>

        {/* Section 9 */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 12 }}>{t("terms.section9")}</h2>
          <p style={{ color: "#374151", lineHeight: 1.7, fontSize: 15 }}>
            To the maximum extent permitted by applicable law, International Luxury Management Inc. (operating as ZeniPay), its officers, directors, employees, agents, and affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, revenue, data, or business opportunities, arising out of or related to your use of the Services, regardless of the theory of liability. Our total aggregate liability for any claims arising under or related to these Terms shall not exceed the total fees paid by you to ZeniPay in the twelve (12) months preceding the event giving rise to the claim. The Services are provided on an &quot;as is&quot; and &quot;as available&quot; basis without warranties of any kind, whether express or implied.
          </p>
        </section>

        {/* Section 10 */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 12 }}>{t("terms.section10")}</h2>
          <p style={{ color: "#374151", lineHeight: 1.7, fontSize: 15 }}>
            These Terms shall be governed by and construed in accordance with the laws of the Province of Quebec, Canada, without regard to its conflict of law provisions. Any disputes arising out of or relating to these Terms or the Services shall be subject to the exclusive jurisdiction of the courts located in the Province of Quebec, Canada. Both parties agree to submit to the personal jurisdiction of such courts.
          </p>
        </section>

        {/* Section 11 */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 12 }}>{t("terms.section11")}</h2>
          <p style={{ color: "#374151", lineHeight: 1.7, fontSize: 15 }}>
            If you have any questions about these Terms &amp; Conditions, please contact us:
          </p>
          <ul style={{ color: "#374151", lineHeight: 1.9, fontSize: 15, paddingLeft: 24, marginTop: 8, listStyleType: "none" }}>
            <li><strong>Legal Entity:</strong> International Luxury Management Inc. (operating as &quot;ZeniPay&quot;)</li>
            <li><strong>Location:</strong> Quebec, Canada</li>
            <li><strong>Email:</strong> <a href="mailto:zenipay@zeniva.ca" style={{ color: "#15B8C9" }}>zenipay@zeniva.ca</a></li>
            <li><strong>Website:</strong> <a href="https://zenipay.ca" target="_blank" rel="noopener noreferrer" style={{ color: "#15B8C9" }}>zenipay.ca</a></li>
          </ul>
        </section>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid #E5E7EB", padding: "32px 0", backgroundColor: "#F9FAFB" }}>
        <div style={{ maxWidth: 800, margin: "0 auto", padding: "0 24px", display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 14, color: "#6B7280" }}>{t("common.copyrightFull")}</span>
          <div style={{ display: "flex", gap: 24, marginTop: 8 }}>
            <a href="/terms" style={{ fontSize: 14, color: "#6B7280", textDecoration: "none" }}>{t("common.termsAndConditions")}</a>
            <a href="/privacy" style={{ fontSize: 14, color: "#6B7280", textDecoration: "none" }}>{t("common.privacyPolicy")}</a>
            <a href="https://zenipay.ca" target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: "#6B7280", textDecoration: "none" }}>zenipay.ca</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
