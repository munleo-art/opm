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
          html { -webkit-text-size-adjust: 100%; }
          .m-only { display: none !important; }

          /* ===== Điện thoại (≤ 640px). Máy tính không bị ảnh hưởng. ===== */
          @media (max-width: 640px) {
            *, *::before, *::after { box-sizing: border-box; }
            body { overflow-x: hidden; }
            /* iOS tự phóng to khi chạm ô nhập có chữ < 16px → giữ 16px để trang không bị xô lệch */
            input, select, textarea { font-size: 16px !important; }
            button, a, select, input[type="checkbox"] { touch-action: manipulation; }
            .m-hide { display: none !important; }
            .m-only { display: flex !important; }
            .m-pad { padding-left: 14px !important; padding-right: 14px !important; }

            /* Popup giữa màn hình → trượt từ dưới lên (bottom sheet) kiểu iOS */
            div[style*="fixed"][style*="translate(-50%"] {
              top: auto !important;
              bottom: 0 !important;
              left: 0 !important;
              right: 0 !important;
              transform: none !important;
              width: 100% !important;
              max-width: 100% !important;
              max-height: 90dvh !important;
              border-radius: 20px 20px 0 0 !important;
              padding: 20px 16px calc(20px + env(safe-area-inset-bottom)) !important;
              animation: ode-sheet-up 0.22s ease-out;
            }
            @keyframes ode-sheet-up { from { transform: translateY(24px); opacity: 0.6; } to { transform: none; opacity: 1; } }

            /* Bảng thông báo (chuông) trải gần hết bề ngang màn hình, không tràn ra ngoài */
            .ode-bell-pop {
              position: fixed !important;
              top: 60px !important;
              left: 12px !important;
              right: 12px !important;
              width: auto !important;
              max-height: 70dvh !important;
            }

            /* Trang Quản trị / Báo cáo: header xuống dòng gọn, bảng nhiều cột → từng khối */
            .adm-header {
              height: auto !important;
              min-height: 56px;
              flex-wrap: wrap;
              gap: 8px;
              padding: 8px 14px !important;
            }
            .adm-page { padding: 18px 14px 40px !important; }
            .adm-row {
              display: flex !important;
              flex-wrap: wrap;
              column-gap: 12px !important;
              row-gap: 2px !important;
              position: relative;
              padding: 12px 52px 12px 14px !important;
            }
            .adm-row > div:first-child { width: 100%; font-size: 14.5px !important; }
            .adm-row > div:last-child { position: absolute; right: 8px; top: 50%; margin-top: -15px; }
            .rp-row {
              display: flex !important;
              flex-wrap: wrap;
              column-gap: 12px !important;
              row-gap: 6px !important;
              position: relative;
              padding: 12px 40px 12px 14px !important;
            }
            .rp-row > div:nth-child(1) { width: 100%; font-size: 14.5px !important; }
            .rp-row > div:nth-child(3), .rp-row > div:nth-child(6) { width: 100%; }
            .rp-row > div:last-child { position: absolute; right: 14px; top: 14px; }
            .rp-sub {
              display: flex !important;
              flex-wrap: wrap;
              column-gap: 12px !important;
              row-gap: 2px !important;
            }
            .rp-sub > div:first-child { width: 100%; font-weight: 600; font-size: 13px; }

            /* Dòng "Phát triển bởi..." không đè lên nội dung nữa, nằm cuối trang */
            .ode-disclaimer {
              position: static !important;
              display: block;
              margin: 8px auto calc(14px + env(safe-area-inset-bottom)) !important;
              background: transparent !important;
              text-align: center !important;
              font-size: 12.5px !important;
              max-width: none !important;
            }
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
          className="ode-disclaimer"
          style={{
            position: 'fixed',
            right: 10,
            bottom: 'max(8px, env(safe-area-inset-bottom))',
            fontSize: 15,
            lineHeight: 1.3,
            color: 'var(--muted-2)',
            background: 'rgba(255,255,255,0.85)',
            padding: '3px 8px',
            borderRadius: 7,
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
