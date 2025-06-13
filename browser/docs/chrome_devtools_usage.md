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

**注意**: スクリプトはまずAuth0 Bearerトークンを使用したAPI呼び出しを試行し、失敗した場合はUI要素からのデータ抽出にフォールバックします。UI抽出は実際のDevin管理コンソールのUsage Historyページの4列グリッド構造に最適化されています。

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
   - 管理者権限があることを確認
   - セッションが期限切れの場合は再ログイン

2. **403 Forbidden エラー**
   - 組織の管理者権限があることを確認
   - billing/usage データへのアクセス権限を確認
   - 組織IDが正しいことを確認

3. **CORS エラー**
   - 同じタブでDevin管理コンソールが開いていることを確認
   - 他のタブやウィンドウからは実行しない
   - ブラウザの拡張機能が干渉していないか確認

4. **データが取得できない**
   - 組織IDが正しいことを確認
   - ネットワーク接続を確認
   - APIエンドポイントの変更がないか確認
   - `debugNetworkRequests()` を実行してAPIリクエストを監視

5. **認証トークンの問題**
   - ブラウザの開発者ツールでApplicationタブを確認
   - Local StorageやSession Storageに認証情報があるか確認
   - Cookiesに必要な認証情報があるか確認

### デバッグ方法

```javascript
// 詳細ログを有効にして実行
const collector = new DevinSessionCollector('your_org_id');
collector.collectAllSessions().then(data => {
    console.log('収集完了:', data);
}).catch(error => {
    console.error('エラー詳細:', error);
});

// ネットワークリクエストを監視
debugNetworkRequests();

// 認証情報を確認
console.log('CSRFトークン:', collector.getCSRFToken());
console.log('認証トークン:', collector.getAuthToken());

// Auth0トークンを手動で確認
for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('@@auth0spajs@@') && key.includes('backend.webapp.devin.ai')) {
        try {
            const value = localStorage.getItem(key);
            const authData = JSON.parse(value);
            if (authData && authData.body && authData.body.access_token) {
                console.log('Auth0トークン発見:', {
                    key: key.substring(0, 50) + '...',
                    token_type: authData.body.token_type,
                    access_token: authData.body.access_token.substring(0, 30) + '...'
                });
            }
        } catch (e) {
            console.log('Auth0トークン解析エラー:', e.message);
        }
    }
}

// 手動でAPIリクエストをテスト（Auth0 Bearer認証）
const authToken = collector.getAuthToken();
if (authToken) {
    fetch('https://api.devin.ai/org_AgnIPhGma3zfPVXZ/billing/usage/sessions?page=1&page_size=1', {
        method: 'GET',
        credentials: 'include',
        headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Authorization': `${authToken.token_type} ${authToken.access_token}`
        }
    }).then(response => {
        console.log('テストリクエスト結果:', response.status, response.statusText);
        return response.json();
    }).then(data => {
        console.log('テストデータ:', data);
    }).catch(error => {
        console.error('テストエラー:', error);
    });
}

// UI抽出をテスト
const uiSessions = collector.extractSessionDataFromUI();
console.log('UI抽出結果:', uiSessions);

// Usage Historyページの構造を確認
console.log('ページ構造確認:');
console.log('- グリッドヘッダー:', document.querySelector('.grid.grid-cols-4 .font-medium')?.textContent);
console.log('- データ行数:', document.querySelectorAll('.divide-y.divide-neutral-200.dark\\:divide-neutral-800 > div.grid.grid-cols-4').length);
```

### APIエンドポイントの確認方法

1. **ブラウザの開発者ツールを開く**
2. **Networkタブを選択**
3. **管理コンソールで何かアクションを実行**（ページ更新、メニュークリックなど）
4. **`sessions`を含むリクエストを探す**
5. **リクエストヘッダーとレスポンスを確認**

実際のAPIエンドポイントやヘッダー情報が異なる場合は、スクリプトを調整する必要があります。

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
