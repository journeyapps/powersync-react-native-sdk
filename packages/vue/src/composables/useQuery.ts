import { type SQLWatchOptions, parseQuery, type CompilableQuery, ParsedQuery } from '@powersync/common';
import { type MaybeRef, type Ref, ref, toValue, watchEffect } from 'vue';
import { usePowerSync } from './powerSync';

interface AdditionalOptions extends Omit<SQLWatchOptions, 'signal'> {
  runQueryOnce?: boolean;
}

export type WatchedQueryResult<T> = {
  data: Ref<T[]>;
  /**
   * Indicates the initial loading state (hard loading). Loading becomes false once the first set of results from the watched query is available or an error occurs.
   */
  isLoading: Ref<boolean>;
  /**
   * Indicates whether the query is currently fetching data, is true during the initial load and any time when the query is re-evaluating (useful for large queries).
   */
  isFetching: Ref<boolean>;
  error: Ref<Error | undefined>;
  /**
   * Function used to run the query again.
   */
  refresh?: () => Promise<void>;
};

/**
 * A composable to access the results of a watched query.
 *
 * @example
 * ```vue
 * <script setup>
 * import { useQuery } from '@powersync/vue';
 *
 * const { data, isLoading, isFetching, error} = useQuery('SELECT * FROM lists');
 * </script>
 *
 * <template>
 *    <div v-if="isLoading">Loading...</div>
 *    <div v-else-if="isFetching">Updating results...</div>
 *
 *    <div v-if="error">{{ error }}</div>
 *    <ul v-else>
 *        <li v-for="l in data" :key="l.id">{{ l.name }}</li>
 *    </ul>
 * </template>
 * ```
 */
export const useQuery = <T = any>(
  query: MaybeRef<string | CompilableQuery<T>>,
  sqlParameters: MaybeRef<any[]> = [],
  options: AdditionalOptions = {}
): WatchedQueryResult<T> => {
  const data = ref<T[]>([]) as Ref<T[]>;
  const error = ref<Error | undefined>(undefined);
  const isLoading = ref(true);
  const isFetching = ref(true);

  // Only defined when the query and parameters are successfully parsed and tables are resolved
  let fetchData: () => Promise<void> | undefined;

  const powerSync = usePowerSync();

  const finishLoading = () => {
    isLoading.value = false;
    isFetching.value = false;
  };

  if (!powerSync) {
    finishLoading();
    error.value = new Error('PowerSync not configured.');
    return { data, isLoading, isFetching, error };
  }

  const handleResult = (result: T[]) => {
    finishLoading();
    data.value = result;
    error.value = undefined;
  };

  const handleError = (e: Error) => {
    fetchData = undefined;
    finishLoading();
    data.value = [];

    const wrappedError = new Error('PowerSync failed to fetch data: ' + e.message);
    wrappedError.cause = e;
    error.value = wrappedError;
  };

  const _fetchData = async (sql: string, parameters: any[]) => {
    isFetching.value = true;
    try {
      const result = await powerSync.value.getAll<T>(sql, parameters);
      handleResult(result);
    } catch (e) {
      console.error('Failed to fetch data:', e);
      handleError(e);
    }
  };

  let abortController = new AbortController();
  watchEffect(async (onCleanup) => {
    // Abort any previous watches when the effect triggers again, or when the component is unmounted
    onCleanup(() => abortController.abort());
    abortController = new AbortController();

    let parsedQuery: ParsedQuery;
    try {
      parsedQuery = parseQuery(toValue(query), toValue(sqlParameters));
    } catch (e) {
      console.error('Failed to parse query:', e);
      handleError(e);
      return;
    }

    const { sqlStatement: sql, parameters } = parsedQuery;

    let resolvedTables = [];
    try {
      resolvedTables = await powerSync.value.resolveTables(sql, parameters, options);
    } catch (e) {
      console.error('Failed to fetch tables:', e);
      handleError(e);
      return;
    }
    // Fetch initial data
    fetchData = () => _fetchData(sql, parameters);
    await fetchData();

    if (options.runQueryOnce) {
      return;
    }

    powerSync.value.onChangeWithCallback(
      {
        onChange: async () => {
          await fetchData();
        },
        onError: handleError
      },
      {
        ...options,
        signal: abortController.signal,
        tables: resolvedTables
      }
    );
  });

  return {
    data,
    isLoading,
    isFetching,
    error,
    refresh: () => fetchData?.()
  };
};
