import puppeteer, { Browser } from "puppeteer";
import * as os from "os";
import * as fs from "fs/promises";
import * as path from "path";

const buildChapterUrl = (chapterId: string) =>
  `https://ww3.read-onepiece.net/manga/one-piece-chapter-${chapterId}/`;

const matchesChapterPage = (_chapterId: string) => (url: string) =>
  /.*one-piece-....-\d+.jpg/.test(url);

export async function fetchLatestChapterFromReadOnePiece(config: {
  latestChapterId: string;
}) {
  let browser: Browser | undefined;
  let tmpDir: string;

  try {
    browser = await puppeteer.launch({
      headless: true,
    });

    tmpDir = await fs.mkdtemp(
      path.join(
        os.tmpdir(),
        `read-onepiece-one-piece-${config.latestChapterId}`
      )
    );

    const url = buildChapterUrl(config.latestChapterId);
    const isChapterPageRequest = matchesChapterPage(config.latestChapterId);
    const images: Array<string> = [];
    const page = await browser.newPage();

    // TODO: Instead of waiting for the response order and sorting the images,
    // we could instead traverse the DOM for the correct order.
    // that approach might be more future proof in case the filenames change.
    page.on("response", async (response) => {
      const url = response.url();

      if (
        response.request().resourceType() === "image" &&
        isChapterPageRequest(url)
      ) {
        const buffer = await response.buffer();
        const filePath = path
          .join(tmpDir, url.split("/").pop()!)
          // We add a 0 to the page number to make sure the pages are sorted correctly later on.
          .replace(/-(\d)\.jpg$/, "-0$1.jpg");
        await fs.writeFile(filePath, buffer);
        images.push(filePath);
      }
    });
    await page.goto(url);
    await page.waitForNetworkIdle();
    await browser?.close();

    /** we can sort em here because we padded the chapter number. Potentially dangerous. */
    images.sort();
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
