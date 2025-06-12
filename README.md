# Devin統計システム

Devin AIが作成したプルリクエスト（PR）の統計分析とレポート生成を行うシステムです。

## 概要

このシステムは以下の機能を提供します：

- **PR統計分析**: 既存のPRデータからDevin作成PRを特定・分析
- **日別・月別統計**: PR作成数、マージ数、成功率の時系列分析
- **クレジット使用量追跡**: Devin APIを使用した実際のクレジット消費量取得
- **自動レポート生成**: 日次・月次レポートの自動生成


## システム構成

```
devin-stat/
├── config/
│   └── settings.yaml          # システム設定
├── src/
│   ├── collectors/            # データ収集
│   │   ├── devin_pr_collector.py
│   │   └── devin_api_client.py
│   ├── analyzers/             # 統計分析
│   │   └── devin_stats_analyzer.py
│   ├── generators/            # レポート生成
│   │   └── devin_report_generator.py
│   └── utils/                 # ユーティリティ
│       ├── github_api.py
│       └── devin_api.py
├── browser/                   # ブラウザベースツール
│   ├── scripts/
│   │   └── devin_session_collector.js
│   └── docs/
│       └── chrome_devtools_usage.md
├── scripts/                   # 実行スクリプト
│   ├── analyze_devin_stats.py
│   ├── generate_daily_report.py
│   └── integrate_browser_data.py
├── .github/workflows/         # GitHub Actions
│   └── daily_devin_stats.yml
└── reports/                   # 生成されたレポート
```

## セットアップ

### 1. 依存関係のインストール

```bash
pip install -r requirements.txt
```

### 2. 環境変数の設定

```bash
# GitHub API用（必須）
export GITHUB_TOKEN="your_github_token"

# Devin API用（オプション - 実際のクレジット使用量取得のため）
export DEVIN_API_TOKEN="your_devin_api_token"
```

**DEVIN_API_TOKEN取得方法**: [docs/devin_api_setup.md](docs/devin_api_setup.md)を参照

### 3. 設定ファイルの確認

`config/settings.yaml`で以下の設定を確認してください：

- PRデータの取得元リポジトリ
- レポート出力先ディレクトリ
- 分析対象期間

## 使用方法

### 基本的な統計分析

```bash
# 基本分析（コンソール出力）
python scripts/analyze_devin_stats.py --console-only

# 詳細分析（ファイル出力）
python scripts/analyze_devin_stats.py --output-dir ./reports

# 特定のPRデータディレクトリを指定
python scripts/analyze_devin_stats.py --pr-data-dir /path/to/pr-data/prs
```

### ブラウザベースのデータ収集

Chrome DevToolsを使用して、Devin管理コンソールから直接セッションデータを収集することも可能です：

```bash
# ブラウザツールのドキュメントを参照
cat browser/docs/chrome_devtools_usage.md
```

**使用方法**:
1. Devin管理コンソールにログイン
2. Chrome DevToolsのConsoleタブを開く
3. `browser/scripts/devin_session_collector.js` を実行
4. `startCollection()` でデータ収集開始

**メリット**:
- API認証不要（ブラウザのログイン状態を使用）
- リアルタイムデータ収集
- 手動での詳細確認が可能

詳細は [browser/docs/chrome_devtools_usage.md](browser/docs/chrome_devtools_usage.md) を参照してください。

### 日次レポート生成

```bash
# 日次レポート生成（GitHub Actions用）
python scripts/generate_daily_report.py
```

## 自動化

GitHub Actionsワークフローが毎日04:00 UTC（13:00 JST）に自動実行され、以下を行います：

1. 最新のPRデータを取得
2. Devin統計分析を実行
3. 日次レポートを生成
4. レポートをリポジトリにコミット

手動実行も可能です：
- GitHubリポジトリの「Actions」タブから「Devin統計日次更新」ワークフローを実行

## 取得可能な統計

### PR統計
- 総Devin PR数
- マージ済み/オープン/クローズ数
- 成功率（マージ率）
- 日別・月別作成・マージ数



### クレジット使用量（Devin API利用時）
- 日別・月別クレジット消費量
- PR作成あたりの平均クレジット数
- コスト効率分析

## データソース

### PRデータ
- **ソース**: `team-mirai-volunteer/pr-data` リポジトリ
- **形式**: JSON形式のPRメタデータ
- **更新**: policy-pr-hubシステムによる日次更新

### Devin API（オプション）
- **エンドポイント**: `/enterprise/consumption`, `/sessions`
- **データ**: 実際のクレジット使用量、セッション統計
- **要件**: Enterprise権限、DEVIN_API_TOKEN

## 出力例

### 日次レポート
```markdown
# Devin日次統計レポート

## 📊 概要統計
- 総Devin PR数: 21件
- マージ済み: 15件
- 成功率: 71.4%

## 📈 日別統計
- 2025-05-22: 5件マージ
- 2025-05-20: 3件マージ


```

## トラブルシューティング

### よくある問題

1. **PRデータが見つからない**
   - `config/settings.yaml`のパス設定を確認
   - pr-dataリポジトリのクローン状況を確認

2. **Devin APIエラー**
   - `DEVIN_API_TOKEN`環境変数の設定を確認
   - Enterprise権限の有無を確認

3. **GitHub Actions失敗**
   - シークレット設定（GITHUB_TOKEN, DEVIN_API_TOKEN）を確認
   - ワークフローログで詳細エラーを確認

### ログ確認

```bash
# 詳細ログ出力
python scripts/analyze_devin_stats.py --console-only 2>&1 | tee analysis.log
```

## 開発・カスタマイズ

### 新しい分析機能の追加

1. `src/analyzers/`に新しい分析クラスを作成
2. `src/generators/`でレポート生成機能を拡張
3. `scripts/`でメインスクリプトを更新

### 設定のカスタマイズ

`config/settings.yaml`で以下をカスタマイズ可能：
- 分析対象期間

- レポート出力形式
- API設定

## ライセンス

このプロジェクトはteam-mirai-volunteerの一部として開発されています。

## 貢献

バグ報告や機能要望は、GitHubのIssuesでお知らせください。

---

*このシステムはDevin AIによって開発されました。*
