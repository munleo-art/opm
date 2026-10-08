import ThemeProvider from '../lib/ThemeProvider';

export const metadata = {
  title: 'ODE Project Manager',
  description: 'Theo dõi tiến độ công việc'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <style>{`
          :root {
            --bg: #FBFBF9;
            --surface: #FFFFFF;
            --text: #141413;
            --muted: #6B6B68;
            --muted-2: #B2B2B2;
            --border: #E5E5E5;
            --chip: #EDEDEA;
            --accent: #141413;
            --accent-contrast: #FBFBF9;
          }
        `}</style>
      </head>
      <body
        style={{
          margin: 0,
          fontFamily: 'system-ui, sans-serif',
          background: 'var(--bg)',
          color: 'var(--text)'
        }}
      >
        <ThemeProvider>{children}</ThemeProvider>
        <div
          style={{
            position: 'fixed',
            right: 10,
            bottom: 'max(8px, env(safe-area-inset-bottom))',
            fontSize: 10,
            lineHeight: 1.3,
            color: 'var(--muted-2)',
            background: 'rgba(255,255,255,0.85)',
            padding: '2px 6px',
            borderRadius: 6,
            pointerEvents: 'none',
            zIndex: 40,
            maxWidth: 'calc(100vw - 20px)',
            textAlign: 'right'
          }}
        >
          Phát triển bởi Ban Sáng tạo Media - ODE
        </div>
      </body>
    </html>
  );
}
