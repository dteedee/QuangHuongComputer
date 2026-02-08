# 🔌 API Gateway Configuration
## Quang Huong Computer - Microservices Gateway Setup

---

## 📋 Overview

API Gateway đóng vai trò là điểm nhập cảnh duy nhất cho tất cả client requests. Nó xử lý:
- **Routing**: Điều hướng requests đến microservices phù hợp
- **Authentication**: Xác thực JWT tokens
- **Rate Limiting**: Giới hạn rate cho API calls
- **Logging**: Centralized logging
- **CORS**: Cross-origin resource sharing

---

## 🏗️ Architecture

```
                    ┌─────────────────┐
                    │  Client (React) │
                    └────────┬────────┘
                             │
                    ┌────────▼────────┐
                    │  API Gateway    │
                    │  (Port 5000)    │
                    └────────┬────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌───────▼────────┐  ┌───────▼────────┐
│  Sales Service │  │  Catalog       │  │  Inventory     │
│  (Port 5001)   │  │  (Port 5002)   │  │  (Port 5003)   │
└────────────────┘  └────────────────┘  └────────────────┘
        │                    │                    │
┌───────▼────────┐  ┌───────▼────────┐  ┌───────▼────────┐
│  Payments      │  │  Repair        │  │  Warranty      │
│  (Port 5004)   │  │  (Port 5005)   │  │  (Port 5006)   │
└────────────────┘  └────────────────┘  └────────────────┘
        │                    │                    │
┌───────▼────────┐  ┌───────▼────────┐  ┌───────▼────────┐
│  Accounting    │  │  HR            │  │  Content       │
│  (Port 5007)   │  │  (Port 5008)   │  │  (Port 5009)   │
└────────────────┘  └────────────────┘  └────────────────┘
```

---

## 🔧 Service Ports Mapping

| Service | Internal Port | External Port | Health Check |
|---------|---------------|---------------|--------------|
| API Gateway | 8080 | 5000 | `/health` |
| Catalog | 8080 | 5002 | `/health` |
| Sales | 8080 | 5001 | `/health` |
| Inventory | 8080 | 5003 | `/health` |
| Repair | 8080 | 5005 | `/health` |
| Warranty | 8080 | 5006 | `/health` |
| Payments | 8080 | 5004 | `/health` |
| Accounting | 8080 | 5007 | `/health` |
| HR | 8080 | 5008 | `/health` |
| Content | 8080 | 5009 | `/health` |
| AI | 8080 | 5010 | `/health` |
| Communication | 8080 | 5011 | `/health` |
| Identity | 8080 | 5012 | `/health` |
| Reporting | 8080 | 5013 | `/health` |
| SystemConfig | 8080 | 5014 | `/health` |

---

## 🌐 API Routes Configuration

### Public Routes (No Authentication)

```
GET    /api/health                   → Gateway health check
POST   /api/auth/login              → Identity Service
POST   /api/auth/register           → Identity Service
POST   /api/auth/refresh-token      → Identity Service
POST   /api/auth/forgot-password    → Identity Service
GET    /api/catalog/products        → Catalog Service
GET    /api/catalog/products/{id}   → Catalog Service
GET    /api/catalog/categories      → Catalog Service
GET    /api/catalog/brands          → Catalog Service
GET    /api/content/pages           → Content Service
GET    /api/content/banners         → Content Service
```

### Protected Routes (Require Authentication)

#### Customer Routes
```
GET    /api/customer/profile        → Identity Service
PUT    /api/customer/profile        → Identity Service
GET    /api/customer/orders         → Sales Service
POST   /api/customer/orders         → Sales Service
GET    /api/customer/orders/{id}    → Sales Service
POST   /api/customer/cart           → Sales Service
PUT    /api/customer/cart/{id}      → Sales Service
DELETE /api/customer/cart/{id}      → Sales Service
POST   /api/customer/checkout       → Sales Service
GET    /api/customer/warranties     → Warranty Service
POST   /api/customer/repairs        → Repair Service
GET    /api/customer/repairs/{id}   → Repair Service
```

