# 最小限APIテストガイド - 401エラー調査

## 概要

401 Unauthorizedエラーを最小コストで調査し、動作する認証方法を特定するためのテストスクリプトです。

## 🚀 クイックスタート

### 1. Devin管理コンソールにログイン
- https://app.devin.ai にアクセスしてログイン
- 組織の管理者権限があることを確認

### 2. Chrome DevToolsを開く
- F12キーまたは右クリック → 検証
- Consoleタブを選択

### 3. 最速テストを実行

```javascript
// 1. スクリプトを読み込み（browser/scripts/minimal_api_test.jsの内容をコピー&ペースト）

// 2. 最速テストを実行（推奨）
quickTest()

// 結果が成功した場合、その設定をメインスクリプトで使用
```

## 📋 詳細テスト方法

### 基本テスト
```javascript
// 認証情報を確認
testAuthInfo()

// 最も可能性の高い方法を試す
quickTest()
```

### 個別エンドポイントテスト
```javascript
testCorrectEndpoint()    // /sessionsエンドポイントをテスト
testOldEndpoint()        // /billing/usage/sessionsエンドポイントをテスト
testPagination()         // ページネーションをテスト
```

### 高度な認証テスト
```javascript
testAdvancedAuth()       // 様々な認証方法を試す
```

### 全テスト実行
```javascript
runAllTests()           // 全てのテストを順次実行
```

## 🎯 期待される結果

### ✅ 成功パターン
```
🎉 成功! この設定が動作します! メインスクリプトで使用してください。
✅ ステータス: 200 OK
📊 レスポンス構造: ['sessions', 'total']
📊 データサンプル: {"sessions": [...], "total": 273}
```

### ❌ 失敗パターン
- `❌ ステータス: 401 Unauthorized` → 認証問題
- `❌ ステータス: 403 Forbidden` → 権限問題  
- `❌ ステータス: 404 Not Found` → エンドポイント問題
- `❌ ステータス: 500 Internal Server Error` → サーバー問題

## 🔍 調査ポイント

### 1. エンドポイント
- `/org_AgnIPhGma3zfPVXZ/sessions` (推奨)
- `/org_AgnIPhGma3zfPVXZ/billing/usage/sessions` (従来)

### 2. 認証方法
- ブラウザクッキー (`credentials: 'include'`)
- CSRFトークン (`X-CSRF-Token` ヘッダー)
- 認証トークン (`Authorization: Bearer` ヘッダー)
- LocalStorage/SessionStorageのトークン

### 3. クエリパラメータ
- **sessions**: `creators`, `created_date_from`, `created_date_to`, `is_archived`
- **billing/usage/sessions**: `page`, `page_size`

### 4. レスポンス形式
- データ構造とページネーション情報
- セッション詳細フィールド

## 🔧 トラブルシューティング

### 401エラーが続く場合
1. ページを再読み込みしてから再実行
2. 別のタブでDevin管理コンソールを開いてから実行
3. ログアウト→ログインしてから再実行
4. `testAuthInfo()`で認証情報を確認

### 403エラーの場合
1. 組織の管理者権限を確認
2. billing/usage データへのアクセス権限を確認

### ネットワークエラーの場合
1. インターネット接続を確認
2. ブラウザの拡張機能を無効化
3. プライベートブラウジングモードで試行

## 📝 次のステップ

### テスト成功時
1. **成功した設定を記録**:
   - エンドポイントURL
   - 必要なヘッダー
   - 認証方法
   
2. **メインスクリプトを更新**:
   - `devin_session_collector.js`の`fetchSessionPage()`メソッドを修正
   - 成功した設定を適用

3. **動作確認**:
   - 更新したスクリプトで`startCollection()`を実行
   - データ収集が正常に動作することを確認

### テスト失敗時
1. **詳細調査**:
   - ブラウザのNetworkタブでAPIリクエストを監視
   - 実際のDevin管理コンソールのAPIコールを観察
   - 必要なヘッダーや認証情報を特定

2. **代替アプローチ**:
   - 手動でのデータエクスポート機能を探す
   - 別の認証方法を調査
   - Devin APIドキュメントを確認
