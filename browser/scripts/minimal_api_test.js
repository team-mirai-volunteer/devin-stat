/**
 * 最小限のAPIテストスクリプト - 401エラー調査用
 * Chrome DevToolsで実行してDevin APIの動作を確認
 * 
 * 使用方法:
 * 1. Devin管理コンソールにログイン
 * 2. Chrome DevToolsのConsoleで実行
 * 3. quickTest() で最も可能性の高い方法を試す
 * 4. 必要に応じて個別テスト関数を実行
 */

// 基本設定
const ORG_ID = 'AgnIPhGma3zfPVXZ';
const BASE_URL = 'https://api.devin.ai';

function getAuthTokens() {
    const tokens = {};
    
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.includes('auth') || key.includes('token') || key.includes('access'))) {
            try {
                const value = localStorage.getItem(key);
                tokens[key] = value;
            } catch (e) {
                console.log(`LocalStorage ${key} 読み取りエラー:`, e);
            }
        }
    }
    
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.includes('auth') || key.includes('token') || key.includes('access'))) {
            try {
                const value = sessionStorage.getItem(key);
                tokens[key] = value;
            } catch (e) {
                console.log(`SessionStorage ${key} 読み取りエラー:`, e);
            }
        }
    }
    
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    if (csrfMeta) {
        tokens['csrf-token'] = csrfMeta.getAttribute('content');
    }
    
    return tokens;
}

/**
 * 最速テスト: 最も可能性の高い方法を試す
 */
