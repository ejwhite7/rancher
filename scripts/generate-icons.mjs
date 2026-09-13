import "./generate-favicon.mjs";
import sharp from "sharp";
import { readFile, copyFile } from "node:fs/promises";
const logo = await readFile(
  new URL("../public/images/rancher-logo.svg", import.meta.url),
);
for (const [name, size] of [
  ["favicon-32", 32],
  ["apple-touch-icon", 180],
  ["icon-192", 192],
  ["icon-512", 512],
]) {
  const inset = Math.round(size * 0.18);
  const icon = await sharp(logo)
    .resize(size - inset * 2, size - inset * 2, { fit: "contain" })
    .png()
    .toBuffer();
  await sharp({
    create: { width: size, height: size, channels: 4, background: "#f7f6ee" },
  })
    .composite([{ input: icon, gravity: "centre" }])
    .png()
    .toFile(`public/${name}.png`);
}
const hero = await readFile(
  new URL("../src/components/Hero.astro", import.meta.url),
  "utf8",
);
const landscape = hero
  .match(/<svg[\s\S]*?<\/svg>/)[0]
  .replace("<svg ", '<svg xmlns="http://www.w3.org/2000/svg" ');
const art = await sharp(Buffer.from(landscape))
  .resize(440, 385)
  .png()
  .toBuffer();
const card = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#f7f6ee"/>
<text x="64" y="106" font-family="Arial" font-size="38" font-weight="700" fill="#193e34">rancher</text>
<text x="64" y="265" font-family="Georgia" font-size="46" fill="#193e34">Make Your Business Data</text>
<text x="64" y="340" font-family="Georgia" font-size="46" font-style="italic" fill="#6c824c">Work as Hard as You Do.</text>
<text x="64" y="408" font-family="Arial" font-size="21" fill="#657068">Turn everyday work into a new revenue opportunity.</text>
<path d="M64 526H1136" stroke="#d9dfd3"/>
<text x="64" y="570" font-family="Arial" font-size="18" fill="#193e34">Business data licensing. On your terms.</text>
</svg>`;
await sharp(Buffer.from(card))
  .composite([{ input: art, left: 742, top: 100 }])
  .png()
  .toFile("public/images/og-rancher-work-hard.png");

await copyFile(
  "public/images/og-rancher-work-hard.png",
  "public/images/og-rancher.png",
);
