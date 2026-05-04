# bizboost-ai
BizBoost AI - AI-powered marketing strategy generator for small businesses

## Run web app (Next.js)

Node.js requirement for MongoDB Atlas TLS stability:
- Use Node.js 20 LTS for this project.
- Node.js 24 can trigger TLS/SSL issues with Atlas on some local setups.

Environment file location:
- Keep MongoDB variables only in apps/web/.env.local.

```powershell
cd apps/web
npm run dev
```

## Test MongoDB health endpoint

```powershell
Invoke-RestMethod -Method GET -Uri "http://localhost:3000/api/health/db"
```

## Test business profile upsert endpoint

```powershell
$body = @{
	firebase_uid = "test123"
	businessName = "Stellar Studio"
	businessType = "Online Store"
	country = "Sri Lanka"
	city = "Colombo"
	language = "English"
	productsOrServices = "Logo design"
} | ConvertTo-Json -Depth 3

Invoke-RestMethod -Method POST `
	-Uri "http://localhost:3000/api/business-profile" `
	-ContentType "application/json" `
	-Body $body
```
