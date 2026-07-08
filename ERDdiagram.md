```mermaid
erDiagram
    businesses {
        uuid id PK
        varchar(255) name
        text whatsapp_phone_number_id
        text whatsapp_access_token
        text whatsapp_business_account_id
        varchar(255) notify_email
        timestamp created_at
        timestamp updated_at
    }

    users {
        uuid id PK
        varchar(255) email
        text password_hash
        varchar(255) full_name
        varchar(30) phone
        user_role role
        boolean is_active
        timestamp last_login_at
        uuid business_id FK
        timestamp created_at
        timestamp updated_at
    }

    customers {
        uuid id PK
        uuid business_id FK
        varchar(30) phone_number
        varchar(255) name
        timestamp created_at
        timestamp updated_at
    }

    conversations {
        uuid id PK
        uuid business_id FK
        uuid customer_id FK
        timestamp last_message_at
        timestamp created_at
    }

    messages {
        uuid id PK
        uuid conversation_id FK
        sender_type sender_type
        text content
        boolean is_custom_reply
        timestamp created_at
    }

    products {
        uuid id PK
        uuid business_id FK
        varchar(255) name
        varchar(100) category
        text description
        text image_url
        integer price
        integer stock
        product_status status
        jsonb variants
        timestamp created_at
        timestamp updated_at
    }

    orders {
        uuid id PK
        uuid business_id FK
        uuid customer_id FK
        order_status status
        decimal total_amount
        timestamp created_at
        timestamp updated_at
    }

    order_items {
        uuid id PK
        uuid order_id FK
        uuid product_id FK
        varchar(255) product_name
        integer qty
        decimal price
    }

    businesses ||--o{ users : "has members"
    businesses ||--o{ customers : "has customers"
    businesses ||--o{ conversations : "has conversations"
    businesses ||--o{ products : "has products"
    businesses ||--o{ orders : "has orders"
    customers ||--o{ conversations : "has conversations"
    customers ||--o{ orders : "places"
    conversations ||--o{ messages : "contains"
    orders ||--o{ order_items : "contains"
    products ||--o{ order_items : "referenced in"
```

## Enums

### user_role
| Value              | Description                                      |
|--------------------|--------------------------------------------------|
| `crm_owner`        | Platform owner — full access across all businesses |
| `business_admin`   | Client who signs up — manages their own business |
| `business_employee`| Agent under a business — restricted access       |

### sender_type
| Value      |
|------------|
| customer   |
| ai         |
| agent      |

### order_status
| Value       |
|-------------|
| new         |
| confirmed   |
| dispatched  |
| delivered   |

### product_status
| Value        |
|--------------|
| active       |
| out_of_stock |

## ProductVariants (JSONB)
```ts
{
  colors?:  string[]
  sizes?:   string[]
  storage?: string[]
}
```

## Permission Matrix

| Action                          | crm_owner | business_admin | business_employee |
|---------------------------------|-----------|----------------|-------------------|
| View all businesses (dashboard) | ✅        | ❌             | ❌                |
| Add/remove CRM owners           | ✅        | ❌             | ❌                |
| Manage own business settings    | ✅        | ✅             | ❌                |
| Add/remove team members         | ✅        | ✅             | ❌                |
| Create/edit products            | ✅        | ✅             | ✅                |
| Delete products                 | ✅        | ✅             | ❌                |
| View/send messages              | ✅        | ✅             | ✅                |
| View orders                     | ✅        | ✅             | ✅                |
| Update order status             | ✅        | ✅             | ✅                |
| View customers & analytics      | ✅        | ✅             | ✅                |

## API Routes

| Method | Path                              | Role Required                        |
|--------|-----------------------------------|--------------------------------------|
| POST   | /api/auth/login                   | —                                    |
| POST   | /api/auth/register                | —                                    |
| GET    | /api/auth/me                      | any authenticated                    |
| GET    | /api/products                     | any authenticated                    |
| POST   | /api/products                     | crm_owner, business_admin, b_employee|
| PATCH  | /api/products/:id                 | crm_owner, business_admin, b_employee|
| DELETE | /api/products/:id                 | crm_owner, business_admin            |
| GET    | /api/customers                    | crm_owner, business_admin, b_employee|
| GET    | /api/customers/analytics          | crm_owner, business_admin, b_employee|
| GET    | /api/customers/:id                | crm_owner, business_admin, b_employee|
| GET    | /api/conversations                | crm_owner, business_admin, b_employee|
| GET    | /api/conversations/:id/messages   | crm_owner, business_admin, b_employee|
| POST   | /api/conversations/:id/messages   | crm_owner, business_admin, b_employee|
| GET    | /api/orders?status=               | crm_owner, business_admin, b_employee|
| GET    | /api/orders/:id                   | crm_owner, business_admin, b_employee|
| PATCH  | /api/orders/:id/status            | crm_owner, business_admin, b_employee|
| GET    | /api/team                         | crm_owner, business_admin            |
| POST   | /api/team                         | crm_owner, business_admin            |
| DELETE | /api/team/:id                     | crm_owner, business_admin            |
| GET    | /api/businesses                   | crm_owner                            |
| GET    | /api/businesses/settings          | crm_owner, business_admin            |
| PATCH  | /api/businesses/settings          | crm_owner, business_admin            |
| GET    | /api/crm-owner/stats              | crm_owner                            |
| GET    | /api/crm-owner/businesses         | crm_owner                            |
| GET    | /api/crm-owner/owners             | crm_owner                            |
| POST   | /api/crm-owner/owners             | crm_owner                            |
| DELETE | /api/crm-owner/owners/:id         | crm_owner                            |
