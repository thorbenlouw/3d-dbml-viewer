import type { ParsedColumnDefault } from '@/types';

export function formatColumnDefaultValue(columnDefault: ParsedColumnDefault): string {
  if (columnDefault.type === 'string') {
    return `'${columnDefault.value}'`;
  }

  if (columnDefault.type === 'expression') {
    return `\`${columnDefault.value}\``;
  }

  return columnDefault.value;
}

export function formatColumnDefaultLabel(columnDefault: ParsedColumnDefault): string {
  return `= ${formatColumnDefaultValue(columnDefault)}`;
}
