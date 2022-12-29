import * as nodepub from "nodepub-rtl";
import * as _sharp from "sharp";
import * as fs from "fs/promises";

const sharp = (_sharp as any).default as typeof _sharp;

const getPageFilename = (page: string, suffix?: "1" | "2") => {
  const filename = page
    .split("/")
    .pop()!
    .replace(/\.jpg$/, "");
  return `${filename}${suffix ? "-" + suffix : ""}.jpg`;
};

/**
 * Generate a epub manga file from a folder of images.
 * Takes care of resizing the images to the correct size and handling double pages.
 */
export async function generateEPubManga(config: {
  folder: string;
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
  const pages: Array<{ no: string; asset: string }> = [];
  const allImages = new Set<string>();

  for (const [index, page] of config.pages.entries()) {
    const pageCount = index + 1;

    const info = await sharp(page).metadata();

    if (info.width == null || info.height == null) {
      throw new Error(`Could not get size of ${page}`);
    }

    if (info.width > info.height) {
      const imageBuffer = await sharp(await fs.readFile(page))
        .resize({
          width: 1264 * 2,
          height: 1680,
          fit: "fill",
        })
        .png()
        .toBuffer();

      const horizontalName = page;
      const leftName = page.replace(/\.jpg$/, "-2.jpg");
      const rightName = page.replace(/\.jpg$/, "-1.jpg");

      await sharp(imageBuffer)
        .rotate(270)
        .resize({
          width: 1264,
          height: 1680,
          fit: "fill",
        })
        .jpeg()
        .toFile(horizontalName);

      const left = await sharp(imageBuffer)
        // divide into 2 parts 0 to width/2 and width/2 to width
        .extract({
          width: 1264,
          height: 1680,
          left: 0,
          top: 0,
        })
        .jpeg()
        .toBuffer();

      await sharp(left).trim().toFile(leftName);

      const right = await sharp(imageBuffer)
        .extract({
          width: 1264,
          height: 1680,
          left: 1264,
          top: 0,
        })
        .jpeg()
        .toBuffer();

      await sharp(right).trim().toFile(rightName);

      allImages.add(horizontalName);
      allImages.add(rightName);
      allImages.add(leftName);

      pages.push(
        {
          no: `${pageCount}`,
          asset: getPageFilename(page),
        },
        {
          no: `${pageCount} - 1`,
          asset: getPageFilename(page, "1"),
        },
        {
          no: `${pageCount} - 2`,
          asset: getPageFilename(page, "2"),
        }
      );
    } else {
      await sharp(await fs.readFile(page))
        .resize({
          width: 1264,
          height: 1680,
          fit: "fill",
        })
        .jpeg()
        .toFile(page);

      allImages.add(page);

      pages.push({
        no: `${pageCount}`,
        asset: getPageFilename(page),
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
    "/Users/laurinquast/Projects/manga-exporter",
    config.outputFilename
  );
}
