import sqlite3InitModule, {
  Database,
  Sqlite3Static,
  FlexibleString,
  PreparedStatement,
  BindingSpec,
} from '@sqlite.org/sqlite-wasm';

const log = (...args: any[]) => console.log(...args); // eslint-disable-line
const error = (...args: any[]) => console.error(...args); // eslint-disable-line

let db: Database | null = null;

/**
 * prepare()で動的に生成するStatementは、メインUIスレッド側に渡せないので
 * JSON.stringify()をキーにして、objectStoreに保持する
 * メインUIスレッド側には、キーを返す(handleとして利用する)
 *  ⇒ handleはhash値にした方がよさそうだが簡易的な実装なので
 */
const objectStore: {
  [key: string]: object;
} = {};

/**
 * sqlite3に接続してDBを作成
 * ・https://sqlite.org/wasm/doc/tip/api-oo1.md
 * @param sqlite3
 * @returns
 */
const connectDB = (sqlite3: Sqlite3Static) => {
  log('Running SQLite3 version', sqlite3.version.libVersion);

  // localStrageに保存(永続化)
  // (c: create if it does not exist, t: trace on)
  // db = new sqlite3.oo1.DB('file:local?vfs=kvvfs', 'ct');
  if ('opfs' in sqlite3) {
    db = new sqlite3.oo1.OpfsDb('/mydb.sqlite3', 'ct');
    log('OPFS is available, created persisted database at', db.filename);
  } else {
    db = new sqlite3.oo1.DB('/mydb.sqlite3', 'ct');
    log('OPFS is not available, created transient database', db.filename);
  }

  return db;
};

/**
 * DBが初期化済みであれば閉じる
 */
export const closeDB = () => {
  db?.close();
  db = null;
};

/**
 * DBの初期化と接続を行う
 * @returns Database
 */
export const connectDatabase = async (): Promise<Database> => {
  if (db) {
    return db;
  }

  log('Loading and initializing SQLite3 module...');

  try {
    // sqlite3の初期化
    const sqlite3 = await sqlite3InitModule({
      print: log,
      printErr: error,
    });

    // DBに接続
    db = connectDB(sqlite3);

    return db;
  } catch (err: unknown) {
    if (err instanceof Error) {
      error(err.name, err.message);
      throw err;
    }
  }

  throw new Error('unknown error');
};

/**
 * execのラッパー
 * @param sql
 * @param opts
 * @returns
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const exec = (sql: any, opts: any = {}): Database => {
  if (!db) {
    throw new Error();
  }

  if ('string' === typeof sql) {
    return db.exec(sql, opts);
  } else {
    return db.exec(sql);
  }
};

export const prepare = (sql: FlexibleString): string => {
  if (!db) {
    throw new Error();
  }
  const stmt = db.prepare(sql);
  // const hash = await sha256(JSON.stringify(stmt));
  const handle = JSON.stringify(stmt);
  objectStore[handle] = stmt;
  return handle;
};

/**
 * PreparedStatement::bind()のラッパー
 * (javascriptのbindとメソッド名が被るのでbindingに変更)
 * @param handle
 * @param binding
 * @returns
 */
export const binding = (handle: string, binding: BindingSpec): string => {
  if (!db) {
    throw new Error();
  }
  const stmt = objectStore[handle] as PreparedStatement;
  stmt.bind(binding);
  return handle;
};

/**
 * PreparedStatement::stepReset()のラッパー
 * @param handle
 * @returns
 */
export const stepReset = (handle: string): string => {
  if (!db) {
    throw new Error();
  }
  const stmt = objectStore[handle] as PreparedStatement;
  stmt.stepReset();
  return handle;
};

/**
 * PreparedStatement::finalize()のラッパー
 * @param handle
 * @returns
 */
export const finalize = (handle: string): number | undefined => {
  if (!db) {
    throw new Error();
  }
  const stmt = objectStore[handle] as PreparedStatement;
  return stmt.finalize();
};

export const selectValue = (
  sql: FlexibleString, // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bind?: BindingSpec, // eslint-disable-next-line @typescript-eslint/no-explicit-any
  asType?: any
): number | undefined => {
  if (!db) {
    throw new Error();
  }

  return db.selectValue(sql, bind, asType);
};
