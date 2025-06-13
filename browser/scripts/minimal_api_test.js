/**
 * 最小限のAPIテストスクリプト
 * Chrome DevToolsで実行してDevin APIの動作を確認
 * 
 * 使用方法:
 * 1. Devin管理コンソールにログイン
 * 2. Chrome DevToolsのConsoleで実行
 * 3. 各テスト関数を個別に実行して結果を確認
 */

// 基本設定
const ORG_ID = 'AgnIPhGma3zfPVXZ';
const BASE_URL = 'https://api.devin.ai';

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
 * テスト3: 認証情報を確認
 */
function testAuthInfo() {
    console.log('🧪 テスト3: ブラウザの認証情報を確認');
    
    // クッキーを確認
    console.log('🍪 クッキー:');
    document.cookie.split(';').forEach(cookie => {
        const [name, value] = cookie.trim().split('=');
        if (name.toLowerCase().includes('auth') || name.toLowerCase().includes('token') || name.toLowerCase().includes('session')) {
            console.log(`  ${name}: ${value ? '設定済み' : '未設定'}`);
        }
    });
    
    // ローカルストレージを確認
    console.log('💾 LocalStorage:');
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key.toLowerCase().includes('auth') || key.toLowerCase().includes('token')) {
            console.log(`  ${key}: 設定済み`);
        }
    }
    
    // セッションストレージを確認
    console.log('💾 SessionStorage:');
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key.toLowerCase().includes('auth') || key.toLowerCase().includes('token')) {
            console.log(`  ${key}: 設定済み`);
        }
    }
    
    // メタタグを確認
    const csrfMeta = document.querySelector('meta[name="csrf-token"]');
    console.log('🔒 CSRF Token:', csrfMeta ? '設定済み' : '未設定');
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
 * 全テストを実行
 */
async function runAllTests() {
    console.log('🚀 全APIテストを開始します...\n');
    
    testAuthInfo();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await testCorrectEndpoint();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await testOldEndpoint();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await testPagination();
    console.log('\n🎉 全テスト完了');
}

// 使用方法を表示
console.log('✅ 最小限APIテストスクリプトが読み込まれました');
console.log('📝 使用方法:');
console.log('  runAllTests() - 全テストを実行');
console.log('  testCorrectEndpoint() - 正しいエンドポイントをテスト');
console.log('  testOldEndpoint() - 古いエンドポイントをテスト');
console.log('  testAuthInfo() - 認証情報を確認');
console.log('  testPagination() - ページネーションをテスト');
