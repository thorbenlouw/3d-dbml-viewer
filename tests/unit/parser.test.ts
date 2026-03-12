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
const colorStylesDbml = readFileSync(resolve(__dirname, '../fixtures/color-styles.dbml'), 'utf-8');
const projectNoteNoneDbml = readFileSync(
  resolve(__dirname, '../fixtures/project-note-none.dbml'),
  'utf-8',
);
const projectNoteBasicDbml = readFileSync(
  resolve(__dirname, '../fixtures/project-note-basic.dbml'),
  'utf-8',
);
const fieldDefaultsDbml = readFileSync(
  resolve(__dirname, '../fixtures/field-defaults.dbml'),
  'utf-8',
);
const enumRenderingDbml = readFileSync(
  resolve(__dirname, '../fixtures/enum-rendering.dbml'),
  'utf-8',
);

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

  describe('field default extraction', () => {
    it('returns undefined when a field has no default', () => {
      const schema = parseDatabaseSchema(fieldDefaultsDbml);
      const table = schema.tables.find((entry) => entry.name === 'field_defaults');
      const plainText = table?.columns.find((column) => column.name === 'plain_text');
      expect(plainText?.default).toBeUndefined();
    });

    it('extracts number defaults', () => {
      const schema = parseDatabaseSchema(fieldDefaultsDbml);
      const table = schema.tables.find((entry) => entry.name === 'field_defaults');
      const column = table?.columns.find((entry) => entry.name === 'id');
      expect(column?.default).toEqual({ type: 'number', value: '42' });
    });

    it('extracts string defaults', () => {
      const schema = parseDatabaseSchema(fieldDefaultsDbml);
      const table = schema.tables.find((entry) => entry.name === 'field_defaults');
      const column = table?.columns.find((entry) => entry.name === 'status');
      expect(column?.default).toEqual({ type: 'string', value: 'pending' });
    });

    it('extracts boolean defaults', () => {
      const schema = parseDatabaseSchema(fieldDefaultsDbml);
      const table = schema.tables.find((entry) => entry.name === 'field_defaults');
      const column = table?.columns.find((entry) => entry.name === 'is_active');
      expect(column?.default).toEqual({ type: 'boolean', value: 'true' });
    });

    it('extracts expression defaults', () => {
      const schema = parseDatabaseSchema(fieldDefaultsDbml);
      const table = schema.tables.find((entry) => entry.name === 'field_defaults');
      const column = table?.columns.find((entry) => entry.name === 'created_at');
      expect(column?.default).toEqual({ type: 'expression', value: 'now()' });
    });

    it('keeps defaults when a field also has other attributes', () => {
      const dbml = `
        Table tasks {
          id int [pk]
          status varchar [not null, unique, default: 'pending']
        }
      `;

      const schema = parseDatabaseSchema(dbml);
      const status = schema.tables[0]?.columns.find((column) => column.name === 'status');

      expect(status).toMatchObject({
        isPrimaryKey: false,
        isForeignKey: false,
        isNotNull: true,
        isUnique: true,
        default: { type: 'string', value: 'pending' },
      });
    });
  });

  describe('enum extraction', () => {
    it('returns undefined for schema.enums when the DBML has no enums', () => {
      const dbml = `
        Table users {
          id integer [pk]
          role varchar
        }
      `;

      const schema = parseDatabaseSchema(dbml);

      expect(schema.enums).toBeUndefined();
      expect(schema.tables[0]?.columns[1]?.enumValues).toBeUndefined();
    });

    it('extracts enum declarations into schema.enums', () => {
      const schema = parseDatabaseSchema(enumRenderingDbml);

      expect(schema.enums).toEqual([
        {
          name: 'order_status',
          values: [
            { name: 'pending', note: 'Order received but not yet processed' },
            { name: 'confirmed' },
            { name: 'shipped' },
          ],
        },
        {
          name: 'priority_level',
          values: [{ name: 'low' }, { name: 'medium' }, { name: 'high' }],
        },
        {
          name: 'audit_event',
          values: [
            { name: 'created' },
            { name: 'updated' },
            { name: 'deleted' },
            { name: 'restored' },
            { name: 'archived' },
            { name: 'unarchived' },
            { name: 'emailed' },
            { name: 'downloaded' },
            { name: 'shared' },
            { name: 'exported' },
            { name: 'printed' },
            { name: 'approved' },
            { name: 'rejected' },
            { name: 'submitted' },
            { name: 'synced' },
            { name: 'queued' },
            { name: 'retried' },
            { name: 'cancelled' },
            { name: 'expired' },
            { name: 'reopened' },
          ],
        },
      ]);
    });

    it('populates enumValues when a column type matches a declared enum', () => {
      const schema = parseDatabaseSchema(enumRenderingDbml);
      const orders = schema.tables.find((table) => table.name === 'orders');
      const status = orders?.columns.find((column) => column.name === 'status');

      expect(status?.enumValues).toEqual([
        { name: 'pending', note: 'Order received but not yet processed' },
        { name: 'confirmed' },
        { name: 'shipped' },
      ]);
    });

    it('keeps enumValues undefined when a column type matches no declared enum', () => {
      const schema = parseDatabaseSchema(enumRenderingDbml);
      const orders = schema.tables.find((table) => table.name === 'orders');
      const externalStatus = orders?.columns.find((column) => column.name === 'external_status');

      expect(externalStatus?.enumValues).toBeUndefined();
    });

    it('preserves enum value notes on matched columns', () => {
      const schema = parseDatabaseSchema(enumRenderingDbml);
      const orders = schema.tables.find((table) => table.name === 'orders');
      const status = orders?.columns.find((column) => column.name === 'status');

      expect(status?.enumValues?.[0]).toEqual({
        name: 'pending',
        note: 'Order received but not yet processed',
      });
    });
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

  describe('project note extraction', () => {
    it('extracts projectNote from with-project.dbml fixture', () => {
      const schema = parseDatabaseSchema(withProjectDbml);
      expect(schema.projectNote).toBe('Demo project for testing project name extraction');
    });

    it('returns projectNote === undefined when Project has no Note', () => {
      const schema = parseDatabaseSchema(projectNoteNoneDbml);
      expect(schema.projectNote).toBeUndefined();
    });

    it('extracts multi-line projectNote from project-note-basic fixture', () => {
      const schema = parseDatabaseSchema(projectNoteBasicDbml);
      expect(schema.projectNote).toBeDefined();
      expect(schema.projectNote).toContain('Retail Data Warehouse');
      expect(schema.projectNote).toContain('orders');
    });

    it('trims whitespace-only note to undefined', () => {
      const dbml = `
        Project Blank {
          Note: '   '
        }
        Table items { id integer [pk] }
      `;
      const schema = parseDatabaseSchema(dbml);
      expect(schema.projectNote).toBeUndefined();
    });

    it('returns projectNote === undefined when no Project block is present', () => {
      const dbml = `Table users { id integer [pk] }`;
      const schema = parseDatabaseSchema(dbml);
      expect(schema.projectNote).toBeUndefined();
    });
  });

  describe('color style extraction from color-styles.dbml fixture', () => {
    it('extracts local table headerColor', () => {
      const schema = parseDatabaseSchema(colorStylesDbml);
      const users = schema.tables.find((t) => t.name === 'users');
      expect(users?.headerColor).toBe('#3b82f6');
    });

    it('extracts another local table headerColor', () => {
      const schema = parseDatabaseSchema(colorStylesDbml);
      const comments = schema.tables.find((t) => t.name === 'comments');
      expect(comments?.headerColor).toBe('#10b981');
    });

    it('keeps headerColor undefined for tables with no color', () => {
      const schema = parseDatabaseSchema(colorStylesDbml);
      const tags = schema.tables.find((t) => t.name === 'tags');
      expect(tags?.headerColor).toBeUndefined();
    });

    it('extracts ref color', () => {
      const schema = parseDatabaseSchema(colorStylesDbml);
      const coloredRef = schema.refs.find((r) => r.color !== undefined);
      expect(coloredRef?.color).toBe('#f59e0b');
    });

    it('keeps ref color undefined when not specified', () => {
      const schema = parseDatabaseSchema(colorStylesDbml);
      const uncoloredRef = schema.refs.find(
        (r) => r.sourceId === 'posts' && r.targetId === 'users',
      );
      expect(uncoloredRef?.color).toBeUndefined();
    });

    it('extracts tablegroup color', () => {
      const schema = parseDatabaseSchema(colorStylesDbml);
      const blogGroup = schema.tableGroups?.find((g) => g.name === 'blog');
      expect(blogGroup?.color).toBe('#8b5cf6');
    });

    it('includes all table groups in tableGroups array', () => {
      const schema = parseDatabaseSchema(colorStylesDbml);
      expect(schema.tableGroups).toBeDefined();
      expect(schema.tableGroups?.map((g) => g.name)).toContain('blog');
    });
  });

  describe('headerColor precedence', () => {
    it('uses table-local headerColor when set', () => {
      const dbml = `
        Table users [headercolor: #ff0000] {
          id integer [pk]
        }
      `;
      const schema = parseDatabaseSchema(dbml);
      expect(schema.tables[0].headerColor).toBe('#ff0000');
    });

    it('returns undefined when no color is set', () => {
      const dbml = `
        Table users {
          id integer [pk]
        }
      `;
      const schema = parseDatabaseSchema(dbml);
      expect(schema.tables[0].headerColor).toBeUndefined();
    });
  });
});
