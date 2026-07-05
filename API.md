# RayoExpress API Documentation

> Vite + React + TypeScript + Supabase frontend application.

---

## 1. Supabase Schema

All tables are defined in `supabase/migrations/`. Row Level Security (RLS) is enabled on every table. Indexes are listed where defined.

### 1.1 `profiles`
Extends `auth.users`. Created automatically via trigger on signup.

| Column       | Type                        | Constraints                              |
|-------------|-----------------------------|------------------------------------------|
| `id`        | `uuid`                      | PK, references `auth.users(id)` CASCADE  |
| `role`      | `public.app_role`           | NOT NULL, DEFAULT `'customer'`           |
| `full_name` | `text`                      | NULLABLE                                 |
| `phone`     | `text`                      | NULLABLE                                 |
| `avatar_url`| `text`                      | NULLABLE                                 |
| `is_suspended`| `boolean`                 | NOT NULL, DEFAULT `false`                |
| `created_at`| `timestamptz`               | NOT NULL, DEFAULT `now()`                |
| `updated_at`| `timestamptz`               | NOT NULL, DEFAULT `now()`                |

**Triggers:** `profiles_updated_at` (BEFORE UPDATE)

**RLS Policies:**
- `profiles_select_self` — SELECT own profile (`auth.uid() = id`)
- `profiles_select_admin` — SELECT all for admin (via `raw_user_meta_data->>'role'`)
- `profiles_insert_self` — INSERT with `auth.uid() = id AND role = 'customer'` (prevents self-elevation)
- `profiles_update_self` — UPDATE own profile; cannot change role
- `profiles_admin_all` — ALL for admin via `profiles.role = 'admin'`

**Indexes:** (none beyond PK)

### 1.2 `password_recovery_questions`

| Column        | Type          | Constraints                                    |
|--------------|---------------|------------------------------------------------|
| `user_id`    | `uuid`        | PK, references `profiles(id)` CASCADE          |
| `question`   | `text`        | NOT NULL                                       |
| `answer_hash`| `text`        | NOT NULL                                       |
| `created_at` | `timestamptz` | NOT NULL, DEFAULT `now()`                      |
| `updated_at` | `timestamptz` | NOT NULL, DEFAULT `now()`                      |

**Triggers:** `password_recovery_updated_at` (BEFORE UPDATE)

**RLS Policies:**
- `recovery_select_self` — SELECT own question
- `recovery_insert_self` — INSERT own question
- `recovery_update_self` — UPDATE own question

### 1.3 `customers`
Auto-created via trigger when profile role is `customer`.

| Column            | Type    | Constraints                                   |
|-------------------|---------|-----------------------------------------------|
| `id`              | `uuid`  | PK, references `profiles(id)` CASCADE         |
| `default_address` | `text`  | NULLABLE                                      |

**RLS Policies:**
- `customers_select_self` — SELECT own record or admin all
- `customers_insert_self` — INSERT own record
- `customers_update_self` — UPDATE own record

### 1.4 `drivers`
Auto-created via trigger when profile role is `driver`, or via approval RPC.

| Column         | Type            | Constraints                           |
|----------------|-----------------|---------------------------------------|
| `id`           | `uuid`          | PK, references `profiles(id)` CASCADE |
| `is_online`    | `boolean`       | NOT NULL, DEFAULT `false`             |
| `approved`     | `boolean`       | NOT NULL, DEFAULT `false`             |
| `rating`       | `numeric(3,2)`  | DEFAULT `0`, CHECK 0–5               |
| `vehicle_type` | `text`          | NULLABLE                              |
| `vehicle_plate`| `text`          | NULLABLE                              |

**RLS Policies:**
- `drivers_select_self` — SELECT own or admin
- `drivers_insert_self` — INSERT own
- `drivers_update_self` — UPDATE own

### 1.5 `driver_documents`

| Column          | Type            | Constraints                                    |
|-----------------|-----------------|------------------------------------------------|
| `id`            | `uuid`          | PK, DEFAULT `gen_random_uuid()`                |
| `driver_id`     | `uuid`          | NOT NULL, references `drivers(id)` CASCADE     |
| `document_type` | `text`          | NOT NULL                                       |
| `file_url`      | `text`          | NOT NULL                                       |
| `approved`      | `boolean`       | NOT NULL, DEFAULT `false`                      |
| `created_at`    | `timestamptz`   | NOT NULL, DEFAULT `now()`                      |

**RLS Policies:**
- `driver_documents_select_self` — SELECT own or admin
- `driver_documents_insert_self` — INSERT own
- `driver_documents_admin_all` — ALL for admin

### 1.6 `stores`

| Column          | Type            | Constraints                                 |
|-----------------|-----------------|---------------------------------------------|
| `id`            | `uuid`          | PK, DEFAULT `gen_random_uuid()`             |
| `owner_id`      | `uuid`          | NOT NULL, references `profiles(id)`         |
| `name`          | `text`          | NOT NULL                                    |
| `description`   | `text`          | NULLABLE                                    |
| `emoji`         | `text`          | DEFAULT `'🏪'`                               |
| `cover_color`   | `text`          | DEFAULT `'#6D28D9'`                          |
| `is_open`       | `boolean`       | NOT NULL, DEFAULT `false`                   |
| `min_order`     | `numeric(10,2)` | DEFAULT `0`, CHECK >= 0                    |
| `delivery_fee`  | `numeric(10,2)` | DEFAULT `0`, CHECK >= 0                    |
| `coverage_area` | `jsonb`         | NULLABLE                                    |
| `created_at`    | `timestamptz`   | NOT NULL, DEFAULT `now()`                   |
| `updated_at`    | `timestamptz`   | NOT NULL, DEFAULT `now()`                   |

**Triggers:** `stores_updated_at` (BEFORE UPDATE)

**RLS Policies:**
- `stores_select_all` — SELECT all
- `stores_select_open` — SELECT only open stores
- `stores_insert_owner` — INSERT as owner
- `stores_update_owner` — UPDATE as owner or admin

