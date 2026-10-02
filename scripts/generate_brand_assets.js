const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const sharp = require('sharp');

const CHROME_PATH = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT_DIR, '1to7-media-brand-assets');

// Ensure output directories exist
const DIRS = {
  root: OUTPUT_DIR,
  fullLogo: path.join(OUTPUT_DIR, '01-Full-Logo'),
  fullLogoSvg: path.join(OUTPUT_DIR, '01-Full-Logo', 'SVG'),
  fullLogoPngTransparent: path.join(OUTPUT_DIR, '01-Full-Logo', 'PNG-Transparent'),
  fullLogoPngWhiteBg: path.join(OUTPUT_DIR, '01-Full-Logo', 'PNG-White-Background'),
  fullLogoPngDarkBg: path.join(OUTPUT_DIR, '01-Full-Logo', 'PNG-Dark-Background'),
  icon: path.join(OUTPUT_DIR, '02-Logo-Icon'),
  iconSvg: path.join(OUTPUT_DIR, '02-Logo-Icon', 'SVG'),
  iconPngTransparent: path.join(OUTPUT_DIR, '02-Logo-Icon', 'PNG-Transparent'),
  iconPngWhiteBg: path.join(OUTPUT_DIR, '02-Logo-Icon', 'PNG-White-Background'),
  iconPngDarkBg: path.join(OUTPUT_DIR, '02-Logo-Icon', 'PNG-Dark-Background'),
};

for (const dir of Object.values(DIRS)) {
  fs.mkdirSync(dir, { recursive: true });
}

// 1. Read existing SVG files
const origLogoSvg = fs.readFileSync(path.join(ROOT_DIR, 'public', 'logo.svg'), 'utf8');
const origIconSvg = fs.readFileSync(path.join(ROOT_DIR, 'public', 'logo-icon.svg'), 'utf8');

