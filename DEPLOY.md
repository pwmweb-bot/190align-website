# Deployment — 190align.com

## TL;DR

```bash
git add -A && git commit -m "your message"
./deploy.sh
```

`./deploy.sh` pushes `main` to GitHub, then SSHes into the live server and
hard-syncs the document root to `origin/main`. Live in ~10 seconds.

---

## How serving actually works (important)

The live site **does not** serve from the FTP `public_html` directory.
It serves from a **git checkout** on the 20i server:

```
/home/virtual/vps-7c189f/3/35236011d5/190align-website
```

The canonical source of truth is **GitHub** (`pwmweb-bot/190align-website`,
branch `main`). Deploying = making the server's checkout match `origin/main`.

### Do NOT use SFTP / lftp to `public_html`
An earlier setup uploaded to `deploy@190align.com` → `public_html`, which the
live site never reads. Those uploads silently do nothing. That method is
retired. (The old script is in git history if ever needed.)

### The 20i panel "Deploy" button
In theory the 20i Git Version Control panel has a **Deploy** button that pulls
`main`. In practice it was failing server-side with no useful error. The SSH
git-sync below bypasses it reliably. If push-to-deploy (the `20i-git-manager`
GitHub App webhook) is ever fully working again, pushes will auto-deploy and
this script becomes optional.

---

## The deploy command (what deploy.sh runs)

```bash
ssh -i ~/.ssh/190align_20i -p 39355 190align.com@ssh.lhr.stackcp.com \
  "cd /home/virtual/vps-7c189f/3/35236011d5/190align-website \
   && git fetch origin && git reset --hard origin/main"
```

`git reset --hard origin/main` discards any drift in the server working tree
and force-aligns it to GitHub. Safe **because GitHub is the source of truth** —
never edit files directly on the server.

---

## Connection details

| Setting | Value |
|---------|-------|
| SSH host | `ssh.lhr.stackcp.com` |
| SSH port | `39355` |
| SSH user | `190align.com` |
| SSH key  | `~/.ssh/190align_20i` |
| Docroot  | `/home/virtual/vps-7c189f/3/35236011d5/190align-website` |
| Repo     | `https://github.com/pwmweb-bot/190align-website` (branch `main`) |

Optional SSH config alias (`~/.ssh/config`):

```
Host 190align
    HostName ssh.lhr.stackcp.com
    User 190align.com
    Port 39355
    IdentityFile ~/.ssh/190align_20i
    IdentitiesOnly yes
```

---

## Verify a deploy

```bash
curl -sI https://190align.com/                       # 200
curl -s  https://190align.com/ | grep "Barlow"       # typography present
```

Note: 20i may cache HTML briefly via its CDN. If a change isn't visible
immediately, give it a minute or hard-refresh.

---

## Not deployed / kept private

These are excluded from the public site and/or repo:

- `.strategy/` — internal business-strategy analysis (gitignored)
- `guides-src/` — source HTML for generating the guide PDF (gitignored)
- `downloads/90-day-planning-guide.pdf` — **is** deployed (the lead magnet)