### 1.7 `categories`

| Column       | Type            | Constraints                       |
|--------------|-----------------|-----------------------------------|
| `id`         | `uuid`          | PK, DEFAULT `gen_random_uuid()`   |
| `name`       | `text`          | NOT NULL                          |
| `emoji`      | `text`          | DEFAULT `'📦'`                    |
| `bg_color`   | `text`          | DEFAULT `'#F3F4F6'`               |
| `created_at` | `timestamptz`   | NOT NULL, DEFAULT `now()`         |

**RLS Policies:**
- `categories_select_all` — SELECT all
- `categories_admin_all` — ALL for admin

### 1.8 `products`

| Column        | Type            | Constraints                                 |
|---------------|-----------------|---------------------------------------------|
| `id`          | `uuid`          | PK, DEFAULT `gen_random_uuid()`             |
| `store_id`    | `uuid`          | NOT NULL, references `stores(id)` CASCADE   |
| `category_id` | `uuid`          | NULLABLE, references `categories(id)`       |
| `name`        | `text`          | NOT NULL                                    |
| `description` | `text`          | NULLABLE                                    |
| `price`       | `numeric(10,2)` | NOT NULL, CHECK > 0                        |
| `emoji`       | `text`          | DEFAULT `'🍽️'`                              |
| `image_url`   | `text`          | NULLABLE                                    |
| `is_active`   | `boolean`       | NOT NULL, DEFAULT `true`                    |
| `created_at`  | `timestamptz`   | NOT NULL, DEFAULT `now()`                   |
| `updated_at`  | `timestamptz`   | NOT NULL, DEFAULT `now()`                   |

**Triggers:** `products_updated_at` (BEFORE UPDATE); `on_product_created` (AFTER INSERT → auto-creates inventory record)

**RLS Policies:**
- `products_select_active` — SELECT where `is_active = true` OR store owner
- `products_insert_store` — INSERT by store owner
- `products_update_store` — UPDATE by store owner
- `products_delete_store` — DELETE by store owner
- `products_admin_store` — ALL for store owner or admin

**Indexes:** `idx_products_store`, `idx_products_category`

### 1.9 `inventory`
Auto-created when a product is inserted.

| Column               | Type    | Constraints                                      |
|----------------------|---------|--------------------------------------------------|
| `id`                 | `uuid`  | PK, DEFAULT `gen_random_uuid()`                  |
| `product_id`         | `uuid`  | NOT NULL, UNIQUE, references `products(id)` CASCADE |
| `quantity`           | `int`   | NOT NULL, DEFAULT `0`, CHECK >= 0               |
| `low_stock_threshold`| `int`   | NOT NULL, DEFAULT `10`                           |
| `updated_at`         | `timestamptz` | NOT NULL, DEFAULT `now()`                  |

**Triggers:** `inventory_updated_at` (BEFORE UPDATE)

**RLS Policies:**
- `inventory_select_store` — SELECT via store owner chain
- `inventory_update_store` — UPDATE via store owner chain
- `inventory_admin_all` — ALL for admin

### 1.10 `promotions`

| Column           | Type            | Constraints                                  |
|------------------|-----------------|----------------------------------------------|
| `id`             | `uuid`          | PK, DEFAULT `gen_random_uuid()`              |
| `store_id`       | `uuid`          | NULLABLE, references `stores(id)`            |
| `code`           | `text`          | NULLABLE                                     |
| `title`          | `text`          | NOT NULL                                     |
| `discount_type`  | `text`          | NOT NULL, CHECK IN (`'percentage'`, `'fixed'`) |
| `discount_value` | `numeric(10,2)` | NOT NULL, CHECK > 0                          |
| `min_order`      | `numeric(10,2)` | DEFAULT `0`                                  |
| `max_uses`       | `int`           | DEFAULT `0`                                  |
| `uses_count`     | `int`           | NOT NULL, DEFAULT `0`                        |
| `starts_at`      | `timestamptz`   | NULLABLE                                     |
| `ends_at`        | `timestamptz`   | NULLABLE                                     |
| `active`         | `boolean`       | NOT NULL, DEFAULT `true`                     |
| `created_at`     | `timestamptz`   | NOT NULL, DEFAULT `now()`                    |

**RLS Policies:**
- `promotions_select_visible` — SELECT active promotions or own store's or admin
- `promotions_insert_store` — INSERT by store owner
- `promotions_update_store` — UPDATE by store owner
- `promotions_admin_all` — ALL for admin

**Indexes:** `idx_promotions_code`

### 1.11 `orders`

| Column                 | Type                  | Constraints                                |
|------------------------|-----------------------|--------------------------------------------|
| `id`                   | `uuid`                | PK, DEFAULT `gen_random_uuid()`            |
| `customer_id`          | `uuid`                | NOT NULL, references `profiles(id)`        |
| `store_id`             | `uuid`                | NOT NULL, references `stores(id)`          |
| `driver_id`            | `uuid`                | NULLABLE, references `profiles(id)`        |
| `status`               | `public.order_status` | NOT NULL, DEFAULT `'pending'`              |
| `payment_method`       | `public.payment_method` | NOT NULL, DEFAULT `'cash'`               |
| `transfer_receipt_url` | `text`                | NULLABLE                                   |
| `subtotal`             | `numeric(10,2)`       | NOT NULL, CHECK >= 0                      |
| `delivery_fee`         | `numeric(10,2)`       | NOT NULL, DEFAULT `0`, CHECK >= 0         |
| `discount`             | `numeric(10,2)`       | NOT NULL, DEFAULT `0`, CHECK >= 0         |
| `tax`                  | `numeric(10,2)`       | NOT NULL, DEFAULT `0`, CHECK >= 0         |
| `tip`                  | `numeric(10,2)`       | NOT NULL, DEFAULT `0`, CHECK >= 0         |
| `total`                | `numeric(10,2)`       | NOT NULL, CHECK >= 0                      |
| `delivery_address`     | `text`                | NOT NULL                                   |
| `customer_delivery_code`| `text`               | NULLABLE                                   |
| `notes`                | `text`                | NULLABLE                                   |
| `created_at`           | `timestamptz`         | NOT NULL, DEFAULT `now()`                  |
| `updated_at`           | `timestamptz`         | NOT NULL, DEFAULT `now()`                  |

