---
title: "Self-Host Next.js with Docker and Nginx"
date: 2025-06-30
slug: self-host-nextjs-with-docker-and-nginx
description: "A hands-on guide to self-hosting a Next.js application with Docker, Nginx, Cloudflare, and Let's Encrypt on a VPS."
---


Vercel’s great for getting a Next.js app online fast, but if you’re looking to cut costs or take full control of your setup, self-hosting is the way to go. In this guide, I’ll walk you through spinning up a production-ready Next.js app on a VPS using Docker, and Nginx. In addition, I'll show you how to configure and automate Cloudflare SSL, and configure VPS Firewall settings.

# Table of Contents

1. **Dockerize Next.js app locally**
2. **Ubuntu Server Configuration**
3. **Deploy Next.js app to VPS**
4. **Configure and Automate HTTPS + SSL**
5. **Configure VPS Firewall**

# Overview
Here’s the stack we’ll be working with:
- **Docker** – Keeps the app environment consistent across local and production.
- **Nginx** – Acts as a reverse proxy and handles SSL termination.
- **Cloud provider of your choice** – I’m using Linode, but you can roll with whatever VPS you prefer.
- **Cloudflare** – Speeds things up globally by caching static assets and protecting your origin.
- **PuTTY and WinSCP** – Tools for connecting to your server over SSH and transferring files from Windows.

# 1. Dockerize your Next.js app locally

First up, let’s dockerize the Next.js app. This gives us a clean, consistent environment we can run anywhere, local, VPS, whatever. Install Docker desktop, if you don't already have it, [Docker Desktop for Windows]([Windows | Docker Docs](https://docs.docker.com/desktop/setup/install/windows-install/)).

Start by tweaking your `next.config.mjs` to output a standalone build. That keeps the production image lightweight:

```javascript
export default {
  ...nextConfig,
  output: 'standalone',
};
```

Next, drop a `Dockerfile` in the root of your project and add this:

```bash
# Builder image
FROM node:18-alpine AS builder

WORKDIR /app

# First install dependencies so we can cache them
RUN apk update && apk upgrade
RUN apk add curl

COPY package.json package-lock.json ./
RUN npm install --legacy-peer-deps

# Now copy the rest of the app and build it
COPY . .
RUN npm run build

# Production image
FROM node:18-alpine AS runner

WORKDIR /app

# Create a non-root user
RUN addgroup -S nonroot && adduser -S nonroot -G nonroot
USER nonroot

# Copy the standalone output from the builder image
COPY --from=builder --chown=nonroot:nonroot /app/.next/standalone ./
COPY --from=builder --chown=nonroot:nonroot /app/public ./public
COPY --from=builder --chown=nonroot:nonroot /app/.next/static ./.next/static

# Prepare the app for production
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"

EXPOSE 3000

# Start the app
CMD ["node", "server.js"]
```

Create a `.dockerignore` file to keep unnecessary files out of the Docker build:

```shell
gitignore
node_modules
Dockerfile
README.md
.dockerignore
.git
.next
.env*
```

At this point, you should be able to build and run the app with Docker:

```bash
docker build -t my-nextjs-app .
```

Try it out locally:

```bash
docker run -p 3000:3000 my-nextjs-app
```

Head over to `http://localhost:3000`, you should see your Next.js root page.

Now let’s get it live so the rest of the world can see it too.

# 2. Ubuntu Server Configuration

This guide assumes you already have an Ubuntu server with your cloud provider of choice.

SSH into the server

```shell
ssh root@your-server-ip
```

Update your package list:

```shell
apt update -y
```

Then install Docker:

```bash
# Add Docker's official GPG key and repository
apt install -y ca-certificates curl gnupg
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker packages
apt update -y
apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
```

Docker should be good to go now. Run `docker --version` to double-check it’s installed.

Enable the firewall:

```shell
ufw allow ssh
ufw allow http
ufw allow https
ufw enable
```

Make sure your cloud provider’s firewall is set to allow incoming traffic on ports 22, 80, 443, and 3000.

Let's not forget to update the server as well:

```shell
apt update && apt upgrade -y
```

# 3. Deploy Next.js app to VPS

