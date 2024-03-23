import sqlite3InitModule, {
  Database,
  Sqlite3Static,
  FlexibleString,
  PreparedStatement,
  BindingSpec,
} from '@sqlite.org/sqlite-wasm';

// 実行したクエリをコンソール出力するためのメソッド
const log = (...args: any[]) => console.log(...args); // eslint-disable-line
const error = (...args: any[]) => console.error(...args); // eslint-disable-line

let db: Database | null = null;

/**
 * DBの初期化と接続を行う
 * @returns Database
 */
export const connectDB = async (): Promise<Database> => {
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
    db = openDB(sqlite3);

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
 * sqlite3に接続してDBを作成
 * ・https://sqlite.org/wasm/doc/tip/api-oo1.md
 * @param sqlite3
 * @returns
 */
const openDB = (sqlite3: Sqlite3Static) => {
  log('Running SQLite3 version', sqlite3.version.libVersion);

  // opfsが利用可能であればOpfsDbを生成する
  if ('opfs' in sqlite3) {
    // (c: create if it does not exist, t: trace on)
    db = new sqlite3.oo1.OpfsDb('/mydb.sqlite3', 'ct');
    log('OPFS is available, created persisted database at', db.filename);
  } else {
    db = new sqlite3.oo1.DB('/mydb.sqlite3', 'ct');
    log('OPFS is not available, created transient database', db.filename);
  }

  return db;
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

/**
 * select文で値を取得
 * @param sql
 * @param bind
 * @param asType
 * @returns
 */
export const selectValue = (
  sql: FlexibleString,
  bind?: BindingSpec, // eslint-disable-next-line @typescript-eslint/no-explicit-any
  asType?: any
): unknown => {
  if (!db) {
    throw new Error();
  }

  return db.selectValue(sql, bind, asType);
};

/**
 * Database::prepare()はStatementを返しますが、メインUIスレッド側に渡せません
 * (値はシリアライズされて渡されるが、UIスレッドからメソッド呼び出しができない)
 * そのため、StatementをobjectStoreに保持して、
 * メインUIスレッド側には、値を取得するためのキー(pointer)を返します
 * (UIスレッド側では、役割を明確にするためhandleという変数名にしています)
 */
const objectStore: {
  [key: number]: object;
} = {};

/**
 * prepareのラッパー
 * ・objectStoreの説明参照
 * @param sql
 * @returns
 */
export const prepare = (sql: FlexibleString): number => {
  if (!db) {
    throw new Error();
  }
  const stmt = db.prepare(sql);
  const handle = stmt.pointer as number;
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
export const binding = (handle: number, binding: BindingSpec): number => {
  if (!db) {
    throw new Error();
  }

  const stmt = objectStore[handle] as PreparedStatement;
  stmt.bind(binding);
  return handle;
};

/**
 * PreparedStatement::stepFinalize()のラッパー
 * @param handle
 * @returns
 */
export const stepFinalize = (handle: number): boolean => {
  if (!db) {
    throw new Error();
  }

  const stmt = objectStore[handle] as PreparedStatement;
  return stmt.stepFinalize();
};