async function quickTest() {
    console.log('⚡ 最速テスト: 最も可能性の高い認証方法を試します');
    
    const tokens = getAuthTokens();
    console.log('🔍 発見された認証トークン:', Object.keys(tokens));
    
    const testCases = [
        {
            name: '基本的なsessionsエンドポイント',
            url: `${BASE_URL}/org_${ORG_ID}/sessions?creators=google-oauth2%7C112643481944466832095&created_date_from=2025-06-11T15:00:00.000Z&created_date_to=2099-12-31T14:59:59.999Z&is_archived=false`,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        },
        {
            name: 'billing/usage/sessionsエンドポイント',
            url: `${BASE_URL}/org_${ORG_ID}/billing/usage/sessions?page=1&page_size=20`,
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        }
    ];
    
    if (tokens['csrf-token']) {
        testCases.forEach(testCase => {
            testCase.headers['X-CSRF-Token'] = tokens['csrf-token'];
        });
    }
    
    for (const testCase of testCases) {
        console.log(`\n🧪 テスト: ${testCase.name}`);
        console.log(`📍 URL: ${testCase.url}`);
        console.log(`📋 ヘッダー:`, testCase.headers);
        
        try {
            const response = await fetch(testCase.url, {
                method: 'GET',
                credentials: 'include',
                headers: testCase.headers
            });
            
            console.log(`✅ ステータス: ${response.status} ${response.statusText}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log('🎉 成功! レスポンス構造:', Object.keys(data));
                console.log('📊 データサンプル:', JSON.stringify(data, null, 2).substring(0, 300) + '...');
                console.log('\n🔥 この設定が動作します! メインスクリプトで使用してください。');
                return { success: true, testCase, data };
            } else {
                const errorText = await response.text();
                console.log('❌ エラー詳細:', errorText.substring(0, 200));
            }
        } catch (error) {
            console.error('❌ リクエストエラー:', error.message);
        }
        
        console.log('─'.repeat(50));
    }
    
    console.log('\n❌ 全てのテストが失敗しました。詳細調査が必要です。');
    return { success: false };
}

/**
 * テスト1: 正しいエンドポイント(/sessions)をテスト
 */
async function testCorrectEndpoint() {
    console.log('🧪 テスト1: 正しい/sessionsエンドポイントをテスト');
    
    const url = `${BASE_URL}/org_${ORG_ID}/sessions?creators=google-oauth2%7C112643481944466832095&created_date_from=2025-06-11T15:00:00.000Z&created_date_to=2099-12-31T14:59:59.999Z&is_archived=false`;
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`✅ ステータス: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('📊 レスポンス構造:', Object.keys(data));
            console.log('📊 データサンプル:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
            return data;
        } else {
            const errorText = await response.text();
            console.log('❌ エラー詳細:', errorText);
        }
    } catch (error) {
        console.error('❌ リクエストエラー:', error);
    }
}

/**
 * テスト2: 古いエンドポイント(/billing/usage/sessions)をテスト
 */
async function testOldEndpoint() {
    console.log('🧪 テスト2: 古い/billing/usage/sessionsエンドポイントをテスト');
    
    const url = `${BASE_URL}/org_${ORG_ID}/billing/usage/sessions?page=1&page_size=20`;
    
    try {
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });
        
        console.log(`✅ ステータス: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('📊 レスポンス構造:', Object.keys(data));
            console.log('📊 データサンプル:', JSON.stringify(data, null, 2).substring(0, 500) + '...');
            return data;
        } else {
            const errorText = await response.text();
            console.log('❌ エラー詳細:', errorText);
        }
    } catch (error) {
        console.error('❌ リクエストエラー:', error);
    }
}

/**
 * テスト3: 認証情報を詳細確認
 */
function testAuthInfo() {
    console.log('🧪 テスト3: ブラウザの認証情報を詳細確認');
    
    // クッキーを確認
    console.log('🍪 クッキー:');
    const cookies = document.cookie.split(';');
    let foundAuthCookies = false;
    cookies.forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name && (name.toLowerCase().includes('auth') || name.toLowerCase().includes('token') || name.toLowerCase().includes('session') || name.toLowerCase().includes('access'))) {
            console.log(`  ${name}: ${value ? '設定済み (' + value.substring(0, 20) + '...)' : '未設定'}`);
            foundAuthCookies = true;
        }
    });
    if (!foundAuthCookies) {
        console.log('  認証関連のクッキーが見つかりません');
    }
    
    // ローカルストレージを詳細確認
    console.log('💾 LocalStorage:');
    const tokens = getAuthTokens();
    if (Object.keys(tokens).length === 0) {
        console.log('  認証関連のトークンが見つかりません');
    } else {
        Object.keys(tokens).forEach(key => {
            if (tokens[key]) {
                console.log(`  ${key}: 設定済み (${tokens[key].substring(0, 20)}...)`);
            }
        });
    }
    
    // セッションストレージを確認
    console.log('💾 SessionStorage:');
    let foundSessionAuth = false;
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && (key.toLowerCase().includes('auth') || key.toLowerCase().includes('token') || key.toLowerCase().includes('access'))) {
            const value = sessionStorage.getItem(key);
            console.log(`  ${key}: 設定済み (${value ? value.substring(0, 20) + '...' : 'empty'})`);
            foundSessionAuth = true;
        }
    }
    if (!foundSessionAuth) {
        console.log('  認証関連のセッションデータが見つかりません');
    }
    
    // メタタグを確認
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    console.log('🔒 CSRF Token:', csrfMeta ? `設定済み (${csrfMeta.getAttribute('content').substring(0, 20)}...)` : '未設定');
    
    console.log('🌐 現在のURL:', window.location.href);
    console.log('🌐 Origin:', window.location.origin);
    
    return tokens;
}

/**
 * テスト4: 簡単なページネーションテスト
 */
async function testPagination() {
    console.log('🧪 テスト4: ページネーションをテスト');
    
    // まず基本のリクエストを試す
    const baseUrl = `${BASE_URL}/org_${ORG_ID}/sessions`;
    const params = new URLSearchParams({
        'creators': 'google-oauth2|112643481944466832095',
        'created_date_from': '2025-06-11T15:00:00.000Z',
        'created_date_to': '2099-12-31T14:59:59.999Z',
        'is_archived': 'false'
    });
    
    try {
        const response = await fetch(`${baseUrl}?${params}`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json'
            }
        });
        
        console.log(`✅ ステータス: ${response.status} ${response.statusText}`);
        
        if (response.ok) {
            const data = await response.json();
            console.log('📊 レスポンス構造:', Object.keys(data));
            
            // ページネーション関連のフィールドを探す
            if (Array.isArray(data)) {
                console.log(`📄 配列形式: ${data.length}件のアイテム`);
            } else if (data.sessions) {
                console.log(`📄 sessions配列: ${data.sessions.length}件`);
                console.log('📄 その他のフィールド:', Object.keys(data).filter(k => k !== 'sessions'));
            } else {
                console.log('📄 データ構造:', Object.keys(data));
            }
            
            return data;
        } else {
            const errorText = await response.text();
            console.log('❌ エラー詳細:', errorText);
        }
    } catch (error) {
        console.error('❌ リクエストエラー:', error);
    }
}

/**
 * 高度な認証テスト: 様々な認証方法を試す
 */
async function testAdvancedAuth() {
    console.log('🧪 高度な認証テスト: 様々な認証方法を試します');
    
    const tokens = getAuthTokens();
    const url = `${BASE_URL}/org_${ORG_ID}/billing/usage/sessions?page=1&page_size=1`;
    
    const authMethods = [
        {
            name: '基本認証 (credentials: include)',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        }
    ];
    
    if (tokens['csrf-token']) {
        authMethods.push({
            name: 'CSRF Token in Header',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
                'X-CSRF-Token': tokens['csrf-token']
            },
            credentials: 'include'
        });
    }
    
    Object.keys(tokens).forEach(key => {
        if (key !== 'csrf-token' && tokens[key]) {
            authMethods.push({
                name: `Authorization Header (${key})`,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${tokens[key]}`
                },
                credentials: 'include'
            });
        }
    });
    
    for (const method of authMethods) {
        console.log(`\n🔐 テスト: ${method.name}`);
        
        try {
            const response = await fetch(url, {
                method: 'GET',
                headers: method.headers,
                credentials: method.credentials || 'include'
            });
            
            console.log(`✅ ステータス: ${response.status} ${response.statusText}`);
            
            if (response.ok) {
                const data = await response.json();
                console.log('🎉 成功! この認証方法が動作します!');
                console.log('📊 レスポンス:', JSON.stringify(data, null, 2).substring(0, 300) + '...');
                return { success: true, method, data };
            } else {
                const errorText = await response.text();
                console.log('❌ エラー:', errorText.substring(0, 100));
            }
        } catch (error) {
            console.error('❌ リクエストエラー:', error.message);
        }
    }
    
    return { success: false };
}

