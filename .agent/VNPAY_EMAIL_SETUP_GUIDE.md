# VNPay Payment Gateway & Email Notifications Setup Guide

## 🎯 Overview

This guide explains how to configure and use the VNPay payment gateway integration and email notification system.

---

## 1. VNPay Payment Gateway Integration

### 📋 **Features Implemented**

- ✅ Real VNPay payment URL generation
- ✅ Secure HMAC-SHA512 signature validation
- ✅ Automatic payment callback handling
- ✅ Vietnamese error message translation
- ✅ Support for multiple bank codes
- ✅ Sandbox and production environment support

### 🔧 **Configuration**

#### **Step 1: Get VNPay Credentials**

1. Register for VNPay merchant account at: https://sandbox.vnpayment.vn/
2. Obtain your credentials:
   - `TmnCode` - Terminal/Merchant Code
   - `HashSecret` - Secret key for signature

#### **Step 2: Update appsettings.json**

```json
{
  "VNPay": {
    "TmnCode": "YOUR_VNPAY_TMN_CODE",
    "HashSecret": "YOUR_VNPAY_HASH_SECRET",
    "PaymentUrl": "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html",
    "ReturnUrl": "http://localhost:5000/api/payments/vnpay/callback",
    "Version": "2.1.0"
  }
}
```

**For Production:**
```json
{
  "VNPay": {
    "PaymentUrl": "https://vnpayment.vn/paymentv2/vpcpay.html",
    "ReturnUrl": "https://yourdomain.com/api/payments/vnpay/callback"
  }
}
```

### 🔄 **Payment Flow**

```
1. Customer clicks "Pay Now"
   ↓
2. Frontend calls POST /api/payments/initiate
   {
     "orderId": "guid",
     "amount": 1000000,
     "provider": "VNPay",
     "bankCode": "NCB" (optional)
   }
   ↓
3. Backend generates VNPay payment URL
   ↓
4. Frontend redirects to VNPay gateway
   ↓
5. Customer completes payment on VNPay
   ↓
6. VNPay redirects to callback URL
   GET /api/payments/vnpay/callback?vnp_...
   ↓
7. Backend validates signature
   ↓
8. Publishes PaymentSucceededEvent
   ↓
9. Redirects to frontend success page
```

### 🏦 **Supported Bank Codes**

```typescript
const bankCodes = {
  "NCB": "Ngân hàng NCB",
  "VIETCOMBANK": "Ngân hàng Vietcombank",
  "VIETINBANK": "Ngân hàng Vietinbank",
  "TECHCOMBANK": "Ngân hàng Techcombank",
  "MBBANK": "Ngân hàng MB",
  "SACOMBANK": "Ngân hàng Sacombank",
  "BIDV": "Ngân hàng BIDV",
  "AGRIBANK": "Ngân hàng Agribank",
  "VPBANK": "Ngân hàng VPBank",
  "ACB": "Ngân hàng ACB"
};
```

### 🧪 **Testing**

#### **Sandbox Test Cards**

VNPay Sandbox provides test cards for different scenarios:

**Success Transaction:**
- Card Number: `9704198526191432198`
- Card Holder: `NGUYEN VAN A`
- Issue Date: `07/15`
- OTP: `123456`

**Insufficient Balance:**
- Card Number: `9704198526191432199`
- OTP: `123456`

#### **Test Flow:**

```bash
# 1. Create order
curl -X POST http://localhost:5000/api/sales/checkout \
  -H "Content-Type: application/json" \
  -d '{
    "items": [{"productId": "...", "quantity": 1}],
    "shippingAddress": "123 Test St"
  }'

# 2. Initiate payment
curl -X POST http://localhost:5000/api/payments/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "orderId": "...",
    "amount": 1000000,
    "provider": "VNPay",
    "bankCode": "NCB"
  }'

# 3. Use returned PaymentUrl to redirect user
```

### 📝 **Response Codes**

