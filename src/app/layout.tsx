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
      </body>
    </html>
  );
}