// 2. Create standalone SVG files with embedded Inter font definition so they look perfect in any viewer
const enhancedIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100" fill="none">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@900&amp;display=swap');
      text { font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    </style>
    <!-- Background Gradient -->
    <linearGradient id="bg-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFB800" />
      <stop offset="45%" stop-color="#FF5E36" />
      <stop offset="100%" stop-color="#F50057" />
    </linearGradient>

    <!-- Sparkle Glow Filter -->
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2.5" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>

    <!-- Text Gradient 1 -->
    <linearGradient id="num1-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1E293B" />
      <stop offset="100%" stop-color="#0F172A" />
    </linearGradient>

    <!-- Text Gradient 7 -->
    <linearGradient id="num7-grad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#F8FAFC" />
    </linearGradient>

    <!-- Master Circle Clip -->
    <clipPath id="circle-clip">
      <circle cx="50" cy="50" r="50" />
    </clipPath>
  </defs>

  <!-- Group clipped to perfect circle -->
  <g clip-path="url(#circle-clip)">
    <!-- Main Full Background Circle -->
    <circle cx="50" cy="50" r="50" fill="url(#bg-grad)" />
    <circle cx="50" cy="50" r="48" stroke="#FFFFFF" stroke-opacity="0.3" stroke-width="2.5" />

    <!-- Monogram Text Elements: 1 ⚡ 7 -->
    <g font-weight="900">
      <!-- Number 1 -->
      <text x="21" y="65" font-size="44" fill="url(#num1-grad)" letter-spacing="-2">1</text>
      
      <!-- Bolt Symbol -->
      <path d="M48 31 L39 52 H48 L45 68 L58 46 H49 L52 31 Z" fill="#FFFFFF" filter="url(#glow)" />

      <!-- Number 7 -->
      <text x="57" y="65" font-size="44" fill="url(#num7-grad)" letter-spacing="-2">7</text>
    </g>

    <!-- Inner Sparkle Star -->
    <g transform="translate(68, 14)">
      <circle cx="8" cy="8" r="8" fill="#FFC107" stroke="#FFFFFF" stroke-width="1.5" />
      <path d="M8 2 L9.5 6 L13.5 8 L9.5 10 L8 14 L6.5 10 L2.5 8 L6.5 6 Z" fill="#000000" />
    </g>
  </g>
</svg>
`;

const enhancedLogoSvgWide = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 80" width="320" height="80" fill="none">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@800;900&amp;display=swap');
      text { font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    </style>
    <!-- Background Gradient for Badge -->
    <linearGradient id="badge-grad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFB800" />
      <stop offset="50%" stop-color="#FF5E36" />
      <stop offset="100%" stop-color="#F50057" />
    </linearGradient>

    <!-- Number 1 Gradient -->
    <linearGradient id="num1-text-grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FFC107" />
      <stop offset="100%" stop-color="#FF9800" />
    </linearGradient>

    <!-- Number 7 Gradient -->
    <linearGradient id="num7-text-grad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FF2E63" />
      <stop offset="100%" stop-color="#E91E63" />
    </linearGradient>

    <!-- Glow Filter -->
    <filter id="glow-bolt" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Left Circular Icon Badge (64x64) -->
  <g transform="translate(8, 8)">
    <circle cx="32" cy="32" r="30" fill="url(#badge-grad)" />
    <circle cx="32" cy="32" r="30" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="2" />
    
    <!-- Monogram 1 ⚡ 7 inside Badge -->
    <g font-weight="900">
      <text x="12" y="45" font-size="30" fill="#0F172A">1</text>
      <path d="M33 22 L27 36 H33 L31 47 L40 32 H34 L36 22 Z" fill="#FFFFFF" filter="url(#glow-bolt)" />
      <text x="39" y="45" font-size="30" fill="#FFFFFF">7</text>
    </g>

    <!-- Top Right Sparkle Star -->
    <g transform="translate(48, 2)">
      <circle cx="6" cy="6" r="6" fill="#FFC107" stroke="#FFFFFF" stroke-width="1" />
      <path d="M6 1 L7.5 4.5 L11 6 L7.5 7.5 L6 11 L4.5 7.5 L1 6 L4.5 4.5 Z" fill="#000000" />
    </g>
  </g>

  <!-- Right Brand Typography -->
  <g transform="translate(86, 0)">
    <!-- 1 -->
    <text x="0" y="48" font-weight="900" font-size="44" fill="url(#num1-text-grad)" letter-spacing="-1">1</text>
    
    <!-- 'to' Pill Badge -->
    <g transform="translate(26, 22)">
      <rect x="0" y="0" width="26" height="20" rx="6" fill="#F50057" />
      <text x="13" y="14" font-weight="900" font-style="italic" font-size="12" fill="#FFFFFF" text-anchor="middle">to</text>
    </g>

    <!-- 7 -->
    <text x="56" y="48" font-weight="900" font-size="44" fill="url(#num7-text-grad)" letter-spacing="-1">7</text>

    <!-- MEDIA Subtitle -->
    <text x="2" y="66" font-weight="800" font-size="12" fill="#94A3B8" letter-spacing="6">MEDIA</text>
  </g>
</svg>
`;

// Fitted SVG: tight bounding box without blank right side
const enhancedLogoSvgFitted = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 190 76" width="190" height="76" fill="none">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@800;900&amp;display=swap');
      text { font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
    </style>
    <!-- Background Gradient for Badge -->
    <linearGradient id="badge-grad-fit" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFB800" />
      <stop offset="50%" stop-color="#FF5E36" />
      <stop offset="100%" stop-color="#F50057" />
    </linearGradient>

    <!-- Number 1 Gradient -->
    <linearGradient id="num1-text-grad-fit" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FFC107" />
      <stop offset="100%" stop-color="#FF9800" />
    </linearGradient>

    <!-- Number 7 Gradient -->
    <linearGradient id="num7-text-grad-fit" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#FF2E63" />
      <stop offset="100%" stop-color="#E91E63" />
    </linearGradient>

    <!-- Glow Filter -->
    <filter id="glow-bolt-fit" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="2" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Left Circular Icon Badge (64x64) -->
  <g transform="translate(6, 6)">
    <circle cx="32" cy="32" r="30" fill="url(#badge-grad-fit)" />
    <circle cx="32" cy="32" r="30" stroke="#FFFFFF" stroke-opacity="0.35" stroke-width="2" />
    
    <!-- Monogram 1 ⚡ 7 inside Badge -->
    <g font-weight="900">
      <text x="12" y="45" font-size="30" fill="#0F172A">1</text>
      <path d="M33 22 L27 36 H33 L31 47 L40 32 H34 L36 22 Z" fill="#FFFFFF" filter="url(#glow-bolt-fit)" />
      <text x="39" y="45" font-size="30" fill="#FFFFFF">7</text>
    </g>

    <!-- Top Right Sparkle Star -->
    <g transform="translate(48, 2)">
      <circle cx="6" cy="6" r="6" fill="#FFC107" stroke="#FFFFFF" stroke-width="1" />
      <path d="M6 1 L7.5 4.5 L11 6 L7.5 7.5 L6 11 L4.5 7.5 L1 6 L4.5 4.5 Z" fill="#000000" />
    </g>
  </g>

  <!-- Right Brand Typography -->
  <g transform="translate(84, -2)">
    <!-- 1 -->
    <text x="0" y="48" font-weight="900" font-size="44" fill="url(#num1-text-grad-fit)" letter-spacing="-1">1</text>
    
    <!-- 'to' Pill Badge -->
    <g transform="translate(26, 22)">
      <rect x="0" y="0" width="26" height="20" rx="6" fill="#F50057" />
      <text x="13" y="14" font-weight="900" font-style="italic" font-size="12" fill="#FFFFFF" text-anchor="middle">to</text>
    </g>

    <!-- 7 -->
    <text x="56" y="48" font-weight="900" font-size="44" fill="url(#num7-text-grad-fit)" letter-spacing="-1">7</text>

    <!-- MEDIA Subtitle -->
    <text x="2" y="66" font-weight="800" font-size="12" fill="#94A3B8" letter-spacing="6">MEDIA</text>
  </g>
</svg>
`;

// Save SVGs
fs.writeFileSync(path.join(DIRS.iconSvg, '1to7media-icon.svg'), enhancedIconSvg);
fs.writeFileSync(path.join(DIRS.fullLogoSvg, '1to7media-logo.svg'), enhancedLogoSvgFitted);
fs.writeFileSync(path.join(DIRS.fullLogoSvg, '1to7media-logo-wide.svg'), enhancedLogoSvgWide);
console.log('Saved SVG files.');

// Helper to render HTML to PNG via Chrome Headless
function renderHtmlWithChrome(htmlFilePath, outputPngPath, width, height) {
  const fileUrl = `file:///${htmlFilePath.replace(/\\/g, '/')}`;
  const cmd = `"${CHROME_PATH}" --headless=new --no-sandbox --disable-gpu --screenshot="${outputPngPath}" --window-size=${width},${height} --default-background-color=00000000 --hide-scrollbars --virtual-time-budget=3000 "${fileUrl}"`;
  execSync(cmd, { stdio: 'inherit' });
}

async function main() {
  const scratchDir = path.join(ROOT_DIR, 'scratch_render');
  fs.mkdirSync(scratchDir, { recursive: true });

  // 1. RENDER ICON AT 2048x2048
  const iconHtml = `<!DOCTYPE html>
  <html>
  <head>
  <meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 0; background: transparent; overflow: hidden; width: 2048px; height: 2048px; }
    svg { width: 100%; height: 100%; display: block; }
  </style>
  </head>
  <body>
    ${origIconSvg}
  </body>
  </html>`;

  const iconHtmlPath = path.join(scratchDir, 'icon_render.html');
  const iconMasterPng = path.join(scratchDir, 'icon_master_2048.png');
  fs.writeFileSync(iconHtmlPath, iconHtml);
  console.log('Rendering master icon via Chrome...');
  renderHtmlWithChrome(iconHtmlPath, iconMasterPng, 2048, 2048);

  // 2. RENDER FULL LOGO AT HIGH RESOLUTION
  const logoHtml = `<!DOCTYPE html>
  <html>
  <head>
  <meta charset="utf-8">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 0;
      background: transparent;
      overflow: hidden;
      width: 2560px;
      height: 640px;
    }
    svg {
      width: 100%;
      height: 100%;
      display: block;
    }
  </style>
  </head>
  <body>
    ${origLogoSvg}
  </body>
  </html>`;

  const logoHtmlPath = path.join(scratchDir, 'logo_render.html');
  const logoMasterPng = path.join(scratchDir, 'logo_master_raw.png');
  fs.writeFileSync(logoHtmlPath, logoHtml);
  console.log('Rendering master logo via Chrome...');
  renderHtmlWithChrome(logoHtmlPath, logoMasterPng, 2560, 640);

  // Trim transparent void from logo to make it cleanly cropped
  console.log('Trimming and processing full logo variations...');
  const trimmedLogoBuffer = await sharp(logoMasterPng)
    .trim()
    .toBuffer();

  const trimmedMeta = await sharp(trimmedLogoBuffer).metadata();
  console.log(`Trimmed logo dimensions: ${trimmedMeta.width}x${trimmedMeta.height}`);

  // Generate Full Logo Variations:
  // Transparent PNGs: 4K (~2500w), 2K (~1400w), 1080p (~800w), sm (~400w)
  await sharp(trimmedLogoBuffer)
    .resize(2400, null, { fit: 'inside' })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(DIRS.fullLogoPngTransparent, '1to7media-logo-4k.png'));

  await sharp(trimmedLogoBuffer)
    .resize(1400, null, { fit: 'inside' })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(DIRS.fullLogoPngTransparent, '1to7media-logo-2k.png'));

  await sharp(trimmedLogoBuffer)
    .resize(800, null, { fit: 'inside' })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(DIRS.fullLogoPngTransparent, '1to7media-logo-1080p.png'));

  await sharp(trimmedLogoBuffer)
    .resize(400, null, { fit: 'inside' })
    .png({ quality: 100, compressionLevel: 9 })
    .toFile(path.join(DIRS.fullLogoPngTransparent, '1to7media-logo-preview.png'));

  // White Background Full Logos (with comfortable padding)
  const padWhite4k = await sharp(trimmedLogoBuffer)
    .resize(2400, null, { fit: 'inside' })
    .extend({ top: 120, bottom: 120, left: 160, right: 160, background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png({ quality: 100 })
    .toFile(path.join(DIRS.fullLogoPngWhiteBg, '1to7media-logo-white-bg-4k.png'));

  const padWhite2k = await sharp(trimmedLogoBuffer)
    .resize(1400, null, { fit: 'inside' })
    .extend({ top: 70, bottom: 70, left: 90, right: 90, background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png({ quality: 100 })
    .toFile(path.join(DIRS.fullLogoPngWhiteBg, '1to7media-logo-white-bg-2k.png'));

  // Dark Background Full Logos (with comfortable padding)
  const darkColor = { r: 15, g: 23, b: 42, alpha: 1 }; // Slate 900 #0F172A
  await sharp(trimmedLogoBuffer)
    .resize(2400, null, { fit: 'inside' })
    .extend({ top: 120, bottom: 120, left: 160, right: 160, background: darkColor })
    .png({ quality: 100 })
    .toFile(path.join(DIRS.fullLogoPngDarkBg, '1to7media-logo-dark-bg-4k.png'));

  await sharp(trimmedLogoBuffer)
    .resize(1400, null, { fit: 'inside' })
    .extend({ top: 70, bottom: 70, left: 90, right: 90, background: darkColor })
    .png({ quality: 100 })
    .toFile(path.join(DIRS.fullLogoPngDarkBg, '1to7media-logo-dark-bg-2k.png'));

  console.log('Full logo PNG variations created.');

  // Generate Icon Variations:
  // Sizes: 1024, 512, 256, 128, 64, 32
  console.log('Processing icon variations...');
  const iconSizes = [
    { size: 1024, name: '1to7media-icon-1024x1024.png' },
    { size: 512, name: '1to7media-icon-512x512.png' },
    { size: 256, name: '1to7media-icon-256x256.png' },
    { size: 128, name: '1to7media-icon-128x128.png' },
    { size: 64, name: '1to7media-icon-64x64.png' },
    { size: 32, name: '1to7media-favicon-32x32.png' },
  ];

  for (const item of iconSizes) {
    await sharp(iconMasterPng)
      .resize(item.size, item.size)
      .png({ quality: 100, compressionLevel: 9 })
      .toFile(path.join(DIRS.iconPngTransparent, item.name));
  }

  // Icon White Background
  await sharp(iconMasterPng)
    .resize(900, 900)
    .extend({ top: 62, bottom: 62, left: 62, right: 62, background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png({ quality: 100 })
    .toFile(path.join(DIRS.iconPngWhiteBg, '1to7media-icon-white-1024x1024.png'));

  await sharp(iconMasterPng)
    .resize(450, 450)
    .extend({ top: 31, bottom: 31, left: 31, right: 31, background: { r: 255, g: 255, b: 255, alpha: 1 } })
    .png({ quality: 100 })
    .toFile(path.join(DIRS.iconPngWhiteBg, '1to7media-icon-white-512x512.png'));

  // Icon Dark Background
  await sharp(iconMasterPng)
    .resize(900, 900)
    .extend({ top: 62, bottom: 62, left: 62, right: 62, background: darkColor })
    .png({ quality: 100 })
    .toFile(path.join(DIRS.iconPngDarkBg, '1to7media-icon-dark-1024x1024.png'));

  await sharp(iconMasterPng)
    .resize(450, 450)
    .extend({ top: 31, bottom: 31, left: 31, right: 31, background: darkColor })
    .png({ quality: 100 })
    .toFile(path.join(DIRS.iconPngDarkBg, '1to7media-icon-dark-512x512.png'));

  console.log('Icon variations created.');

  // Create README documentation
  const readmeContent = `# 1to7 MEDIA — Official Brand Assets Package

This package contains the official vector and raster brand identity assets for **1to7 Media**, tailored for presentations, websites, pitch decks, mobile applications, social media, and print materials.

---

## 📁 Package Directory Structure

\`\`\`
1to7-media-brand-assets/
├── 01-Full-Logo/
│   ├── SVG/
│   │   ├── 1to7media-logo.svg             (Fitted vector - Recommended for UI/Web/Presentations)
│   │   └── 1to7media-logo-wide.svg        (Original wide canvas format)
│   ├── PNG-Transparent/
│   │   ├── 1to7media-logo-4k.png          (Ultra-HD / 2400px - Perfect for print & large banners)
│   │   ├── 1to7media-logo-2k.png          (High-res / 1400px - Ideal for pitch decks & keynotes)
│   │   ├── 1to7media-logo-1080p.png       (Standard / 800px - Great for websites & emails)
│   │   └── 1to7media-logo-preview.png     (Compact / 400px - Small headers & footers)
│   ├── PNG-White-Background/
│   │   ├── 1to7media-logo-white-bg-4k.png (4K with crisp white padding for Word/PDFs)
│   │   └── 1to7media-logo-white-bg-2k.png (2K with crisp white padding)
│   └── PNG-Dark-Background/
│       ├── 1to7media-logo-dark-bg-4k.png  (4K on Slate #0F172A background for dark decks)
│       └── 1to7media-logo-dark-bg-2k.png  (2K on Slate #0F172A background)
│
├── 02-Logo-Icon/
│   ├── SVG/
│   │   └── 1to7media-icon.svg             (Vector circle badge monogram with 1 ⚡ 7)
│   ├── PNG-Transparent/
│   │   ├── 1to7media-icon-1024x1024.png   (Master retina app icon resolution)
│   │   ├── 1to7media-icon-512x512.png     (PWA & standard high-res avatar)
│   │   ├── 1to7media-icon-256x256.png     (Social profile pictures - Twitter, Instagram, LinkedIn)
│   │   ├── 1to7media-icon-128x128.png     (Medium UI badge)
│   │   ├── 1to7media-icon-64x64.png       (Small avatar)
│   │   └── 1to7media-favicon-32x32.png    (Website favicon)
│   ├── PNG-White-Background/
│   │   ├── 1to7media-icon-white-1024x1024.png
│   │   └── 1to7media-icon-white-512x512.png
│   └── PNG-Dark-Background/
│       ├── 1to7media-icon-dark-1024x1024.png
│       └── 1to7media-icon-dark-512x512.png
│
├── preview.html                           (Interactive HTML showcase to preview and copy hex codes)
└── README.md                              (This guide)
\`\`\`

---

## 🎨 Brand Color Palette

| Name | Hex Code | Preview | Usage |
| :--- | :--- | :--- | :--- |
| **Amber Gold** | \`#FFB800\` | 🟨 | Badge gradient start & sparkle highlight |
| **Coral Orange** | \`#FF5E36\` | 🟧 | Badge gradient midpoint |
| **Hot Pink** | \`#F50057\` | 🟥 | Badge gradient end & "to" pill badge |
| **Gold Yellow** | \`#FFC107\` | 🟨 | Number 1 typography gradient start & star |
| **Vivid Orange**| \`#FF9800\` | 🟧 | Number 1 typography gradient end |
| **Electric Pink**| \`#FF2E63\`| 🟥 | Number 7 typography gradient start |
| **Deep Magenta**| \`#E91E63\`| 🟪 | Number 7 typography gradient end |
| **Midnight Navy**| \`#0F172A\`| ⬛ | Badge monogram 1 fill & Dark BG |
| **Slate Gray** | \`#94A3B8\` | ⬜ | "MEDIA" subtitle typography |
| **Pure White** | \`#FFFFFF\` | ⬜ | Lightning bolt fill, badge stroke & star stroke |

---

## ✍️ Brand Typography
- **Primary Font Family:** Inter / system-ui, sans-serif
- **"1" and "7" Numbers:** Inter Black 900
- **"to" Pill:** Inter Black 900 Italic
- **"MEDIA" Subtitle:** Inter ExtraBold 800 with \`letter-spacing: 6px\`

---

## 🚀 Quick Usage Guide

1. **For Word Documents, PDFs, and Light Pitch Decks:**
   Use files from \`01-Full-Logo/PNG-White-Background/\` or \`PNG-Transparent/\`.

2. **For Dark Keynotes, Pitch Decks, and Dark Websites:**
   Use files from \`01-Full-Logo/PNG-Dark-Background/\` or \`PNG-Transparent/\`.

3. **For Web Development & Designers (Figma / Illustrator):**
   Use \`01-Full-Logo/SVG/1to7media-logo.svg\` and \`02-Logo-Icon/SVG/1to7media-icon.svg\` (infinitely scalable vectors).

4. **For App Store, Google Play, WhatsApp, Twitter, and LinkedIn:**
   Use \`02-Logo-Icon/PNG-Transparent/1to7media-icon-1024x1024.png\` or \`512x512.png\`.
`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'README.md'), readmeContent);
  console.log('README.md written.');

  // Create an interactive, gorgeous preview.html
  const previewHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>1to7 Media — Brand Assets & Logo Showcase</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #090D16;
      --card-bg: #111827;
      --card-border: #1F2937;
      --text-main: #F9FAFB;
      --text-muted: #9CA3AF;
      --accent: #F50057;
      --amber: #FFB800;
      --coral: #FF5E36;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Inter', sans-serif;
      background: var(--bg);
      color: var(--text-main);
      min-height: 100vh;
      padding: 40px 20px 80px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
    }
    header {
      text-align: center;
      margin-bottom: 48px;
    }
    .badge {
      display: inline-block;
      padding: 6px 16px;
      background: linear-gradient(135deg, rgba(255, 184, 0, 0.15), rgba(245, 0, 87, 0.15));
      border: 1px solid rgba(245, 0, 87, 0.3);
      color: #FF5E36;
      border-radius: 999px;
      font-size: 13px;
      font-weight: 700;
      letter-spacing: 1px;
      text-transform: uppercase;
      margin-bottom: 16px;
    }
    h1 {
      font-size: 38px;
      font-weight: 900;
      letter-spacing: -0.5px;
      margin-bottom: 12px;
      background: linear-gradient(135deg, #FFB800, #FF5E36, #F50057);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    p.lead {
      color: var(--text-muted);
      font-size: 17px;
      max-width: 600px;
      margin: 0 auto;
      line-height: 1.6;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(360px, 1fr));
      gap: 28px;
      margin-bottom: 48px;
    }
    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      overflow: hidden;
      display: flex;
      flex-direction: column;
      box-shadow: 0 10px 30px rgba(0,0,0,0.3);
      transition: transform 0.2s ease, border-color 0.2s ease;
    }
    .card:hover {
      transform: translateY(-4px);
      border-color: #374151;
    }
    .card-preview {
      height: 240px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 30px;
      position: relative;
    }
    .preview-transparent {
      background-color: #1a2233;
      background-image: 
        linear-gradient(45deg, #131926 25%, transparent 25%), 
        linear-gradient(-45deg, #131926 25%, transparent 25%), 
        linear-gradient(45deg, transparent 75%, #131926 75%), 
        linear-gradient(-45deg, transparent 75%, #131926 75%);
      background-size: 20px 20px;
      background-position: 0 0, 0 10px, 10px -10px, -10px 0px;
    }
    .preview-light {
      background: #FFFFFF;
    }
    .preview-dark {
      background: #0F172A;
    }
    .card-preview img {
      max-width: 90%;
      max-height: 85%;
      object-fit: contain;
      filter: drop-shadow(0 4px 12px rgba(0,0,0,0.15));
    }
    .card-body {
      padding: 24px;
      flex: 1;
      display: flex;
      flex-direction: column;
    }
    .card-title {
      font-size: 19px;
      font-weight: 800;
      margin-bottom: 6px;
    }
    .card-desc {
      font-size: 14px;
      color: var(--text-muted);
      margin-bottom: 20px;
      line-height: 1.5;
    }
    .asset-list {
      margin-top: auto;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 16px;
      background: #1F2937;
      color: #F9FAFB;
      text-decoration: none;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      transition: background 0.15s ease, transform 0.15s ease;
      border: 1px solid rgba(255,255,255,0.06);
    }
    .btn:hover {
      background: #374151;
      transform: translateY(-1px);
    }
    .btn-primary {
      background: linear-gradient(135deg, #FF5E36, #F50057);
      border: none;
      color: #FFFFFF;
      font-weight: 700;
    }
    .btn-primary:hover {
      background: linear-gradient(135deg, #FF6B47, #FA1A6D);
    }
    .palette-section {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 20px;
      padding: 32px;
      margin-bottom: 48px;
    }
    .palette-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
      gap: 16px;
      margin-top: 20px;
    }
    .swatch {
      border-radius: 12px;
      padding: 16px;
      cursor: pointer;
      transition: transform 0.2s ease;
      display: flex;
      flex-direction: column;
      justify-content: flex-end;
      height: 120px;
      box-shadow: 0 4px 10px rgba(0,0,0,0.2);
    }
    .swatch:hover {
      transform: scale(1.03);
    }
    .swatch-hex {
      font-size: 13px;
      font-weight: 800;
      font-family: monospace;
      letter-spacing: 0.5px;
    }
    .swatch-name {
      font-size: 11px;
      font-weight: 600;
      opacity: 0.85;
      margin-top: 2px;
    }
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: #10B981;
      color: white;
      padding: 12px 24px;
      border-radius: 10px;
      font-size: 14px;
      font-weight: 700;
      opacity: 0;
      transform: translateY(20px);
      transition: opacity 0.3s ease, transform 0.3s ease;
      pointer-events: none;
      box-shadow: 0 10px 25px rgba(0,0,0,0.4);
    }
    .toast.show {
      opacity: 1;
      transform: translateY(0);
    }
    footer {
      text-align: center;
      color: #6B7280;
      font-size: 14px;
      margin-top: 40px;
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="badge">Official Brand Package</div>
      <h1>1to7 Media Brand Assets</h1>
      <p class="lead">Complete high-definition logo package prepared for presentations, web, mobile, marketing decks, and print.</p>
    </header>

    <div class="grid">
      <!-- 1. Full Horizontal Logo (Transparent) -->
      <div class="card">
        <div class="card-preview preview-transparent">
          <img src="01-Full-Logo/PNG-Transparent/1to7media-logo-2k.png" alt="1to7 Media Full Logo">
        </div>
        <div class="card-body">
          <h2 class="card-title">Full Horizontal Logo</h2>
          <p class="card-desc">Primary brand identity lockup featuring the circular badge and brand typography. Transparent background.</p>
          <div class="asset-list">
            <a href="01-Full-Logo/SVG/1to7media-logo.svg" download class="btn btn-primary">Download SVG (Vector)</a>
            <a href="01-Full-Logo/PNG-Transparent/1to7media-logo-4k.png" download class="btn">Download Ultra-HD 4K PNG</a>
            <a href="01-Full-Logo/PNG-Transparent/1to7media-logo-2k.png" download class="btn">Download Presentation 2K PNG</a>
            <a href="01-Full-Logo/PNG-Transparent/1to7media-logo-1080p.png" download class="btn">Download Web 1080p PNG</a>
          </div>
        </div>
      </div>

      <!-- 2. Logo Icon / Monogram (Transparent) -->
      <div class="card">
        <div class="card-preview preview-transparent">
          <img src="02-Logo-Icon/PNG-Transparent/1to7media-icon-512x512.png" alt="1to7 Media Icon">
        </div>
        <div class="card-body">
          <h2 class="card-title">Brand Icon & Monogram</h2>
          <p class="card-desc">Circular monogram badge with glowing lightning bolt and star. Ideal for app icon, favicon, and social profiles.</p>
          <div class="asset-list">
            <a href="02-Logo-Icon/SVG/1to7media-icon.svg" download class="btn btn-primary">Download SVG (Vector)</a>
            <a href="02-Logo-Icon/PNG-Transparent/1to7media-icon-1024x1024.png" download class="btn">Download 1024x1024 PNG (Retina)</a>
            <a href="02-Logo-Icon/PNG-Transparent/1to7media-icon-512x512.png" download class="btn">Download 512x512 PNG (App Icon)</a>
            <a href="02-Logo-Icon/PNG-Transparent/1to7media-icon-256x256.png" download class="btn">Download 256x256 PNG (Avatar)</a>
          </div>
        </div>
      </div>

      <!-- 3. Full Logo (Light Card / White BG) -->
      <div class="card">
        <div class="card-preview preview-light">
          <img src="01-Full-Logo/PNG-White-Background/1to7media-logo-white-bg-2k.png" alt="1to7 Media White Background">
        </div>
        <div class="card-body">
          <h2 class="card-title">Full Logo (Light Decks / Word)</h2>
          <p class="card-desc">With comfortable crisp white padding, ready to paste straight into Word, PowerPoint, pitch decks, and PDFs.</p>
          <div class="asset-list">
            <a href="01-Full-Logo/PNG-White-Background/1to7media-logo-white-bg-4k.png" download class="btn">Download 4K White BG PNG</a>
            <a href="01-Full-Logo/PNG-White-Background/1to7media-logo-white-bg-2k.png" download class="btn">Download 2K White BG PNG</a>
          </div>
        </div>
      </div>

      <!-- 4. Full Logo (Dark Card / Navy BG) -->
      <div class="card">
        <div class="card-preview preview-dark">
          <img src="01-Full-Logo/PNG-Dark-Background/1to7media-logo-dark-bg-2k.png" alt="1to7 Media Dark Background">
        </div>
        <div class="card-body">
          <h2 class="card-title">Full Logo (Dark Mode Decks)</h2>
          <p class="card-desc">Optimized on Slate Midnight (#0F172A) for sleek dark-themed keynote slides, websites, and displays.</p>
          <div class="asset-list">
            <a href="01-Full-Logo/PNG-Dark-Background/1to7media-logo-dark-bg-4k.png" download class="btn">Download 4K Dark BG PNG</a>
            <a href="01-Full-Logo/PNG-Dark-Background/1to7media-logo-dark-bg-2k.png" download class="btn">Download 2K Dark BG PNG</a>
          </div>
        </div>
      </div>
    </div>

    <!-- Palette Section -->
    <div class="palette-section">
      <h2 style="font-size: 22px; font-weight: 800;">Official Color Palette (Click to Copy HEX)</h2>
      <p style="color: var(--text-muted); font-size: 14px; margin-top: 4px;">Click any color swatch to instantly copy its color code to your clipboard.</p>
      
      <div class="palette-grid">
        <div class="swatch" style="background: #FFB800; color: #000;" onclick="copyHex('#FFB800')">
          <span class="swatch-hex">#FFB800</span>
          <span class="swatch-name">Amber Gold</span>
        </div>
        <div class="swatch" style="background: #FF5E36; color: #FFF;" onclick="copyHex('#FF5E36')">
          <span class="swatch-hex">#FF5E36</span>
          <span class="swatch-name">Coral Orange</span>
        </div>
        <div class="swatch" style="background: #F50057; color: #FFF;" onclick="copyHex('#F50057')">
          <span class="swatch-hex">#F50057</span>
          <span class="swatch-name">Hot Pink</span>
        </div>
        <div class="swatch" style="background: #FFC107; color: #000;" onclick="copyHex('#FFC107')">
          <span class="swatch-hex">#FFC107</span>
          <span class="swatch-name">Gold Yellow</span>
        </div>
        <div class="swatch" style="background: #FF2E63; color: #FFF;" onclick="copyHex('#FF2E63')">
          <span class="swatch-hex">#FF2E63</span>
          <span class="swatch-name">Electric Pink</span>
        </div>
        <div class="swatch" style="background: #0F172A; color: #FFF; border: 1px solid #334155;" onclick="copyHex('#0F172A')">
          <span class="swatch-hex">#0F172A</span>
          <span class="swatch-name">Midnight Navy</span>
        </div>
        <div class="swatch" style="background: #94A3B8; color: #000;" onclick="copyHex('#94A3B8')">
          <span class="swatch-hex">#94A3B8</span>
          <span class="swatch-name">Slate Gray</span>
        </div>
      </div>
    </div>

    <footer>
      1to7 Media Brand Guidelines & Identity Assets • Ready to share with team & management
    </footer>
  </div>

  <div id="toast" class="toast">Copied to clipboard!</div>

  <script>
    function copyHex(hex) {
      navigator.clipboard.writeText(hex).then(() => {
        const toast = document.getElementById('toast');
        toast.textContent = 'Copied ' + hex + ' to clipboard!';
        toast.classList.add('show');
        setTimeout(() => toast.classList.remove('show'), 2000);
      });
    }
  </script>
</body>
</html>
`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'preview.html'), previewHtml);
  console.log('preview.html written.');

  console.log('All files created successfully!');
}

main().catch(console.error);
