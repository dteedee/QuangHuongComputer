# RBAC & Permission Matrix

## Roles overview
- **Guest**: Unauthenticated visitor
- **Customer**: Registered end-user (B2C)
- **Technician**: Repair staff
- **Sale**: Sales staff
- **Accountant**: Financial staff
- **Manager**: Store manager
- **Admin**: System administrator

## Permissions Matrix

| Context | Permission | Guest | Customer | Technician | Sale | Accountant | Manager | Admin |
|---------|------------|-------|----------|------------|------|------------|---------|-------|
| **Catalog** | View Products | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| | Manage Products | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Sales** | Add to Cart | ✅ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Checkout | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ |
| | View Own Orders | ❌ | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| | Manage Orders | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| **Repair** | Book Repair | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ |
| | Update Job Status | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| | View Job Details | ❌ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| **Accounting** | View Invoices | ❌ | ✅ (Own) | ❌ | ✅ | ✅ | ✅ | ✅ |
| | Create Invoice | ❌ | ❌ | ❌ | ✅ | ✅ | ❌ | ✅ |
| | Approve Credit | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| **Warranty** | Submit Claim | ❌ | ✅ | ❌ | ✅ | ❌ | ❌ | ✅ |
| | Review Claim | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |

## Implementation Strategy
Permissions are implemented using Policy-based authorization in ASP.NET Core. 
Each permission maps to a policy string (e.g., `Permissions.Catalog.View`).