| Code | Meaning |
|------|---------|
| 00 | Success |
| 07 | Suspicious transaction |
| 09 | Not registered for Internet Banking |
| 10 | Wrong authentication (3 times) |
| 11 | Payment timeout |
| 12 | Account locked |
| 13 | Wrong OTP |
| 24 | Customer cancelled |
| 51 | Insufficient balance |
| 65 | Daily limit exceeded |
| 75 | Bank maintenance |
| 79 | Wrong password (too many times) |

---

## 2. Email Notification System

### 📧 **Email Templates Implemented**

1. **Order Confirmation** - Sent when order is created
2. **Payment Success** - Sent when payment completes
3. **Warranty Registration** - Sent when warranty is activated

### 🔧 **Configuration**

#### **Step 1: Gmail App Password**

For Gmail SMTP:

1. Enable 2-Factor Authentication on your Google account
2. Go to: https://myaccount.google.com/apppasswords
3. Generate an app password for "Mail"
4. Use this password in configuration

#### **Step 2: Update appsettings.json**

```json
{
  "Email": {
    "SmtpHost": "smtp.gmail.com",
    "SmtpPort": 587,
    "SmtpUsername": "your-email@gmail.com",
    "SmtpPassword": "your-16-char-app-password",
    "FromEmail": "noreply@quanghuongcomputer.com",
    "FromName": "Quang Huong Computer"
  }
}
```

**For Other Email Providers:**

```json
// Outlook/Office365
{
  "Email": {
    "SmtpHost": "smtp-mail.outlook.com",
    "SmtpPort": 587
  }
}

// SendGrid
{
  "Email": {
    "SmtpHost": "smtp.sendgrid.net",
    "SmtpPort": 587,
    "SmtpUsername": "apikey",
    "SmtpPassword": "YOUR_SENDGRID_API_KEY"
  }
}
```

### 📨 **Email Triggers**

| Event | Email Template | Trigger |
|-------|---------------|---------|
| Order Created | Order Confirmation | `OrderConfirmedDomainEvent` |
| Payment Success | Payment Success | `PaymentSucceededEvent` |
| Warranty Registered | Warranty Registration | `OrderFulfilledEvent` |

### 🎨 **Email Templates**

