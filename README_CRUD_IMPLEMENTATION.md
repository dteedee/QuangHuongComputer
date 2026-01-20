# CRUD Management System Implementation Guide

## 🎯 Project Status

**Phase 1: Foundation Infrastructure** ✅ COMPLETED
- Backend: Repository pattern, Validation, Endpoint builder, Testing infrastructure
- Frontend: Reusable components, Custom hooks, Testing setup

**Phase 2-4: Module Implementations** 🔄 IN PROGRESS (11 agents working in parallel)
- Supplier Management (Agents: ac1bd33, ad2ac33)
- AR/AP & Shift Management (Agents: a8bbc00, a6e44b8)
- HR Module (Agents: ab47dd2, a208788)
- Admin Module (Agents: abaff86, a0cc975)
- CMS Module (Agents: a824349, ad722c3)
- Chat Enhancement (Agent: ada2d77)

**Phase 5: Testing** 🔄 IN PROGRESS
- Backend Tests (Agent: abd223b)
- Frontend Tests (Agent: a49a141)

## 📋 Quick Start Guide

### Prerequisites
- .NET 8 SDK
- Node.js 18+
- PostgreSQL
- Git

### Backend Setup

```bash
cd backend

# Restore packages
dotnet restore

# Run migrations
dotnet ef database update --project Services/Inventory
dotnet ef database update --project Services/Accounting
dotnet ef database update --project Services/HR
# ... repeat for all services

# Run backend
cd ApiGateway
dotnet run
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Run tests with UI
npm run test:ui
```

### Run Tests

**Backend**:
```bash
cd backend
dotnet test
```

**Frontend**:
```bash
cd frontend
npm test
npm run test:coverage
```

## 🏗️ Architecture Overview

### Backend Architecture

```
BuildingBlocks/ (Shared Infrastructure)
├── Repository/      (Generic CRUD with pagination)
├── Validation/      (Validation framework)
├── Endpoints/       (Endpoint builder)
└── Testing/         (Test utilities)

Services/ (Domain Modules)
├── Inventory/       (Supplier, Stock, PO)
├── Accounting/      (AR, AP, Shifts, Invoice)
├── HR/              (Employee, Timesheet, Payroll)
├── Identity/        (Users, Roles, Permissions)
├── SystemConfig/    (Configuration)
├── Content/         (Posts, Coupons)
└── Communication/   (Chat)
```

### Frontend Architecture

```
components/
├── crud/           (Reusable CRUD components)
│   ├── DataTable.tsx
│   ├── CrudListPage.tsx
│   ├── CrudFormModal.tsx
│   └── ...
└── [module]/       (Module-specific components)

hooks/              (Custom React hooks)
├── useCrudList.ts
├── useCrudCreate.ts
├── useCrudUpdate.ts
└── ...

pages/              (Page components)
├── backoffice/
│   ├── inventory/
│   ├── accountant/
│   ├── hr/
│   ├── admin/
│   └── cms/
└── ...
```

## 🎨 Code Patterns

### Backend - Creating a New CRUD Module

```csharp
// 1. Domain Entity
public class MyEntity : Entity<Guid>
{
    public string Name { get; private set; }

    public MyEntity(string name)
    {
        Id = Guid.NewGuid();
        Name = name;
    }

    public void UpdateName(string name) => Name = name;

    public ValidationResult Validate()
    {
        var result = new ValidationResult();
        if (!CommonValidators.IsNotEmpty(Name))
            result.AddError(nameof(Name), "Name is required");
        return result;
    }
}

// 2. DTOs
public record CreateMyEntityDto(string Name);
public record UpdateMyEntityDto(string Name);

// 3. Validator
public class MyEntityValidator : IValidator<CreateMyEntityDto>
{
    public ValidationResult Validate(CreateMyEntityDto instance)
    {
        var result = new ValidationResult();
        if (!CommonValidators.IsNotEmpty(instance.Name))
            result.AddError(nameof(instance.Name), "Name is required");
        return result;
    }

    public Task<ValidationResult> ValidateAsync(CreateMyEntityDto instance)
        => Task.FromResult(Validate(instance));
}

// 4. Endpoints
group.MapGet("/myentities", async (
    [AsParameters] QueryParams queryParams,
    MyDbContext db) =>
{
    var repository = new Repository<MyEntity, Guid, MyDbContext>(db);
    var result = await repository.GetPagedAsync(queryParams);
    return Results.Ok(result);
}).RequireAuthorization("mymodule.view");

// 5. Tests
public class MyEntityTests : CrudTestBase<MyEntity, Guid, MyDbContext>
{
    protected override MyEntity CreateValidEntity()
        => new MyEntity("Test Name");

    protected override MyEntity CreateInvalidEntity()
        => new MyEntity("");

    protected override void UpdateEntity(MyEntity entity)
        => entity.UpdateName("Updated Name");
}
```

