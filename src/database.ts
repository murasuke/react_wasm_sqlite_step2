import sqlite3InitModule, {
  Database,
  Sqlite3Static,
  FlexibleString,
  PreparedStatement,
} from '@sqlite.org/sqlite-wasm';

const log = (...args: any[]) => console.log(...args); // eslint-disable-line
const error = (...args: any[]) => console.error(...args); // eslint-disable-line

let db: Database | null = null;

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

export const prepare = (sql: FlexibleString): PreparedStatement => {
  if (!db) {
    throw new Error();
  }

  return db.prepare(sql);
};

export const selectValue = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sql: any, // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bind?: any, // eslint-disable-next-line @typescript-eslint/no-explicit-any
  asType?: any
): number | undefined => {
  if (!db) {
    throw new Error();
  }

  return db.selectValue(sql, bind, asType);
};
