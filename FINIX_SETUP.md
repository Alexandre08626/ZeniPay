# Finix Integration Setup Guide

## 🚀 Quick Start

ZeniPay is now integrated with Finix Payments. Follow these steps to complete the setup.

---

## 1. Get Finix Sandbox Credentials

### Sign in to Finix Dashboard
1. Go to https://dashboard.finix.com
2. Switch to **Sandbox** environment (top-right toggle)
3. Navigate to **Settings** → **API Keys**

### Get API Credentials
Copy the following values:

- **Username** (USR_xxx...)
- **Password** (API secret key)
- **Application ID** (APxxxxxxxxxx)
- **Merchant ID** (MUxxxxxxxxxx)
- **Identity ID** (IDxxxxxxxxxx)

### Get Webhook Secret
1. Go to **Developers** → **Webhooks**
2. Create a new webhook endpoint:
   - URL: `https://zenipay.ca/api/zenipay/webhooks/tilled`
   - Events: Select all `transfer.*` events
3. Copy the **Webhook Secret**

---

## 2. Update Environment Variables

### Local Development (.env.local)
Edit `C:\Users\ILM\OneDrive\Desktop\ZeniPay\.env.local`:

```bash
FINIX_ENV=sandbox
FINIX_API_USERNAME=USR_xxxxxxxxxxxx
FINIX_API_PASSWORD=your_api_password_here
FINIX_MERCHANT_ID=MUxxxxxxxxxx
FINIX_MERCHANT_IDENTITY_ID=IDxxxxxxxxxx
FINIX_WEBHOOK_SECRET=whsec_xxxxxxxxxx
```

### Production (Vercel)
Add the same variables to Vercel:
1. Go to https://vercel.com/zeniva-travel/zenipay/settings/environment-variables
2. Add each variable with value **Production**
3. Redeploy after adding

---

## 3. Test the Integration

### Test Card (Finix Sandbox)
Use these test cards:

```
SUCCESS:
Card: 4111 1111 1111 1111
Expiry: 12/25
CVC: 123
Name: Test User

DECLINE:
Card: 4000 0000 0000 0002
Expiry: 12/25
CVC: 123
```

### Test Flow
1. Create a pay link:
   ```bash
   curl -X POST https://zenipay.ca/api/zenipay/create-link \
     -H "Content-Type: application/json" \
     -d '{
       "amount": 100,
       "currency": "USD",
       "description": "Test Payment",
       "merchant": "Test Merchant"
     }'
   ```

2. Open the pay link URL in a browser
3. Enter test card details
4. Submit payment
5. Verify:
   - ✅ Payment appears in Finix Dashboard → Transfers
   - ✅ Invoice auto-created in Supabase `zenipay_invoices`
   - ✅ Transaction appears in ZeniPay dashboard

---

## 4. Verify Webhooks

### Check Webhook Delivery
1. In Finix Dashboard → Developers → Webhooks
2. Click on your webhook endpoint
3. View **Recent Deliveries**
4. Confirm `transfer.succeeded` events are being sent

### Test Webhook Locally (Optional)
Use ngrok to test webhooks on localhost:

```bash
ngrok http 3000
# Copy the https URL

# Update webhook URL in Finix to:
# https://your-ngrok-url.ngrok.io/api/zenipay/webhooks/tilled
```

---

## 5. API Endpoints Reference

### Process Payment (Finix)

**PCI note:** card data is tokenized client-side by Finix.js. The server accepts
only the resulting `instrument_id` — it must NEVER receive raw PAN/expiry/CVV.

```http
POST /api/zenipay/finix/process-payment
Content-Type: application/json

{
  "pay_link_id": "link_xxx",
  "amount": 100.00,
  "currency": "USD",
  "description": "Test payment",
  "customer_name": "John Doe",
  "customer_email": "jane@example.com",
  "instrument_id": "TKxxxxxxxxxxxxxx",
  "fraud_session_id": "fs_xxxxxxxx",
  "merchant_id": "mer_xxxxxxxx"
}
```

**Response:**
```json
{
  "success": true,
  "paymentId": "ZNV-XXXXXX",
  "transferId": "TRxxxxxxxxxxxxxx",
  "state": "SUCCEEDED",
  "amount": 100.00,
  "currency": "USD",
  "card": {
    "brand": "VISA",
    "last4": "1111"
  }
}
```

### Webhook Handler
```http
POST /api/zenipay/webhooks/tilled
Finix-Signature: sha256=xxxxx
Content-Type: application/json

{
  "type": "transfer.succeeded",
  "data": {
    "id": "TRxxxxxx",
    "state": "SUCCEEDED",
    "amount": 10000,
    "currency": "USD"
  }
}
```

---

## 6. Production Checklist

Before going live:

- [ ] Get production Finix credentials
- [ ] Update `FINIX_ENV=production` in Vercel
- [ ] Add all production credentials to Vercel
- [ ] Update webhook URL to production endpoint
- [ ] Test with small real transaction
- [ ] Verify accounting entries
- [ ] Enable monitoring/alerts

---

## 7. Pricing & Fees

**ZeniPay Merchant Rate:**
- 2.90% + $0.30 per transaction

**Finix Cost (Interchange Plus):**
- 1.90% + $0.15 per transaction

**ZeniPay Markup:**
- 1.00% + $0.15 per transaction

**ZeniPay Revenue (90% of markup):**
- 0.90% + $0.135 per transaction

**Example on $100 transaction:**
- Customer pays: $100.00
- ZeniPay charges merchant: $3.20 (2.90% + $0.30)
- Finix cost: $2.05 (1.90% + $0.15)
- Markup: $1.15
- ZeniPay keeps: $1.04 (90% of $1.15)
- Finix keeps: $0.11 (10% of $1.15)

---

## 8. Troubleshooting

### Payment Fails with "FINIX_MERCHANT_ID not configured"
- Check `.env.local` has `FINIX_MERCHANT_ID`
- Restart dev server: `npm run dev`

### Webhook signature verification fails
- Check `FINIX_WEBHOOK_SECRET` matches Finix dashboard
- Verify webhook is using correct endpoint URL

### Invoice not auto-created
- Check webhook is configured in Finix
- View webhook logs in Finix dashboard
- Check Supabase logs for errors

### TypeScript errors
- Run `npm install` to ensure dependencies
- Check import paths in new files

---

## 📞 Support

- Finix Docs: https://docs.finix.com
- Finix Support: support@finix.com
- ZeniPay Dashboard: https://zenipay.ca/app

---

**Status:** ✅ Integration Complete - Awaiting Credentials