### Frontend - Creating a New CRUD Page

```typescript
// 1. API Client (api/mymodule.ts)
export const myModuleApi = {
  getList: async (params?: QueryParams) =>
    client.get<PagedResult<MyEntity>>('/mymodule/entities', { params }),
  create: async (data: CreateDto) =>
    client.post('/mymodule/entities', data),
  // ... other methods
};

// 2. Zod Schema (schemas/myModuleSchemas.ts)
export const createEntitySchema = z.object({
  name: z.string().min(1, 'Name is required'),
});

// 3. Page Component (pages/backoffice/mymodule/EntitiesPage.tsx)
export function EntitiesPage() {
  const { hasPermission } = usePermissions();

  const {
    data,
    total,
    page,
    pageSize,
    isLoading,
    search,
    handlePageChange,
    handleSearch,
  } = useCrudList({
    queryKey: ['mymodule', 'entities'],
    fetchFn: myModuleApi.getList,
  });

  const columns: Column<MyEntity>[] = [
    { key: 'name', label: 'Name', sortable: true },
    { key: 'createdAt', label: 'Created', render: (item) => formatDate(item.createdAt) },
  ];

  return (
    <CrudListPage
      title="Entities"
      columns={columns}
      data={data}
      total={total}
      page={page}
      pageSize={pageSize}
      onPageChange={handlePageChange}
      isLoading={isLoading}
      onAdd={() => setShowModal(true)}
      canAdd={hasPermission('mymodule.create')}
      filters={
        <SearchInput value={search} onChange={handleSearch} />
      }
    />
  );
}

// 4. Tests (pages/__tests__/EntitiesPage.test.tsx)
describe('EntitiesPage', () => {
  it('renders list correctly', async () => {
    render(<EntitiesPage />);
    expect(await screen.findByText('Entities')).toBeInTheDocument();
  });
});
```

## 🧪 Testing Standards

### Backend Tests
- **Coverage Target**: 80%+
- **Pattern**: AAA (Arrange-Act-Assert)
- **Naming**: `Method_Scenario_ExpectedResult`
- **Tools**: xUnit + FluentAssertions

```csharp
[Fact]
public async Task Create_ValidData_Success()
{
    // Arrange
    var entity = new MyEntity("Test");
    var repository = GetRepository();

    // Act
    var created = await repository.AddAsync(entity);

    // Assert
    created.Should().NotBeNull();
    created.Id.Should().NotBe(Guid.Empty);
}
```

### Frontend Tests
- **Coverage Target**: Comprehensive user interactions
- **Tools**: Vitest + React Testing Library
- **Focus**: User behavior, not implementation

```typescript
it('creates entity on form submit', async () => {
  const user = userEvent.setup();
  render(<EntitiesPage />);

  await user.click(screen.getByText('Add New'));
  await user.type(screen.getByLabelText('Name'), 'Test Entity');
  await user.click(screen.getByText('Save'));

  expect(await screen.findByText('Created successfully')).toBeInTheDocument();
});
```

## 📚 Module-Specific Documentation

### Supplier Management
- **Endpoint**: `/api/inventory/suppliers`
- **Permissions**: `inventory.supplier.create`, `inventory.supplier.update`, etc.
- **Features**: Duplicate checking, FK constraint handling, contact validation

### AR/AP & Shift Management
- **Endpoints**: `/api/accounting/ar`, `/api/accounting/ap`, `/api/accounting/shifts`
- **Features**: Aging buckets, payment validation, shift session management

### HR Module
- **Endpoints**: `/api/hr/employees`, `/api/hr/timesheets`, `/api/hr/payroll`
- **Features**: Timesheet hours calculation, payroll processing

### Admin & Config
- **Endpoints**: `/api/auth/users`, `/api/config`
- **Features**: User management, permission assignment, config versioning

