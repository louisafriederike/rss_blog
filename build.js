const fs = require("fs");
const path = require("path");
const matter = require("gray-matter");
const md = require("markdown-it")();
const postsDir = "./content";
const outDir = "./public";
const postOutDir = path.join(outDir, "posts");

if (!fs.existsSync(postOutDir)) fs.mkdirSync(postOutDir, { recursive: true });

let posts = [];
let tagsMap = {}; // { tag: [post, post, ...] }

// Function to format the date to DD-MM-YYYY
function formatDate(date) {
  const d = new Date(date);
  const day = String(d.getDate()).padStart(2, "0"); // Ensure day is 2 digits
  const month = String(d.getMonth() + 1).padStart(2, "0"); // Get month (1-12) and ensure 2 digits
  const year = d.getFullYear(); // Get the full year
  return `${day}-${month}-${year}`; // Format as DD-MM-YYYY
}

// Read the Markdown files and process them in reverse order to add new posts at the top
fs.readdirSync(postsDir).reverse().forEach(file => {
  const filePath = path.join(postsDir, file);
  const fileContent = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(fileContent);
  const htmlContent = md.render(content);
  const slug = data.title.toLowerCase().replace(/\s+/g, "-");
  const tags = data.tags || [];
  
  // Format the date in DD-MM-YYYY format
  const formattedDate = formatDate(data.date);
  
  // Collect posts for each tag
  tags.forEach(tag => {
    if (!tagsMap[tag]) tagsMap[tag] = [];
    tagsMap[tag].push({ ...data, slug, formattedDate }); // Add formattedDate here
  });

  // Create the post's HTML section
  const postHTML = `
    <section id="${slug}" class="post">
      <header>
        <h2><a href="#${slug}">${data.title}</a></h2>
        <p><em>${data.summary}</em></p>
        <p>${formattedDate}</p> <!-- Use formattedDate here -->
      </header>
      <article>${htmlContent}</article>
    </section>
  `.trim();

  posts.push({ ...data, slug, postHTML, formattedDate }); // Add formattedDate to the post
});

// Generate the Tags Section HTML
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

// Generate the main index.html with all posts included in one long page
const indexHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>peepee</title>
  <link rel="stylesheet" href="style.css" />
</head>
<body>
  <h1>My Blog</h1>
  

<div id="menu">
  <h2>Posts</h2>
  <ul>
    ${posts.map(p => `<li><a href="#${p.slug}">${p.title}</a><p><span class="formattedDate">${p.formattedDate}</span></p></li>`).join("\n")}
  </ul>
</div>
    <section>
    <h2>🗂 Tags</h2>
    ${tagsSection}
  </section>

  <!-- Posts will be displayed here -->
  <div class="post-list">
    ${posts.map(p => p.postHTML).join("\n")}
  </div>

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

// Generate the RSS feed
const rss = `
<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0">
  <channel>
    <title>My Blog</title>
    <link>https://yourdomain.com/</link>
    <description>Blog about media art and alternative publishing</description>
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
