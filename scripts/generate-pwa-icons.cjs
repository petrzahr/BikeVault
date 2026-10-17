// Generates the PNG icons referenced by src/app/manifest.ts from the same geometry as src/app/icon.svg.
// sharp is intentionally not a BikeVault dependency; run with any sharp install on NODE_PATH, e.g.:
//   $env:NODE_PATH = "..\CashPilot\node_modules"; node scripts/generate-pwa-icons.cjs
const path = require("path");
const sharp = require("sharp");

const publicDir = path.resolve(__dirname, "../public");

const glyph = (scale) => `
  <g transform="translate(256, 256) scale(${scale}) translate(-12, -12)" fill="none" stroke="#0f1113" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="18.5" cy="17.5" r="3.5" />
    <circle cx="5.5" cy="17.5" r="3.5" />
    <circle cx="15" cy="5" r="1" />
    <path d="M12 17.5V14l-3-3 4-3 2 3h2" />
  </g>`;

// "any" icon: burnt amber plate with sharp corners, identical to icon.svg
const anySvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" rx="48" ry="48" fill="#cc7a00" />${glyph(14)}
</svg>`;

// Maskable icon: full-bleed burnt amber, glyph kept inside the 80 % safe zone
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <rect width="512" height="512" fill="#cc7a00" />${glyph(12)}
</svg>`;

const outputs = [
  { name: "icon-192.png", svg: anySvg, size: 192 },
  { name: "icon-512.png", svg: anySvg, size: 512 },
  { name: "icon-maskable-512.png", svg: maskableSvg, size: 512 },
];

(async () => {
  for (const { name, svg, size } of outputs) {
    await sharp(Buffer.from(svg)).resize(size, size).png().toFile(path.join(publicDir, name));
    console.log(`Generated ${name} (${size}x${size})`);
  }
})().catch((err) => {
  console.error("Icon generation failed:", err);
  process.exit(1);
});
