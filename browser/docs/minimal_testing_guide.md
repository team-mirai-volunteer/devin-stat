# 最小限APIテストガイド

## 概要

401 Unauthorizedエラーを最小コストで調査するためのテストスクリプトです。

## 使用方法

### 1. Devin管理コンソールにログイン
- https://app.devin.ai にアクセスしてログイン

### 2. Chrome DevToolsを開く
- F12キーまたは右クリック → 検証
- Consoleタブを選択

### 3. テストスクリプトを実行

```javascript
// スクリプトを読み込み（browser/scripts/minimal_api_test.jsの内容をコピー&ペースト）

// 全テストを実行
runAllTests()

// または個別テストを実行
testCorrectEndpoint()    // 正しい/sessionsエンドポイントをテスト
testOldEndpoint()        // 古い/billing/usage/sessionsエンドポイントをテスト
testAuthInfo()           // 認証情報を確認
testPagination()         // ページネーションをテスト
```

## 期待される結果

### 成功パターン
- ✅ ステータス: 200 OK
- 📊 レスポンス構造が表示される
- 📊 データサンプルが表示される

### 失敗パターン
- ❌ ステータス: 401 Unauthorized → 認証問題
- ❌ ステータス: 403 Forbidden → 権限問題
- ❌ ステータス: 404 Not Found → エンドポイント問題

## 調査ポイント

1. **正しいエンドポイント**: `/sessions` vs `/billing/usage/sessions`
2. **認証方法**: クッキー、トークン、ヘッダー
3. **クエリパラメータ**: `creators`, `created_date_from`, `created_date_to`, `is_archived`
4. **レスポンス形式**: データ構造とページネーション

## 次のステップ

テスト結果に基づいて：
- 動作するエンドポイントを特定
- 必要な認証方法を確認
- メインスクリプトを修正
