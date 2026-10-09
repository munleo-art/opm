'use client';

import { useEffect, useState } from 'react';

// Điện thoại (kể cả iPhone Pro Max ~440px) => true. Máy tính bảng ngang / máy tính => false.
// Phải khớp với breakpoint @media (max-width: 640px) trong app/layout.tsx.
export const MOBILE_BREAKPOINT = 640;

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT}px)`);
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener('change', update);
    return () => mq.removeEventListener('change', update);
  }, []);
  return isMobile;
}
