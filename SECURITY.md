# Security

Let's Meet is built so that a server compromise exposes as little as possible (see "How your data is protected" in the
README). If you find a way around that — a way to read Google data, decrypt answers without the link, keep a plan alive
past its deletion, or run script on the site — please report it privately.

**How to report:** open a private report through this repository's **Security → Report a vulnerability** tab
(GitHub private vulnerability reporting). Please don't open a public issue for security problems.

Include what you did, what you expected, and what happened. You'll get a reply as soon as possible.

**Running your own copy?** You are the operator of that copy. Keep your Cloudflare, Google Cloud and GitHub accounts
behind passkeys or two-factor authentication, keep the OAuth scope at `calendar.freebusy` only, and never store the
OAuth client secret (the app doesn't use it).
