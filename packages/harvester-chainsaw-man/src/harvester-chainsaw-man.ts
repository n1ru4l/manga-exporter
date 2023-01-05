import puppeteer, { Browser, HTTPResponse } from "puppeteer";
import * as os from "os";
import * as fs from "fs/promises";
import * as path from "path";

const buildChapterUrl = (chapterId: string) =>
  `https://www.chainsaw-man-manga.online/manga/chainsaw-man-chapter-${chapterId}/`;

export async function fetchChapterFromChainsawMangaOnline(config: {
  chapterId: string;
}) {
  let browser: Browser | undefined;
  let tmpDir: string;

  try {
    browser = await puppeteer.launch({
      headless: true,
    });

    tmpDir = await fs.mkdtemp(
      path.join(os.tmpdir(), `chainsaw-man-manga-${config.chapterId}`)
    );

    const url = buildChapterUrl(config.chapterId);
    const images: Array<string> = [];
    const page = await browser.newPage();
    page.setDefaultTimeout(60_000);

    const resources = new Map<string, HTTPResponse>();

    page.on("response", async (response) => {
      const url = response.url();

      if (response.request().resourceType() === "image") {
        resources.set(url, response);
      }
    });

    await page.goto(url);

    const data: Array<string> = await page.evaluate(() =>
      Array.from(window.document.querySelectorAll("article figure img")).map(
        (img) => (img as any).src
      )
    );

    let counter = 1;

    for (const rawUrl of data) {
      const response = resources.get(rawUrl);
      if (!response) {
        throw new Error(`Could not find response for ${rawUrl}`);
      }
      const buffer = await response.buffer();
      const url = new URL(rawUrl);
      const filename = `chainsaw-man-${config.chapterId}-${String(
        counter
      ).padStart(2, "0")}.jpg`;

      const fullFilePath = path.join(tmpDir, filename);
      await fs.writeFile(fullFilePath, buffer);
      images.push(fullFilePath);
      counter++;
    }

    await browser?.close();

    const cover = path.join(tmpDir, "cover.jpg");

    await fs.copyFile(images[0], cover);

    return {
      folder: tmpDir,
      images,
      cover,
    };
  } catch (err) {
    console.error(err);
    return null;
  } finally {
    await browser?.close();
  }
}

// const result = await fetchChapterFromChainsawMangaOnline({
//   chapterId: "98",
// });

// console.log(result);