#### Admin Routes
```
GET    /api/admin/dashboard         → Reporting Service
GET    /api/admin/products          → Catalog Service
POST   /api/admin/products          → Catalog Service
PUT    /api/admin/products/{id}     → Catalog Service
DELETE /api/admin/products/{id}     → Catalog Service
GET    /api/admin/orders            → Sales Service
PUT    /api/admin/orders/{id}       → Sales Service
GET    /api/admin/customers         → Identity Service
GET    /api/admin/users             → Identity Service
POST   /api/admin/users             → Identity Service
PUT    /api/admin/users/{id}        → Identity Service
DELETE /api/admin/users/{id}        → Identity Service
```

#### Backoffice Routes
```
GET    /api/pos/orders              → Sales Service
POST   /api/pos/orders              → Sales Service
GET    /api/inventory/stock         → Inventory Service
POST   /api/inventory/purchase      → Inventory Service
GET    /api/repair/jobs             → Repair Service
PUT    /api/repair/jobs/{id}        → Repair Service
GET    /api/warranty/claims         → Warranty Service
PUT    /api/warranty/claims/{id}    → Warranty Service
GET    /api/accounting/invoices     → Accounting Service
POST   /api/accounting/invoices     → Accounting Service
GET    /api/hr/employees            → HR Service
GET    /api/hr/shifts               → HR Service
```

---

## 🔐 Authentication Flow

```
Client Request
       │
       ▼
┌──────────────────┐
│ API Gateway      │
│                  │
│ 1. Extract JWT   │
│ 2. Validate Token│
│ 3. Check Role    │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│ Is Valid?        │
└────┬─────────┬───┘
     │         │
    Yes        No
     │         │
     ▼         ▼
┌─────────┐  ┌──────────────┐
│ Forward │  │ Return 401   │
│ to Service│  │ Unauthorized │
└─────────┘  └──────────────┘
```

---

## 📝 Gateway Configuration (appsettings.json)

```json
{
  "Urls": "http://0.0.0.0:8080",
  "Serilog": {
    "MinimumLevel": "Information",
    "WriteTo": [
      {
        "Name": "Console",
        "Args": {
          "outputTemplate": "[{Timestamp:HH:mm:ss} {Level:u3}] {Message:lj}{NewLine}{Exception}"
        }
      }
    ]
  },
  "AllowedOrigins": [
    "http://localhost:3000",
    "https://quanghuongcomputer.com"
  ],
  "Jwt": {
    "Key": "your-super-secret-key-here-change-in-production",
    "Issuer": "QuangHuongComputer",
    "Audience": "QuangHuongComputer",
    "ExpiryMinutes": 60
  },
  "RateLimiting": {
    "PermitLimit": 100,
    "WindowInSeconds": 60,
    "SlidingExpiry": false
  },
  "Services": {
    "Identity": {
      "BaseUrl": "http://identity:8080"
    },
    "Catalog": {
      "BaseUrl": "http://catalog:8080"
    },
    "Sales": {
      "BaseUrl": "http://sales:8080"
    },
    "Inventory": {
      "BaseUrl": "http://inventory:8080"
    },
    "Repair": {
      "BaseUrl": "http://repair:8080"
    },
    "Warranty": {
      "BaseUrl": "http://warranty:8080"
    },
    "Payments": {
      "BaseUrl": "http://payments:8080"
    },
    "Accounting": {
      "BaseUrl": "http://accounting:8080"
    },
    "HR": {
      "BaseUrl": "http://hr:8080"
    },
    "Content": {
      "BaseUrl": "http://content:8080"
    },
    "AI": {
      "BaseUrl": "http://ai:8080"
    },
    "Communication": {
      "BaseUrl": "http://communication:8080"
    },
    "Reporting": {
      "BaseUrl": "http://reporting:8080"
    },
    "SystemConfig": {
      "BaseUrl": "http://systemconfig:8080"
    }
  }
}
```

---

## 🐳 Docker Compose Configuration