**Triggers:**
- `orders_updated_at` (BEFORE UPDATE)
- `on_order_accepted` (AFTER UPDATE, pending→accepted) → generates delivery code
- `on_order_status_change` (AFTER UPDATE, status changed) → logs to `order_status_history`
- `on_order_status_validate` (BEFORE UPDATE, status changed) → validates state machine transitions
- `on_order_notify` (AFTER UPDATE, status changed) → creates notifications
- `on_order_accept_inventory` (AFTER UPDATE, pending→accepted) → decrements inventory

**RLS Policies:**
- `orders_select_customer` — SELECT own orders
- `orders_select_driver` — SELECT assigned orders
- `orders_select_store` — SELECT orders for own store
- `orders_select_admin` — SELECT all for admin
- `orders_insert_customer` — INSERT own orders
- `orders_select` / `orders_update` — Catch-all: customer, driver, store owner, or admin

**Indexes:** `idx_orders_customer`, `idx_orders_store`, `idx_orders_driver`, `idx_orders_status`

### 1.12 `order_items`

| Column          | Type            | Constraints                                    |
|-----------------|-----------------|------------------------------------------------|
| `id`            | `uuid`          | PK, DEFAULT `gen_random_uuid()`                |
| `order_id`      | `uuid`          | NOT NULL, references `orders(id)` CASCADE      |
| `product_id`    | `uuid`          | NOT NULL, references `products(id)`            |
| `product_name`  | `text`          | NOT NULL                                       |
| `product_emoji` | `text`          | NULLABLE                                       |
| `quantity`      | `int`           | NOT NULL, CHECK > 0                            |
| `unit_price`    | `numeric(10,2)` | NOT NULL, CHECK >= 0                           |
| `subtotal`      | `numeric(10,2)` | GENERATED ALWAYS AS `(quantity * unit_price)` STORED |

**RLS Policies:**
- `order_items_select_customer` / `_driver` / `_store` / `_admin` — Role-scoped SELECT
- `order_items_select` — Catch-all for participants
- `order_items_insert` — INSERT by order customer

**Indexes:** `idx_order_items_order`

### 1.13 `order_status_history`
Inserted automatically via trigger `on_order_status_change`.

| Column       | Type                  | Constraints                                |
|--------------|-----------------------|--------------------------------------------|
| `id`         | `uuid`                | PK, DEFAULT `gen_random_uuid()`            |
| `order_id`   | `uuid`                | NOT NULL, references `orders(id)` CASCADE  |
| `status`     | `public.order_status` | NOT NULL                                   |
| `changed_by` | `uuid`                | NULLABLE, references `profiles(id)`        |
| `created_at` | `timestamptz`         | NOT NULL, DEFAULT `now()`                  |

**RLS Policies:**
- `order_status_history_select` — SELECT for order participants
- `order_status_history_insert_deny` — INSERT denied (trigger only)

**Indexes:** `idx_order_status_history_order`

### 1.14 `payments`

| Column        | Type            | Constraints                                |
|---------------|-----------------|--------------------------------------------|
| `id`          | `uuid`          | PK, DEFAULT `gen_random_uuid()`            |
| `order_id`    | `uuid`          | NOT NULL, references `orders(id)` CASCADE  |
| `method`      | `text`          | NOT NULL                                   |
| `amount`      | `numeric(10,2)` | NOT NULL, CHECK >= 0                      |
| `receipt_url` | `text`          | NULLABLE                                   |
| `verified`    | `boolean`       | NOT NULL, DEFAULT `false`                  |
| `verified_by` | `uuid`          | NULLABLE, references `profiles(id)`        |
| `created_at`  | `timestamptz`   | NOT NULL, DEFAULT `now()`                  |

**RLS Policies:**
- `payments_select` — SELECT for order participants or admin
- `payments_insert` — INSERT by order customer
- `payments_update` — UPDATE by admin

### 1.15 `payment_transactions`
Extended payment tracking with external provider references.

| Column               | Type            | Constraints                                      |
|----------------------|-----------------|--------------------------------------------------|
| `id`                 | `uuid`          | PK, DEFAULT `gen_random_uuid()`                  |
| `order_id`           | `uuid`          | NOT NULL, references `orders(id)` CASCADE        |
| `method`             | `text`          | NOT NULL                                         |
| `amount`             | `numeric(10,2)` | NOT NULL, CHECK >= 0                            |
| `receipt_url`        | `text`          | NULLABLE                                         |
| `provider`           | `text`          | NULLABLE                                         |
| `provider_reference` | `text`          | NULLABLE                                         |
| `status`             | `text`          | NOT NULL, DEFAULT `'pending'`, CHECK IN (`'pending'`, `'completed'`, `'failed'`, `'refunded'`) |
| `verified`           | `boolean`       | NOT NULL, DEFAULT `false`                        |
| `verified_by`        | `uuid`          | NULLABLE, references `profiles(id)`              |
| `created_at`         | `timestamptz`   | NOT NULL, DEFAULT `now()`                        |
| `updated_at`         | `timestamptz`   | NOT NULL, DEFAULT `now()`                        |

**Triggers:** `set_updated_at_payment_transactions` (BEFORE UPDATE)

**RLS Policies:**
- `payment_transactions_select` — SELECT for order participants or admin
- `payment_transactions_insert` — INSERT by order customer
- `payment_transactions_update` — UPDATE by admin

### 1.16 `delivery_codes`
Inserted automatically via trigger when order status changes to `accepted`.

