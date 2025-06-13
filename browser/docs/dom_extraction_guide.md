# DOM専用セッションデータ抽出ガイド（複数ページ対応）

## 概要

Devin管理コンソールのUsage HistoryページからDOM要素を直接解析してセッションデータを収集するJavaScriptスクリプトです。API認証が困難な場合の確実な代替手段として設計されており、複数ページにわたるデータの累積収集に対応しています。

## 使用方法

### ステップ1: ページ準備

1. [Devin管理コンソール](https://app.devin.ai)にログイン
2. Usage Historyページに移動: `https://app.devin.ai/settings/usage?tab=history`
3. セッションデータが完全に読み込まれるまで待機
4. セッション一覧が4列のグリッド形式で表示されていることを確認

### ステップ2: スクリプト実行

1. `F12`キーでChrome DevToolsを開く
2. "Console"タブを選択
3. `browser/scripts/dom_session_extractor.js` の内容をコピー&ペースト
4. 初期化コマンドを実行:

```javascript
startDOMExtraction()
```

### ステップ3: 複数ページデータ収集

#### 基本的な流れ
1. **最初のページ**: `startDOMExtraction()` で自動処理
2. **次のページ**: ページネーションで次のページに移動
3. **データ追加**: `addCurrentPage()` でデータを累積
4. **繰り返し**: 全ページで手順2-3を繰り返し
5. **最終出力**: `exportAll()` で全データをダウンロード

#### 利用可能なコマンド

```javascript
// 現在のページのデータを累積ストレージに追加
addCurrentPage()

// 累積データの状況を表示
showStatus()

// 累積データを全てJSONでダウンロード
exportAll()

// 累積データをクリア（やり直し時）
clearAll()
```

### 期待される出力

#### 初回実行時
```
🚀 DOM抽出（複数ページ対応）を開始します...

📋 複数ページ対応の使用方法:
1. Devin管理コンソールのUsage Historyページに移動
2. ページが完全に読み込まれるまで待機
3. addCurrentPage() を実行してデータを累積
4. 次のページに移動して再度 addCurrentPage() を実行
5. 全ページ処理後、exportAll() で全データをダウンロード

🔄 最初のページを自動処理中...
📍 現在のURL: https://app.devin.ai/settings/usage?tab=history
📋 Usage Historyヘッダー: ✅
📋 ACUs Usedカラム: ✅
🔍 グリッドからセッションデータを抽出中...
✅ 20 個のセッションを累積ストレージに追加しました
📊 ページ 1: 20 件追加, 0 件重複スキップ
📈 累積: 20 セッション, 45.2 ACU
✅ 初期ページ処理完了!
```

#### 追加ページ処理時
```javascript
addCurrentPage()
```
```
🚀 現在のページからセッションデータを抽出中...
✅ 15 個のセッションを累積ストレージに追加しました
📊 ページ 2: 15 件追加, 0 件重複スキップ
📈 累積: 35 セッション, 78.5 ACU
```

#### 最終出力時
```javascript
exportAll()
```
```
📥 累積データをJSONファイルとしてダウンロードしました
📊 最終結果: 35 セッション, 78.5 ACU, 2 ページ
```

## 出力データ形式

### 複数ページ対応の出力形式
```json
{
  "sessions": [
    {
      "session_name": "GitHub Action PR Merge Notification",
      "session_id": "9d5ab35a402f4a1fb2abb6deb525cce0",
      "created_at": "2025-06-08T05:05:49.405332+00:00",
      "acu_used": 0.6665147118,
      "raw_index": 0,
      "page_number": 1,
      "extraction_timestamp": "2025-06-13T04:15:00.000Z"
    }
  ],
  "total": 35,
  "total_acu_used": 78.5,
  "pages_processed": 2,
  "extraction_start": "2025-06-13T04:10:00.000Z",
  "extraction_end": "2025-06-13T04:15:00.000Z",
  "extraction_method": "dom-multi-page"
}
```

### 新しいフィールドの説明
- `page_number`: セッションが抽出されたページ番号
- `extraction_timestamp`: 各セッションの抽出時刻
- `pages_processed`: 処理されたページ数
- `extraction_start`: データ収集開始時刻
- `extraction_end`: データ収集終了時刻
- `extraction_method`: "dom-multi-page" で複数ページ対応を示す

## デバッグモード

問題が発生した場合、詳細ログ付きで実行:

```javascript
extractSessionsDebug()
```

## トラブルシューティング

### セッションデータが見つからない場合

1. **ページ確認**:
   - Usage Historyページにいることを確認
   - セッション一覧が表示されていることを確認
   - ページが完全に読み込まれるまで待機

2. **手動確認**:
   ```javascript
   // セッション要素の存在確認
   document.querySelectorAll('[class*="grid"][class*="cursor-pointer"]').length
   ```

3. **フォールバック実行**:
   ```javascript
   const extractor = new DOMSessionExtractor();
   extractor.fallbackExtraction()
   ```

### DOM構造が変更された場合

1. **要素調査**:
   ```javascript
   // セッション関連要素を探す
   document.querySelectorAll('*').forEach(el => {
     if (el.textContent.includes('session') || el.textContent.includes('ACU')) {
       console.log(el.className, el.textContent.substring(0, 50));
     }
   });
   ```

2. **新しいセレクターのテスト**:
   ```javascript
   // 新しいセレクターを試す
   const newSelector = 'your-new-selector-here';
   document.querySelectorAll(newSelector).length
   ```

## 技術仕様

### DOM構造

- **コンテナ**: `.divide-y.divide-neutral-200.dark:divide-neutral-800`
- **データ行**: `div.grid.cursor-pointer.grid-cols-4.gap-4.px-4.py-3`
- **4列構造**: Session | Created At | ACUs Used | (空)

### 抽出戦略

1. **メインセレクター**: 正確なクラス名でのマッチング
2. **フォールバックセレクター**: より一般的なパターンマッチング
3. **テキスト抽出**: 正規表現によるフォールバック抽出

## 既存システムとの統合

```bash
python scripts/integrate_browser_data.py --input devin-sessions-2025-06-13.json
```

## セキュリティ注意事項

- スクリプト実行後はConsoleの履歴をクリアすることを推奨
- ダウンロードしたJSONファイルは適切に管理してください
- 組織のセキュリティポリシーに従ってデータを取り扱ってください
