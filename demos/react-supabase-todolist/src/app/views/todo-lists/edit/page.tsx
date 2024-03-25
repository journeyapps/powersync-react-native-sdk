import { NavigationPage } from '@/components/navigation/NavigationPage';
import { useSupabase } from '@/components/providers/SystemProvider';
import { TodoItemWidget } from '@/components/widgets/TodoItemWidget';
import { TodoListsWidget, loadTodoLists } from '@/components/widgets/TodoListsWidget';
import { LISTS_TABLE, TODOS_TABLE, TodoRecord } from '@/library/powersync/AppSchema';
import { usePowerSync, usePowerSyncWatchedQuery } from '@journeyapps/powersync-react';
import { AbstractPowerSyncDatabase } from '@journeyapps/powersync-sdk-web';
import AddIcon from '@mui/icons-material/Add';
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Grid,
  List,
  TextField,
  Typography,
  styled
} from '@mui/material';
import Fab from '@mui/material/Fab';
import React, { Suspense } from 'react';
import { LoaderFunctionArgs, useLoaderData, useParams } from 'react-router-dom';

export const todoPageLoader = (db: AbstractPowerSyncDatabase) => async ({ params }: LoaderFunctionArgs) => {
  return {
    todos: await db.query<TodoRecord>(`SELECT * FROM ${TODOS_TABLE} WHERE list_id=? ORDER BY created_at DESC, id`, [params.id]).preload(),
    list_names: await db.query<{ name: string }>(`SELECT name FROM ${LISTS_TABLE} WHERE id = ?`, [params.id]).preload(),
    lists: await loadTodoLists(db)
  };
}

type QueryLoaderType = Awaited<ReturnType<ReturnType<typeof todoPageLoader>>>;

/**
 * useSearchParams causes the entire element to fall back to client side rendering
 * This is exposed as a separate React component in order to suspend its render
 * and allow the root page to render on the server.
 */
const TodoEditSection = () => {
  const powerSync = usePowerSync();
  const supabase = useSupabase();
  const { id: listID } = useParams();
  const queryResults = useLoaderData() as QueryLoaderType;

  const [listRecord] = usePowerSyncWatchedQuery(queryResults.list_names);
  const todos = usePowerSyncWatchedQuery(queryResults.todos);

  const [showPrompt, setShowPrompt] = React.useState(false);
  const nameInputRef = React.createRef<HTMLInputElement>();

  const toggleCompletion = async (record: TodoRecord, completed: boolean) => {
    const updatedRecord = { ...record, completed: completed };
    if (completed) {
      const userID = supabase?.currentSession?.user.id;
      if (!userID) {
        throw new Error(`Could not get user ID.`);
      }
      updatedRecord.completed_at = new Date().toISOString();
      updatedRecord.completed_by = userID;
    } else {
      updatedRecord.completed_at = null;
      updatedRecord.completed_by = null;
    }
    await powerSync.execute(
      `UPDATE ${TODOS_TABLE}
              SET completed = ?,
                  completed_at = ?,
                  completed_by = ?
              WHERE id = ?`,
      [completed, updatedRecord.completed_at, updatedRecord.completed_by, record.id]
    );
  };

  const createNewTodo = async (description: string) => {
    const userID = supabase?.currentSession?.user.id;
    if (!userID) {
      throw new Error(`Could not get user ID.`);
    }

    await powerSync.execute(
      `INSERT INTO
                ${TODOS_TABLE}
                    (id, created_at, created_by, description, list_id) 
                VALUES
                    (uuid(), datetime(), ?, ?, ?)`,
      [userID, description, listID!]
    );
  };

  const deleteTodo = async (id: string) => {
    await powerSync.writeTransaction(async (tx) => {
      await tx.execute(`DELETE FROM ${TODOS_TABLE} WHERE id = ?`, [id]);
    });
  };

  if (!listRecord) {
    return (
      <Box>
        <Typography>No matching List found, please navigate back...</Typography>
      </Box>
    );
  }

  return (
    <NavigationPage title={`Todo List: ${listRecord.name}`}>
      <Box>
        <S.FloatingActionButton onClick={() => setShowPrompt(true)}>
          <AddIcon />
        </S.FloatingActionButton>
        <Box>
          <Grid container>
            <Grid item xs={4}>
              <TodoListsWidget selectedId={listID} lists={queryResults.lists} />
            </Grid>
            <Grid item xs={8}>
              <List dense={false}>
                {todos.map((r) => (
                  <TodoItemWidget
                    key={r.id}
                    description={r.description}
                    onDelete={() => deleteTodo(r.id)}
                    isComplete={r.completed == 1}
                    toggleCompletion={() => toggleCompletion(r, !r.completed)}
                  />
                ))}
              </List>
            </Grid>
          </Grid>
        </Box>
        {/* TODO use a dialog service in future, this is just a simple example app */}
        <Dialog
          open={showPrompt}
          onClose={() => setShowPrompt(false)}
          aria-labelledby="alert-dialog-title"
          aria-describedby="alert-dialog-description"
          PaperProps={{
            component: 'form',
            onSubmit: async (event: React.FormEvent<HTMLFormElement>) => {
              event.preventDefault();
              await createNewTodo(nameInputRef.current!.value);
              setShowPrompt(false);
            }
          }}
        >
          <DialogTitle id="alert-dialog-title">{'Create Todo Item'}</DialogTitle>
          <DialogContent>
            <DialogContentText id="alert-dialog-description">
              Enter a description for a new todo item
            </DialogContentText>
            <TextField sx={{ marginTop: '10px' }} fullWidth inputRef={nameInputRef} autoFocus label="Task Name" />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowPrompt(false)}>Cancel</Button>
            <Button type="submit">Create</Button>
          </DialogActions>
        </Dialog>
      </Box>
    </NavigationPage>
  );
};


export default function TodoEditPage() {
  return (
    <Box>
      <Suspense fallback={<CircularProgress />}>
        <TodoEditSection />
      </Suspense>
    </Box>
  );
}

namespace S {
  export const FloatingActionButton = styled(Fab)`
    position: absolute;
    bottom: 20px;
    right: 20px;
  `;
}
