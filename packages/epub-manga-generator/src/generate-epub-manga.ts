import * as nodepub from "nodepub-rtl";
import * as _sharp from "sharp";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

const sharp = (_sharp as any).default as typeof _sharp;

const getPageFilename = (page: string, suffix?: "1" | "2") => {
  const filename = page
    .split("/")
    .pop()!
    .replace(/\.jpg$/, "");
  return `${filename}${suffix ? "-" + suffix : ""}.jpg`;
};

const fit = "contain";

/**
 * Generate a epub manga file from a folder of images.
 * Takes care of resizing the images to the correct size and handling double pages.
 */
export async function generateEPubManga(config: {
  config: {
    id: string;
    title: string;
    series: string;
    language: string;
    author: string;
    cover: string;
    size: { width: number; height: number };
  };
  outputFilename: string;
  /** Ordered List of Manga Pages */
  pages: Array<string>;
}) {
  const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "manga-exporter-"));
  const pages: Array<{ no: string; asset: string }> = [];
  const allImages = new Set<string>();

  for (const [index, page] of config.pages.entries()) {
    const pageCount = index + 1;

    const info = await sharp(page).metadata();

    if (info.width == null || info.height == null) {
      throw new Error(`Could not get size of ${page}`);
    }

    if (info.width > info.height) {
      const out = path.join(tmpDir, String(index) + ".jpg");
      const leftOut = path.join(tmpDir, String(index) + "-2.jpg");
      const rightOut = path.join(tmpDir, String(index) + "-1.jpg");

      const imageBuffer = await sharp(await fs.readFile(page))
        .resize({
          width: config.config.size.width * 2,
          height: config.config.size.height,
          fit,
        })
        .png()
        .toBuffer();

      await sharp(imageBuffer)
        .rotate(270)
        .resize({
          width: config.config.size.width,
          height: config.config.size.height,
          fit,
        })
        .jpeg()
        .toFile(out);

      const left = await sharp(imageBuffer)
        // divide into 2 parts 0 to width/2 and width/2 to width
        .extract({
          width: config.config.size.width,
          height: config.config.size.height,
          left: 0,
          top: 0,
        })
        .jpeg()
        .toBuffer();

      await sharp(left).trim().toFile(leftOut);

      const right = await sharp(imageBuffer)
        .extract({
          width: config.config.size.width,
          height: config.config.size.height,
          left: config.config.size.width,
          top: 0,
        })
        .jpeg()
        .toBuffer();

      await sharp(right).trim().toFile(rightOut);

      allImages.add(out);
      allImages.add(rightOut);
      allImages.add(leftOut);

      pages.push(
        {
          no: `${pageCount}`,
          asset: getPageFilename(out),
        },
        {
          no: `${pageCount} - 1`,
          asset: getPageFilename(out, "1"),
        },
        {
          no: `${pageCount} - 2`,
          asset: getPageFilename(out, "2"),
        }
      );
    } else {
      const out = path.join(tmpDir, String(index) + ".jpg");

      await sharp(await fs.readFile(page))
        .resize({
          width: config.config.size.width,
          height: config.config.size.height,
          fit,
        })
        .jpeg()
        .toFile(out);

      allImages.add(out);

      pages.push({
        no: `${pageCount}`,
        asset: getPageFilename(out),
      });
    }
  }

  const epub = nodepub.document({
    id: config.config.id,
    title: config.config.title,
    series: config.config.series,
    language: config.config.language,
    author: config.config.author,
    cover: config.config.cover,
    // @ts-expect-error missing in type definitions
    pageDirection: "rtl",
    kindleComicConverter: true,
    images: Array.from(allImages),
    originalResWidth: config.config.size.width,
    originalResHeight: config.config.size.height,
    showContents: false,
  });

  for (const page of pages) {
    epub.addSection(
      `Page ${page.no}`,
      /* HTML */ `
        <div style="text-align:center;top:0.0%;">
          <img
            width="${config.config.size.width}"
            height="${config.config.size.height}"
            src="../images/${page.asset}"
          />
        </div>
      `
    );

    epub.addCSS(/* CSS */ `
      @page {
        margin: 0;
      }
      body {
        display: block;
        margin: 0;
        padding: 0;
      }
    `);
  }

  await epub.writeEPUB(
    path.dirname(config.outputFilename),
    config.outputFilename
  );
}
