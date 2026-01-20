export default function PrivacyPolicyPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1E3A5F 0%, #0D264C 100%)',
      padding: '40px 20px',
    }}>
      <div style={{
        background: '#FFFBF5',
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
          Privacy Policy
        </h1>
        <p style={{
          color: '#5A7184',
          fontSize: '14px',
          marginBottom: '32px',
          textAlign: 'center',
        }}>
          Last updated: January 2025
        </p>

        <div style={{ color: '#1E3A5F', fontSize: '15px', lineHeight: '1.8' }}>
          <Section title="Introduction">
            <p>
              Syrena ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our mobile application.
            </p>
          </Section>

          <Section title="Information We Collect">
            <p><strong>Account Information:</strong> When you create an account, we collect your email address and username.</p>
            <p><strong>Location Data:</strong> With your permission, we collect location data to show nearby places and allow you to save locations on the map.</p>
            <p><strong>User Content:</strong> We store places, notes, ratings, and photos you choose to save in the app.</p>
            <p><strong>Usage Data:</strong> We may collect information about how you interact with the app to improve our services.</p>
          </Section>

          <Section title="How We Use Your Information">
            <p>We use your information to:</p>
            <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
              <li>Provide and maintain the app's functionality</li>
              <li>Allow you to save and share places with friends</li>
              <li>Send notifications about friend requests and shared places</li>
              <li>Improve and personalize your experience</li>
            </ul>
          </Section>

          <Section title="Data Sharing">
            <p>
              We do not sell your personal information. Your saved places and profile information may be visible to friends you connect with in the app. We may share data with service providers (such as Supabase for data storage) who help us operate the app.
            </p>
          </Section>

          <Section title="Data Security">
            <p>
              We implement appropriate security measures to protect your information. However, no method of transmission over the internet is 100% secure.
            </p>
          </Section>

          <Section title="Your Rights">
            <p>You can:</p>
            <ul style={{ paddingLeft: '20px', marginTop: '8px' }}>
              <li>Access and update your profile information within the app</li>
              <li>Delete your account and associated data</li>
              <li>Control location permissions through your device settings</li>
            </ul>
          </Section>

          <Section title="Children's Privacy">
            <p>
              Our app is not intended for children under 13. We do not knowingly collect information from children under 13.
            </p>
          </Section>

          <Section title="Changes to This Policy">
            <p>
              We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new policy on this page.
            </p>
          </Section>

          <Section title="Contact Us">
            <p>
              If you have questions about this Privacy Policy, please contact us at:{' '}
              <a href="mailto:wavesight0@gmail.com" style={{ color: '#C9A962' }}>
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
        borderBottom: '2px solid #C9A962',
        paddingBottom: '8px',
      }}>
        {title}
      </h2>
      {children}
    </div>
  );
}
