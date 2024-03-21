# ComlinkでWeb Workerを非同期関数として呼び出す(React+vite)

## はじめに

[ReactでSQLite Wasmを実行して、localStorageに永続化する最小のサンプル](https://github.com/murasuke/react_wasm_sqlite_step1)であｈ、
メインスレッドで実行しているため、`console.js:213 Ignoring inability to install OPFS sqlite3_vfs: The OPFS sqlite3_vfs cannot run in the main thread because it requires Atomics.wait().`という警告が出ます。

このプロジェクトでは、sqliteをWeb Workerで実行するように変更します。



### [Comlink](https://github.com/GoogleChromeLabs/comlink)とは



## 作成手順

画面イメージ
![img10](./img/img10.png)

※「実行結果は・・・」はCSSアニメーションで左右に動いています。時間がかかる処理をWeb Workerで実行した場合、画面はブロックされません。

### プロジェクト作成
* viteでReactプロジェクトを作成

```bash
$ npm create vite@latest react_wasm_sqlite_step2 -- --template react-ts
$ cd react_wasm_sqlite_step2
$ npm install
```

### sqliteをインストール
```bash
$ npm i @sqlite.org/sqlite-wasm
```

* `vite.config.ts`を修正

`headers`と`optimizeDeps`を追加します。
`Cross-Origin-Opener-Policy`と`Cross-Origin-Embedder-Policy`は、sqliteが内部的に利用する`SharedArrayBuffer`を利用するために必要な設定です。

[SharedArrayBuffer と過渡期な cross-origin isolation の話](https://blog.agektmr.com/2021/11/cross-origin-isolation.html)

```typescript:vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    exclude: ['@sqlite.org/sqlite-wasm'],
  },
});
```

### Comlinkをインストール

Web Workerを非同期関数として呼び出すことを可能にしてくれるライブラリ[Comlink](https://github.com/GoogleChromeLabs/comlink)をインストールします

* comlinkをインストールする
```bash
$ npm i comlink
$ npm i -D vite-plugin-comlink
```

* `vite.config.ts`の設定変更

`vite-plugin-comlink`をimportして、pluginを設定します

```diff
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
+ import { comlink } from 'vite-plugin-comlink';

// https://vitejs.dev/config/
export default defineConfig({
-  plugins: [react()],
+  plugins: [react(), comlink()],
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    },
  },
  optimizeDeps: {
    exclude: ['@sqlite.org/sqlite-wasm'],
  },
+  worker: {
+    plugins: [comlink()],
+  },
});
```

* comlinkの型定義

型定義を利用するため、下記1行を追加します
```typescript:./src/vite-env.d.ts
/// <reference types="vite-plugin-comlink/client" />
```

### comlinkでWorker化する処理

Web Workerとして呼び出す処理をworker.tsに記載します（時間がかかるテスト関数を呼び出すだけ）

```typescript:./src/worker.ts
import { blockingFunc } from './blockingFunc';

export const workerBlockingFunc = (iterations: number): number => {
  console.log(`Web Worker 処理開始`);

  // randomの合計を返す
  return blockingFunc(iterations);
};

```

### ReactからWeb Workerを呼び出す

* Reactコンポーネントの`useEffect()`でWeb Workerを読み込む
* ボタンクリックでWeb Workerの処理を呼び出す
* 画面説明用ラベルをCSSアニメーションで左右に移動させる(ブロッキング確認のため)

```typescript:./src/App.tsx
import { useEffect, useRef } from 'react';
import type { Remote } from 'comlink';
import { blockingFunc } from './blockingFunc';
import './App.css';

function App() {
  const roopCount = 300;
  // ComlinkWorkerをuseRefで保持
  const workerRef = useRef<Remote<typeof import('./worker')> | null>(null);

  useEffect(() => {
    // Workerを生成
    workerRef.current = new ComlinkWorker<typeof import('./worker')>(
      new URL('./worker', import.meta.url)
    );
  }, []);

  // comlink(web worker)による非同期処理。アニメーションが止まらない
  const handleClickWorker = async () => {
    if (workerRef.current) {
      console.log('start workerBlockingFunc()');
      const result = await workerRef.current.workerBlockingFunc(roopCount);
      console.log(`end workerBlockingFunc(): ${result}`);
    }
  };

  // 同期処理(画面のアニメーションが止まる)
  const handleClickSync = async () => {
    if (workerRef.current) {
      console.log('start blockingFunc()');
      const result = blockingFunc(roopCount);
      console.log(`end blockingFunc(): ${result}`);
    }
  };

  return (
    <div>
      <button onClick={() => handleClickWorker()}>
        時間がかかる関数をcomlinkで非同期的に実行
      </button>
      <br />
      <button onClick={() => handleClickSync()}>
        時間がかかる関数を同期的に実行
      </button>
      <div className="return">実行結果はDevToolsのConsoleに出力されます。</div>
    </div>
  );
}

export default App;
```
### CSSにアニメーション効果を追加

画面描画がブロックされていることがわかるように、「実行結果は・・・」を左右にアニメーションさせる。


```css:./src/App.css
@keyframes return {
  50% {
    left: 200px;
  }
  100% {
    left: 0px;
  }
}

.return {
  width:  320px;
  position: relative;
  left: 0px;
  top: 0;

  animation-name: return;
  animation-duration: 3s;
  animation-iteration-count: infinite;
  animation-timing-function: ease;
}

```
## 動作確認

```bash
$ npm run dev

  VITE v5.1.5  ready in 191 ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
  ➜  press h + enter to show help
```
* コンソールを開いてから、ボタンをクリックすると各処理の流れを追うことができます
  * App.tsxからの呼び出し
  * Web Workerで実行
  * 2秒後にApp.tsxで処理結果を受け取る
  * 処理中、画面描画はブロックされない（アニメーションがなめらかに動作し続ける）

  ![img20](./img/img20.png)

※「時間がかかる関数を同期的に実行」ボタンをクリックすると、画面が一時停止します


## 参考

https://www.npmjs.com/package/vite-plugin-comlink

https://dev.to/franciscomendes10866/how-to-use-service-workers-with-react-17p2
