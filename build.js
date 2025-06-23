(async () => {
  const fs = require("fs");
  const path = require("path");
  const matter = require("gray-matter");
  const md = require("markdown-it")();
  const Parser = require("rss-parser");
  const parser = new Parser();

  const postsDir = "./content";
  const outDir = "./public";
  const postOutDir = path.join(outDir, "posts");

  if (!fs.existsSync(postOutDir)) fs.mkdirSync(postOutDir, { recursive: true });

  let posts = [];
  let tagsMap = {};

  function formatDate(date) {
    const d = new Date(date);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}-${month}-${year}`;
  }

  fs.readdirSync(postsDir).reverse().forEach(file => {
    const filePath = path.join(postsDir, file);
    const fileContent = fs.readFileSync(filePath, "utf8");
    const { data, content } = matter(fileContent);
    const htmlContent = md.render(content);
    const slug = data.title.toLowerCase().replace(/\s+/g, "-");
    const tags = data.tags || [];
    const formattedDate = formatDate(data.date);

    tags.forEach(tag => {
      if (!tagsMap[tag]) tagsMap[tag] = [];
      tagsMap[tag].push({ ...data, slug, formattedDate });
    });

    const postHTML = `
      <section id="${slug}" class="post">
        <header>
          <h2><a href="#${slug}">${data.title}</a></h2>
          <p><em>${data.summary}</em></p>
          <p>${formattedDate}</p>
        </header>
        <article>${htmlContent}</article>
      </section>
    `.trim();

    posts.push({ ...data, slug, postHTML, formattedDate });
  });

  // --- External RSS Feed Embedding ---
  let externalFeedHTML = "";
  try {
    const feed = await parser.parseURL("https://varia.zone/feeds/all-nl.rss.xml");
    externalFeedHTML = `
      <section>
        <h2>📡 Varia Feed</h2>
        <ul>
          ${feed.items.slice(0, 5).map(item => `
            <li>
              <a href="${item.link}" target="_blank">${item.title}</a>
              <p><small>${new Date(item.pubDate).toLocaleDateString()}</small></p>
            </li>
          `).join("\n")}
        </ul>
      </section>
    `;
  } catch (err) {
    console.error("Failed to fetch external RSS feed:", err);
  }

  const tagsSection = Object.keys(tagsMap).sort().map(tag => {
    const postsList = tagsMap[tag].map(p => 
      `<li><a href="#${p.slug}">${p.title}</a><p><span class="formattedDate">${p.formattedDate}</span></p></li>`).join("\n");

    return `
      <div class="tag-group">
        <h3 class="tag-toggle" onclick="toggleTag('${tag}')">#${tag}</h3>
        <ul id="tag-${tag}" class="tag-posts" style="display:none;">
          ${postsList}
        </ul>
      </div>
    `;
  }).join("\n");

  const indexHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>.zip media lab</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <h1>.zip</h1>

  <div id="menu">
    <h2>Events</h2>
    <ul>
      ${posts.map(p => `<li><a href="#${p.slug}">${p.title}</a><p><span class="formattedDate">${p.formattedDate}</span></p></li>`).join("\n")}
    </ul>
  </div>

  <h2>News</h2>
  <ul>
    ${posts.map(p => `<li><a href="#${p.slug}">${p.title}</a><p><span class="formattedDate">${p.formattedDate}</span></p></li>`).join("\n")}
  </ul>



  <section>
    <h2>🗂 Tags</h2>
    ${tagsSection}
  </section>

  <div class="post-list">
    ${posts.map(p => p.postHTML).join("\n")}
  </div>

    ${externalFeedHTML}
    
  <a href="feed.xml">📡 RSS Feed</a>

  <script>
    function toggleTag(tag) {
      const el = document.getElementById('tag-' + tag);
      el.style.display = el.style.display === 'none' ? 'block' : 'none';
    }
  </script>
</body>
</html>
`;

  fs.writeFileSync(path.join(outDir, "index.html"), indexHTML);

  const rss = `
<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>.zip</title>
    <link>https://yourdomain.com/</link>
    <description>media-lab .zip</description>
    ${posts.map(p => `
    <item>
      <title>${p.title}</title>
      <link>https://yourdomain.com/#${p.slug}</link>
      <description>${p.summary}</description>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <guid>https://yourdomain.com/#${p.slug}</guid>
    </item>
    `).join("\n")}
  </channel>
</rss>
  `;

  fs.writeFileSync(path.join(outDir, "feed.xml"), rss.trim());
})();