| Column       | Type            | Constraints                                   |
|--------------|-----------------|-----------------------------------------------|
| `id`         | `uuid`          | PK, DEFAULT `gen_random_uuid()`               |
| `order_id`   | `uuid`          | NOT NULL, UNIQUE, references `orders(id)` CASCADE |
| `code`       | `text`          | NOT NULL                                      |
| `created_by` | `uuid`          | NOT NULL, references `profiles(id)`           |
| `created_at` | `timestamptz`   | NOT NULL, DEFAULT `now()`                     |

**RLS Policies:**
- `delivery_codes_select_participant` — SELECT for order participants
- `delivery_codes_insert_deny` — INSERT denied (trigger only)

**Indexes:** `idx_delivery_codes_order`

### 1.17 `delivery_evidence`

| Column     | Type            | Constraints                                  |
|------------|-----------------|----------------------------------------------|
| `id`       | `uuid`          | PK, DEFAULT `gen_random_uuid()`              |
| `order_id` | `uuid`          | NOT NULL, references `orders(id)` CASCADE    |
| `driver_id`| `uuid`          | NOT NULL, references `drivers(id)`           |
| `image_url`| `text`          | NULLABLE                                     |
| `notes`    | `text`          | NULLABLE                                     |
| `created_at`| `timestamptz`  | NOT NULL, DEFAULT `now()`                    |

**RLS Policies:**
- `delivery_evidence_select` — SELECT for order participants or admin
- `delivery_evidence_insert` — INSERT by assigned driver
- `delivery_evidence_update_admin` — UPDATE by admin
- `delivery_evidence_delete_admin` — DELETE by admin

### 1.18 `notifications`
Inserted automatically via trigger or `send_notification` RPC. Direct INSERT from client denied.

| Column     | Type            | Constraints                              |
|------------|-----------------|------------------------------------------|
| `id`       | `uuid`          | PK, DEFAULT `gen_random_uuid()`          |
| `user_id`  | `uuid`          | NOT NULL, references `profiles(id)` CASCADE |
| `title`    | `text`          | NOT NULL                                 |
| `body`     | `text`          | NULLABLE                                 |
| `type`     | `text`          | DEFAULT `'info'`                         |
| `read_at`  | `timestamptz`   | NULLABLE                                 |
| `created_at`| `timestamptz`  | NOT NULL, DEFAULT `now()`                |

**RLS Policies:**
- `notifications_select_self` — SELECT own
- `notifications_update_self` — UPDATE own (mark as read)
- `notifications_insert_deny` — INSERT denied (trigger/RPC only)

**Indexes:** `idx_notifications_user`

### 1.19 `chats`

| Column        | Type            | Constraints                                |
|---------------|-----------------|--------------------------------------------|
| `id`          | `uuid`          | PK, DEFAULT `gen_random_uuid()`            |
| `order_id`    | `uuid`          | NOT NULL, references `orders(id)` CASCADE  |
| `customer_id` | `uuid`          | NOT NULL, references `profiles(id)`        |
| `driver_id`   | `uuid`          | NULLABLE, references `profiles(id)`        |
| `store_id`    | `uuid`          | NULLABLE, references `stores(id)`          |
| `created_at`  | `timestamptz`   | NOT NULL, DEFAULT `now()`                  |
| `updated_at`  | `timestamptz`   | DEFAULT `now()`                            |

**Triggers:** `chats_updated_at` (BEFORE UPDATE)

**RLS Policies:**
- `chats_select_participant` — SELECT by customer, driver, store owner, or admin
- `chats_insert_customer` — INSERT by customer

**Indexes:** `idx_chats_order_id`

### 1.20 `messages`

| Column        | Type            | Constraints                                           |
|---------------|-----------------|-------------------------------------------------------|
| `id`          | `uuid`          | PK, DEFAULT `gen_random_uuid()`                       |
| `chat_id`     | `uuid`          | NOT NULL, references `chats(id)` CASCADE              |
| `sender_id`   | `uuid`          | NOT NULL, references `profiles(id)`                   |
| `sender_role` | `text`          | NULLABLE, CHECK IN (`'customer'`, `'driver'`, `'store'`, `'admin'`) |
| `message`     | `text`          | NULLABLE (legacy)                                     |
| `content`     | `text`          | NULLABLE                                              |
| `read_at`     | `timestamptz`   | NULLABLE                                              |
| `created_at`  | `timestamptz`   | NOT NULL, DEFAULT `now()`                             |

**RLS Policies:**
- `messages_select_participant` — SELECT by any chat participant
- `messages_insert_participant` — INSERT by any chat participant (must be `sender_id = auth.uid()`)

**Indexes:** `idx_messages_chat_id`, `idx_messages_created_at`

**Realtime:** Added to `supabase_realtime` publication.

### 1.21 `store_schedules`

| Column     | Type            | Constraints                                 |
|------------|-----------------|---------------------------------------------|
| `id`       | `uuid`          | PK, DEFAULT `gen_random_uuid()`             |
| `store_id` | `uuid`          | NOT NULL, references `stores(id)` CASCADE   |
| `week_day` | `int`           | NOT NULL, CHECK 0–6                        |
| `opens_at` | `time`          | NOT NULL                                    |
| `closes_at`| `time`          | NOT NULL                                    |
| UNIQUE     |                 | `(store_id, week_day)`                      |

**RLS Policies:**
- `store_schedules_select_all` — SELECT all
- `store_schedules_insert_owner` / `_update_owner` / `_delete_owner` — CRUD by store owner
- `store_schedules_admin_all` — ALL for admin

### 1.22 `locations`
Real-time driver/customer location tracking.

| Column     | Type             | Constraints                                |
|------------|------------------|--------------------------------------------|
| `id`       | `uuid`           | PK, DEFAULT `gen_random_uuid()`            |
| `user_id`  | `uuid`           | NOT NULL, references `profiles(id)` CASCADE |
| `order_id` | `uuid`           | NULLABLE, references `orders(id)`          |
| `lat`      | `numeric(10,7)`  | NOT NULL                                   |
| `lng`      | `numeric(10,7)`  | NOT NULL                                   |
| `created_at`| `timestamptz`    | NOT NULL, DEFAULT `now()`                  |

