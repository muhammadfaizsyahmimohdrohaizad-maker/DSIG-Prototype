# Havlook Prototype 🚀

An AI-powered outreach application built with a modern frontend framework, utilizing Vercel Serverless Functions for backend API routing, Supabase for the database, and the Gemini API for generative AI capabilities.

## 🛠 Tech Stack
* **Frontend:** React / Vite (or Next.js)
* **Backend:** Vercel Serverless Functions (`/api` directory)
* **Database & Auth:** Supabase
* **AI Integration:** Google Gemini API

---

## 📋 Prerequisites

Before setting up the project locally, ensure you have the following installed and configured:
* [Node.js](https://nodejs.org/) (v18 or higher recommended)
* [Git](https://git-scm.com/) & [GitHub CLI](https://cli.github.com/) (`gh`)
* A [Vercel](https://vercel.com/) account for deployment and local API testing.
* A [Supabase](https://supabase.com/) account for database management.
* A Google Gemini API Key.

---

## 🚀 Local Development Setup

### 1. Clone the Repository
Open your terminal and clone the repository using the GitHub CLI:
```bash
gh repo clone muhammadfaizsyahmimohdrohaizad-maker/DSIG-Prototype
cd DSIG-Prototype

```

### 2. Install Dependencies

Install all required NPM packages:

```bash
npm install

```

### 3. Environment Variables

Create a `.env` file in the root directory of the project. **Do not commit this file to Git.**

Add the following keys to your `.env` file:

```env
# Supabase Configuration
VITE_SUPABASE_URL=[https://your-project-ref.supabase.co](https://your-project-ref.supabase.co)
VITE_SUPABASE_ANON_KEY=your-anon-public-key

# Gemini AI Configuration
GEMINI_API_KEY=your_gemini_api_key_here

```

*(Note: If you are using Next.js instead of Vite, replace the `VITE_` prefix with `NEXT_PUBLIC_`)*.

### 4. Run the Development Server

To run the frontend locally, use standard NPM commands:

```bash
npm run dev

```

**Testing Serverless Functions Locally:**
Because this project uses Vercel Serverless Functions (`/api/*`), standard local development commands might not serve the API routes correctly. To test the backend and frontend together locally, use the Vercel CLI:

```bash
npm i -g vercel
vercel dev

```

---

## ☁️ Deployment

This project is configured to deploy automatically via **Vercel** when changes are pushed to the `main` branch.

### 1. Push to GitHub

```bash
git add .
git commit -m "Update code"
git push origin main

```

### 2. Configure Vercel

1. Log in to your [Vercel Dashboard](https://vercel.com/dashboard).
2. Import this GitHub repository.
3. In the project setup, navigate to **Environment Variables** and add all the keys from your local `.env` file.
4. Click **Deploy**.

---

## Security Notes

* **Never push your `.env` file to GitHub.** Ensure `.env` is listed in your `.gitignore` file.
* Keep your Supabase Service Role Keys and Gemini API keys hidden on the server side (in the Vercel dashboard and your Vercel `/api` functions) to prevent unauthorized usage.
