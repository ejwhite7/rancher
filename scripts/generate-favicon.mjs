import sharp from "sharp";
import { readFile, writeFile } from "node:fs/promises";

const logo = await readFile(new URL("../public/images/rancher-logo.svg", import.meta.url));
const sizes = [16, 32, 48];
const images = await Promise.all(sizes.map(async (size) => {
  const inset = Math.round(size * 0.125);
  const mark = await sharp(logo).resize(size - inset * 2, size - inset * 2, { fit: "contain" }).png().toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: "#f7f6ee" } })
    .composite([{ input: mark, gravity: "centre" }]).png().toBuffer();
}));

// ICO directory followed by one PNG payload per resolution.
const directory = Buffer.alloc(6 + sizes.length * 16);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(sizes.length, 4);
let offset = directory.length;
images.forEach((image, index) => {
  const entry = 6 + index * 16;
  directory[entry] = sizes[index];
  directory[entry + 1] = sizes[index];
  directory.writeUInt16LE(1, entry + 4);
  directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(image.length, entry + 8);
  directory.writeUInt32LE(offset, entry + 12);
  offset += image.length;
});
await writeFile(new URL("../public/favicon.ico", import.meta.url), Buffer.concat([directory, ...images]));