**RLS Policies:**
- `locations_select` — SELECT own, or order participant, or admin
- `locations_insert` — INSERT own location

**Indexes:** `idx_locations_user`, `idx_locations_order`

### 1.23 `store_applications`

| Column            | Type            | Constraints                                      |
|-------------------|-----------------|--------------------------------------------------|
| `id`              | `uuid`          | PK, DEFAULT `gen_random_uuid()`                  |
| `user_id`         | `uuid`          | NOT NULL, references `profiles(id)` CASCADE      |
| `store_name`      | `text`          | NOT NULL                                         |
| `description`     | `text`          | NULLABLE                                         |
| `address`         | `text`          | NULLABLE                                         |
| `phone`           | `text`          | NULLABLE                                         |
| `status`          | `text`          | NOT NULL, DEFAULT `'pending'`, CHECK IN (`'pending'`, `'approved'`, `'rejected'`) |
| `reviewed_by`     | `uuid`          | NULLABLE, references `profiles(id)`              |
| `reviewed_at`     | `timestamptz`   | NULLABLE                                         |
| `rejection_reason`| `text`          | NULLABLE                                         |
| `created_at`      | `timestamptz`   | NOT NULL, DEFAULT `now()`                        |
| `updated_at`      | `timestamptz`   | NOT NULL, DEFAULT `now()`                        |

**Triggers:** `handle_store_applications_updated_at` (BEFORE UPDATE)

**RLS Policies:**
- `store_applications_select_self` — SELECT own or admin
- `store_applications_insert_self` — INSERT own
- `store_applications_select_admin` — SELECT for admin
- `store_applications_admin_all` — ALL for admin

### 1.24 `driver_applications`

| Column            | Type            | Constraints                                      |
|-------------------|-----------------|--------------------------------------------------|
| `id`              | `uuid`          | PK, DEFAULT `gen_random_uuid()`                  |
| `user_id`         | `uuid`          | NOT NULL, references `profiles(id)` CASCADE      |
| `full_name`       | `text`          | NOT NULL                                         |
| `phone`           | `text`          | NULLABLE                                         |
| `vehicle_type`    | `text`          | NULLABLE                                         |
| `vehicle_plate`   | `text`          | NULLABLE                                         |
| `status`          | `text`          | NOT NULL, DEFAULT `'pending'`, CHECK IN (`'pending'`, `'approved'`, `'rejected'`) |
| `reviewed_by`     | `uuid`          | NULLABLE, references `profiles(id)`              |
| `reviewed_at`     | `timestamptz`   | NULLABLE                                         |
| `rejection_reason`| `text`          | NULLABLE                                         |
| `created_at`      | `timestamptz`   | NOT NULL, DEFAULT `now()`                        |
| `updated_at`      | `timestamptz`   | NOT NULL, DEFAULT `now()`                        |

**Triggers:** `handle_driver_applications_updated_at` (BEFORE UPDATE)

**RLS Policies:**
- `driver_applications_select_self` — SELECT own or admin
- `driver_applications_insert_self` — INSERT own
- `driver_applications_select_admin` — SELECT for admin
- `driver_applications_admin_all` — ALL for admin

### 1.25 `application_documents`

| Column           | Type            | Constraints                                           |
|------------------|-----------------|-------------------------------------------------------|
| `id`             | `uuid`          | PK, DEFAULT `gen_random_uuid()`                       |
| `application_id` | `uuid`          | NOT NULL, references `driver_applications(id)` CASCADE |
| `document_type`  | `text`          | NOT NULL                                              |
| `file_url`       | `text`          | NOT NULL                                              |
| `created_at`     | `timestamptz`   | NOT NULL, DEFAULT `now()`                             |

**RLS Policies:**
- `application_documents_select` — SELECT by applicant or admin
- `application_documents_insert` — INSERT by applicant

### 1.26 `audit_log`

| Column        | Type            | Constraints                              |
|---------------|-----------------|------------------------------------------|
| `id`          | `uuid`          | PK, DEFAULT `gen_random_uuid()`          |
| `user_id`     | `uuid`          | NULLABLE, references `profiles(id)`     |
| `action`      | `text`          | NOT NULL                                 |
| `entity_type` | `text`          | NOT NULL                                 |
| `entity_id`   | `text`          | NULLABLE                                 |
| `details`     | `jsonb`         | NULLABLE                                 |
| `ip_address`  | `text`          | NULLABLE                                 |
| `created_at`  | `timestamptz`   | DEFAULT `now()`                          |

**RLS Policies:**
- `Admins can view audit logs` — SELECT by admin only
- `audit_log_insert_deny` — INSERT denied (use `log_audit_event` RPC instead)

**Indexes:** `idx_audit_log_user_id`, `idx_audit_log_entity`, `idx_audit_log_created_at`

### 1.27 `app_config`
Key-value configuration store.

| Column       | Type            | Constraints                       |
|--------------|-----------------|-----------------------------------|
| `key`        | `text`          | PK                                |
| `value`      | `jsonb`         | NOT NULL                          |
| `updated_at` | `timestamptz`   | DEFAULT `now()`                   |

**RLS Policies:**
- `Everyone can read app_config` — SELECT all
- `Only admins can update app_config` — ALL for admin

---

## 2. RPC Functions

All RPCs are called via `supabase.rpc('function_name', {...})` in the frontend `src/`. They are defined as `SECURITY DEFINER` functions in the database.

### 2.1 `create_order`
- **Purpose:** Server-side order creation with validation, inventory check, coupon application, tax calculation, and total computation. Called from `order-service.ts:53`.
- **Parameters:**
  - `p_store_id uuid` — store to order from
  - `p_product_ids uuid[]` — array of product IDs
  - `p_quantities int[]` — corresponding quantities
  - `p_delivery_address text` — delivery address
  - `p_payment_method public.payment_method` — `'cash'`, `'transfer'`, or `'card'`
  - `p_coupon_code text DEFAULT null` — optional coupon code
  - `p_notes text DEFAULT null` — order notes
  - `p_tip numeric(10,2) DEFAULT 0` — tip amount