/**
 * 全テストを実行
 */
async function runAllTests() {
    console.log('🚀 全APIテストを開始します...\n');
    
    const tokens = testAuthInfo();
    console.log('\n' + '='.repeat(50) + '\n');
    
    const quickResult = await quickTest();
    if (quickResult.success) {
        console.log('\n🎉 quickTest()で解決策が見つかりました!');
        return quickResult;
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    await testCorrectEndpoint();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await testOldEndpoint();
    console.log('\n' + '='.repeat(50) + '\n');
    
    const advancedResult = await testAdvancedAuth();
    if (advancedResult.success) {
        console.log('\n🎉 高度な認証テストで解決策が見つかりました!');
        return advancedResult;
    }
    
    console.log('\n' + '='.repeat(50) + '\n');
    
    await testPagination();
    console.log('\n🎉 全テスト完了');
}

/**
 * UI要素からのデータ抽出テスト
 */
function testUIDataExtraction() {
    console.log('🧪 UI要素からのデータ抽出テスト');
    
    const extractedData = {
        sessions: [],
        metadata: {
            extraction_method: 'ui_scraping',
            timestamp: new Date().toISOString(),
            url: window.location.href
        }
    };
    
    const possibleSelectors = [
        'table tr',
        'tbody tr',
        '[role="row"]',
        
        'ul li',
        'ol li',
        '[role="listitem"]',
        
        '.card',
        '.session',
        '.item',
        
        '[data-session]',
        '[data-id]',
        '[data-session-id]',
        
        '.container',
        '.content',
        '.main'
    ];
    
    console.log('🔍 UI要素を検索中...');
    
    possibleSelectors.forEach(selector => {
        try {
            const elements = document.querySelectorAll(selector);
            if (elements.length > 0) {
                console.log(`📋 発見: ${selector} (${elements.length}個の要素)`);
                
                Array.from(elements).slice(0, 3).forEach((element, index) => {
                    const text = element.textContent?.trim().substring(0, 100);
                    if (text && text.length > 10) {
                        console.log(`  ${index + 1}: ${text}...`);
                    }
                });
            }
        } catch (error) {
            console.log(`❌ セレクター ${selector} でエラー:`, error.message);
        }
    });
    
    console.log('\n🔍 セッション関連のテキストを検索...');
    const sessionKeywords = ['session', 'セッション', 'acu', 'ACU', 'usage', '使用量', 'created', '作成'];
    
    sessionKeywords.forEach(keyword => {
        const xpath = `//*[contains(text(), '${keyword}')]`;
        try {
            const result = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
            if (result.snapshotLength > 0) {
                console.log(`📝 "${keyword}" を含む要素: ${result.snapshotLength}個`);
                
                for (let i = 0; i < Math.min(3, result.snapshotLength); i++) {
                    const element = result.snapshotItem(i);
                    const text = element.textContent?.trim().substring(0, 80);
                    console.log(`  ${i + 1}: ${text}...`);
                }
            }
        } catch (error) {
            console.log(`❌ XPath検索でエラー (${keyword}):`, error.message);
        }
    });
    
    console.log('\n🔍 JSON データを含むscriptタグを検索...');
    const scriptTags = document.querySelectorAll('script');
    let foundJsonData = false;
    
    scriptTags.forEach((script, index) => {
        const content = script.textContent || script.innerHTML;
        if (content && (content.includes('sessions') || content.includes('session_id') || content.includes('acu_used'))) {
            console.log(`📜 Script ${index + 1}: セッション関連データを発見`);
            console.log(`  内容: ${content.substring(0, 200)}...`);
            foundJsonData = true;
            
            try {
                const jsonMatch = content.match(/\{.*"sessions".*\}/s);
                if (jsonMatch) {
                    const jsonData = JSON.parse(jsonMatch[0]);
                    console.log('🎉 JSONデータの解析に成功!');
                    console.log('📊 データ構造:', Object.keys(jsonData));
                    extractedData.sessions = jsonData.sessions || jsonData;
                }
            } catch (error) {
                console.log('❌ JSON解析エラー:', error.message);
            }
        }
    });
    
    if (!foundJsonData) {
        console.log('📜 セッション関連のJSONデータは見つかりませんでした');
    }
    
    console.log('\n🔍 セッション情報パターンを検索...');
    const pageText = document.body.textContent || '';
    
    const sessionIdPattern = /[a-f0-9]{32}/g;
    const sessionIds = pageText.match(sessionIdPattern);
    if (sessionIds && sessionIds.length > 0) {
        console.log(`🆔 セッションIDらしき文字列: ${sessionIds.length}個発見`);
        sessionIds.slice(0, 5).forEach((id, index) => {
            console.log(`  ${index + 1}: ${id}`);
        });
    }
    
    const acuPattern = /\d+\.\d+.*acu/gi;
    const acuMatches = pageText.match(acuPattern);
    if (acuMatches && acuMatches.length > 0) {
        console.log(`💰 ACU使用量らしき文字列: ${acuMatches.length}個発見`);
        acuMatches.slice(0, 5).forEach((match, index) => {
            console.log(`  ${index + 1}: ${match}`);
        });
    }
    
    return extractedData;
}

/**
 * ネットワークリクエストを監視してAPIエンドポイントを特定
 */
function monitorNetworkRequests() {
    console.log('🌐 ネットワークリクエスト監視を開始...');
    console.log('📝 この後、管理コンソールで何かアクション（ページ更新、メニュークリックなど）を実行してください');
    
    const originalFetch = window.fetch;
    const originalXHROpen = XMLHttpRequest.prototype.open;
    
    window.fetch = function(...args) {
        const url = args[0];
        if (typeof url === 'string' && (url.includes('api.devin.ai') || url.includes('sessions'))) {
            console.log('🔍 Fetch API呼び出しを検出:');
            console.log(`  URL: ${url}`);
            console.log(`  オプション:`, args[1]);
        }
        return originalFetch.apply(this, args);
    };
    
    XMLHttpRequest.prototype.open = function(method, url, ...args) {
        if (typeof url === 'string' && (url.includes('api.devin.ai') || url.includes('sessions'))) {
            console.log('🔍 XMLHttpRequest呼び出しを検出:');
            console.log(`  Method: ${method}`);
            console.log(`  URL: ${url}`);
        }
        return originalXHROpen.apply(this, [method, url, ...args]);
    };
    
    console.log('✅ ネットワーク監視を設定しました');
    console.log('📝 監視を停止するには: stopNetworkMonitoring()');
    
    window.stopNetworkMonitoring = function() {
        window.fetch = originalFetch;
        XMLHttpRequest.prototype.open = originalXHROpen;
        console.log('🛑 ネットワーク監視を停止しました');
    };
}

/**
 * 包括的な調査: API + UI の両方をテスト
 */
async function comprehensiveTest() {
    console.log('🚀 包括的調査を開始: API + UI の両方をテスト');
    console.log('='.repeat(60));
    
    console.log('\n📋 ステップ1: 認証情報確認');
    const tokens = testAuthInfo();
    
    console.log('\n📋 ステップ2: API接続テスト');
    const apiResult = await quickTest();
    
    console.log('\n📋 ステップ3: UI データ抽出テスト');
    const uiData = testUIDataExtraction();
    
    console.log('\n📋 ステップ4: 結果まとめ');
    console.log('='.repeat(60));
    
    if (apiResult.success) {
        console.log('✅ API接続: 成功');
        console.log('🎯 推奨アプローチ: API呼び出し');
        console.log('📝 設定:', apiResult.testCase);
    } else {
        console.log('❌ API接続: 失敗');
    }
    
    if (uiData.sessions.length > 0) {
        console.log('✅ UI データ抽出: 成功');
        console.log(`📊 抽出されたセッション数: ${uiData.sessions.length}`);
    } else {
        console.log('❌ UI データ抽出: セッションデータが見つかりません');
    }
    
    console.log('\n📋 推奨事項:');
    if (apiResult.success) {
        console.log('🎯 API呼び出しが動作するため、メインスクリプトを更新してください');
        console.log('📝 working_solution_template.jsに設定を記録してください');
    } else if (uiData.sessions.length > 0) {
        console.log('🎯 UI データ抽出を使用してください');
        console.log('📝 UIスクレイピング機能をメインスクリプトに追加する必要があります');
    } else {
        console.log('🔍 さらなる調査が必要です:');
        console.log('  1. monitorNetworkRequests()でネットワーク監視を開始');
        console.log('  2. 管理コンソールでアクションを実行');
        console.log('  3. 実際のAPIエンドポイントを特定');
    }
    
    return {
        api: apiResult,
        ui: uiData,
        tokens: tokens
    };
}

// 使用方法を表示
console.log('✅ 最小限APIテストスクリプト (包括版) が読み込まれました');
console.log('📝 推奨使用方法:');
console.log('  comprehensiveTest() - API + UI の包括的テスト (推奨)');
console.log('  quickTest() - 最速でAPI認証方法を特定');
console.log('  testUIDataExtraction() - UI要素からデータ抽出をテスト');
console.log('  monitorNetworkRequests() - ネットワークリクエストを監視');
console.log('');
console.log('📝 個別テスト:');
console.log('  testAuthInfo() - 認証情報を確認');
console.log('  testCorrectEndpoint() - 正しいエンドポイントをテスト');
console.log('  testOldEndpoint() - 古いエンドポイントをテスト');
console.log('  testAdvancedAuth() - 高度な認証方法をテスト');
console.log('  testPagination() - ページネーションをテスト');
console.log('  runAllTests() - 全APIテストを実行');
