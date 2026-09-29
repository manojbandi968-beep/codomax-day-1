/* ============================================
   app.js — blog post storage & rendering, connected to the Express API
   ============================================ */

const POSTS_KEY = "inkwell_posts";
const API_BASE = `${window.location.origin}/api`;

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

function getAuthHeaders(extra = {}) {
  const currentUser = typeof getCurrentUser === "function" ? getCurrentUser() : null;
  const token = currentUser && currentUser.token ? currentUser.token : "";

  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

function filterPosts(posts, searchTerm = "", category = "All") {
  const normalizedSearch = String(searchTerm || "").trim().toLowerCase();
  const normalizedCategory = String(category || "All").trim();

  return posts.filter((post) => {
    const categoryMatch = normalizedCategory === "All" || (post.category || "General") === normalizedCategory;
    const haystack = `${post.title || ""} ${post.content || ""} ${post.category || ""}`.toLowerCase();
    const searchMatch = !normalizedSearch || haystack.includes(normalizedSearch);
    return categoryMatch && searchMatch;
  });
}

function getAvailableCategories(posts) {
  const categories = [...new Set((posts || []).map((post) => post.category || "General"))];
  return ["All", ...categories];
}

async function fetchPosts(filters = {}) {
  const searchTerm = String(filters.search || "").trim();
  const category = String(filters.category || "All").trim();

  const params = new URLSearchParams();
  if (searchTerm) params.set("search", searchTerm);
  if (category && category !== "All") params.set("category", category);

  try {
    const response = await fetch(`${API_BASE}/posts${params.toString() ? `?${params.toString()}` : ""}`);
    if (!response.ok) {
      throw new Error("Failed to load posts.");
    }

    const posts = await response.json();
    if (Array.isArray(posts)) {
      savePosts(posts);
      return filterPosts(posts, searchTerm, category);
    }
  } catch (error) {
    console.warn("Falling back to local posts:", error.message);
  }

  const localPosts = filterPosts(getPosts(), searchTerm, category);
  return localPosts;
}

async function addPost({ title, category, content, imageUrl, authorId, authorName }) {
  const payload = {
    title,
    category,
    content,
    imageUrl: imageUrl || "",
    authorId,
    authorName,
  };

  try {
    const response = await fetch(`${API_BASE}/posts`, {
      method: "POST",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Unable to create post.");
    }

    const stored = getPosts();
    const posts = stored.filter((post) => post.id !== data.id);
    posts.unshift(data);
    savePosts(posts);
    return data;
  } catch (error) {
    const localPost = {
      id: "p_" + Date.now(),
      title,
      category,
      content,
      imageUrl: imageUrl || "",
      authorId,
      authorName,
      createdAt: new Date().toISOString(),
    };

    const posts = [localPost, ...getPosts()];
    savePosts(posts);
    return localPost;
  }
}

async function updatePost(postId, { title, category, content, imageUrl }) {
  const payload = { title, category, content, imageUrl: imageUrl || "" };

  try {
    const response = await fetch(`${API_BASE}/posts/${postId}`, {
      method: "PUT",
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.message || "Unable to update post.");
    }

    const posts = getPosts().map((post) => (post.id === postId ? { ...post, ...data } : post));
    savePosts(posts);
    return data;
  } catch (error) {
    const updated = {
      ...getPostById(postId),
      title,
      category,
      content,
      imageUrl: imageUrl || "",
      updatedAt: new Date().toISOString(),
    };

    const posts = getPosts().map((post) => (post.id === postId ? updated : post));
    savePosts(posts);
    return updated;
  }
}

async function deletePost(postId) {
  try {
    const response = await fetch(`${API_BASE}/posts/${postId}`, {
      method: "DELETE",
      headers: getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error("Unable to delete post.");
    }
  } catch (error) {
    console.warn("Using local fallback for delete:", error.message);
  }

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
  const clean = String(content || "").replace(/\s+/g, " ").trim();
  return clean.length > maxLen ? clean.slice(0, maxLen).trim() + "…" : clean;
}

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

async function renderHomeGrid(containerId, options = {}) {
  seedDemoPostsIfEmpty();
  const container = document.getElementById(containerId);
  const searchTerm = typeof options.search === "string" ? options.search : "";
  const category = typeof options.category === "string" ? options.category : "All";
  const posts = Array.isArray(options.posts)
    ? filterPosts(options.posts, searchTerm, category)
    : await fetchPosts({ search: searchTerm, category });

  if (!container) return;

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
    });
  });
}

window.fetchPosts = fetchPosts;
window.addPost = addPost;
window.updatePost = updatePost;
window.deletePost = deletePost;
window.getPostById = getPostById;
window.filterPosts = filterPosts;
window.getAvailableCategories = getAvailableCategories;
window.renderHomeGrid = renderHomeGrid;