- **Returns:** `jsonb` with `order_id`, `subtotal`, `delivery_fee`, `discount`, `tax`, `tip`, `total`, `status`.
- **Logic:**
  1. Validates authentication
  2. Validates store exists and is open
  3. Validates products exist, are active, and have sufficient inventory
  4. Validates minimum order amount
  5. Applies coupon if valid (percentage/fixed)
  6. Calculates 12% IVA tax
  7. Creates order and order_items records
  8. Returns order summary

### 2.2 `log_audit_event`
- **Purpose:** Insert audit log entries. Called from `audit.service.ts:20`.
- **Parameters:**
  - `p_action text`
  - `p_entity_type text`
  - `p_entity_id text DEFAULT null`
  - `p_details jsonb DEFAULT null`
  - `p_ip_address text DEFAULT null`
- **Returns:** `uuid` (the audit log ID)
- **Note:** Direct INSERT to `audit_log` is denied via RLS. This RPC bypasses RLS via `SECURITY DEFINER`.

### 2.3 `admin_set_user_role`
- **Purpose:** Change any user's role. Called from `auth-service.ts:73`.
- **Parameters:**
  - `p_user_id uuid`
  - `p_new_role public.app_role`
- **Returns:** `void`
- **Security:** Only callable by admin (checked via RLS inside function).

### 2.4 `admin_approve_store_application`
- **Purpose:** Approve a store application atomically. Called from `admin-application.service.ts:92`.
- **Parameters:**
  - `p_application_id uuid`
  - `p_review_notes text DEFAULT ''`
- **Returns:** `jsonb` with `ok`, `store_id`, `application_id`.
- **Side effects:** Updates application status, creates store record, changes user role to `store`, logs audit event, sends notification.

### 2.5 `admin_reject_store_application`
- **Purpose:** Reject a store application. Called from `admin-application.service.ts:107`.
- **Parameters:**
  - `p_application_id uuid`
  - `p_rejection_reason text`
- **Returns:** `jsonb` with `ok`, `application_id`.
- **Side effects:** Updates application status, logs audit event, sends notification.

### 2.6 `admin_approve_driver_application`
- **Purpose:** Approve a driver application atomically. Called from `admin-application.service.ts:122`.
- **Parameters:**
  - `p_application_id uuid`
  - `p_review_notes text DEFAULT ''`
- **Returns:** `jsonb` with `ok`, `driver_id`, `application_id`.
- **Side effects:** Updates application status, creates/updates driver record, changes user role to `driver`, logs audit event, sends notification.

### 2.7 `admin_reject_driver_application`
- **Purpose:** Reject a driver application. Called from `admin-application.service.ts:137`.
- **Parameters:**
  - `p_application_id uuid`
  - `p_rejection_reason text`
- **Returns:** `jsonb` with `ok`, `application_id`.
- **Side effects:** Updates application status, logs audit event, sends notification.

### 2.8 Database Helper Functions (not called from frontend directly)

| Function | Purpose |
|---|---|
| `handle_updated_at()` | Trigger function that sets `updated_at = now()` |
| `handle_new_user()` | Trigger on `auth.users` INSERT — creates profile with role `'customer'` |
| `handle_profile_role_insert()` | Trigger on `profiles` INSERT — creates `customers` or `drivers` record based on role |
| `generate_delivery_code()` | Trigger on `orders` UPDATE to `accepted` — generates 8-char delivery code |
| `log_order_status_change()` | Trigger on `orders` UPDATE — inserts into `order_status_history` |
| `validate_order_status()` | Trigger on `orders` BEFORE UPDATE — enforces state machine transitions |
| `notify_order_status()` | Trigger on `orders` UPDATE — creates notifications for customer and optionally driver |
| `handle_new_product()` | Trigger on `products` INSERT — creates inventory record |
| `decrement_inventory_on_accept()` | Trigger on `orders` UPDATE to `accepted` — decrements inventory |
| `send_notification()` | `SECURITY DEFINER` function to insert notifications server-side |
| `is_admin()` | Returns `true` if current user has admin role |
| `is_store_owner(store_id text)` | Returns `true` if current user is the store owner |
| `storage_file_valid()` | Trigger on `storage.objects` INSERT — validates file size ≤ 10 MB |

---

## 3. Frontend Service Layer

### 3.1 Auth Service (`src/modules/auth/application/auth-service.ts`)

| Function | Parameters | Return Type | Audit Log | Error Handling |
|---|---|---|---|---|
| `loginUser` | `email: string, password: string` | `Promise<SignInWithPasswordResponse>` | `LOGIN` / `LOGIN_FAILED` | Rate limit check (5/15min); throws on Supabase error |
| `registerUser` | `email: string, password: string, options?: { data?: Record<string, unknown> }` | `Promise<SignUpResponse>` | `REGISTER` | Throws on Supabase error |
| `getProfile` | `userId: string` | `Promise<Profile \| null>` | — | Returns `null` if not found; throws on query error |
| `upsertProfile` | `userId: string, data?: Partial<Profile>` | `Promise<void>` | — | Upserts profile with `onConflict: 'id'` |
| `updateUserRole` | `userId: string, newRole: Role` | `Promise<void>` | — | Calls `admin_set_user_role` RPC |
| `sendPasswordReset` | `email: string` | `Promise<void>` | `PASSWORD_RESET_REQUESTED` | Throws if Supabase not configured or error |
| `saveSecurityQuestion` | `userId: string, question: string, answer: string` | `Promise<void>` | — | Upserts into `password_recovery_questions` |
| `verifySecurityAnswer` | `userId: string, answer: string` | `Promise<boolean>` | — | Returns `false` on error or mismatch |
| `getRecoveryQuestion` | `userId: string` | `Promise<string \| null>` | — | Returns `null` on error or not found |

