# Inkwell Blog App

A full-stack blog application built with Express, Supabase, and vanilla HTML/CSS/JS. It includes user authentication, a protected dashboard, post creation, editing, deletion, and search/category filtering.

## Features

- User sign up and login
- JWT-style session handling via Supabase auth tokens
- Protected dashboard with user profile state
- Create, read, update, and delete blog posts
- Search posts by keyword
- Filter posts by category
- Responsive layout for desktop and mobile screens

## Tech Stack

- Node.js + Express
- Supabase for auth and database
- Vanilla JavaScript frontend
- HTML/CSS for presentation

## Prerequisites

- Node.js 18+
- A Supabase project

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Copy the environment example and configure your Supabase values:

```bash
cp .env.example .env
```

Then update the values in `.env`:

```env
PORT=3000
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

3. Create the tables in Supabase using the schema in `supabase/schema.sql`.

4. Start the app:

```bash
npm start
```

The app will run at:

```text
http://localhost:3000
```

## Deployment

This app is ready to deploy on Render or another Node.js host.

### Render deployment

1. Push this project to GitHub.
2. Create a new Web Service on Render.
3. Connect the GitHub repository.
4. Use these settings:
   - Build command: `npm install`
   - Start command: `npm start`
   - Add environment variables:
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `PORT`

### Vercel note

This app is a server-rendered Express application, so it is best suited for Render or a Node-compatible host rather than static-only hosting like Vercel.

## Project Structure

```text
.
├── css/
├── js/
├── supabase/
├── .env.example
├── create-blog.html
├── dashboard.html
├── index.html
├── login.html
├── package.json
├── register.html
├── server.js
└── README.md
```

## Notes

- The app is designed for a single full-stack project demo.
- If Supabase is not configured, the API will show a configuration warning instead of registering or listing posts.
