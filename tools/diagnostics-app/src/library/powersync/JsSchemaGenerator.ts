import { Column, Schema } from '@powersync/web';

export class JsSchemaGenerator {
  generate(schema: Schema): string {
    const tables = schema.tables;

    return `new Schema({
  ${tables.map((table) => this.generateTable(table.name, table.columns)).join(',\n  ')}
})
`;
  }

  private generateTable(name: string, columns: Column[]): string {
    return `new Table({
      ${columns.map((c) => this.generateColumn(c)).join(',\n      ')}
  })`;
  }

  private generateColumn(column: Column) {
    return `${column.name}: column.${column.type?.toLocaleLowerCase()}`;
  }
}


// const todos = new Table(
//   {
//     list_id: column.text,
//     created_at: column.text,
//     completed_at: column.text,
//     description: column.text,
//     created_by: column.text,
//     completed_by: column.text,
//     completed: column.integer
//   },
//   { indexes: { list: ['list_id'] } }
// );

// const lists = new Table({
//   created_at: column.text,
//   name: column.text,
//   owner_id: column.text
// });

// export const AppSchema = new Schema({
//   todos,
//   lists
// });