### 3.2 Store Service (`src/modules/stores/application/store-service.ts`)

| Function | Parameters | Return Type | Audit Log | Notes |
|---|---|---|---|---|
| `getStores` | — | `Promise<Store[]>` | — | Returns all stores ordered by name |
| `getStoreById` | `id: string` | `Promise<Store \| null>` | — | Single store lookup |
| `getCategories` | — | `Promise<Category[]>` | — | All categories ordered by name |
| `getProductsByStore` | `storeId: string` | `Promise<Product[]>` | — | Active products only |
| `getProductsByCategory` | `categoryId: string` | `Promise<Product[]>` | — | Includes store join |
| `createStore` | `data: { name, description?, emoji?, user_id }` | `Promise<Store>` | `STORE_CREATED` | Inserts store, returns new record |
| `updateStore` | `storeId, userId, updates` | `Promise<void>` | `STORE_UPDATED` | Updates store fields |
| `createProduct` | `storeId, userId, product` | `Promise<Product>` | `PRODUCT_CREATED` | Creates product with `is_active: true` |
| `updateProduct` | `productId, userId, updates` | `Promise<Product>` | `PRODUCT_UPDATED` | Returns updated product |
| `deleteProduct` | `productId, userId` | `Promise<void>` | `PRODUCT_DELETED` | Hard delete |

All functions fall back to mock data when Supabase is not configured (`!isSupabaseReady`).

### 3.3 Order Service (`src/modules/orders/application/order-service.ts`)

| Function | Parameters | Return Type | Audit Log | Error Handling |
|---|---|---|---|---|
| `createOrder` | `params: CreateOrderParams` | `Promise<CreateOrderResult>` | — | Validates input; calls `create_order` RPC |
| `getOrderById` | `orderId: string` | `Promise<any>` | — | Includes `order_items`, `order_status_history`, `driver`, `store` |
| `getMyOrders` | `userId: string` | `Promise<Order[]>` | — | Customer's orders, descending |
| `getStoreOrders` | `storeId: string` | `Promise<Order[]>` | — | Store's orders, descending |
| `getDriverOrders` | `driverId: string` | `Promise<Order[]>` | — | Driver's assigned orders, descending |
| `updateOrderStatus` | `orderId, status, role?, userId?` | `Promise<Order>` | `order_status_changed` | Validates status via `canTransition` state machine |
| `assignDriver` | `orderId, driverId, role?` | `Promise<Order>` | — | Only `store` or `admin` roles can assign |

**`CreateOrderParams`**
```typescript
interface CreateOrderParams {
  storeId: string;
  productIds: string[];
  quantities: number[];
  deliveryAddress: string;
  paymentMethod: 'cash' | 'transfer' | 'card';
  couponCode?: string;
  notes?: string;
  tip?: number;
}
```

### 3.4 Payment Service (`src/modules/payments/application/payment.service.ts`)

| Function | Parameters | Return Type | Audit Log | Notes |
|---|---|---|---|---|
| `savePaymentReceipt` | `orderId, method, amount, receiptUrl, userId` | `Promise<PaymentTransaction>` | `PAYMENT_CREATED` | Validates method and amount |
| `getPaymentsByOrder` | `orderId: string` | `Promise<PaymentTransaction[]>` | — | All payments for an order |
| `getStorePayments` | `storeId: string` | `Promise<PaymentTransaction[]>` | — | Payments via orders join |
| `verifyPayment` | `paymentId, adminId, verified` | `Promise<void>` | `payment_verified` / `payment_rejected` | Admin action |
| `uploadReceipt` | `orderId, file: File` | `Promise<string>` | — | Uploads to `receipts` bucket |
| `confirmPayment` | `paymentId, userId` | `Promise<void>` | `PAYMENT_CONFIRMED` | Sets verified |
| `failPayment` | `paymentId, userId` | `Promise<void>` | `PAYMENT_FAILED` | Sets unverified |
| `initiateRefund` | `paymentId, userId, reason?` | `Promise<void>` | `REFUND_INITIATED` | Clears verification |

### 3.5 Audit Service (`src/modules/audit/application/audit.service.ts`)

| Function | Parameters | Return Type | Notes |
|---|---|---|---|
| `logAuditEvent` | `entry: AuditEntry` | `Promise<void>` | Calls `log_audit_event` RPC; non-critical (catch errors silently) |
| `getMockAuditLog` | — | `AuditEntry[]` | Returns in-memory log when in mock mode |

**`AuditEntry`**
```typescript
interface AuditEntry {
  userId: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: Record<string, unknown>;
}
```

### 3.6 Storage Service (`src/shared/storage/storage.service.ts`)

| Function | Parameters | Return Type | Notes |
|---|---|---|---|
| `uploadFile` | `bucket, entityId, file` | `Promise<{ path, storagePath }>` | Validates size & MIME type |
| `uploadFileWithUpsert` | `bucket, entityId, file` | `Promise<{ path, storagePath }>` | Allows overwrite |
| `getPublicUrl` | `bucket, path` | `Promise<string>` | For public buckets (`product-images`, `avatars`) |
| `getSignedUrl` | `bucket, path, expiresInSeconds?` | `Promise<string>` | For private buckets; 1-hour cache |
| `getFileUrl` | `bucket, path` | `Promise<string \| null>` | Auto-selects public vs signed |
| `deleteFile` | `bucket, path` | `Promise<void>` | Removes file and cache entry |

**Buckets:**

| Bucket Name | Public | Max Size | Allowed Types |
|---|---|---|---|
| `product-images` | Yes | 5 MB | JPEG, PNG, WebP |
| `avatars` | Yes | 2 MB | JPEG, PNG, WebP |
| `delivery-evidence` | No | 10 MB | JPEG, PNG, WebP |
| `receipts` | No | 10 MB | JPEG, PNG, WebP, PDF |
| `driver-documents` | No | 10 MB | JPEG, PNG, WebP, PDF |
| `application-documents` | No | 10 MB | JPEG, PNG, WebP, PDF |

