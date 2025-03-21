export default /* HTML */ `<?xml version="1.0" encoding="utf-8"?>
<package
  xmlns="http://www.idpf.org/2007/opf" version="3.0" xml:lang="ja" unique-identifier="unique-id" prefix="rendition: http://www.idpf.org/vocab/rendition/# ebpaj: http://www.ebpaj.jp/">
  <metadata
    xmlns:dc="http://purl.org/dc/elements/1.1/">
    <dc:title id="title"><%= title %></dc:title>
    <dc:creator id="creator01"><%= creator1 %></dc:creator>
    <dc:language id="language">ja</dc:language>
    <dc:identifier id="unique-id">urn:uuid:<%= uuid4 %></dc:identifier>
    <meta property="dcterms:modified"><%= date %></meta>
    <meta property="rendition:layout">pre-paginated</meta>
    <meta property="rendition:spread">landscape</meta>
    <meta property="ebpaj:guide-version">1.1</meta>
    <meta name="primary-writing-mode" content="<%= panel_view %>"/>
  </metadata>
  <manifest>
    <!-- style -->
    <item media-type="text/css" id="fixed-layout" href="style/fixed-layout.css"/>
    <!-- image -->
    <item media-type="image/jpeg" id="cover" href="image/cover.jpg" properties="cover-image"/>
<% for (let i in pages) { -%>
    <item media-type="image/jpeg" id="<%= pages[i].asset %>" href="image/<%= pages[i].asset %>"/>
<% } -%>
    <!-- xhtml -->
    <item media-type="application/xhtml+xml" id="p-cover" href="xhtml/p-cover.xhtml" properties="svg" fallback="cover"/>
<% for (let i in pages) { -%>
    <item media-type="application/xhtml+xml" id="page-<%= pages[i].no %>" href="xhtml/<%= pages[i].no %>.xhtml" properties="svg" fallback="<%= pages[i].asset %>"/>
<% } -%>
  </manifest>
  <spine toc="ncxtoc" page-progression-direction="<%= page_direction %>">
    <itemref linear="yes" idref="p-cover" properties="rendition:page-spread-center"/>
<% for (let i in pages) {
if(page_direction == "rtl"){
if (i%2 == 0 ){
 -%>
    <itemref linear="yes" idref="page-<%= pages[i].no %>" properties="page-spread-right"/>
<% }else { -%>
    <itemref linear="yes" idref="page-<%= pages[i].no %>" properties="page-spread-left"/>
<%} } -%>
<% if(page_direction == "ltr"){
if (i%2 == 0 ){
 -%>
    <itemref linear="yes" idref="page-<%= pages[i].no %>" properties="page-spread-left"/>
<% }else { -%>
    <itemref linear="yes" idref="page-<%= pages[i].no %>" properties="page-spread-right"/>
<%} } -%>
<% } -%>
  </spine>
</package>
`;
