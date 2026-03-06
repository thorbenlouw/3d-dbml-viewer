import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { parseDatabaseSchema } from '@/parser';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface ExampleSpec {
  name: string;
  expectedTableCount: number;
}

const examples: ExampleSpec[] = [
  { name: 'blog', expectedTableCount: 5 },
  { name: 'ecommerce', expectedTableCount: 10 },
  { name: 'saas-platform', expectedTableCount: 19 },
  { name: 'multi-schema-erp', expectedTableCount: 25 },
];

describe('example DBML files', () => {
  it.each(examples)(
    '$name.dbml parses without error and has correct table/ref counts',
    ({ name, expectedTableCount }) => {
      const filePath = resolve(__dirname, '../../examples', `${name}.dbml`);
      const text = readFileSync(filePath, 'utf-8');

      let result: ReturnType<typeof parseDatabaseSchema>;
      expect(() => {
        result = parseDatabaseSchema(text);
      }).not.toThrow();

      expect(result!.tables.length).toBe(expectedTableCount);
      expect(result!.refs.length).toBeGreaterThan(0);
    },
  );
});
