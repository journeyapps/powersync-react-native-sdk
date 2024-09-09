import { describe, it, expect } from 'vitest';
import { JsSchemaGenerator } from '../../../src/library/powersync/JsSchemaGenerator'
import { Schema, Table, Column, ColumnType, column } from '@powersync/web';

describe('JsSchemaGenerator', () => {
  const generator = new JsSchemaGenerator();

  describe('generate', () => {
    it('should generate a schema with multiple tables', () => {
      const users = new Table({
        id: column.text,
        name: column.text,
      })
      const posts = new Table({
        id: column.text,
        title: column.text,
        content: column.text
      })
      const schema = new Schema({ users, posts });

      const result = generator.generate(schema);

      expect(result).toBe(
        `new Schema({
  new Table({
      id: column.text,
      name: column.text
  }),
  new Table({
      id: column.text,
      title: column.text,
      content: column.text
  })
})
`
      );
    });
  });

  describe('generateTable', () => {
    it('should generate a table with columns', () => {
      const columns = [
        new Column({ name: 'id', type: ColumnType.TEXT }),
        new Column({ name: 'age', type: ColumnType.INTEGER }),
      ];

      const result = (generator as any).generateTable('users', columns);

      expect(result).toBe(
        `new Table({
      id: column.text,
      age: column.integer
  })`
      );
    });
  });

  describe('generateColumn', () => {
    it('should generate a column', () => {
      const column = new Column({ name: 'email', type: ColumnType.TEXT });

      const result = (generator as any).generateColumn(column);

      expect(result).toBe('email: column.text');
    });
  });
});
