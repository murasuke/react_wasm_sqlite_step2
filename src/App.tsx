import { useEffect } from 'react';
import * as Comlink from 'comlink';
import './App.css';

const worker = new ComlinkWorker<typeof import('./worker')>(
  new URL('./worker', import.meta.url)
);

function App() {
  useEffect(() => {
    return () => {
      // clean up
      worker.closeDB();
    };
  }, []);

  // comlink(web worker)による非同期処理。
  const connectDB = async () => {
    await worker.connectDatabase();
    // テーブル作成
    await worker.exec(
      'CREATE TABLE IF NOT EXISTS users(id INTEGER, name TEXT)'
    );
  };

  const execute = async () => {
    const select_max = 'SELECT max(id) as max_count FROM users';
    const max = ((await worker.selectValue(select_max)) as number) ?? 0;

    // 行追加(exec)
    await worker.exec({
      sql: 'insert into users values(?,?)',
      bind: [max + 1, `Alice${max + 1}`],
    });

    // 行追加(prepare & bind)
    // const stmt = await worker.prepare('insert into users values(?, ?)');
    // stmt.bind([max + 2, `Bob${max + 2}`]).stepReset();
    // stmt.finalize();

    // 結果出力
    const values = await worker.exec({
      sql: 'SELECT * FROM users',
      rowMode: 'object',
      returnValue: 'resultRows',
    });

    console.log(values);
  };

  return (
    <div>
      <button onClick={() => connectDB()}>DB生成</button>
      <br />
      <button onClick={() => execute()}>クエリ実行</button>
      <div className="return">実行結果はDevToolsのConsoleに出力されます。</div>
    </div>
  );
}

export default App;

// function App() {
//   // ComlinkWorkerをuseRefで保持
//   const workerRef = useRef<Remote<typeof import('./worker')> | null>(null);
//   useEffect(() => {
//     // Workerを生成
//     workerRef.current = new ComlinkWorker<typeof import('./worker')>(
//       new URL('./worker', import.meta.url)
//     );

//     return () => {
//       // clean up
//       workerRef.current?.closeDB();
//     };
//   }, []);

//   // comlink(web worker)による非同期処理。
//   const connectDB = async () => {
//     if (workerRef.current) {
//       await workerRef.current.connectDatabase();
//       // テーブル作成
//       await workerRef.current.exec(
//         'CREATE TABLE IF NOT EXISTS users(id INTEGER, name TEXT)'
//       );
//     }
//   };

//   const execute = async () => {
//     if (workerRef.current) {
//       const select_max = 'SELECT max(id) as max_count FROM users';
//       const max =
//         ((await workerRef.current.selectValue(select_max)) as number) ?? 0;

//       // 行追加(exec)
//       await workerRef.current.exec({
//         sql: 'insert into users values(?,?)',
//         bind: [max + 1, `Alice${max + 1}`],
//       });

//       // 行追加(prepare & bind)
//       // const stmt = db.prepare('insert into users values(?, ?)');
//       // stmt.bind([max + 2, `Bob${max + 2}`]).stepReset();
//       // stmt.finalize();

//       // 結果出力
//       const values = await workerRef.current.exec({
//         sql: 'SELECT * FROM users',
//         rowMode: 'object',
//         returnValue: 'resultRows',
//       });

//       console.log(values);
//     }
//   };

//   return (
//     <div>
//       <button onClick={() => connectDB()}>DB生成</button>
//       <br />
//       <button onClick={() => execute()}>クエリ実行</button>
//       <div className="return">実行結果はDevToolsのConsoleに出力されます。</div>
//     </div>
//   );
// }

// export default App;
