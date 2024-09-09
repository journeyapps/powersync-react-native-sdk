// https://www.sqlite.org/lang_expr.html#castexpr
export enum ColumnType {
  TEXT = 'TEXT',
  INTEGER = 'INTEGER',
  REAL = 'REAL'
}

export interface ColumnOptions {
  name: string;
  type?: ColumnType;
}

export type BaseColumnType<T extends number | string | null> = {
  type: ColumnType;
};

export type ColumnsType = Record<string, BaseColumnType<any>>;

export type ExtractColumnValueType<T extends BaseColumnType<any>> = T extends BaseColumnType<infer R> ? R : unknown;

const text: BaseColumnType<string | null> = {
  type: ColumnType.TEXT
};

const integer: BaseColumnType<number | null> = {
  type: ColumnType.INTEGER
};

const real: BaseColumnType<number | null> = {
  type: ColumnType.REAL
};

// There is maximum of 127 arguments for any function in SQLite. Currently we use json_object which uses 1 arg per key (column name)
// and one per value, which limits it to 63 arguments.
export const MAX_AMOUNT_OF_COLUMNS = 63;

export const column = {
  text,
  integer,
  real
};

export class Column {
  constructor(protected options: ColumnOptions) {}

  get name() {
    return this.options.name;
  }

  get type() {
    return this.options.type;
  }

  toJSON() {
    return {
      name: this.name,
      type: this.type
    };
  }
}