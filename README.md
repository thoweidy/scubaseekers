# scubaseekers

Shopify store management scripts for the **scubaseekers** store.

## Requirements

- [Node.js](https://nodejs.org/) 18+
- [Shopify CLI](https://shopify.dev/docs/api/shopify-cli) 3.93+

Install Shopify CLI once:

```bash
npm install -g @shopify/cli
```

## Setup

1. Copy the example environment file and fill in your store domain:

```bash
cp .env.example .env
# then edit .env with your store domain
```

2. Install project dependencies:

```bash
npm install
```

3. Authenticate with your store (run once, or whenever your session expires):

```bash
npm run auth
```

This opens a browser to complete OAuth. The CLI saves a token locally so subsequent commands run without prompting.

## Available commands

| Command | Description |
|---|---|
| `npm run auth` | Authenticate with the Shopify store |
| `npm run products:list` | List all products with status, stock, and pricing |
| `npm run products:low-stock` | Show variants at or below the low-stock threshold (default: 5) |
| `npm run orders:list` | List the 50 most recent orders |
| `npm run orders:open` | Show paid, unshipped orders that need fulfillment |
| `npm run inventory:check` | Show inventory levels across all active locations |
| `npm run customers:list` | List the 50 most recently created customers |

## Configuration

Edit `.env` to change defaults:

```dotenv
# Your store domain
SHOPIFY_STORE_DOMAIN=scubaseekers.myshopify.com

# Stock level below which a variant appears in the low-stock report
LOW_STOCK_THRESHOLD=5
```

## Adding more scripts

All scripts live under `scripts/`. The shared helper in `scripts/lib/store.js` exposes:

- `STORE` – store domain from `.env`
- `LOW_STOCK_THRESHOLD` – threshold value from `.env`
- `executeQuery(query, variables?, allowMutations?)` – runs a validated Shopify Admin GraphQL query via the CLI

Add a new `.js` file under the appropriate subdirectory and wire it up in `package.json` under `"scripts"`.
