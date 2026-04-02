# System Architecture

This document outlines the high-level architecture of the Quang Huong Computer system, automatically interpreted from the repository structure using Repomix.

## Microservices Architecture Overview

The system is built on a modern **Event-Driven Microservices Architecture** utilizing **.NET 8** for the backend services and **Next.js/React** for the frontend, alongside an **API Gateway**.

```mermaid
graph TD
    %% Define Styles
    classDef frontend fill:#2b5c8f,stroke:#1a3a5c,color:white,rx:5px,ry:5px;
    classDef gateway fill:#8b5cf6,stroke:#6d28d9,color:white,rx:5px,ry:5px;
    classDef service fill:#10b981,stroke:#047857,color:white,rx:5px,ry:5px;
    classDef storage fill:#f59e0b,stroke:#b45309,color:white,rx:10px,ry:10px;
    classDef broker fill:#ef4444,stroke:#b91c1c,color:white,rx:10px,ry:10px;
    classDef shared fill:#4b5563,stroke:#374151,color:white,stroke-dasharray: 5 5;

    Client([Web & Mobile Clients])
    
    subgraph FrontendLayer [Frontend Layer]
        NextApp[Next.js App / API Routes]
        ReactUI[React SPA UI]
    end
    
    Gateway[API Gateway]
    
    subgraph BackendLayer [Backend .NET Microservices]
        Identity[Identity Service]
        Catalog[Catalog & PC Builder]
        Sales[Sales & Orders]
        CRM[CRM & Automation]
        HR[HR & Payroll]
        Accounting[Accounting]
        Payments[Payments]
        Inventory[Inventory]
        Communication[Communication Hub]
        Content[CMS & Content]
        Repair[Repair & Warranty]
        Reporting[Reporting]
        AiService[AI Integration]
    end
    
    subgraph SharedCore [BuildingBlocks (Shared Core)]
        EventBus[Messaging / Outbox Pattern]
        DbPlatform[PostgreSQL EF Core]
        CachePlatform[Redis Distributed Cache]
        CommonUtils[Endpoints, Localization, Auditing]
    end
    
    MessageBroker{{Message Broker / Integration Events}}
    Database[(PostgreSQL Databases)]
    RedisCache[(Redis Caching)]

    %% Connections
    Client -->|HTTPS| FrontendLayer
    NextApp -.->|Internal API| Gateway
    ReactUI -->|REST/GraphQL| Gateway
    
    Gateway -->|Routing & Auth| BackendLayer
    
    %% Microservices using BuildingBlocks
    BackendLayer -.->|uses| CommonUtils
    BackendLayer -.->|reads/writes| DbPlatform
    BackendLayer -.->|caches| CachePlatform
    BackendLayer -.->|pub/sub| EventBus
    
    %% Data storage connections
    DbPlatform === Database
    CachePlatform === RedisCache
    EventBus === MessageBroker
    
    %% Styling Assignment
    class Client,ReactUI,NextApp frontend;
    class Gateway gateway;
    class Identity,Catalog,Sales,CRM,HR,Accounting,Payments,Inventory,Communication,Content,Repair,Reporting,AiService service;
    class Database,RedisCache storage;
    class MessageBroker broker;
    class SharedCore,CommonUtils,EventBus,DbPlatform,CachePlatform shared;
```

## Core Components

### 1. Frontend Layer
- **Next.js & React Framework:** Contains the UI components and server-side routes (`app/api/*`). Handles presentation for Customers and Backoffice Admins.

### 2. API Gateway
- **Centralized Entrypoint:** Routes external requests to the appropriate internal microservices. Also responsible for global routing policies, CORS, and early validation.

### 3. Backend Microservices (.NET 8)
Each service is fully decoupled, managing its own domain data:
- **Identity:** Auth, Roles, and Users.
- **Catalog:** Products, Categories, Brands, and PC Building Engine.
- **Sales & Orders:** Cart, Checkout, and Order management.
- **CRM:** Customer Segmentation, Automation Rules, Email Campaigns, Leads.
- **HR & Accounting:** Employees, Payrolls, Transactions, Invoices.
- **Inventory & Payments:** Stock check, Warehouses, Payment Gateways.
- **Communication & Content:** Chat Hubs, Notifications, Banners, CMS.
- **Ai:** Search optimization and smart suggestions.
- **Repair / Warranty / Reporting:** Post-sale services and analytics.

### 4. Shared BuildingBlocks
A shared class library providing standard technical solutions across all microservices:
- **Database:** Standardized BaseDbContext, AuditSaveChangesInterceptor, and PostgreSQL configs.
- **Caching:** Distributed Redis Caching mechanisms.
- **Messaging:** Outbox Pattern implementation (`OutboxProcessorBackgroundService.cs`), and Integration Events processing for eventual consistency.
- **Security & Validation:** Centralized permission handlers and validation pipelines.
