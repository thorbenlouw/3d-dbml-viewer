import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { parseDatabaseSchema, ParseError } from '@/parser';
import { HARD_CODED_DBML } from '@/data/schema.dbml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const notesDemoDbml = readFileSync(resolve(__dirname, '../fixtures/notes-demo.dbml'), 'utf-8');
const withProjectDbml = readFileSync(resolve(__dirname, '../fixtures/with-project.dbml'), 'utf-8');

function findTable(tableName: string) {
  const schema = parseDatabaseSchema(HARD_CODED_DBML);
  const table = schema.tables.find((entry) => entry.name === tableName);
  if (!table) {
    throw new Error(`Expected table ${tableName} to exist`);
  }
  return table;
}

describe('parseDatabaseSchema', () => {
  it('returns exactly 8 tables for the hard-coded schema', () => {
    const schema = parseDatabaseSchema(HARD_CODED_DBML);
    expect(schema.tables).toHaveLength(8);
  });

  it('returns all dimension and fact tables', () => {
    const schema = parseDatabaseSchema(HARD_CODED_DBML);
    const names = schema.tables.map((t) => t.name).sort();
    expect(names).toEqual([
      'dim_customer',
      'dim_date',
      'dim_employee',
      'dim_product',
      'dim_store',
      'dim_supplier',
      'fact_inventory',
      'fact_sales',
    ]);
  });

  it('extracts field names and types for dim_customer', () => {
    const schema = parseDatabaseSchema(HARD_CODED_DBML);
    const dimCustomer = schema.tables.find((t) => t.name === 'dim_customer');
    const fields = dimCustomer?.columns.map((c) => `${c.name}:${c.type}`);
    expect(fields).toEqual([
      'customer_key:integer',
      'customer_id:varchar',
      'first_name:varchar',
      'last_name:varchar',
      'email:varchar',
      'phone:varchar',
      'city:varchar',
      'state_province:varchar',
      'country_code:char(2)',
      'postal_code:varchar',
      'is_current:boolean',
      'valid_from:timestamp',
      'valid_to:timestamp',
    ]);
  });

  it('captures PK and NN flags from DBML settings', () => {
    const dimCustomer = findTable('dim_customer');
    const factSales = findTable('fact_sales');

    const customerKey = dimCustomer.columns.find((c) => c.name === 'customer_key');
    const orderId = factSales.columns.find((c) => c.name === 'order_id');

    expect(customerKey?.isPrimaryKey).toBe(true);
    expect(customerKey?.isNotNull).toBe(false);

    expect(orderId?.isPrimaryKey).toBe(false);
    expect(orderId?.isNotNull).toBe(true);
  });

  it('derives FK flags from inline refs in fact_sales', () => {
    const factSales = findTable('fact_sales');

    const customerKey = factSales.columns.find((c) => c.name === 'customer_key');
    const productKey = factSales.columns.find((c) => c.name === 'product_key');
    const storeKey = factSales.columns.find((c) => c.name === 'store_key');

    expect(customerKey?.isForeignKey).toBe(true);
    expect(productKey?.isForeignKey).toBe(true);
    expect(storeKey?.isForeignKey).toBe(true);
  });

  it('keeps table-level refs for layout and link rendering', () => {
    const schema = parseDatabaseSchema(HARD_CODED_DBML);
    // 6 inline refs in fact_sales + 4 inline refs in fact_inventory + 4 stand-alone refs
    expect(schema.refs).toHaveLength(14);

    const refPairs = schema.refs.map((ref) => `${ref.sourceId}->${ref.targetId}`);
    // spot-check a few key relationships (dim tables are the "1" side — they appear as source)
    expect(refPairs).toContain('dim_customer->fact_sales');
    expect(refPairs).toContain('dim_product->fact_sales');
    expect(refPairs).toContain('dim_supplier->fact_inventory');
    expect(refPairs).toContain('dim_product->dim_supplier');
  });

  it('throws ParseError for malformed DBML', () => {
    expect(() => parseDatabaseSchema('not valid dbml {{{')).toThrow(ParseError);
  });

  describe('note extraction from notes-demo.dbml fixture', () => {
    it('extracts note from posts.body column', () => {
      const schema = parseDatabaseSchema(notesDemoDbml);
      const posts = schema.tables.find((t) => t.name === 'posts');
      const body = posts?.columns.find((c) => c.name === 'body');
      expect(body?.note).toBe('Markdown content stored as plain text; HTML is escaped on read');
    });

    it('extracts note from posts.status column', () => {
      const schema = parseDatabaseSchema(notesDemoDbml);
      const posts = schema.tables.find((t) => t.name === 'posts');
      const status = posts?.columns.find((c) => c.name === 'status');
      expect(status?.note).toBe('draft | published | archived');
    });

    it('extracts note from users.role column', () => {
      const schema = parseDatabaseSchema(notesDemoDbml);
      const users = schema.tables.find((t) => t.name === 'users');
      const role = users?.columns.find((c) => c.name === 'role');
      expect(role?.note).toBe('One of: admin, editor, viewer');
    });

    it('extracts table-level note from follows table', () => {
      const schema = parseDatabaseSchema(notesDemoDbml);
      const follows = schema.tables.find((t) => t.name === 'follows');
      expect(follows?.note).toBe(
        'Adjacency list capturing social follow relationships between users',
      );
    });

    it('users.id column has note === undefined', () => {
      const schema = parseDatabaseSchema(notesDemoDbml);
      const users = schema.tables.find((t) => t.name === 'users');
      const id = users?.columns.find((c) => c.name === 'id');
      expect(id?.note).toBeUndefined();
    });

    it('users table has note === undefined', () => {
      const schema = parseDatabaseSchema(notesDemoDbml);
      const users = schema.tables.find((t) => t.name === 'users');
      expect(users?.note).toBeUndefined();
    });
  });

  it('TablePartial blocks do not produce extra tables', () => {
    const dbmlWithRecords = `
      Table products {
        id integer [primary key]
        name varchar
      }

      TablePartial price_fields {
        price decimal
      }
    `;
    const schema = parseDatabaseSchema(dbmlWithRecords);
    expect(schema.tables).toHaveLength(1);
    expect(schema.tables[0].name).toBe('products');
  });

  it('extracts table group names when TableGroup is present', () => {
    const dbml = `
      Table users {
        id integer [pk]
      }

      Table posts {
        id integer [pk]
        user_id integer [ref: > users.id]
      }

      TableGroup core_domain {
        users
        posts
      }
    `;

    const schema = parseDatabaseSchema(dbml);
    const users = schema.tables.find((table) => table.name === 'users');
    const posts = schema.tables.find((table) => table.name === 'posts');

    expect(users?.tableGroup).toBe('core_domain');
    expect(posts?.tableGroup).toBe('core_domain');
  });

  it('keeps tableGroup undefined when no table group is set', () => {
    const dbml = `
      Table users {
        id integer [pk]
      }
    `;
    const schema = parseDatabaseSchema(dbml);
    const users = schema.tables.find((table) => table.name === 'users');
    expect(users?.tableGroup).toBeUndefined();
  });

  describe('project name extraction', () => {
    it('extracts projectName from a DBML string with a Project block', () => {
      const schema = parseDatabaseSchema(withProjectDbml);
      expect(schema.projectName).toBe('MyProject');
    });

    it('returns projectName === undefined when no Project block is present', () => {
      const dbml = `
        Table users {
          id integer [pk]
        }
      `;
      const schema = parseDatabaseSchema(dbml);
      expect(schema.projectName).toBeUndefined();
    });
  });
});
