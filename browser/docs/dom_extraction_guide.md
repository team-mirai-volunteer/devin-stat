# DOM専用セッションデータ抽出ガイド

## 概要

Devin管理コンソールのUsage HistoryページからDOM要素を直接解析してセッションデータを収集するJavaScriptスクリプトです。API認証が困難な場合の確実な代替手段として設計されています。

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
4. 以下のコマンドを実行:

```javascript
startDOMExtraction()
```

### 期待される出力

```
🚀 DOM抽出を開始します...
📍 現在のURL: https://app.devin.ai/settings/usage?tab=history
📋 Usage Historyヘッダー: ✅
📋 ACUs Usedカラム: ✅
🔍 グリッドからセッションデータを抽出中...
🔍 セレクター "div.grid.cursor-pointer.grid-cols-4.gap-4.px-4.py-3": 20 行発見
📊 行 1: { name: "GitHub Action PR Merge Notif...", id: "9d5ab35a402f4a1fb2a...", date: "2025-06-08T05:05:49.405Z", acu: 0.67 }
✅ 20 個のセッションを抽出しました
📥 JSONファイルをダウンロードしました: devin-sessions-2025-06-13.json
✅ 抽出完了!
📊 20 セッション、合計 45.2 ACU
```

## 出力データ形式

```json
{
  "sessions": [
    {
      "session_name": "GitHub Action PR Merge Notification",
      "session_id": "9d5ab35a402f4a1fb2abb6deb525cce0",
      "created_at": "2025-06-08T05:05:49.405332+00:00",
      "acu_used": 0.6665147118,
      "raw_index": 0
    }
  ],
  "total": 20,
  "total_acu_used": 45.2,
  "extraction_timestamp": "2025-06-13T03:17:52.000Z",
  "extraction_method": "dom",
  "page_url": "https://app.devin.ai/settings/usage?tab=history"
}
```

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
