import * as _sharp from "sharp";
import * as fsp from "fs/promises";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as _ejs from "ejs";
import * as _JSZip from "jszip";

import css_style from "./template/fixed-layout.css.js";
import containerXML from "./template/container.xml.js";
import pageTemplate from "./template/page.ejs.js";
import opfTemplate from "./template/opf.ejs.js";
import coverTemplate from "./template/cover.ejs.js";

const sharp: typeof _sharp = (_sharp as any).default;
const ejs: typeof _ejs = (_ejs as any).default ?? _ejs;
const JSZip: typeof _JSZip = (_JSZip as any).default ?? _JSZip;

const getPageFilename = (page: string, suffix?: "1" | "2") => {
  const filename = page
    .split("/")
    .pop()!
    .replace(/\.jpg$/, "");
  return `${filename}${suffix ? "-" + suffix : ""}.jpg`;
};

const jpegOptions: _sharp.JpegOptions = {
  quality: 100,
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
  const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "manga-exporter-"));
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

      const imageBuffer = await sharp(await fsp.readFile(page))
        .greyscale()
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
        .jpeg(jpegOptions)
        .toFile(out);

      const left = await sharp(imageBuffer)
        // divide into 2 parts 0 to width/2 and width/2 to width
        .extract({
          width: config.config.size.width,
          height: config.config.size.height,
          left: 0,
          top: 0,
        })
        .jpeg(jpegOptions)
        .toBuffer();

      await sharp(left).trim().toFile(leftOut);

      const right = await sharp(imageBuffer)
        .extract({
          width: config.config.size.width,
          height: config.config.size.height,
          left: config.config.size.width,
          top: 0,
        })
        .jpeg(jpegOptions)
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
          no: `${pageCount}-1`,
          asset: getPageFilename(out, "1"),
        },
        {
          no: `${pageCount}-2`,
          asset: getPageFilename(out, "2"),
        }
      );
    } else {
      const out = path.join(tmpDir, String(index) + ".jpg");

      await sharp(await fsp.readFile(page))
        .greyscale()
        .resize({
          width: config.config.size.width,
          height: config.config.size.height,
          fit,
        })
        .jpeg(jpegOptions)
        .toFile(out);

      allImages.add(out);

      pages.push({
        no: `${pageCount}`,
        asset: getPageFilename(out),
      });
    }
  }
  const uuid = crypto.randomUUID();
  const date = new Date().toISOString().slice(0, 19) + "Z";

  const zip = new JSZip();
  zip.file("mimetype", "application/epub+zip");
  const meta = zip.folder("META-INF");
  meta!.file("container.xml", containerXML);
  const item = zip.folder("item");

  const imageFolder = zip.folder("item/image");

  for (const image of allImages) {
    const imageName = path.basename(image);
    imageFolder!.file(imageName, await fsp.readFile(image));
  }

  imageFolder!.file("cover.jpg", await fsp.readFile(config.config.cover));

  const styleFolder = zip.folder("item/style");
  styleFolder!.file("fixed-layout.css", css_style);
  var xhtmlFolder = zip.folder("item/xhtml");

  item!.file(
    "standard.opf",
    ejs.render(opfTemplate, {
      uuid4: uuid,
      title: config.config.title,
      creator1: config.config.author,
      date: date,
      panel_view: "horizontal-rl",
      page_direction: "rtl",
      pages,
    })
  );

  xhtmlFolder!.file(
    "p-cover.xhtml",
    ejs.render(coverTemplate, {
      title: config.config.title,
      width: config.config.size.width,
      height: config.config.size.height,
      covername: pages[0].asset,
    })
  );

  for (let page of pages) {
    xhtmlFolder!.file(
      page.no + ".xhtml",
      ejs.render(pageTemplate, {
        width: config.config.size.width,
        height: config.config.size.height,
        image: page.asset,
        title: config.config.title,
      })
    );
  }

  await new Promise<void>((res, rej) => {
    zip
      .generateNodeStream({ type: "nodebuffer", streamFiles: true })
      .pipe(fs.createWriteStream(config.outputFilename))
      .on("close", res)
      .on("error", rej);
  });
}
