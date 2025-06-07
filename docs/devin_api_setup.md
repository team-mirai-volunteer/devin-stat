# Devin API設定ガイド

## DEVIN_API_TOKENについて

`DEVIN_API_TOKEN`は**オプション**の設定で、実際のクレジット使用量を取得するために使用します。設定しなくても基本的なPR統計（総数、マージ数、成功率、日別統計）は正常に動作します。

## 取得方法

### 1. Devinウェブアプリにアクセス
- https://app.devin.ai にログイン

### 2. 設定ページへ移動
- 右上のユーザーメニューから「Settings」を選択

### 3. API Token作成
- 「Secrets」セクションに移動
- 「Add Secret」または「API Token」を選択
- 新しいAPIトークンを生成

### 4. 権限確認
- **Enterprise権限**が必要です
- `/enterprise/consumption`エンドポイントへのアクセス権限が必要

## 環境変数設定

```bash
# Linux/Mac
export DEVIN_API_TOKEN="your_api_token_here"

# Windows
set DEVIN_API_TOKEN=your_api_token_here
```

## GitHub Actions設定

リポジトリの「Settings」→「Secrets and variables」→「Actions」で以下を追加：

- **Name**: `DEVIN_API_TOKEN`
- **Value**: 取得したAPIトークン

## API機能

### 利用可能なエンドポイント

1. **Enterprise Consumption API**
   - エンドポイント: `/enterprise/consumption`
   - 機能: 実際のクレジット使用量取得
   - 日付範囲指定可能

2. **Sessions API**
   - エンドポイント: `/sessions`
   - 機能: PR作成関連セッションの特定
   - セッション詳細情報取得

### 取得可能なデータ

- **日別クレジット消費量**: 正確な使用量
- **PR作成コスト**: セッション単位での詳細分析
- **効率性指標**: 実際のコスト効率計算

## フォールバック機能

APIトークンが設定されていない場合：

- **推定値を使用**: PR作成あたり50クレジットで計算
- **基本統計は正常動作**: PR数、マージ率、日別統計
- **警告メッセージ**: API未接続の旨を表示

## トラブルシューティング

### よくある問題

1. **401 Unauthorized**
   - トークンが無効または期限切れ
   - 新しいトークンを生成してください

2. **403 Forbidden**
   - Enterprise権限がない
   - 組織管理者に権限付与を依頼

3. **API接続エラー**
   - ネットワーク接続を確認
   - Devin APIサービス状況を確認

### 確認方法

```bash
# API接続テスト
python scripts/analyze_devin_stats.py --console-only
```

成功時の出力例：
```
✅ API接続成功: 15セッション
```

失敗時の出力例：
```
⚠️ API接続不可（DEVIN_API_TOKENが未設定）
```

## セキュリティ注意事項

- **トークンを公開しない**: GitHubリポジトリにコミットしない
- **環境変数で管理**: 設定ファイルに直接記載しない
- **定期的な更新**: セキュリティのため定期的にトークンを更新
- **最小権限の原則**: 必要な権限のみを付与

---

**注意**: DEVIN_API_TOKENは統計の詳細度を向上させるためのオプション機能です。設定しなくても基本的なDevin統計分析は完全に動作します。