### CMS
- **Endpoints**: `/api/content/posts`, `/api/content/coupons`
- **Features**: Rich text editing, publish workflow, coupon validation

### Chat
- **Features**: Typing indicator, read/unread status, connection handling, AI link parsing

## 🔒 Security

### Backend
- JWT authentication
- Role-based authorization
- Permission-based endpoint protection
- Input validation
- SQL injection prevention (EF Core)

### Frontend
- Permission-based UI hiding
- Input sanitization
- XSS prevention
- Token management

## ⚡ Performance

### Backend
- Pagination for large datasets
- Indexed database columns
- Soft delete with query filters
- Efficient LINQ queries

### Frontend
- Debounced search (300ms)
- React Query caching
- Code splitting
- Lazy loading

## 🐛 Troubleshooting

### Backend Issues

**Database Connection**:
```bash
# Check connection string in appsettings.json
# Test PostgreSQL connection
psql -U postgres -h localhost
```

**Missing Tables**:
```bash
# Run migrations
dotnet ef database update --project Services/[Module]
```

**Test Failures**:
```bash
# Run specific test
dotnet test --filter "MyEntityTests.Create_ValidData_Success"

# Run with verbose output
dotnet test -v detailed
```

### Frontend Issues

**Dependencies**:
```bash
# Clean install
rm -rf node_modules package-lock.json
npm install
```

**Type Errors**:
```bash
# Regenerate types
npm run build
```

**Test Failures**:
```bash
# Run specific test
npm test -- -t "EntitiesPage"

# Run with UI
npm run test:ui
```

## 📝 Verification Checklist

For each module, verify:

**Backend**:
- [ ] Domain entity inherits from Entity<Guid>
- [ ] CRUD endpoints with pagination
- [ ] Permission checks on all endpoints
- [ ] DTOs for create/update
- [ ] Validators with business rules
- [ ] Unit tests (80%+ coverage)
- [ ] Integration tests

**Frontend**:
- [ ] API client methods
- [ ] Zod validation schemas
- [ ] List page with table
- [ ] Search/filter/sort functionality
- [ ] Create/Edit modal
- [ ] Delete confirmation
- [ ] Permission-based UI
- [ ] Component tests
- [ ] Integration tests

## 🚀 Deployment

### Backend
```bash
cd backend/ApiGateway
dotnet publish -c Release -o ./publish
```

### Frontend
```bash
cd frontend
npm run build
# Output in: dist/
```

## 📖 Additional Resources

- [.NET 8 Documentation](https://docs.microsoft.com/dotnet)
- [React 19 Documentation](https://react.dev)
- [TanStack Query](https://tanstack.com/query)
- [Zod Documentation](https://zod.dev)
- [Vitest Documentation](https://vitest.dev)

## 🤝 Contributing

When adding a new CRUD module:
1. Follow existing patterns in BuildingBlocks
2. Create domain entity with validation
3. Create DTOs and validators
4. Use CrudEndpointBuilder or follow manual pattern
5. Create comprehensive tests
6. Update API client
7. Create page component using CRUD components
8. Add tests

## 📞 Support

For issues or questions:
1. Check IMPLEMENTATION_SUMMARY.md
2. Review existing module implementations
3. Check test files for examples
4. Consult BuildingBlocks code

## ✅ Final Steps

Once all agents complete:

1. **Review Code**:
   ```bash
   # Check for compilation errors
   dotnet build
   npm run build
   ```

2. **Run Tests**:
   ```bash
   dotnet test
   npm test
   ```

3. **Manual Testing**:
   - Test each CRUD flow
   - Verify permissions
   - Check validation
   - Test edge cases

4. **Performance Testing**:
   - Test with 1000+ records
   - Verify pagination performance
   - Check query optimization

5. **Security Audit**:
   - Verify permission checks
   - Test unauthorized access
   - Check input validation

6. **Documentation**:
   - Update API documentation
   - Document any special cases
   - Create user guides

## 🎉 Success Criteria

- ✅ All modules follow consistent patterns
- ✅ 80%+ test coverage
- ✅ All tests passing
- ✅ List pages load < 2s
- ✅ Forms submit < 500ms
- ✅ All endpoints protected by permissions
- ✅ Responsive design works on mobile
- ✅ Accessibility standards met

---

**Implementation completed by 11 specialized AI agents working in parallel!**
