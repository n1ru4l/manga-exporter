import { generateEPubManga } from "@manga-exporter/epub-manga-generator";
import { fetchLatestChapterFromReadOnePiece } from "@manga-exporter/harvester-one-piece";
import * as fs from "fs/promises";
import { Octokit } from "@octokit/rest";
import { Telegraf } from "telegraf";

const oktokit = new Octokit({
  auth: process.env.GITHUB_TOKEN,
});

const telegraf = new Telegraf(process.env.TELEGRAM_TOKEN!);

/** TODO: make it flexible :) */
const oasisSize = {
  width: 1264,
  height: 1680,
};

async function fetchOnePieceMangaChapterFetcher(config: {
  latestChapterId: string;
}) {
  const result = await fetchLatestChapterFromReadOnePiece(config);
  const outputFilename = `one-piece-${config.latestChapterId}`;

  if (result === null) {
    console.log("Could not fetch latest chapter.");
    return null;
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
      outputFilename,
      pages: result.images,
    });
    return outputFilename;
  } finally {
    await fs.rm(result.folder, { recursive: true });
  }
}

async function main() {
  const issue = await oktokit.issues.get({
    owner: "n1ru4l",
    repo: "manga-exporter",
    issue_number: 1,
  });

  if (!issue.data.body) {
    throw new Error("Could not fetch issue body.");
  }

  const latestChapterId = parseInt(issue.data.body, 10);

  if (isNaN(latestChapterId)) {
    throw new Error("Could not parse latest chapter id.");
  }

  const newChapterId = latestChapterId + 1;

  const filename = await fetchOnePieceMangaChapterFetcher({
    latestChapterId: String(newChapterId),
  });

  if (filename === null) {
    console.log("Could not fetch latest chapter.");
    return;
  }

  // TODO: Attempt sending to Kindle

  // TODO: Notify on Telegram
  await telegraf.telegram.sendDocument(process.env.TELEGRAM_CHAT_ID!, filename);

  // TODO: Update issue body with new chapter id

  await oktokit.issues.update({
    owner: "n1ru4l",
    repo: "manga-exporter",
    issue_number: 1,
    body: String(newChapterId),
  });
}

main();
