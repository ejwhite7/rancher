import "./generate-favicon.mjs";
import sharp from "sharp";
import { readFile } from "node:fs/promises";
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
  .resize(540, 473)
  .png()
  .toBuffer();
const card = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
<rect width="1200" height="630" fill="#f7f6ee"/>
<text x="64" y="106" font-family="Arial" font-size="38" font-weight="700" fill="#193e34">rancher</text>
<text x="64" y="265" font-family="Georgia" font-size="62" fill="#193e34">Your business data.</text>
<text x="64" y="340" font-family="Georgia" font-size="62" font-style="italic" fill="#6c824c">A second harvest.</text>
<text x="64" y="408" font-family="Arial" font-size="21" fill="#657068">Turn everyday work into a new opportunity.</text>
<path d="M64 526H1136" stroke="#d9dfd3"/>
<text x="64" y="570" font-family="Arial" font-size="18" fill="#193e34">Business data. New possibilities.</text>
</svg>`;
await sharp(Buffer.from(card))
  .composite([{ input: art, left: 650, top: 65 }])
  .png()
  .toFile("public/images/og-rancher.png");
