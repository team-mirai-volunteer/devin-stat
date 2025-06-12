# Chrome DevTools を使用したDevinセッションデータ収集

## 概要

このガイドでは、Devin管理コンソールでChrome DevToolsを使用してセッション統計データを直接収集する方法を説明します。

## 前提条件

- Devin管理コンソールへのアクセス権限
- Google Chrome または Chromium ベースのブラウザ
- 組織の管理者権限（billing/usage データアクセスのため）

## 使用方法

### 1. Devin管理コンソールにログイン

1. https://app.devin.ai にアクセス
2. 組織アカウントでログイン
3. 管理者権限があることを確認

### 2. Chrome DevToolsを開く

1. ブラウザで `F12` キーを押す、または右クリック → 「検証」
2. 「Console」タブを選択

### 3. データ収集スクリプトの実行

1. `browser/scripts/devin_session_collector.js` の内容をコピー
2. Chrome DevToolsのConsoleにペースト
3. `Enter` キーで実行してスクリプトを読み込み
4. `startCollection()` を実行してデータ収集を開始

```javascript
// 基本的な使用方法
startCollection()

// 組織IDを指定する場合
collectDevinSessions("your_org_id")

// 自動ダウンロードを無効にする場合
collectDevinSessions("your_org_id", false)
```

### 4. データの確認とダウンロード

- スクリプトは自動的にJSONファイルをダウンロードします
- ファイル名: `devin_sessions_YYYY-MM-DD.json`
- コンソールにサマリー情報が表示されます

## 出力データ形式

収集されるデータは既存のPython分析システムと互換性があります：

```json
{
  "metadata": {
    "last_updated": "2025-06-12 04:15:30 UTC",
    "total_records": 273,
    "description": "Devin usage history data collected via Chrome DevTools",
    "format_version": "1.0",
    "collection_method": "browser_api",
    "org_id": "AgnIPhGma3zfPVXZ"
  },
  "data": [
    {
      "session": "GitHub Action PR Merge Notification",
      "session_id": "9d5ab35a402f4a1fb2abb6deb525cce0",
      "created_at": "2025-06-08",
      "acus_used": 0.67,
      "acu_used_since_last_reset": 0.23,
      "max_acu_limit": 10
    }
  ]
}
```

## 既存システムとの統合

### Python分析システムでの使用

収集したJSONファイルは既存の分析スクリプトで直接使用できます：

```bash
# 収集したデータを使用して分析実行
python scripts/analyze_devin_stats.py --usage-data ./devin_sessions_2025-06-12.json
```

### データの配置

```bash
# dataディレクトリに配置
cp devin_sessions_2025-06-12.json data/usage_history_browser.json

# 既存のusage_history.jsonと統合
python scripts/csv_to_json_converter.py --merge-browser-data
```

## トラブルシューティング

### よくある問題

1. **401 Unauthorized エラー**
   - Devin管理コンソールにログインしていることを確認
   - ページを再読み込みしてから再実行

2. **403 Forbidden エラー**
   - 組織の管理者権限があることを確認
   - billing/usage データへのアクセス権限を確認

3. **CORS エラー**
   - 同じタブでDevin管理コンソールが開いていることを確認
   - 他のタブやウィンドウからは実行しない

4. **データが取得できない**
   - 組織IDが正しいことを確認
   - ネットワーク接続を確認
   - APIエンドポイントの変更がないか確認

### デバッグ方法

```javascript
// 詳細ログを有効にして実行
const collector = new DevinSessionCollector('your_org_id');
collector.collectAllSessions().then(data => {
    console.log('収集完了:', data);
}).catch(error => {
    console.error('エラー詳細:', error);
});
```

## セキュリティ考慮事項

- **ログイン状態の管理**: スクリプトはブラウザのログイン状態を使用
- **データの取り扱い**: 収集したデータには機密情報が含まれる可能性
- **アクセス制限**: 管理者権限を持つユーザーのみが実行可能
- **ログの管理**: コンソールログに機密情報が表示される可能性

## 制限事項

- **ブラウザ依存**: Chrome/Chromium系ブラウザでのみ動作確認済み
- **手動実行**: 自動化には別途スケジューリングシステムが必要
- **API制限**: Devin APIのレート制限に従う必要
- **データ量**: 大量のセッションがある場合は時間がかかる可能性

## 今後の改善予定

- **自動化対応**: GitHub Actionsでの定期実行サポート
- **エラーハンドリング強化**: より詳細なエラー情報とリカバリ機能
- **データ検証**: 収集データの整合性チェック機能
- **UI改善**: より使いやすいインターフェース

---

*このツールに関する質問や問題がある場合は、GitHubのIssuesでお知らせください。*