All emails use responsive HTML templates with:
- ✅ Professional design
- ✅ Company branding (Quang Huong Red #D70018)
- ✅ Mobile-responsive layout
- ✅ Clear call-to-action buttons
- ✅ Vietnamese language support

### 🧪 **Testing Email**

```csharp
// Manual test
var emailService = app.Services.GetRequiredService<IEmailService>();
await emailService.SendOrderConfirmationAsync(
    "customer@example.com",
    "Test Customer",
    "ORD-20260107-ABC123",
    1000000
);
```

### 📊 **Email Delivery Monitoring**

Emails are sent asynchronously and failures are logged but don't break the main flow:

```csharp
try {
    await _emailService.SendEmailAsync(message);
    _logger.LogInformation("Email sent successfully");
}
catch (Exception ex) {
    _logger.LogError(ex, "Failed to send email");
    // Don't throw - email failure shouldn't break order flow
}
```

---

## 3. Frontend Integration

### 💳 **VNPay Payment Integration**

Update `PaymentPage.tsx`:

```typescript
const handlePayment = async () => {
  const response = await paymentApi.initiate({
    orderId: order.id,
    amount: order.totalAmount,
    provider: 'VNPay',
    bankCode: selectedBank // Optional
  });

  // Redirect to VNPay
  window.location.href = response.paymentUrl;
};
```

### ✅ **Payment Callback Page**

Create `PaymentCallbackPage.tsx`:

```typescript
export const PaymentCallbackPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const orderId = searchParams.get('orderId');
    const error = searchParams.get('error');

    if (error) {
      toast.error(`Payment failed: ${error}`);
      navigate(`/payment/failed/${orderId}`);
    } else {
      toast.success('Payment successful!');
      navigate(`/payment/success/${orderId}`);
    }
  }, []);

  return <div>Processing payment...</div>;
};
```

---

## 4. Security Best Practices

### 🔐 **VNPay Security**

1. **Never expose HashSecret** in frontend code
2. **Always validate signature** on callback
3. **Use HTTPS** in production
4. **Implement idempotency** to prevent duplicate processing
5. **Log all transactions** for audit trail

### 📧 **Email Security**

1. **Use App Passwords** instead of account passwords
2. **Enable TLS/SSL** for SMTP
3. **Rate limit** email sending
4. **Sanitize user input** in email templates
5. **Don't include sensitive data** in emails

---

## 5. Production Checklist

### ✅ **Before Going Live**

- [ ] Replace VNPay sandbox credentials with production credentials
- [ ] Update `PaymentUrl` to production URL
- [ ] Configure production `ReturnUrl` with HTTPS
- [ ] Set up proper email domain (not Gmail)
- [ ] Configure SPF, DKIM, DMARC records for email domain
- [ ] Test all payment scenarios (success, failure, timeout)
- [ ] Set up email delivery monitoring
- [ ] Configure error alerting
- [ ] Enable transaction logging
- [ ] Set up backup payment method
- [ ] Test email deliverability
- [ ] Configure email rate limiting
- [ ] Set up email bounce handling

---

## 6. Troubleshooting

### 🐛 **Common Issues**

#### **VNPay: Invalid Signature**
```
Error: Invalid signature
Solution: Check HashSecret matches exactly (case-sensitive)
```

#### **VNPay: Payment Timeout**
```
Error: Code 11 - Payment timeout
Solution: Increase timeout or retry payment
```

#### **Email: Authentication Failed**
```
Error: 535 Authentication failed
Solution: 
1. Enable 2FA on Google account
2. Generate new App Password
3. Use App Password in configuration
```

#### **Email: Connection Timeout**
```
Error: SMTP connection timeout
Solution:
1. Check firewall allows port 587
2. Verify SMTP host is correct
3. Try port 465 with SSL
```

### 📞 **Support**

- **VNPay Support**: https://sandbox.vnpayment.vn/apis/docs/
- **Gmail SMTP**: https://support.google.com/mail/answer/7126229
- **SendGrid**: https://docs.sendgrid.com/

---

## 7. Monitoring & Analytics

### 📊 **Key Metrics to Track**

**Payment Metrics:**
- Payment success rate
- Average payment time
- Failed payment reasons
- Bank code distribution

**Email Metrics:**
- Email delivery rate
- Open rate (if tracking enabled)
- Bounce rate
- Failed sends

### 🔍 **Logging**

All payment and email events are logged:

```csharp
_logger.LogInformation("Payment initiated: {PaymentId}", paymentId);
_logger.LogInformation("VNPay callback received: {TxnRef}", txnRef);
_logger.LogInformation("Email sent: {ToEmail}", toEmail);
_logger.LogError(ex, "Payment failed: {PaymentId}", paymentId);
```

---

## 8. Cost Estimation

### 💰 **VNPay Fees**

- Transaction fee: ~1.5-2.5% per transaction
- Monthly fee: Varies by contract
- Setup fee: One-time

### 📧 **Email Costs**

| Provider | Free Tier | Paid Plans |
|----------|-----------|------------|
| Gmail | 500/day | N/A |
| SendGrid | 100/day | $19.95/month (40k emails) |
| AWS SES | 62,000/month | $0.10 per 1,000 emails |
| Mailgun | 5,000/month | $35/month (50k emails) |

---

## 9. Next Steps

1. **Get VNPay credentials** from sandbox/production
2. **Configure email provider** (Gmail or SendGrid recommended)
3. **Test payment flow** end-to-end
4. **Test email delivery** to different providers
5. **Monitor logs** for any issues
6. **Set up alerts** for failed payments/emails
7. **Document** any custom configurations

---

**Status**: ✅ **Ready for Testing**  
**Last Updated**: 2026-01-07  
**Version**: 1.0.0
