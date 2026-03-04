import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { parseDatabaseSchema } from '@/parser';
import { computeLayout } from '@/layout';
import { HARD_CODED_DBML } from '@/data/schema.dbml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const notesDemoDbml = readFileSync(resolve(__dirname, '../fixtures/notes-demo.dbml'), 'utf-8');

describe('parser -> layout pipeline', () => {
  it('returns exactly 8 LayoutNode objects', () => {
    const schema = parseDatabaseSchema(HARD_CODED_DBML);
    const nodes = computeLayout(schema);
    expect(nodes).toHaveLength(8);
  });

  it('each node has id, name, and finite x, y, z', () => {
    const schema = parseDatabaseSchema(HARD_CODED_DBML);
    const nodes = computeLayout(schema);
    for (const node of nodes) {
      expect(typeof node.id).toBe('string');
      expect(typeof node.name).toBe('string');
      expect(Number.isFinite(node.x)).toBe(true);
      expect(Number.isFinite(node.y)).toBe(true);
      expect(Number.isFinite(node.z)).toBe(true);
    }
  });

  it('DBML -> schema -> layout retains dimensional model tables and field metadata', () => {
    const schema = parseDatabaseSchema(HARD_CODED_DBML);
    const nodes = computeLayout(schema);

    const names = nodes.map((n) => n.name).sort();
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

    const dimCustomer = schema.tables.find((t) => t.name === 'dim_customer');
    const factSales = schema.tables.find((t) => t.name === 'fact_sales');

    expect(dimCustomer?.columns.find((c) => c.name === 'customer_key')).toMatchObject({
      isPrimaryKey: true,
      isForeignKey: false,
      isNotNull: false,
    });

    expect(factSales?.columns.find((c) => c.name === 'customer_key')).toMatchObject({
      type: 'integer',
      isForeignKey: true,
      isNotNull: true,
    });

    expect(schema.refs).toHaveLength(14);
  });

  it('notes-demo.dbml: posts table has body column with correct note after layout', () => {
    const schema = parseDatabaseSchema(notesDemoDbml);
    const nodes = computeLayout(schema);
    expect(nodes).toBeDefined();

    const posts = schema.tables.find((t) => t.name === 'posts');
    const body = posts?.columns.find((c) => c.name === 'body');
    expect(body?.note).toBe('Markdown content stored as plain text; HTML is escaped on read');
  });

  it('notes-demo.dbml: follows TableCardNode has table.note set', () => {
    const schema = parseDatabaseSchema(notesDemoDbml);
    computeLayout(schema);

    const follows = schema.tables.find((t) => t.name === 'follows');
    expect(follows?.note).toBe(
      'Adjacency list capturing social follow relationships between users',
    );
  });
});
