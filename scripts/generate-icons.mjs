/**
 * Rasterizes public/icons/*.svg → PNGs for PWA / iOS / Android maskable.
 * Run: npm run icons
 */
import sharp from "sharp";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const dir = join(__dirname, "../public/icons");

const standard = readFileSync(join(dir, "icon-source.svg"));
const maskable = readFileSync(join(dir, "icon-maskable.svg"));

await sharp(standard).resize(180, 180).png({ compressionLevel: 9 }).toFile(join(dir, "apple-touch-icon.png"));
await sharp(standard).resize(192, 192).png({ compressionLevel: 9 }).toFile(join(dir, "icon-192.png"));
await sharp(standard).resize(512, 512).png({ compressionLevel: 9 }).toFile(join(dir, "icon-512.png"));
await sharp(maskable).resize(512, 512).png({ compressionLevel: 9 }).toFile(join(dir, "icon-512-maskable.png"));

console.log("Wrote public/icons: apple-touch-icon.png, icon-192.png, icon-512.png, icon-512-maskable.png");
