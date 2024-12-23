import { column, Schema, Table } from "@powersync/web";
// OR: import { column, Schema, Table } from '@powersync/react-native';

const list = new Table(
   {
      // id column (text) is automatically included
      text: column.text,
      created_at: column.text,
   },
   { indexes: {} }
);

const paged_list = new Table(
   {
      // id column (text) is automatically included
      text: column.text,
      page: column.integer,
      created_at: column.text,
   },
   { indexes: {} }
);

const syncto_list = new Table(
   {
      // id column (text) is automatically included
      text: column.text,
      created_at: column.text,
   },
   { indexes: {} }
);

export const schema = new Schema({
   list,
   paged_list,
   syncto_list,
});
