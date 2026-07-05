# Deploy RayoExpress to Vercel

## Prerequisites

- A [Vercel](https://vercel.com) account (GitHub login recommended)
- Node.js 20+ installed locally
- The RayoExpress repo cloned and ready

---

## 1. Install Vercel CLI

```bash
npm i -g vercel
```

## 2. Login

```bash
npx vercel login
```

Follow the browser prompt to authenticate with your Vercel account.

## 3. Link the project

From the project root:

```bash
npx vercel link
```

This creates a `.vercel/project.json` with the `projectId` and `orgId`.

## 4. Set environment variables

**Option A — Vercel Dashboard (recommended)**

Go to your project on [vercel.com](https://vercel.com) → **Settings** → **Environment Variables** and add:

| Name                      | Value                                  | Environments    |
|---------------------------|----------------------------------------|-----------------|
| `VITE_SUPABASE_URL`       | `https://bxhnlwkhoeeqpifqvqxs.supabase.co` | Production, Preview, Development |
| `VITE_SUPABASE_ANON_KEY`  | `sb_publishable__YLr43cEbtmlrRPdhOmMsA_CeN6c2-n` | Production, Preview, Development |

**Option B — Vercel CLI**

```bash
npx vercel env add VITE_SUPABASE_URL
npx vercel env add VITE_SUPABASE_ANON_KEY
```

## 5. Deploy

```bash
npx vercel --prod
```

Vercel will run `npm run build`, output to `dist/`, and publish the site.

After the first deploy, every push to `main` will auto-deploy via the CI/CD pipeline.

---

## Custom domain (optional)

1. In the Vercel Dashboard → your project → **Settings** → **Domains**
2. Add your domain (e.g. `rayoexpress.com`)
3. Follow Vercel's DNS configuration instructions for your provider

---

## CI/CD — GitHub Secrets

For the automated deployment workflow (`.github/workflows/deploy.yml`) the following secrets must be set in your GitHub repository:

| Secret                | Description                            | How to get it                                                  |
|-----------------------|----------------------------------------|----------------------------------------------------------------|
| `VERCEL_TOKEN`        | Vercel personal access token           | [Vercel Account → Tokens](https://vercel.com/account/tokens)   |
| `VERCEL_ORG_ID`       | Your Vercel team/user ID               | Run `npx vercel whoami` → copy the ID from `.vercel/project.json` |
| `VERCEL_PROJECT_ID`   | Your Vercel project ID                 | Run `npx vercel link` → copy from `.vercel/project.json`       |

Additionally, add the following environment variable secrets so they are available during the GitHub Actions build:

| Secret                        | Value                                  |
|-------------------------------|----------------------------------------|
| `VITE_SUPABASE_URL`           | `https://bxhnlwkhoeeqpifqvqxs.supabase.co` |
| `VITE_SUPABASE_ANON_KEY`      | `sb_publishable__YLr43cEbtmlrRPdhOmMsA_CeN6c2-n` |

### How to set GitHub Secrets

1. Go to your repo on GitHub → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret** and add each secret

After adding the secrets, any push to `main` will trigger the `deploy.yml` workflow.

---

## Manual deploy (without CI/CD)

If you prefer to skip GitHub Actions, just run locally:

```bash
npx vercel --prod
```

---

## Review

After deployment your app will be available at:
- `https://rayo-express.vercel.app` (or your custom domain)
