import './App.css';

const worker = new ComlinkWorker<typeof import('./worker')>(
  new URL('./worker', import.meta.url)
);

function App() {
  // comlink(web worker)による非同期処理。
  const connectDB = async () => {
    await worker.connectDB();
    // テーブル作成
    await worker.exec(
      'CREATE TABLE IF NOT EXISTS users(id INTEGER, name TEXT)'
    );

    // データ出力
    dumpUsers();
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
    // worker側からPreparedStatementを返してもメソッドを呼べないため、
    // 値自体はWeb Worker側で保持して、キー(handle)経由で操作する
    const handle1 = await worker.prepare('insert into users values(?, ?)');
    const handle2 = await worker.prepare('insert into users values(?, ?)');

    await worker.binding(handle1, [max + 2, `Bob${max + 2}`]);
    await worker.binding(handle2, [max + 3, `Carol${max + 3}`]);

    await worker.stepFinalize(handle1);
    await worker.stepFinalize(handle2);

    // データ出力
    dumpUsers();
  };

  const dumpUsers = async () => {
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