```yaml
version: '3.8'

services:
  api-gateway:
    build:
      context: .
      dockerfile: backend/ApiGateway/Dockerfile
    container_name: computer_api_gateway
    ports:
      - "5000:8080"
    environment:
      - ASPNETCORE_ENVIRONMENT=Production
      - Services__Identity__BaseUrl=http://identity:8080
      - Services__Catalog__BaseUrl=http://catalog:8080
      - Services__Sales__BaseUrl=http://sales:8080
      - Services__Inventory__BaseUrl=http://inventory:8080
      - Services__Repair__BaseUrl=http://repair:8080
      - Services__Warranty__BaseUrl=http://warranty:8080
      - Services__Payments__BaseUrl=http://payments:8080
      - Services__Accounting__BaseUrl=http://accounting:8080
      - Services__HR__BaseUrl=http://hr:8080
      - Services__Content__BaseUrl=http://content:8080
      - Services__AI__BaseUrl=http://ai:8080
      - Services__Communication__BaseUrl=http://communication:8080
      - Services__Reporting__BaseUrl=http://reporting:8080
      - Services__SystemConfig__BaseUrl=http://systemconfig:8080
    depends_on:
      - identity
      - catalog
      - sales
      - inventory
      - repair
      - warranty
      - payments
      - accounting
      - hr
      - content
      - ai
      - communication
      - reporting
      - systemconfig
    networks:
      - computer_net
    restart: unless-stopped
```

---

## 🔍 Health Checks

### Gateway Health Check Endpoint
```
GET /api/health
```

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00Z",
  "services": {
    "identity": "healthy",
    "catalog": "healthy",
    "sales": "healthy",
    "inventory": "healthy",
    "repair": "healthy",
    "warranty": "healthy",
    "payments": "healthy",
    "accounting": "healthy",
    "hr": "healthy",
    "content": "healthy",
    "ai": "healthy",
    "communication": "healthy",
    "reporting": "healthy",
    "systemconfig": "healthy"
  }
}
```

---

## 🚦 Rate Limiting Strategy

| Endpoint | Rate Limit | Burst |
|----------|------------|-------|
| Public APIs | 100 req/min | 20 |
| Customer APIs | 200 req/min | 50 |
| Admin APIs | 1000 req/min | 100 |
| POS APIs | 500 req/min | 50 |

---

## 📊 Monitoring & Logging

### Metrics to Track:
- Request count per endpoint
- Response times (p50, p95, p99)
- Error rates
- Active connections
- Gateway health

### Logging Levels:
- **Information**: Normal operations
- **Warning**: Rate limit hits, slow responses
- **Error**: Failed requests, service unavailability
- **Critical**: Gateway failure, all services down

---

## 🔄 Circuit Breaker Configuration

```json
{
  "CircuitBreaker": {
    "FailureThreshold": 5,
    "SamplingDuration": "00:00:30",
    "MinimumThroughput": 10,
    "DurationOfBreak": "00:01:00"
  }
}
```

---

## 🛡️ Security Headers

```csharp
app.UseSecurityHeaders(new HeaderPolicyCollection()
    .AddFrameOptionsSameOrigin()
    .AddContentTypeOptionsNoSniff()
    .AddStrictTransportSecurityMaxAgeIncludeSubDomains(maxAgeInSeconds: 60 * 60 * 24 * 365)
    .AddXssProtectionBlock()
    .AddContentSecurityPolicy(builder =>
    {
        builder.AddDefaultSrc().Self();
        builder.AddImgSrc().Self().Append("data:");
        builder.AddScriptSrc().Self();
        builder.AddStyleSrc().Self();
    })
);
```

---

## 📝 Testing Gateway

### Test Health Check
```bash
curl http://localhost:5000/api/health
```

### Test Authentication
```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'
```

### Test Protected Route
```bash
curl http://localhost:5000/api/catalog/products \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

---

## 🐛 Troubleshooting

### Issue: Gateway returns 502 Bad Gateway
**Solution**: Check if downstream service is running
```bash
docker ps | grep service-name
```

### Issue: CORS errors
**Solution**: Add origin to AllowedOrigins in appsettings.json

### Issue: High latency
**Solution**: Check service health, enable caching

---

*Document Version: 1.0*  
*Last Updated: 2024*  
*Owner: Backend Team*
