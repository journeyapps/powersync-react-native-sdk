import * as React from 'react';
import { StatusBar } from 'expo-status-bar';
import { ScrollView, View } from 'react-native';
import { FAB, Text } from '@rneui/themed';
import prompt from 'react-native-prompt-android';

import { router, Stack } from 'expo-router';
import { LIST_TABLE, TODO_TABLE, ListRecord, TodoRecord } from '../../../library/powersync/AppSchema';
import { useSystem } from '../../../library/powersync/system';
import { PowerSyncDatabase, useQuery, useStatus } from '@powersync/react-native';
import { ListItemWidget } from '../../../library/widgets/ListItemWidget';

const description = (total: number, completed: number = 0) => {
  return `${total - completed} pending, ${completed} completed`;
};

const createSlowQuery = (id: number) => {
  return async (db: PowerSyncDatabase) => {
    console.log(`Query ${id} started on connection ${db.database.name}`);

    // Real query with artificial delay using SQLite's sleep function
    const result = await db.get(`
      WITH RECURSIVE r(i) AS (
        SELECT 1
        UNION ALL
        SELECT i+1 FROM r WHERE i<1000
      )
      SELECT (SELECT sqlite_sleep(2)), COUNT(*) FROM r;
    `);

    console.log(`Query ${id} completed on connection ${db.database.name}`);
    return result;
  };
};

const ListsViewWidget: React.FC = () => {
  const system = useSystem();
  const status = useStatus();
  const { data: listRecords } = useQuery<ListRecord & { total_tasks: number; completed_tasks: number }>(`
      SELECT
        ${LIST_TABLE}.*, COUNT(${TODO_TABLE}.id) AS total_tasks, SUM(CASE WHEN ${TODO_TABLE}.completed = true THEN 1 ELSE 0 END) as completed_tasks
      FROM
        ${LIST_TABLE}
      LEFT JOIN ${TODO_TABLE}
        ON  ${LIST_TABLE}.id = ${TODO_TABLE}.list_id
      GROUP BY
        ${LIST_TABLE}.id;
      `);

  const createNewList = async (name: string) => {
    const { userID } = await system.supabaseConnector.fetchCredentials();

    const queries = [
      () => system.powersync.get<ListRecord>(`SELECT l.* FROM lists l WHERE l.name = ?`, ['Shopping list']),
      () => system.powersync.get<ListRecord>(`SELECT l.* FROM lists l WHERE l.name = ?`, ['Test']),
      () => system.powersync.get<ListRecord>(`SELECT l.* FROM lists l WHERE l.name = ?`, ['Test 2'])
      // const lists3 = await system.powersync.get<ListRecord>(
      //   `SELECT l.*, (SELECT sqlite_sleep(2)) FROM lists l WHERE l.name = ?`,
      //   ['Test 3']
      // );
      // const lists4 = await system.powersync.get<ListRecord>(
      //   `SELECT l.*, (SELECT sqlite_sleep(2)) FROM lists l WHERE l.name = ?`,
      //   ['Test 4']
      // );
    ];
    const startTime = Date.now();
    const promises = [];
    for (let i = 0; i < 10; i++) {
      // Run each query type 3 times
      //   for (const query of queries) {
      //     const promise = query()
      //       .then((result) => {
      //         const elapsed = Date.now() - startTime;
      //         console.log(`[+${elapsed.toFixed(5)}ms] Query ${i})} completed `);
      //         console.log(`Query ${i} completed with result:`, result);
      //       })
      //       .catch((error) => {
      //         const elapsed = Date.now() - startTime;
      //         console.log(`[+${elapsed.toFixed(5)}ms] Query ${i})} completed `);
      //         console.error(`Query ${i} error:`, error);
      //       });

      //     promises.push(promise);
      //   }
      // }
      const promise = system.powersync
        .get<ListRecord>(
          `
        WITH RECURSIVE r(i) AS (
          SELECT 1
          UNION ALL
          SELECT i+1 FROM r
          WHERE i<2000000
        ),
        -- Do some heavy computation to create delay
        computed AS (
          SELECT COUNT(*) as cnt,
                 SUM(i) as sum,
                 AVG(i) as avg
          FROM r
        )
        SELECT l.*
        FROM lists l, computed
        WHERE l.name = 'Shopping list'
        LIMIT 1
      `
        )
        .then((result) => {
          console.log(`Query ${i} completed with result:`, result);
        })
        .catch((error) => {
          console.error(`Query ${i} error:`, error);
        });

      promises.push(promise);
    }
    await Promise.all(promises);
    console.log('All queries completed');
    // console.log('Todos:', todos);
    // const res = await system.powersync.execute(
    //   `INSERT INTO ${LIST_TABLE} (id, created_at, name, owner_id) VALUES (uuid(), datetime(), ?, ?) RETURNING *`,
    //   [name, userID]
    // );

    // const resultRecord = res.rows?.item(0);
    // if (!resultRecord) {
    //   throw new Error('Could not create list');
    // }
  };

  const deleteList = async (id: string) => {
    await system.powersync.writeTransaction(async (tx) => {
      // Delete associated todos
      await tx.execute(`DELETE FROM ${TODO_TABLE} WHERE list_id = ?`, [id]);
      // Delete list record
      await tx.execute(`DELETE FROM ${LIST_TABLE} WHERE id = ?`, [id]);
    });
  };

  return (
    <View style={{ flex: 1, flexGrow: 1 }}>
      <Stack.Screen
        options={{
          headerShown: false
        }}
      />
      <FAB
        style={{ zIndex: 99, bottom: 0 }}
        icon={{ name: 'add', color: 'white' }}
        color="#aa00ff"
        size="small"
        placement="right"
        onPress={() => {
          prompt(
            'Add a new list',
            '',
            async (name) => {
              if (!name) {
                return;
              }
              await createNewList(name);
            },
            { placeholder: 'List name', style: 'shimo' }
          );
        }}
      />
      <ScrollView key={'lists'} style={{ maxHeight: '90%' }}>
        {!status.hasSynced ? (
          <Text>Busy with sync...</Text>
        ) : (
          listRecords.map((r) => (
            <ListItemWidget
              key={r.id}
              title={r.name}
              description={description(r.total_tasks, r.completed_tasks)}
              onDelete={() => deleteList(r.id)}
              onPress={() => {
                router.push({
                  pathname: 'views/todos/edit/[id]',
                  params: { id: r.id }
                });
              }}
            />
          ))
        )}
      </ScrollView>

      <StatusBar style={'light'} />
    </View>
  );
};

export default ListsViewWidget;
