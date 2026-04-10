export default function TermsOfServicePage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1E3A5F 0%, #152A45 100%)',
      padding: '40px 20px',
    }}>
      <div style={{
        background: '#FAFBFC',
        borderRadius: '20px',
        padding: '48px',
        maxWidth: '800px',
        margin: '0 auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <h1 style={{
          color: '#1E3A5F',
          fontSize: '32px',
          fontWeight: '700',
          marginBottom: '8px',
          textAlign: 'center',
        }}>
          Terms of Service
        </h1>
        <p style={{
          color: '#64748B',
          fontSize: '14px',
          marginBottom: '32px',
          textAlign: 'center',
        }}>
          Last updated: January 2025
        </p>

        <div style={{ color: '#1E3A5F', fontSize: '15px', lineHeight: '1.8' }}>
          <Section title="1. Acceptance of Terms">
            <p>
              By accessing or using Syrena ("the App"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the App.
            </p>
          </Section>

          <Section title="2. Description of Service">
            <p>
              Syrena is a social travel application that allows users to save, discover, and share places with friends. The App includes features for mapping locations, sharing recommendations, and connecting with other travelers.
            </p>
          </Section>

          <Section title="3. User Accounts">
            <p>To use certain features of the App, you must create an account. You agree to:</p>
            <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
              <li>Provide accurate and complete information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Promptly update any changes to your information</li>
              <li>Accept responsibility for all activities under your account</li>
            </ul>
          </Section>

          <Section title="4. User Content">
            <p>
              You retain ownership of content you create (places, photos, comments, reviews). By posting content, you grant Syrena a non-exclusive, worldwide license to use, display, and distribute your content within the App.
            </p>
            <p style={{ marginTop: '12px' }}>
              You are solely responsible for the content you post. You agree not to post content that:
            </p>
            <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
              <li>Is illegal, harmful, threatening, abusive, or harassing</li>
              <li>Is defamatory, vulgar, obscene, or invasive of privacy</li>
              <li>Infringes on intellectual property rights</li>
              <li>Contains spam, advertising, or promotional material</li>
              <li>Contains malware or harmful code</li>
              <li>Impersonates another person or entity</li>
            </ul>
          </Section>

          <Section title="5. Community Guidelines">
            <p>
              Syrena is a community for travel enthusiasts. We expect all users to:
            </p>
            <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
              <li>Be respectful to other users</li>
              <li>Share genuine and helpful recommendations</li>
              <li>Report inappropriate content or behavior</li>
              <li>Respect the privacy of others</li>
            </ul>
            <p style={{ marginTop: '12px' }}>
              We reserve the right to remove content and suspend accounts that violate these guidelines.
            </p>
          </Section>

          <Section title="6. Content Moderation">
            <p>
              Users can report content they believe violates these terms. We review reports and may take action including content removal or account suspension. Repeated violations may result in permanent account termination.
            </p>
          </Section>

          <Section title="7. Intellectual Property">
            <p>
              The App, including its design, features, and content (excluding user content), is owned by Syrena and protected by intellectual property laws. You may not copy, modify, or distribute the App without permission.
            </p>
          </Section>

          <Section title="8. Privacy">
            <p>
              Your use of the App is also governed by our{' '}
              <a href="/privacy" style={{ color: '#B8860B' }}>Privacy Policy</a>,
              which describes how we collect, use, and protect your information.
            </p>
          </Section>

          <Section title="9. Disclaimers">
            <p>
              The App is provided "as is" without warranties of any kind. We do not guarantee the accuracy of place information, recommendations, or user-generated content. Use your own judgment when visiting locations.
            </p>
          </Section>

          <Section title="10. Limitation of Liability">
            <p>
              To the fullest extent permitted by law, Syrena shall not be liable for any indirect, incidental, special, or consequential damages arising from your use of the App.
            </p>
          </Section>

          <Section title="11. Account Termination">
            <p>
              You may delete your account at any time through the App settings. We may suspend or terminate accounts that violate these terms. Upon termination, your right to use the App ceases immediately.
            </p>
          </Section>

          <Section title="12. Changes to Terms">
            <p>
              We may update these Terms of Service from time to time. Continued use of the App after changes constitutes acceptance of the new terms.
            </p>
          </Section>

          <Section title="13. Contact Us">
            <p>
              If you have questions about these Terms, please contact us at:{' '}
              <a href="mailto:wavesight0@gmail.com" style={{ color: '#B8860B' }}>
                wavesight0@gmail.com
              </a>
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <h2 style={{
        color: '#1E3A5F',
        fontSize: '18px',
        fontWeight: '600',
        marginBottom: '12px',
        borderBottom: '2px solid #B8860B',
        paddingBottom: '8px',
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
