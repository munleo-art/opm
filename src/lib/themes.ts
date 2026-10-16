// Bộ theme giao diện OPM. Màu gốc theo bảng 10 màu pastel anh Minh chọn + theme mặc định Trắng – Xám – Đen.
// Mỗi theme có bản Sáng/Tối; mọi cặp chữ/nền đã kiểm tra tương phản ≥ 4.5:1.
// Theme chỉ đổi khung giao diện. 4 màu trạng thái deadline (STATUS_COLORS) KHÔNG đổi theo theme.

export type ThemeMode = 'light' | 'dark';

export interface ThemeTokens {
  bg: string; surface: string; soft: string; border: string;
  accent: string; onAccent: string; ink: string; text: string; muted: string;
}

export interface ThemeDef {
  key: string;
  name: string;
  base: string;
  light: ThemeTokens;
  dark: ThemeTokens;
}

export const DEFAULT_THEME_KEY = 'mono';

export const THEMES: ThemeDef[] = [
  {
    "key": "mono",
    "name": "Trắng – Xám – Đen",
    "base": "#E4E4E2",
    "light": {
      "bg": "#F6F6F5",
      "surface": "#FFFFFF",
      "soft": "#EDEDEC",
      "border": "#E3E3E1",
      "accent": "#18181B",
      "onAccent": "#FFFFFF",
      "ink": "#18181B",
      "text": "#18181B",
      "muted": "#5F5F66"
    },
    "dark": {
      "bg": "#121213",
      "surface": "#1C1C1E",
      "soft": "#2A2A2D",
      "border": "#343437",
      "accent": "#F4F4F5",
      "onAccent": "#18181B",
      "ink": "#F4F4F5",
      "text": "#F2F2F0",
      "muted": "#A1A1AA"
    }
  },
  {
    "key": "blush",
    "name": "Blush",
    "base": "#F7E1E6",
    "light": {
      "bg": "#FDF7F8",
      "surface": "#FFFFFF",
      "soft": "#F8E6EA",
      "border": "#E6DFE0",
      "accent": "#B0455D",
      "onAccent": "#FFFFFF",
      "ink": "#58232F",
      "text": "#17201F",
      "muted": "#5B6563"
    },
    "dark": {
      "bg": "#1A1113",
      "surface": "#261A1D",
      "soft": "#42242B",
      "border": "#3B2B2F",
      "accent": "#F7E1E6",
      "onAccent": "#17201F",
      "ink": "#F7E1E6",
      "text": "#F2F2F0",
      "muted": "#A9B0AE"
    }
  },
  {
    "key": "peach",
    "name": "Peach",
    "base": "#FFD6A5",
    "light": {
      "bg": "#FFF4E6",
      "surface": "#FFFFFF",
      "soft": "#FFDCB3",
      "border": "#EADAC3",
      "accent": "#9D6625",
      "onAccent": "#FFFFFF",
      "ink": "#634117",
      "text": "#17201F",
      "muted": "#5B6563"
    },
    "dark": {
      "bg": "#1A1611",
      "surface": "#26201A",
      "soft": "#423424",
      "border": "#3B342B",
      "accent": "#FFD6A5",
      "onAccent": "#17201F",
      "ink": "#FFD6A5",
      "text": "#F2F2F0",
      "muted": "#A9B0AE"
    }
  },
  {
    "key": "lilac",
    "name": "Lilac",
    "base": "#E6D6F7",
    "light": {
      "bg": "#F8F4FD",
      "surface": "#FFFFFF",
      "soft": "#EADCF8",
      "border": "#DFDAE8",
      "accent": "#793DB8",
      "onAccent": "#FFFFFF",
      "ink": "#3C1E5C",
      "text": "#17201F",
      "muted": "#5B6563"
    },
    "dark": {
      "bg": "#16111A",
      "surface": "#201A26",
      "soft": "#332442",
      "border": "#332B3B",
      "accent": "#E6D6F7",
      "onAccent": "#17201F",
      "ink": "#E6D6F7",
      "text": "#F2F2F0",
      "muted": "#A9B0AE"
    }
  },
  {
    "key": "sage",
    "name": "Sage",
    "base": "#D6EAD4",
    "light": {
      "bg": "#F4F9F3",
      "surface": "#FFFFFF",
      "soft": "#DCEDDA",
      "border": "#D8E3D8",
      "accent": "#437F3D",
      "onAccent": "#FFFFFF",
      "ink": "#2C5328",
      "text": "#17201F",
      "muted": "#5B6563"
    },
    "dark": {
      "bg": "#121A11",
      "surface": "#1B261A",
      "soft": "#264224",
      "border": "#2C3B2B",
      "accent": "#D6EAD4",
      "onAccent": "#17201F",
      "ink": "#D6EAD4",
      "text": "#F2F2F0",
      "muted": "#A9B0AE"
    }
  },
  {
    "key": "lemon",
    "name": "Lemon",
    "base": "#FEF3B0",
    "light": {
      "bg": "#FFFCE9",
      "surface": "#FFFFFF",
      "soft": "#FEF5BC",
      "border": "#EAE7C8",
      "accent": "#80721E",
      "onAccent": "#FFFFFF",
      "ink": "#635817",
      "text": "#17201F",
      "muted": "#5B6563"
    },
    "dark": {
      "bg": "#1A1911",
      "surface": "#26241A",
      "soft": "#423E24",
      "border": "#3B392B",
      "accent": "#FEF3B0",
      "onAccent": "#17201F",
      "ink": "#FEF3B0",
      "text": "#F2F2F0",
      "muted": "#A9B0AE"
    }
  },
  {
    "key": "mauve",
    "name": "Mauve",
    "base": "#E6D6E7",
    "light": {
      "bg": "#F8F4F8",
      "surface": "#FFFFFF",
      "soft": "#EADCEB",
      "border": "#DFDAE0",
      "accent": "#A050A5",
      "onAccent": "#FFFFFF",
      "ink": "#502853",
      "text": "#17201F",
      "muted": "#5B6563"
    },
    "dark": {
      "bg": "#1A111A",
      "surface": "#251A26",
      "soft": "#412442",
      "border": "#3A2B3B",
      "accent": "#E6D6E7",
      "onAccent": "#17201F",
      "ink": "#E6D6E7",
      "text": "#F2F2F0",
      "muted": "#A9B0AE"
    }
  },
  {
    "key": "coral",
    "name": "Coral",
    "base": "#FFC1B6",
    "light": {
      "bg": "#FFEEEB",
      "surface": "#FFFFFF",
      "soft": "#FFCAC1",
      "border": "#EAD0CA",
      "accent": "#C6452F",
      "onAccent": "#FFFFFF",
      "ink": "#632317",
      "text": "#17201F",
      "muted": "#5B6563"
    },
    "dark": {
      "bg": "#1A1211",
      "surface": "#261C1A",
      "soft": "#422824",
      "border": "#3B2D2B",
      "accent": "#FFC1B6",
      "onAccent": "#17201F",
      "ink": "#FFC1B6",
      "text": "#F2F2F0",
      "muted": "#A9B0AE"
    }
  },
  {
    "key": "aqua",
    "name": "Aqua",
    "base": "#D0F0ED",
    "light": {
      "bg": "#F2FBFA",
      "surface": "#FFFFFF",
      "soft": "#D7F2F0",
      "border": "#D5E6E3",
      "accent": "#377C75",
      "onAccent": "#FFFFFF",
      "ink": "#265550",
      "text": "#17201F",
      "muted": "#5B6563"
    },
    "dark": {
      "bg": "#111A1A",
      "surface": "#1A2625",
      "soft": "#24423F",
      "border": "#2B3B3A",
      "accent": "#D0F0ED",
      "onAccent": "#17201F",
      "ink": "#D0F0ED",
      "text": "#F2F2F0",
      "muted": "#A9B0AE"
    }
  },
  {
    "key": "sand",
    "name": "Sand",
    "base": "#EAD8B0",
    "light": {
      "bg": "#F9F4E9",
      "surface": "#FFFFFF",
      "soft": "#EDDEBC",
      "border": "#E1DBC8",
      "accent": "#876E35",
      "onAccent": "#FFFFFF",
      "ink": "#584723",
      "text": "#17201F",
      "muted": "#5B6563"
    },
    "dark": {
      "bg": "#1A1711",
      "surface": "#26221A",
      "soft": "#423924",
      "border": "#3B362B",
      "accent": "#EAD8B0",
      "onAccent": "#17201F",
      "ink": "#EAD8B0",
      "text": "#F2F2F0",
      "muted": "#A9B0AE"
    }
  },
  {
    "key": "sky",
    "name": "Sky",
    "base": "#DCE6F7",
    "light": {
      "bg": "#F5F8FD",
      "surface": "#FFFFFF",
      "soft": "#E1EAF8",
      "border": "#DAE1E8",
      "accent": "#416BB4",
      "onAccent": "#FFFFFF",
      "ink": "#20365A",
      "text": "#17201F",
      "muted": "#5B6563"
    },
    "dark": {
      "bg": "#11141A",
      "surface": "#1A1E26",
      "soft": "#242F42",
      "border": "#2B313B",
      "accent": "#DCE6F7",
      "onAccent": "#17201F",
      "ink": "#DCE6F7",
      "text": "#F2F2F0",
      "muted": "#A9B0AE"
    }
  }
];

// Màu trạng thái deadline — giữ quy ước cũ của OPM, chỉ đậm hơn một chút để dễ đọc (đã duyệt 16/10/2026).
// red: đến/quá deadline · orange: sát deadline · blue: chưa đến hạn · green: đã xong
export const STATUS_COLORS: Record<ThemeMode, { red: string; orange: string; blue: string; green: string }> = {
  light: { red: '#C63C3C', orange: '#B0650A', blue: '#4A6FA8', green: '#2E7D32' },
  dark: { red: '#F08A8A', orange: '#F0B25E', blue: '#9DB7E3', green: '#7CCB8A' }
};

export function themeByKey(key: string | null | undefined): ThemeDef {
  return THEMES.find((t) => t.key === key) ?? THEMES[0];
}
