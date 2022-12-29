import { generateEPubManga } from "@manga-exporter/epub-manga-generator";
import { fetchLatestChapterFromReadOnePiece } from "@manga-exporter/harvester-one-piece";
import * as fs from "fs/promises";

/** TODO: make it flexible :) */
const oasisSize = {
  width: 1264,
  height: 1680,
};

async function fetchOnePieceMangaChapterFetcher(config: {
  latestChapterId: string;
}) {
  const result = await fetchLatestChapterFromReadOnePiece(config);

  if (result === null) {
    console.log("Could not fetch latest chapter.");
    return;
  }
  try {
    await generateEPubManga({
      config: {
        id: `one-piece-weekly-${config.latestChapterId}`,
        title: `One Piece - Chapter ${config.latestChapterId}`,
        series: "One Piece",
        language: "en",
        author: "Eiichiro Oda",
        cover: result.cover,
        size: oasisSize,
      },
      folder: result.folder,
      outputFilename: `one-piece-${config.latestChapterId}`,
      pages: result.images,
    });
  } finally {
    await fs.rm(result.folder, { recursive: true });
  }
}

fetchOnePieceMangaChapterFetcher({
  latestChapterId: process.env.LATEST_CHAPTER_ID!,
});
