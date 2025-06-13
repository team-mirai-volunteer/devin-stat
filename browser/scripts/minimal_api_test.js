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

// 使用方法を表示
console.log('✅ 最小限APIテストスクリプト (強化版) が読み込まれました');
console.log('📝 推奨使用方法:');
console.log('  quickTest() - 最速で動作する方法を特定 (推奨)');
console.log('  runAllTests() - 全テストを実行');
console.log('');
console.log('📝 個別テスト:');
console.log('  testAuthInfo() - 認証情報を確認');
console.log('  testCorrectEndpoint() - 正しいエンドポイントをテスト');
console.log('  testOldEndpoint() - 古いエンドポイントをテスト');
console.log('  testAdvancedAuth() - 高度な認証方法をテスト');
console.log('  testPagination() - ページネーションをテスト');