---

## 4. Authentication Flow

### 4.1 Role-Based Auth

Four roles defined by the `app_role` enum:

| Role | Description | Access |
|---|---|---|
| `customer` | End-user placing orders | Customer screens |
| `driver` | Delivery personnel | Driver dashboard |
| `store` | Store owner/manager | Store admin dashboard |
| `admin` | Platform administrator | Admin dashboard |

### 4.2 Auth Context and Provider

**File:** `src/modules/auth/context/AuthContext.tsx`

The `AuthProvider` wraps the app and provides:
- `user: UserProfile | null` — current authenticated user
- `loading: boolean` — session loading state
- `login(role: Role)` — Supabase auth login + profile fetch; checks `is_suspended`
- `mockLogin(email, password)` — mock mode authentication
- `logout()` — calls `supabase.auth.signOut()` and navigates to landing
- `navigate(screen, params?)` — type-safe screen navigation

**Boot sequence:**
1. On mount, checks `supabase.auth.getSession()`
2. If session exists, fetches profile via `getProfile()`
3. If profile found and not suspended, navigates to role-appropriate screen
4. Listens to `onAuthStateChange` for real-time session changes

### 4.3 Protected Routes

**`AuthGuard`** (`src/app/router/AuthGuard.tsx`):
- Shows loading spinner while auth is loading
- Redirects to `/login` if no user
- Renders children if authenticated

**`RoleGuard`** (`src/app/router/RoleGuard.tsx`):
- Checks if user's role is in `allowedRoles`
- Redirects to role-appropriate fallback if unauthorized
- If no user, redirects to `/login`

**Route configuration** (`src/app/router/index.tsx`):
```typescript
const roleRoutes: Record<Role, string[]> = {
  customer: ['home', 'store-detail', 'cart', 'tracking', 'orders', 'promotions', 'favorites', 'addresses', 'personal-info', 'notification-settings', 'wallet', 'profile'],
  driver: ['driver', 'profile'],
  store: ['store-admin', 'profile'],
  admin: ['admin', 'profile'],
};
```

Public routes (`/`, `/login`, `/register-store`, `/register-driver`) have no guard.

### 4.4 Rate Limiting

**File:** `src/shared/auth/rate-limiter.ts`

In-memory rate limiter for login attempts:

- **Limit:** 5 attempts per 15 minutes (configurable per call)
- **Key:** email address
- **Window:** sliding window per key
- **Cleanup:** stale entries purged every 60 seconds
- **Functions:**
  - `checkRateLimit(key, maxAttempts, windowMs)` — returns `boolean`
  - `recordAttempt(key)` — increments counter
  - `resetAttempts(key)` — clears entry on successful login

When the limit is exceeded, `loginUser` throws: `"Demasiados intentos. Intenta de nuevo en 15 minutos."`

---

## 5. State Machines

### 5.1 Order Status Machine

**File:** `src/modules/orders/domain/order-status.machine.ts`

**States:**
```
pending → accepted → preparing → picked_up → on_the_way → arrived → delivered (terminal)
                                                                       ↓
                                                             cancelled (terminal)
                                                                       ↓
                                                             refunded (terminal)
```

### 5.2 Allowed Transitions by Role

| From | To | Roles |
|---|---|---|
| `pending` | `accepted`, `cancelled` | `store`, `admin` |
| `accepted` | `preparing`, `cancelled` | `store`, `admin` |
| `preparing` | `picked_up`, `cancelled` | `store`, `admin` |
| `picked_up` | `on_the_way`, `cancelled` | `driver`, `admin` |
| `on_the_way` | `arrived`, `cancelled` | `driver`, `admin` |
| `arrived` | `delivered`, `cancelled` | `driver`, `admin`, `customer` |
| `delivered` | `refunded` | `admin` |
| `cancelled` | `refunded` | `admin` |
| `refunded` | *(none)* | — |

### 5.3 Database Enforcement

The same state machine is enforced server-side by the `validate_order_status()` trigger function in `002_triggers.sql`. If a disallowed transition is attempted, the database raises an exception.

---

## 6. Environment Variables

### 6.1 `VITE_SUPABASE_URL`
- **Required:** Yes
- **Used in:** `src/integrations/supabase/client.ts:4`
- **Purpose:** Supabase project URL for initializing the Supabase client. All database queries, auth, storage, and RPC calls go through this endpoint.
- **Example:** `https://bxhnlwkhoeeqpifqvqxs.supabase.co`

### 6.2 `VITE_SUPABASE_ANON_KEY`
- **Required:** Yes
- **Used in:** `src/integrations/supabase/client.ts:5`
- **Purpose:** Supabase anonymous/public key for client-side authentication. Used as fallback for `VITE_SUPABASE_PUBLISHABLE_KEY`.
- **Example:** `sb_publishable__YLr43cEbtmlrRPdhOmMsA_CeN6c2-n`

### 6.3 `VITE_SUPABASE_PUBLISHABLE_KEY`
- **Required:** No (falls back to `VITE_SUPABASE_ANON_KEY`)
- **Used in:** `src/integrations/supabase/client.ts:5`
- **Purpose:** Alternative anon key variable name for compatibility.

### 6.4 `SUPABASE_SERVICE_ROLE_KEY`
- **Required:** No (local development only)
- **Used in:** Not referenced in frontend code (server-side only)
- **Purpose:** Supabase service role key for admin-level server-side operations. **Must never be exposed to the client.**

### 6.5 `DEEPSEEK_API_KEY`
- **Required:** No (not implemented in current codebase)
- **Purpose:** Reserved for future integration with DeepSeek AI for AI-powered features (e.g., smart search, recommendations, or chatbot).

---

> **Generated from:** `supabase/migrations/` and `src/` at commit time.