[Install WinSCP]([WinSCP :: Official Site :: Download](https://winscp.net/eng/download.php)) if you don't already have it, this will help visualize files, directories, and deploy to our server.

In WinSCP log into your server. Create `/website/` directory under `/`. Then drag and drop Next.js project files:

![Transferring the Next.js project into the server website directory with WinSCP](assets/blog/winscp-deployment.png)
*(Disclaimer) screenshot for demonstration, please don't copy unnecessary files over*

Now test building your Next.js docker container on your VPS from the `/website/` directory.

```shell
docker build -t my-nextjs-app .
```

```shell
docker run -p 3000:3000 my-nextjs-app
```

You should now be able to see your Next.js site at `http://your-ip-addrress:3000`.

**Nginx Configuration and Testing**

Nginx sits in front of your app, handling traffic on ports 80 and 443, and passing it to port 3000 where your site actually lives.

Begin with installing and running Nginx.

```shell
sudo apt-get install nginx
sudo service nginx start
```

Nginx could honestly be its own course, but let’s keep it simple. Drop the config below into `/etc/nginx/sites-available/default` and carry on like a true script kiddie.

```shell
server {
    listen 80;
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Check it and reload the config.

```shell
sudo nginx -t
sudo nginx -s reload
```

You should be able to access `http://your-ip-address` now without specifying the 3000 port.

*if not*, try symlinking `/etc/nginx/sites-available/default` & `/etc/nginx/sites-enabled/default`

```shell
sudo ln -s /etc/nginx/sites-available/default /etc/nginx/sites-enabled/default

sudo nginx -s reload
```

Verify your Next.js site is live at `http://your-ip-address`, before proceeding to the next step.

# 4. Configure and Automate HTTPS + SSL

This guide assumes you're using Cloudflare.

**Configure DNS Records**

Ensure each domain has these two A records, specifying `www` & `your-domain.com`, with your origin server IP address. Ensure proxy status is enabled.

![Example Cloudflare DNS A records with proxy status enabled](assets/blog/cloudflare-dns-example.png)

![Cloudflare DNS A records pointing to the VPS origin with proxy status enabled](assets/blog/cloudflare-dns-origin.png)
*(Informational) Cloudflare Dashboard > DNS > Records*

**Enable SSL/TLS**

In Cloudflare, head to the *SSL/TLS > Overview* settings and set your domain to *Automatic* or *Flexible*.

Hit `https://your-domain.com` to confirm HTTPS is live.

You _could_ stop here—Cloudflare handles HTTPS for users, even if traffic to your origin stays on port 80. 

But come on, grabbing a Let's Encrypt cert with autorenewal isn’t that deep. Let’s lock it down end-to-end.

**(Optional) Obtain SSL certificates from Let's Encrypt**

To obtain Let's Encrypt certs, we'll be using [Certbot](https://certbot.eff.org/). Before we begin, test if snap is installed.

```shell
sudo snap install hello-world

hello-world
```

Ubuntu usually comes with snap base installed, but not always. Run the following if in need.

```shell
sudo apt update
sudo apt install snapd
```

Remove Certbot packages from other package managers to ensure `certbot` runs from `snap`. Given this tutorial, you're likely using `apt`. 

```shell
sudo apt-get remove certbot
```

Install Certbot.

```shell
sudo snap install --classic certbot
```

Prepare (symlink) Certbot.

```shell
sudo ln -s /snap/bin/certbot /usr/bin/certbot
```

Use Certbot to receive a Let's Encrypt certificate, edit our nginx configuration, and handle auto renewal for your domain(s).

```shell
sudo certbot --nginx
```

Test automatic renewal.

```shell
sudo certbot renew --dry-run
```

The command to renew certbot is installed in one of the following locations:
- `/etc/crontab/`
- `/etc/cron.*/*`
- `systemctl list-timers`

Nice! You’ve got your Let’s Encrypt cert, and it’s all set to auto-renew. Now let’s make sure Nginx is locked in and ready to handle HTTPS traffic from Cloudflare on port 443.

**(Optional) HTTPS Nginx Configuration**

Edit `/etc/nginx/sites-available/default`. 
- Add 2 `server` blocks per domain. One for listening on 80, one for 443.
- Add `your-domain1.com` next to `server_name` including www.
- Add the Let's Encrypt certificates you generated previously.
	- `ssl_certificate /etc/letsencrypt/live/your-domain1.com/fullchain.pem;`
	- `ssl_certificate_key /etc/letsencrypt/live/your-domain1.com/privkey.pem;`
- Add protocols and ciphers.
	-  `ssl_protocols TLSv1.2 TLSv1.3;`
	-  `ssl_ciphers HIGH:!aNULL:!MD5;`

```shell
server {
    listen 80;
    listen [::]:80;
    server_name your-domain1.com www.your-domain1.com;
    return 301 https://$host$request_uri;
}


server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name your-domain1.com www.your-domain1.com;
    
    ssl_certificate /etc/letsencrypt/live/your-domain1.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain1.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection keep-alive;
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;

    }

}
```

*TLDR Considerations*:
- If you’re running multiple domains, give each one its own `server` block, sharing can get messy fast.  
- As for HTTP on port 80? I don’t bother. Any stray requests get hit with a clean 301 redirect to HTTPS, just in case something weird slips through.

Save file, check, and reload Nginx.

```shell
sudo nginx -t
sudo nginx -s reload
```

At last, we’re ready for Cloudflare Full (Strict) SSL/TLS. *Cue the drum roll...* Time to lock it down end-to-end like a boss.

**(Optional) Enable Cloudflare Full (strict) SSL/TLS**

Head over to the Cloudflare Dashboard, jump into _SSL/TLS > Overview_, and flip your domain to **Full (Strict)**. Boom, you’ve now got end-to-end encryption. Hit `https://your-domain.com` to see it in action.

🎉 Congrats, you’re officially legit.

Want to peek at your Let’s Encrypt cert? Temporarily disable the orange cloud (Proxy status) under _DNS > Records_ so you’re hitting your origin directly. Then visit your site, click the padlock in the browser, and you’ll see your cert details.

Just don’t forget to turn the proxy back on when you’re done — Cloudflare’s got your back.

# 5. Configure VPS Firewall

We’ve locked this site down with HTTPS, might as well show the firewall some love too. Every cloud provider’s a little different, so your mileage may vary, but the core idea stays the same.

First up, both the _Default Inbound_ and _Default Outbound_ policies are set to **drop**. That means nothing gets in or out unless we explicitly say so. Every protocol, port, source, and destination has to earn its keep.

![Linode inbound and outbound firewall rules with default drop policies](assets/blog/linode-firewall-rules.png)

**Inbound Rules**
- **Allow SSH (TCP 22)**
	- Required for remote access via PuTTY or WinSCP.
    - For tighter security, consider restricting access to a known static IP range.   
    - Always use SSH keys — password authentication is for amateurs.
- **Allow HTTPS (TCP 443)**
	- This rule is scoped to **only** accept inbound traffic from Cloudflare’s IP ranges.
	- This ensures your origin server only responds to trusted proxy requests.    
    - You can find the current list of Cloudflare IPs [here](https://www.cloudflare.com/ips/).

**Outbound Rules**
- **Allow HTTP (TCP 80)**
    - Required for fetching packages and updates via `apt`.
- **Allow HTTPS (TCP 443)**
    - Enables secure communication when pulling certs, packages, or external resources.
- **Allow DNS (TCP/UDP 53)**
    - Needed for domain resolution when installing or updating packages with `apt`.
    - No DNS, no downloads — keep it open.
# Conclusion

You’ve just stood up a secure, production-ready Next.js app with Docker, Nginx, and Let’s Encrypt, all self-hosted and protected by Cloudflare. Whether you're scaling a project or sharpening your devops chops, this setup gives you full control, speed, and flexibility.

# References Used:

[Self-Host Next.js with Kamal and GitHub Actions](https://getdeploying.com/guides/deploy-nextjs#6-set-up-cicd-with-github-actions)
[Configuring HTTPS servers](https://nginx.org/en/docs/http/configuring_https_servers.html)
[Installing snap on Ubuntu | Snapcraft documentation](https://snapcraft.io/docs/installing-snap-on-ubuntu)
[Publishing an ASP.NET Core website to a cheap Linux VM host - Scott Hanselman's Blog](https://www.hanselman.com/blog/publishing-an-aspnet-core-website-to-a-cheap-linux-vm-host)
[Ubuntu | Docker Docs](https://docs.docker.com/engine/install/ubuntu/)
[Windows | Docker Docs](https://docs.docker.com/desktop/setup/install/windows-install/)
[How To Install Nginx on Ubuntu 20.04 | DigitalOcean](https://www.digitalocean.com/community/tutorials/how-to-install-nginx-on-ubuntu-20-04)
[Let's Encrypt](https://letsencrypt.org/)
[Certbot](https://certbot.eff.org/)
[IP Ranges | Cloudflare](https://www.cloudflare.com/ips/)