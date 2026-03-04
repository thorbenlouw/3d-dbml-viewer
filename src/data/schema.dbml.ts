export const HARD_CODED_DBML = `
// ── Enums ────────────────────────────────────────────────────────────────────

enum order_status {
  pending   [note: 'Order received but not yet processed']
  confirmed
  shipped
  delivered
  cancelled
  returned
}

enum payment_method {
  credit_card
  debit_card
  bank_transfer
  digital_wallet
  buy_now_pay_later
}

enum product_category {
  electronics
  clothing
  home_and_garden
  sports_and_outdoors
  books_and_media
  food_and_beverage
}

// ── Dimension Tables ──────────────────────────────────────────────────────────

Table dim_date [note: 'Calendar dimension — one row per day covering the full reporting horizon'] {
  date_key   integer     [pk, increment, note: 'Surrogate key: YYYYMMDD integer']
  full_date  date        [not null, unique]
  day_of_week  smallint  [not null, note: '1 = Monday … 7 = Sunday']
  day_name     varchar(9) [not null]
  week_of_year smallint  [not null]
  month_number smallint  [not null]
  month_name   varchar(9) [not null]
  quarter      smallint  [not null, note: '1–4']
  year         smallint  [not null]
  is_weekend   boolean   [not null, default: false]
  is_holiday   boolean   [not null, default: false]
  fiscal_year  smallint  [null, note: 'Fiscal year if different from calendar year']

  indexes {
    full_date [unique, name: 'udx_dim_date_full_date']
    (year, month_number) [name: 'idx_dim_date_year_month']
  }
}

Table dim_customer [note: 'SCD Type 2 customer dimension'] {
  customer_key  integer   [pk, increment]
  customer_id   varchar   [not null, note: 'Business natural key — stable across SCD versions']
  first_name    varchar   [not null]
  last_name     varchar   [not null]
  email         varchar   [not null]
  phone         varchar   [null]
  city          varchar   [null]
  state_province varchar  [null]
  country_code  char(2)   [not null, default: 'US']
  postal_code   varchar   [null]
  is_current    boolean   [not null, default: true, note: 'True for the active SCD row']
  valid_from    timestamp [not null]
  valid_to      timestamp [null, note: 'NULL means currently active']

  indexes {
    customer_id [name: 'idx_dim_customer_bk']
    (customer_id, is_current) [name: 'idx_dim_customer_current']
    email [name: 'idx_dim_customer_email']
  }
}

Table dim_product [note: 'Product catalogue dimension with hierarchical category path'] {
  product_key    integer  [pk, increment]
  product_id     varchar  [not null, unique, note: 'SKU / business key']
  product_name   varchar  [not null]
  description    text     [null]
  category       product_category [not null]
  sub_category   varchar  [null]
  brand          varchar  [null]
  supplier_id    integer  [null]
  unit_cost      decimal(10,2) [null]
  list_price     decimal(10,2) [not null]
  weight_kg      decimal(8,3)  [null]
  is_active      boolean  [not null, default: true]

  indexes {
    product_id [unique]
    category   [name: 'idx_dim_product_category']
    (category, sub_category) [name: 'idx_dim_product_cat_subcat']
  }
}

Table dim_store [note: 'Physical and online store/channel dimension'] {
  store_key    integer  [pk, increment]
  store_id     varchar  [not null, unique]
  store_name   varchar  [not null]
  store_type   varchar  [not null, note: 'physical | online | pop_up']
  region       varchar  [null]
  country_code char(2)  [not null, default: 'US']
  city         varchar  [null]
  opened_date  date     [null]
  closed_date  date     [null, note: 'NULL if currently operating']
  floor_area_m2 integer [null]
  manager_id   integer  [null]

  indexes {
    store_id [unique]
    region   [name: 'idx_dim_store_region']
  }
}

Table dim_employee [note: 'Employee / sales-rep dimension with self-referential management hierarchy'] {
  employee_key  integer  [pk, increment]
  employee_id   varchar  [not null, unique]
  first_name    varchar  [not null]
  last_name     varchar  [not null]
  job_title     varchar  [null]
  department    varchar  [null]
  manager_key   integer  [null, note: 'Self-join to dim_employee for org hierarchy']
  hire_date     date     [null]
  store_key     integer  [null, note: 'Primary store assignment; NULL for remote/HQ staff']

  indexes {
    employee_id [unique]
    manager_key [name: 'idx_dim_employee_manager']
  }
}

Table dim_supplier [note: 'Supplier / vendor master'] {
  supplier_id   integer  [pk, increment]
  supplier_code varchar  [not null, unique]
  supplier_name varchar  [not null]
  contact_name  varchar  [null]
  contact_email varchar  [null]
  country_code  char(2)  [not null]
  lead_time_days smallint [null, note: 'Average fulfilment lead time in days']
  is_preferred  boolean  [not null, default: false]
}

// ── Fact Tables ───────────────────────────────────────────────────────────────

Table fact_sales [note: '''
  Grain: one row per order line item.
  All monetary amounts are stored in the transaction currency;
  usd_exchange_rate allows conversion to reporting currency.
'''] {
  sales_key      bigint   [pk, increment]
  order_id       varchar  [not null, note: 'Source order identifier']
  line_number    smallint [not null]
  order_date_key integer  [not null, ref: > dim_date.date_key]
  ship_date_key  integer  [null,     ref: > dim_date.date_key, note: 'NULL until shipped']
  customer_key   integer  [not null, ref: > dim_customer.customer_key]
  product_key    integer  [not null, ref: > dim_product.product_key]
  store_key      integer  [not null, ref: > dim_store.store_key]
  employee_key   integer  [null,     ref: > dim_employee.employee_key]
  quantity       integer  [not null]
  unit_price     decimal(10,2) [not null]
  discount_pct   decimal(5,2)  [not null, default: 0.00]
  line_total     decimal(12,2) [not null, note: 'quantity * unit_price * (1 - discount_pct)']
  cost_total     decimal(12,2) [null]
  status         order_status  [not null, default: 'pending']
  payment_method payment_method [null]
  currency_code  char(3)  [not null, default: 'USD']
  usd_exchange_rate decimal(12,6) [not null, default: 1.000000]

  indexes {
    order_id            [name: 'idx_fact_sales_order']
    (order_date_key)    [name: 'idx_fact_sales_date']
    (customer_key)      [name: 'idx_fact_sales_customer']
    (product_key)       [name: 'idx_fact_sales_product']
    (store_key)         [name: 'idx_fact_sales_store']
    (order_id, line_number) [unique, name: 'udx_fact_sales_order_line']
  }
}

Table fact_inventory [note: 'Daily inventory snapshot — grain: one row per product per store per day'] {
  inventory_key  bigint   [pk, increment]
  snapshot_date_key integer [not null, ref: > dim_date.date_key]
  product_key    integer  [not null, ref: > dim_product.product_key]
  store_key      integer  [not null, ref: > dim_store.store_key]
  supplier_id    integer  [null,     ref: > dim_supplier.supplier_id]
  quantity_on_hand  integer [not null, default: 0]
  quantity_on_order integer [not null, default: 0]
  reorder_point     integer [null]
  unit_cost         decimal(10,2) [null]

  indexes {
    (snapshot_date_key, product_key, store_key) [unique, name: 'udx_fact_inventory_grain']
    (product_key) [name: 'idx_fact_inventory_product']
    (store_key)   [name: 'idx_fact_inventory_store']
  }
}

// ── Stand-alone Refs ──────────────────────────────────────────────────────────

Ref fk_dim_product_supplier: dim_product.supplier_id > dim_supplier.supplier_id
Ref fk_dim_store_manager:    dim_store.manager_id    > dim_employee.employee_key
Ref fk_dim_employee_store:   dim_employee.store_key  > dim_store.store_key
Ref fk_employee_manager:     dim_employee.manager_key - dim_employee.employee_key

// ── Table Groups ─────────────────────────────────────────────────────────────

TableGroup dimensions {
  dim_date
  dim_customer
  dim_product
  dim_store
  dim_employee
  dim_supplier
}

TableGroup facts {
  fact_sales
  fact_inventory
}
`;
