export default /* HTML */ `<?xml version="1.0" encoding="UTF-8"?><!DOCTYPE html>
  <html
    xmlns="http://www.w3.org/1999/xhtml"
    xmlns:epub="http://www.idpf.org/2007/ops"
    xml:lang="ja"
  >
    <head>
      <meta charset="UTF-8" />
      <title><%= title %></title>
      <link rel="stylesheet" type="text/css" href="../style/fixed-layout.css" />
      <meta
        name="viewport"
        content="width=<%= width %> ,height=<%= height %>"
      />
    </head>
    <body>
      <div class="main">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          xmlns:xlink="http://www.w3.org/1999/xlink"
          version="1.1"
          width="100%"
          height="100%"
          viewBox="0 0 <%= width %> <%= height %>"
        >
          <image
            width="<%= width %>"
            height="<%= height %>"
            xlink:href="../image/<%= image %>"
          />
        </svg>
      </div>
    </body>
  </html>`;
