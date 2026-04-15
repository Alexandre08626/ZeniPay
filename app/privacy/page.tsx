"use client";
import { useT, LangToggleLight } from "../../modules/zenipay/i18n";

export default function PrivacyPage() {
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
          {t("privacy.title")}
        </h1>
        <p style={{ color: "#6B7280", fontSize: 14, marginBottom: 40 }}>{t("common.effectiveDate")}</p>

        {/* Section 1 */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 12 }}>{t("privacy.section1")}</h2>
          <p style={{ color: "#374151", lineHeight: 1.7, fontSize: 15 }}>
            International Luxury Management Inc., operating as &quot;ZeniPay&quot; (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;), respects your privacy and is committed to protecting the personal information you share with us. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use the ZeniPay platform, website, APIs, and related services (collectively, the &quot;Services&quot;). By using our Services, you consent to the practices described in this policy. We encourage you to read this Privacy Policy carefully and contact us if you have any questions.
          </p>
        </section>

        {/* Section 2 */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 12 }}>{t("privacy.section2")}</h2>
          <p style={{ color: "#374151", lineHeight: 1.7, fontSize: 15 }}>
            We collect the following types of information to provide and improve our Services:
          </p>
          <ul style={{ color: "#374151", lineHeight: 1.9, fontSize: 15, paddingLeft: 24, marginTop: 8 }}>
            <li><strong>Business Information:</strong> Company name, business registration details, business type, industry, website URL, and other information related to your business operations.</li>
            <li><strong>Owner Identity (KYC):</strong> Full legal name, date of birth, government-issued identification (e.g., passport, driver&apos;s license), Social Insurance Number or equivalent, and proof of address for Know Your Customer verification purposes.</li>
            <li><strong>Banking Information:</strong> Bank account details including institution number, transit number, and account number for settlement of funds.</li>
            <li><strong>Transaction Data:</strong> Payment amounts, transaction dates, customer payment information (processed securely via our payment partner), refund and chargeback records, and settlement history.</li>
            <li><strong>Usage Data:</strong> IP addresses, browser type, device information, pages visited, features used, access times, and other analytics data related to your interaction with our platform.</li>
          </ul>
        </section>

        {/* Section 3 */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 12 }}>{t("privacy.section3")}</h2>
          <p style={{ color: "#374151", lineHeight: 1.7, fontSize: 15 }}>
            We use the information we collect for the following purposes:
          </p>
          <ul style={{ color: "#374151", lineHeight: 1.9, fontSize: 15, paddingLeft: 24, marginTop: 8 }}>
            <li><strong>Payment Processing:</strong> To facilitate payment transactions through our payment processing partner, Finix Payments, including authorization, capture, settlement, and refund operations.</li>
            <li><strong>Identity Verification:</strong> To verify your identity and the legitimacy of your business through KYC and KYB processes, as required by applicable laws and regulations.</li>
            <li><strong>Fraud Prevention:</strong> To detect, prevent, and investigate fraudulent transactions, unauthorized access, and other illegal activities that may affect our platform or users.</li>
            <li><strong>Platform Improvement:</strong> To analyze usage patterns, improve our Services, develop new features, personalize your experience, and provide customer support.</li>
            <li><strong>Legal Compliance:</strong> To comply with applicable laws, regulations, legal processes, and enforceable governmental requests.</li>
          </ul>
        </section>

        {/* Section 4 */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 12 }}>{t("privacy.section4")}</h2>
          <p style={{ color: "#374151", lineHeight: 1.7, fontSize: 15 }}>
            We share your information only with trusted third parties necessary to provide our Services:
          </p>
          <ul style={{ color: "#374151", lineHeight: 1.9, fontSize: 15, paddingLeft: 24, marginTop: 8 }}>
            <li><strong>Finix Payments:</strong> Our payment processing partner receives transaction and merchant data necessary to process payments, manage settlements, and comply with card network regulations.</li>
            <li><strong>Supabase:</strong> Our data storage and infrastructure provider hosts merchant and platform data with enterprise-grade security and encryption.</li>
            <li><strong>Legal and Regulatory Bodies:</strong> We may disclose information when required by law, court order, or governmental authority.</li>
          </ul>
          <p style={{ color: "#374151", lineHeight: 1.7, fontSize: 15, marginTop: 12, fontWeight: 600 }}>
            We do not sell, rent, or trade your personal information to third parties for marketing or advertising purposes.
          </p>
        </section>

        {/* Section 5 */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 12 }}>{t("privacy.section5")}</h2>
          <p style={{ color: "#374151", lineHeight: 1.7, fontSize: 15 }}>
            Protecting payment card data is a top priority. ZeniPay maintains PCI DSS (Payment Card Industry Data Security Standard) compliance through the following measures:
          </p>
          <ul style={{ color: "#374151", lineHeight: 1.9, fontSize: 15, paddingLeft: 24, marginTop: 8 }}>
            <li>Card data is never stored on ZeniPay&apos;s servers. All payment card information is processed directly and securely through Finix Payments&apos; PCI-compliant infrastructure.</li>
            <li>We use tokenization to reference payment methods without exposing sensitive cardholder data.</li>
            <li>All data transmitted between your browser, our platform, and our payment partners is encrypted using TLS (Transport Layer Security) protocols.</li>
            <li>We undergo regular security assessments and maintain compliance with current PCI DSS requirements through our partnership with Finix.</li>
          </ul>
        </section>

        {/* Section 6 */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 12 }}>{t("privacy.section6")}</h2>
          <p style={{ color: "#374151", lineHeight: 1.7, fontSize: 15 }}>
            We retain your personal and business information for as long as your account remains active and as necessary to provide our Services. After account termination, we may retain certain information as required by applicable laws and regulations, including tax and financial reporting requirements, fraud prevention, and dispute resolution purposes. Transaction records are typically retained for a minimum of seven (7) years in accordance with Canadian financial regulations. You may request deletion of your data subject to our legal retention obligations.
          </p>
        </section>

        {/* Section 7 */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 12 }}>{t("privacy.section7")}</h2>
          <p style={{ color: "#374151", lineHeight: 1.7, fontSize: 15 }}>
            Under the Personal Information Protection and Electronic Documents Act (PIPEDA) and applicable Canadian privacy laws, you have the following rights:
          </p>
          <ul style={{ color: "#374151", lineHeight: 1.9, fontSize: 15, paddingLeft: 24, marginTop: 8 }}>
            <li><strong>Right of Access:</strong> You have the right to request access to the personal information we hold about you and to receive a copy of that information.</li>
            <li><strong>Right of Correction:</strong> You have the right to request correction of any inaccurate or incomplete personal information we hold about you.</li>
            <li><strong>Right of Deletion:</strong> You have the right to request the deletion of your personal information, subject to our legal obligations and legitimate business interests for data retention.</li>
          </ul>
          <p style={{ color: "#374151", lineHeight: 1.7, fontSize: 15, marginTop: 12 }}>
            To exercise any of these rights, please contact us at <a href="mailto:zenipay@zeniva.ca" style={{ color: "#15B8C9" }}>zenipay@zeniva.ca</a>. We will respond to your request within 30 days as required by PIPEDA.
          </p>
        </section>

        {/* Section 8 */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 12 }}>{t("privacy.section8")}</h2>
          <p style={{ color: "#374151", lineHeight: 1.7, fontSize: 15 }}>
            ZeniPay uses cookies and similar tracking technologies to enhance your experience on our platform:
          </p>
          <ul style={{ color: "#374151", lineHeight: 1.9, fontSize: 15, paddingLeft: 24, marginTop: 8 }}>
            <li><strong>Essential Cookies:</strong> These cookies are strictly necessary for the operation of our platform, including session management, authentication, and security features. They cannot be disabled.</li>
            <li><strong>Analytics Cookies:</strong> We use analytics cookies to understand how users interact with our platform, identify usage trends, and improve our Services. These cookies collect aggregated, anonymized data.</li>
          </ul>
          <p style={{ color: "#374151", lineHeight: 1.7, fontSize: 15, marginTop: 12 }}>
            We do not use advertising or third-party marketing cookies. You can manage your cookie preferences through your browser settings.
          </p>
        </section>

        {/* Section 9 */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 12 }}>{t("privacy.section9")}</h2>
          <p style={{ color: "#374151", lineHeight: 1.7, fontSize: 15 }}>
            We take the security of your information seriously and implement robust measures to protect it:
          </p>
          <ul style={{ color: "#374151", lineHeight: 1.9, fontSize: 15, paddingLeft: 24, marginTop: 8 }}>
            <li><strong>Encryption:</strong> All data is encrypted in transit using TLS and at rest using AES-256 encryption standards.</li>
            <li><strong>Access Controls:</strong> We enforce strict role-based access controls, multi-factor authentication, and the principle of least privilege for all team members accessing sensitive data.</li>
            <li><strong>Regular Audits:</strong> We conduct regular security audits, vulnerability assessments, and penetration testing to identify and address potential security risks.</li>
          </ul>
          <p style={{ color: "#374151", lineHeight: 1.7, fontSize: 15, marginTop: 12 }}>
            While we strive to protect your information, no method of electronic transmission or storage is 100% secure. If you discover a security vulnerability, please report it to us immediately at <a href="mailto:zenipay@zeniva.ca" style={{ color: "#15B8C9" }}>zenipay@zeniva.ca</a>.
          </p>
        </section>

        {/* Section 10 */}
        <section style={{ marginBottom: 36 }}>
          <h2 style={{ fontSize: 22, fontWeight: 700, color: "#111827", marginBottom: 12 }}>{t("privacy.section10")}</h2>
          <p style={{ color: "#374151", lineHeight: 1.7, fontSize: 15 }}>
            If you have any questions about this Privacy Policy or our data practices, please contact us:
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
