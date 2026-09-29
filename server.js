const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, 'supabase', '.env') });
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;
const supabaseConfigured = Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
const supabase = supabaseConfigured
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
  : null;

function requireSupabase(req, res, next) {
  if (!supabase) {
    return res.status(503).json({
      message: 'Supabase is not configured. Add SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY to .env.',
    });
  }
  return next();
}

async function getAuthenticatedUser(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Authentication required.' });
  }

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) {
    return res.status(401).json({ message: 'Invalid or expired session.' });
  }

  req.authUser = data.user;
  return next();
}

async function getProfile(userId) {
  const { data, error } = await supabase.from('profiles').select('id, name').eq('id', userId).single();
  if (error) throw error;
  return data;
}

function publicUser(user, profile, session) {
  return {
    id: user.id,
    email: user.email,
    name: profile.name,
    token: session.access_token,
  };
}

function formatPost(post) {
  return {
    id: post.id,
    title: post.title,
    category: post.category,
    content: post.content,
    imageUrl: post.image_url || '',
    authorId: post.author_id,
    authorName: post.profiles?.name || 'Unknown author',
    createdAt: post.created_at,
  };
}

const postSelect = 'id, title, category, content, image_url, author_id, created_at, profiles(name)';

app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

app.get('/api/health', (req, res) => {
  res.json({ ok: true, supabaseConfigured, message: 'Inkwell API is running.' });
});

app.post('/api/register', requireSupabase, async (req, res, next) => {
  try {
    const { name, email, password } = req.body || {};
    const normalizedName = String(name || '').trim();
    const normalizedEmail = String(email || '').trim().toLowerCase();

    if (!normalizedName || !normalizedEmail || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters.' });
    }

    const { data: created, error: createError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { name: normalizedName },
    });

    if (createError) {
      const status = createError.message.toLowerCase().includes('already') ? 409 : 400;
      return res.status(status).json({ message: createError.message });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({ id: created.user.id, name: normalizedName })
      .select('id, name')
      .single();

    if (profileError) throw profileError;

    const { data: sessionData, error: sessionError } = await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password,
    });

    if (sessionError) throw sessionError;

    return res.status(201).json({
      user: publicUser(created.user, profile, sessionData.session),
      token: sessionData.session.access_token,
    });
  } catch (error) {
    return next(error);
  }
});

app.post('/api/login', requireSupabase, async (req, res, next) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required.' });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(email).trim().toLowerCase(),
      password,
    });

    if (error || !data.user || !data.session) {
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }

    const profile = await getProfile(data.user.id);
    return res.json({
      user: publicUser(data.user, profile, data.session),
      token: data.session.access_token,
    });
  } catch (error) {
    return next(error);
  }
});

app.get('/api/posts', requireSupabase, async (req, res, next) => {
  try {
    let query = supabase
      .from('posts')
      .select(postSelect)
      .order('created_at', { ascending: false });

    const searchTerm = String(req.query.search || '').trim();
    const category = String(req.query.category || '').trim();

    if (category && category.toLowerCase() !== 'all') {
      query = query.eq('category', category);
    }

    if (searchTerm) {
      query = query.or(`title.ilike.%${searchTerm}%,content.ilike.%${searchTerm}%`);
    }

    const { data, error } = await query;
    if (error) throw error;
    return res.json((data || []).map(formatPost));
  } catch (error) {
    return next(error);
  }
});

app.get('/api/posts/:id', requireSupabase, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('posts')
      .select(postSelect)
      .eq('id', req.params.id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ message: 'Post not found.' });
      }
      throw error;
    }

    return res.json(formatPost(data));
  } catch (error) {
    return next(error);
  }
});

app.post('/api/posts', requireSupabase, getAuthenticatedUser, async (req, res, next) => {
  try {
    const { title, category, content, imageUrl } = req.body || {};
    const normalizedTitle = String(title || '').trim();
    const normalizedContent = String(content || '').trim();

    if (!normalizedTitle || !normalizedContent) {
      return res.status(400).json({ message: 'Title and content are required.' });
    }

    const { data, error } = await supabase
      .from('posts')
      .insert({
        title: normalizedTitle,
        category: String(category || 'General').trim() || 'General',
        content: normalizedContent,
        image_url: String(imageUrl || '').trim() || null,
        author_id: req.authUser.id,
      })
      .select(postSelect)
      .single();

    if (error) throw error;
    return res.status(201).json(formatPost(data));
  } catch (error) {
    return next(error);
  }
});

app.put('/api/posts/:id', requireSupabase, getAuthenticatedUser, async (req, res, next) => {
  try {
    const { title, category, content, imageUrl } = req.body || {};
    const normalizedTitle = String(title || '').trim();
    const normalizedContent = String(content || '').trim();

    if (!normalizedTitle || !normalizedContent) {
      return res.status(400).json({ message: 'Title and content are required.' });
    }

    const { data, error } = await supabase
      .from('posts')
      .update({
        title: normalizedTitle,
        category: String(category || 'General').trim() || 'General',
        content: normalizedContent,
        image_url: String(imageUrl || '').trim() || null,
      })
      .eq('id', req.params.id)
      .eq('author_id', req.authUser.id)
      .select(postSelect)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ message: 'Post not found.' });
      }
      throw error;
    }

    return res.json(formatPost(data));
  } catch (error) {
    return next(error);
  }
});

app.patch('/api/posts/:id', requireSupabase, getAuthenticatedUser, async (req, res, next) => {
  try {
    const { title, category, content, imageUrl } = req.body || {};
    const normalizedTitle = String(title || '').trim();
    const normalizedContent = String(content || '').trim();

    if (!normalizedTitle || !normalizedContent) {
      return res.status(400).json({ message: 'Title and content are required.' });
    }

    const { data, error } = await supabase
      .from('posts')
      .update({
        title: normalizedTitle,
        category: String(category || 'General').trim() || 'General',
        content: normalizedContent,
        image_url: String(imageUrl || '').trim() || null,
      })
      .eq('id', req.params.id)
      .eq('author_id', req.authUser.id)
      .select(postSelect)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({ message: 'Post not found.' });
      }
      throw error;
    }

    return res.json(formatPost(data));
  } catch (error) {
    return next(error);
  }
});

app.delete('/api/posts/:id', requireSupabase, getAuthenticatedUser, async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from('posts')
      .delete()
      .eq('id', req.params.id)
      .eq('author_id', req.authUser.id)
      .select('id');

    if (error) throw error;
    if (!data.length) return res.status(404).json({ message: 'Post not found.' });

    return res.json({ message: 'Post deleted successfully.' });
  } catch (error) {
    return next(error);
  }
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  return res.sendFile(path.join(__dirname, 'index.html'));
});

app.use((error, req, res, next) => {
  console.error(error);
  return res.status(500).json({ message: 'Something went wrong on the server.' });
});

app.listen(PORT, () => {
  console.log(`Inkwell API running on http://localhost:${PORT}`);
  console.log(`Supabase: ${supabaseConfigured ? 'configured' : 'not configured'}`);
});
