Cloudflare deployment — quick steps

Required GitHub secrets (Repository → Settings → Secrets → Actions):
- `CF_API_TOKEN` — API token with Workers & Pages publish permissions
- `CF_ACCOUNT_ID` — your Cloudflare account ID
- `CF_PAGES_PROJECT` — the Pages project name (used by Pages action)

Pre-publish local steps (one-time):
1. Install Wrangler locally:
```powershell
npm install -g wrangler
wrangler login
```

2. Create the Workers KV namespace and note the returned id:
```powershell
wrangler kv:namespace create "KV_STORE" --env production
# copy the returned id and add it to `wrangler.toml` under [[kv_namespaces]] -> id
```

3. Update `wrangler.toml`:
- Set `[[kv_namespaces]].id` to the KV namespace id from step 2.
- Set `account_id = "<your-account-id>"` if desired.

CI / GitHub Actions
- On push to `main`, `pages.yml` will build and publish the `build/` directory to Cloudflare Pages using the above secrets.
- On push to `main`, `worker.yml` will run `wrangler publish --env production` to publish the Worker.

Testing endpoints
- After Worker publish, test health:
```powershell
curl https://<your-pages-or-worker-domain>/make-server-b35a818f/health
```

If you want, I can generate a `cloudflare-action` example or push these workflows into your repo (they are already added). Next step: set GitHub secrets and push your code to the repo URL: https://github.com/wolfboy199/SAFECORD-International-.git
