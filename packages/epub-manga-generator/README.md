# EPub Manga Generator

Generate an EPub manga from a folder of images.

```ts
import { generateEPubManga } from "@manga-exporter/epub-manga-generator";

await generateEPubManga({
  config: {
    id: "one-piece-1337",
    title: "One Piece - Chapter 1337",
    series: "One Piece",
    language: "en",
    author: "Eiichiro Oda",
    cover: "./images/cover.jpg",
    size: {
      width: 1264,
      height: 1680,
    },
  },
  folder: "./images",
  outputFilename: "./one-piece-1337",
  pages: [
    "./images/page-01.jpg",
    "./images/page-02.jpg",
    "./images/page-03.jpg",
    "./images/page-04.jpg",
    "./images/page-05.jpg",
  ],
});
```
