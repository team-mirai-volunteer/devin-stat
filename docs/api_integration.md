# Devin API統合ガイド

## 概要

Devin統計システムでは、より詳細な統計情報を取得するためにDevin APIとの統合をサポートしています。

## 必要な準備

### 1. Devin APIトークンの取得

1. Devinの設定ページにアクセス
2. 「API Settings」または「統合設定」を選択
3. 新しいAPIトークンを生成
4. Enterprise権限が必要（consumption dataアクセスのため）

### 2. 環境変数の設定

```bash
export DEVIN_API_TOKEN="your_devin_api_token_here"
```

GitHub Actionsの場合：
1. リポジトリの「Settings」→「Secrets and variables」→「Actions」
2. 「New repository secret」をクリック
3. Name: `DEVIN_API_TOKEN`
4. Secret: 取得したAPIトークン

## 利用可能なAPI機能

### 1. Enterprise Consumption API

**エンドポイント**: `/enterprise/consumption`

**取得データ**:
- 日別・月別クレジット使用量
- 期間指定での集計
- 企業レベルの使用統計

**使用例**:
```python
from src.collectors.devin_api_client import DevinAPIClient

client = DevinAPIClient()
consumption = client.get_enterprise_consumption("2025-05-01", "2025-05-31")
print(f"5月のクレジット使用量: {consumption.get('total_credits', 0)}")
```

### 2. Sessions API

**エンドポイント**: `/sessions`

**取得データ**:
- セッション一覧
- PR関連セッションの特定
- セッション時間とクレジット使用量

**使用例**:
```python
sessions = client.list_sessions(limit=100)
pr_sessions = [s for s in sessions if client._is_pr_related_session(s)]
print(f"PR関連セッション: {len(pr_sessions)}件")
```

## API統合の設定

### config/settings.yaml

```yaml
devin_api:
  base_url: "https://api.devin.ai/v1"
  token_env_var: "DEVIN_API_TOKEN"
  endpoints:
    consumption: "/enterprise/consumption"
    sessions: "/sessions"
```

### API利用可能性の確認

```python
from src.utils.devin_api import is_devin_api_available

if is_devin_api_available():
    print("✅ Devin API利用可能")
else:
    print("❌ Devin API利用不可（トークン未設定）")
```

## 統計分析での活用

### 1. 実際のクレジット使用量

API統合により、推定値ではなく実際のクレジット使用量を取得できます：

```python
# API統合前（推定値）
estimated_credits = pr_count * 50  # 推定値

# API統合後（実際の値）
api_data = client.analyze_pr_related_sessions()
actual_credits = api_data.get('estimated_credits', 0)
```

### 2. セッション分析

PR作成に関連するセッションを特定し、詳細な分析が可能：

```python
api_analysis = client.analyze_pr_related_sessions(days_back=30)
print(f"過去30日のPR関連セッション: {api_analysis['total_pr_sessions']}件")
```

### 3. 日別統計の精度向上

API統合により、日別のクレジット使用量とセッション数の正確な追跡が可能：

```python
daily_stats = api_analysis['daily_stats']
for date, stats in daily_stats.items():
    print(f"{date}: {stats['pr_sessions']}セッション, {stats['estimated_credits']}クレジット")
```

## エラーハンドリング

### 1. API利用不可の場合

```python
try:
    consumption = client.get_enterprise_consumption(start_date, end_date)
except Exception as e:
    print(f"API呼び出しエラー: {e}")
    # フォールバック処理（推定値使用）
    consumption = {"total_credits": estimated_value}
```

### 2. レート制限対応

APIクライアントには自動的なレート制限対応が組み込まれています：

```python
@backoff.on_exception(
    backoff.expo,
    requests.exceptions.RequestException,
    max_tries=3,
    max_time=30
)
def make_devin_api_request(endpoint, params=None):
    # 自動再試行ロジック
```

## セキュリティ考慮事項

### 1. トークンの安全な管理

- 環境変数での管理
- GitHub Secretsでの暗号化保存
- ログへの出力禁止

### 2. 最小権限の原則

- 必要最小限のAPI権限のみ使用
- 定期的なトークンローテーション

### 3. データプライバシー

- 個人情報の除外
- 集計データのみの使用
- アクセスログの管理

## トラブルシューティング

### よくある問題

1. **401 Unauthorized**
   - APIトークンの有効性を確認
   - 環境変数の設定を確認

2. **403 Forbidden**
   - Enterprise権限の有無を確認
   - APIエンドポイントのアクセス権限を確認

3. **404 Not Found**
   - APIエンドポイントのURLを確認
   - Devin APIのバージョンを確認

### デバッグ方法

```python
# API接続テスト
from src.utils.devin_api import get_devin_token, get_devin_headers

token = get_devin_token()
print(f"Token available: {bool(token)}")

headers = get_devin_headers()
print(f"Headers: {headers}")
```

## 今後の拡張予定

### 1. 追加API機能

- プロジェクト別統計
- ユーザー別分析
- パフォーマンス指標

### 2. 高度な分析

- 予測分析
- 異常検知
- コスト最適化提案

---

*API統合に関する質問や問題がある場合は、GitHubのIssuesでお知らせください。*
