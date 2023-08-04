import puppeteer, { Browser } from "puppeteer";
import * as os from "os";
import * as fs from "fs/promises";
import * as path from "path";

const buildChapterUrl = (chapterId: string) =>
  `https://ww1.tcbscans.org/manga/one-piece/chapter-${chapterId}/`;

const createDeferred = <T>() => {
  let resolve: (value: T) => void;
  let reject: (reason: any) => void;
  const promise = new Promise<T>((_resolve, _reject) => {
    resolve = _resolve;
    reject = _reject;
  });
  return {
    promise,
    resolve: resolve!,
    reject: reject!,
  };
};

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
    const images: Array<string> = [];
    const page = await browser.newPage();
    page.setDefaultTimeout(5_000);

    const d = createDeferred<void>();

    await page.setRequestInterception(true);

    page.on("request", (request) => {
      if (request.isNavigationRequest() && request.url() !== url) {
        request.abort();
        return;
      }
      request.continue();
    });

    const canAllocateResources = createDeferred<void>();
    let imageNames = new Array<string>();
    let fetchedImageCount = 0;

    page.on("response", async (response) => {
      canAllocateResources.promise.then(async () => {
        const url = response.url();

        const index = imageNames.findIndex((name) => name === url);

        if (response.request().resourceType() === "image" && index !== -1) {
          const buffer = await response.buffer();
          const fileName = `one-piece-${config.latestChapterId}-${String(
            index + 1
          ).padStart(2, "0")}.jpg`;
          console.log("got", fileName);
          const filePath = path.join(tmpDir, fileName);
          // We add a 0 to the page number to make sure the pages are sorted correctly later on.
          await fs.writeFile(filePath, buffer);
          images.push(filePath);

          fetchedImageCount++;

          if (fetchedImageCount === imageNames.length) {
            d.resolve();
          }
        }
      });
    });

    await page.goto(url, {
      timeout: 20_000,
    });

    imageNames = await page.evaluate(async () => {
      let images = [];
      for (const item of window.document.querySelectorAll(
        ".read-container img"
      )) {
        images.push((item as any).src);
      }

      return images;
    });

    if (imageNames.length === 0) {
      throw new Error("No images found.");
    }

    canAllocateResources.resolve();

    await d.promise;
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
