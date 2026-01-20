export default function SupportPage() {
  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1E3A5F 0%, #0D264C 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: '#FFFBF5',
        borderRadius: '20px',
        padding: '48px',
        maxWidth: '500px',
        width: '100%',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        <h1 style={{
          color: '#1E3A5F',
          fontSize: '32px',
          fontWeight: '700',
          marginBottom: '8px',
        }}>
          Syrena Support
        </h1>
        <p style={{
          color: '#5A7184',
          fontSize: '16px',
          marginBottom: '32px',
        }}>
          We're here to help with any questions or issues
        </p>

        <div style={{
          background: '#F5F0E8',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '24px',
        }}>
          <p style={{
            color: '#1E3A5F',
            fontSize: '14px',
            marginBottom: '8px',
            fontWeight: '600',
          }}>
            Contact Us
          </p>
          <a
            href="mailto:wavesight0@gmail.com"
            style={{
              color: '#C9A962',
              fontSize: '18px',
              fontWeight: '600',
              textDecoration: 'none',
            }}
          >
            wavesight0@gmail.com
          </a>
        </div>

        <p style={{
          color: '#8A9BAD',
          fontSize: '14px',
          lineHeight: '1.6',
        }}>
          We typically respond within 24-48 hours. Please include your username and a detailed description of your issue.
        </p>
      </div>
    </div>
  );
}
