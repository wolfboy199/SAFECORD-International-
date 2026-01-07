
  # SAFECORD (International)

  This is a code bundle for SAFECORD (International). The original project is available at https://www.figma.com/design/JRxEsSHo2rC5LvgP3UagKZ/SAFECORD--International-.

  ## Running the code

  Run `npm i` to install the dependencies.

  Run `npm run dev` to start the development server.
  
    ## Preparing a private GitHub repository

    1. Create a new private repository on GitHub (via the web UI or `gh repo create --private`).
    2. From your local project root run:

    ```bash
    git init
    git add .
    git commit -m "initial commit"
    git branch -M main
    git remote add origin git@github.com:YOUR_USERNAME/YOUR_REPO.git
    git push -u origin main
    ```

    3. Do NOT commit sensitive files. This repo includes `.gitignore` to exclude `node_modules`, `dist`, and `.env` files. Keep keys and secrets in environment variables or Cloudflare/Pages/Workers secrets.

    ## Deploying to Cloudflare Pages (frontend)

    1. Push your private repo to GitHub (see above).
    2. In Cloudflare Dashboard → Pages → Create a project → Connect GitHub and choose your private repo.
    3. Build settings:
      - Framework: Other
      - Build command: `npm ci && npm run build`
      - Build output directory: `dist`
    4. Add any environment variables under Pages → Settings → Environment variables. Do NOT store secrets in `src` files.
    5. Deploy. Cloudflare Pages supports private repos.

    ## Deploying backend to Cloudflare Workers (optional)

    If you want the backend (APIs) to run on Cloudflare Workers and use Cloudflare KV instead of Supabase:

    1. Install Wrangler: `npm install -g wrangler` and run `wrangler login`.
    2. Create a `wrangler.toml` and KV namespace, then adapt `src/supabase/functions/server/index.tsx` to a Worker entry and replace `kv_store` with Worker KV bindings.
    3. Use `wrangler secret put NAME` to add secrets (service keys) to the Worker.
    4. Publish with `wrangler publish`.

    ## Linking your Squarespace domain

    Option A — Keep DNS in Squarespace:
    - In Cloudflare Pages add your custom domain (e.g. chat.yourdomain.com).
    - Cloudflare Pages provides DNS records (CNAME/A). Add those exact records in Squarespace → Domains → DNS settings.

    Option B — Move DNS to Cloudflare (recommended for full control):
    - Add your site to Cloudflare, change nameservers in Squarespace to the ones Cloudflare provides, then manage DNS on Cloudflare.

    ## Security notes

    - Never commit secrets (API keys, service role keys, passwords) to the repository.
    - Use Cloudflare Pages environment variables and Worker secrets for keys.
    - Keep backups of any generated admin passwords and rotate them after first use.

    ## Next steps I can do for you

    - Scaffold a `wrangler.toml`, a Worker entrypoint that adapts the server code for Cloudflare, and convert `kv_store` to use Worker KV.
    - Or, if you prefer, I can prepare the repo for you to upload (clean sensitive values, add deployment docs, and sample env files).

    Tell me which option you prefer and I will proceed.
  