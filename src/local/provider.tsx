import {
  SQLiteProvider,
  type SQLiteDatabase,
  useSQLiteContext,
} from "expo-sqlite";
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { StyleSheet, Text, View } from "react-native";

import { PageLoading } from "@/components/ui/Spinner";
import {
  getActiveWorkspaceId,
  initializeLocalDatabase,
  LOCAL_DATABASE_NAME,
  type LocalDatabase,
} from "@/local/database";
import { LocalHabitRepository } from "@/local/repository";
import { colors } from "@/theme";

type LocalDataContextValue = {
  repository: LocalHabitRepository;
  revision: number;
  didWrite: () => void;
  reportReadError: (error: unknown) => void;
};

const LocalDataContext = createContext<LocalDataContextValue | null>(null);

async function initialize(database: SQLiteDatabase) {
  await initializeLocalDatabase(database as unknown as LocalDatabase);
}

function StorageError({ error }: { error: Error }) {
  return (
    <View style={styles.center}>
      <Text style={styles.title}>Couldn’t open local storage</Text>
      <Text style={styles.message}>{error.message}</Text>
    </View>
  );
}

function RepositoryProvider({ children }: { children: ReactNode }) {
  const database = useSQLiteContext() as unknown as LocalDatabase;
  const [workspaceId, setWorkspaceId] = useState<string>();
  const [revision, setRevision] = useState(0);
  const [error, setError] = useState<Error>();

  useEffect(() => {
    let active = true;
    void getActiveWorkspaceId(database)
      .then((id) => {
        if (active) setWorkspaceId(id);
      })
      .catch((reason: unknown) => {
        if (active)
          setError(
            reason instanceof Error
              ? reason
              : new Error("Couldn’t read the local workspace"),
          );
      });
    return () => {
      active = false;
    };
  }, [database]);

  const didWrite = useCallback(() => setRevision((value) => value + 1), []);
  const reportReadError = useCallback((reason: unknown) => {
    setError(
      reason instanceof Error
        ? reason
        : new Error("Couldn’t read data stored on this phone"),
    );
  }, []);
  const repository = useMemo(
    () =>
      workspaceId ? new LocalHabitRepository(database, workspaceId) : undefined,
    [database, workspaceId],
  );

  if (error) return <StorageError error={error} />;
  if (!repository) return <PageLoading />;

  return (
    <LocalDataContext.Provider
      value={{ repository, revision, didWrite, reportReadError }}
    >
      {children}
    </LocalDataContext.Provider>
  );
}

export function LocalDatabaseProvider({ children }: { children: ReactNode }) {
  const [error, setError] = useState<Error>();
  const handleError = useCallback((reason: Error) => setError(reason), []);
  if (error) return <StorageError error={error} />;

  return (
    <SQLiteProvider
      databaseName={LOCAL_DATABASE_NAME}
      onInit={initialize}
      onError={handleError}
    >
      <RepositoryProvider>{children}</RepositoryProvider>
    </SQLiteProvider>
  );
}

export function useLocalData(): LocalDataContextValue {
  const value = useContext(LocalDataContext);
  if (!value) {
    throw new Error("useLocalData must be used inside LocalDatabaseProvider");
  }
  return value;
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 24,
    backgroundColor: colors.background,
  },
  title: { fontSize: 18, fontWeight: "600", color: colors.foreground },
  message: { textAlign: "center", color: colors.muted },
});
