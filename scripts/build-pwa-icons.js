/**
 * PWA icon builder: generates icon images with logo on red background.
 * Run: node scripts/build-pwa-icons.js
 * Requires: npm install sharp (devDependency)
 */

const sharp = require("sharp");
const path = require("path");
const fs = require("fs");

const RED = { r: 185, g: 28, b: 28, alpha: 1 }; // #b91c1c
const SIZES = [192, 512];
const LOGO_PATH = path.join(process.cwd(), "public", "logo.png");
const OUT_DIR = path.join(process.cwd(), "public", "icons");

async function build() {
  if (!fs.existsSync(LOGO_PATH)) {
    console.error("Logo not found at public/logo.png");
    process.exit(1);
  }
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const logo = sharp(LOGO_PATH);
  const meta = await logo.metadata();
  const logoW = meta.width || 1;
  const logoH = meta.height || 1;

  for (const size of SIZES) {
    const padding = Math.round(size * 0.12);
    const inner = size - 2 * padding;
    const scale = Math.min(inner / logoW, inner / logoH, 1);
    const w = Math.round(logoW * scale);
    const h = Math.round(logoH * scale);
    const left = padding + (inner - w) / 2;
    const top = padding + (inner - h) / 2;

    const resizedLogo = await logo
      .clone()
      .resize(w, h, { fit: "inside" })
      .toBuffer();

    await sharp({
      create: {
        width: size,
        height: size,
        channels: 4,
        background: RED,
      },
    })
      .composite([{ input: resizedLogo, left: Math.round(left), top: Math.round(top) }])
      .png()
      .toFile(path.join(OUT_DIR, `icon-${size}.png`));

    console.log(`Generated public/icons/icon-${size}.png`);
  }
  console.log("PWA icons built. Update manifest to use /icons/icon-192.png and /icons/icon-512.png if needed.");
}

build().catch((err) => {
  console.error(err);
  process.exit(1);
});
