# ARC Portal

Production-grade backend for ARC testnet (chain ID `5042002`).

## Structure

```
contracts/    — Hardhat project with 5 Solidity templates
backend/      — Express + TypeScript backend
```

## Quick Start

### 1. Start PostgreSQL
```bash
docker compose up -d
```

### 2. Install & Migrate
```bash
cd backend && npm install
npm run migrate
```

### 3. Run Backend
```bash
npm run dev
```

### 4. Endpoints

| Endpoint | Method | Description |
|---|---|---|
| `/health` | GET | Health check + indexer status |
| `/api/validators` | GET | List validators |
| `/api/validators/stats` | GET | Network statistics |
| `/api/validators/export` | GET | CSV export |
| `/api/deploy/templates` | GET | Available templates |
| `/api/deploy/erc20` | POST | Prepare ERC20 deployment |
| `/api/deploy/erc721` | POST | Prepare ERC721 deployment |
| `/api/deploy/dao` | POST | Prepare DAO deployment |
| `/api/deploy/confirm` | POST | Confirm deployment |
| `/api/upload/image` | POST | Upload image to IPFS |
| `/api/upload/metadata` | POST | Upload metadata to IPFS |

## Security

- All secrets in `.env` (git-ignored)
- Rate limiting on deploy + upload routes
- Wallet signature validation (EIP-191)
- Template-only deployment (no arbitrary bytecode)
- Backend never stores private keys
