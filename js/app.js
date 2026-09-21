/* ============================================
   app.js — blog post storage & rendering, backed by localStorage
   ============================================ */

const POSTS_KEY = "inkwell_posts";

function getPosts() {
  try {
    return JSON.parse(localStorage.getItem(POSTS_KEY)) || [];
  } catch {
    return [];
  }
}

function savePosts(posts) {
  localStorage.setItem(POSTS_KEY, JSON.stringify(posts));
}

function addPost({ title, category, content, imageUrl, authorId, authorName }) {
  const posts = getPosts();
  const post = {
    id: "p_" + Date.now(),
    title,
    category,
    content,
    imageUrl: imageUrl || "",
    authorId,
    authorName,
    createdAt: new Date().toISOString(),
  };
  posts.unshift(post);
  savePosts(posts);
  return post;
}

function deletePost(postId) {
  const posts = getPosts().filter((p) => p.id !== postId);
  savePosts(posts);
}

function getPostById(postId) {
  return getPosts().find((p) => p.id === postId);
}

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

function excerpt(content, maxLen = 110) {
  const clean = content.replace(/\s+/g, " ").trim();
  return clean.length > maxLen ? clean.slice(0, maxLen).trim() + "…" : clean;
}

// Seeds a couple of sample posts the first time the app runs,
// so the Home page isn't empty on a fresh clone.
function seedDemoPostsIfEmpty() {
  if (getPosts().length > 0) return;
  const demo = [
    {
      title: "Setting up a blog with nothing but a text editor",
      category: "Dev Notes",
      content:
        "You don't need a framework to start writing on the web. A folder, a few HTML files, and a little localStorage will get you further than you'd expect. This post walks through the bare minimum stack that still feels solid: semantic markup, one stylesheet, two small scripts. Everything else can wait.",
      imageUrl: "",
      authorId: "demo",
      authorName: "Inkwell Team",
    },
    {
      title: "Why constraints make better first drafts",
      category: "Craft",
      content:
        "Limiting yourself to no backend, no build step, and no dependencies sounds like a handicap, but it forces every decision to be deliberate. Fewer moving parts means fewer places for a bug to hide, and it's easier to explain your own project a week later.",
      imageUrl: "",
      authorId: "demo",
      authorName: "Inkwell Team",
    },
  ];
  const posts = demo.map((p, i) => ({
    id: "p_seed_" + i,
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    ...p,
  }));
  savePosts(posts);
}

function postCardHtml(post) {
  const thumb = post.imageUrl
    ? `<img class="post-thumb" src="${escapeHtml(post.imageUrl)}" alt="">`
    : `<div class="post-thumb"></div>`;
  return `
    <article class="post-card">
      ${thumb}
      <div class="post-category">${escapeHtml(post.category || "General")}</div>
      <h3><a href="#" data-post-id="${post.id}" class="post-link">${escapeHtml(post.title)}</a></h3>
      <p class="post-excerpt">${escapeHtml(excerpt(post.content))}</p>
      <div class="post-meta">${escapeHtml(post.authorName)} · ${formatDate(post.createdAt)}</div>
    </article>
  `;
}

function renderHomeGrid(containerId) {
  seedDemoPostsIfEmpty();
  const container = document.getElementById(containerId);
  const posts = getPosts();

  if (posts.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        No posts yet. <a href="create-blog.html">Write the first one</a>.
      </div>
    `;
    return;
  }

  container.innerHTML = posts.map(postCardHtml).join("");

  container.querySelectorAll(".post-link").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      const post = getPostById(link.dataset.postId);
      if (post) alert(post.title + "\n\n" + post.content);
      // Swap this alert for a real post.html?id= page if you want full post views.
    });
  });
}
