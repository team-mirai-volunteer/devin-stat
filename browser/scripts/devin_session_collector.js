/**
 * Devin Session Data Collector
 * Chrome DevToolsで実行するDevinセッション統計収集スクリプト
 * 
 * 使用方法:
 * 1. Devin管理コンソールにログイン
 * 2. Chrome DevToolsのConsoleタブを開く
 * 3. このスクリプトをコピー&ペーストして実行
 */

class DevinSessionCollector {
    constructor(orgId = 'AgnIPhGma3zfPVXZ') {
        this.orgId = orgId;
        this.baseUrl = 'https://api.devin.ai';
        this.sessions = [];
        this.totalSessions = 0;
    }

    /**
     * 全セッションデータを収集
     */
    async collectAllSessions() {
        console.log('🚀 Devinセッションデータ収集を開始します...');
        
        try {
            const authToken = this.getAuthToken();
            if (authToken) {
                console.log('🔑 Auth0トークンを使用してAPI経由で収集を試行...');
                const apiSessions = await this.collectSessionsViaAPI();
                if (apiSessions && apiSessions.length > 0) {
                    console.log(`✅ API経由で ${apiSessions.length} セッションを収集`);
                    this.sessions = apiSessions;
                    return this.formatOutput();
                }
            }
        } catch (error) {
            console.log('❌ API収集に失敗:', error.message);
        }
        
        console.log('🔄 UI抽出にフォールバック...');
        try {
            const uiSessions = this.extractSessionDataFromUI();
            if (uiSessions && uiSessions.length > 0) {
                console.log(`✅ UI経由で ${uiSessions.length} セッションを収集`);
                this.sessions = uiSessions;
                return this.formatOutput();
            } else {
                throw new Error('UIからセッションデータが見つかりません');
            }
        } catch (error) {
            console.error('❌ UI抽出も失敗:', error.message);
            throw new Error('API・UI両方の収集方法が失敗しました');
        }
    }

    async collectSessionsViaAPI() {
        let page = 1;
        const pageSize = 20;
        let hasMore = true;
        const allSessions = [];

        while (hasMore) {
            console.log(`📄 ページ ${page} を取得中...`);
            
            const response = await this.fetchSessionPage(page, pageSize);
            
            if (response.sessions && response.sessions.length > 0) {
                allSessions.push(...response.sessions);
                this.totalSessions = response.total || allSessions.length;
                
                console.log(`✅ ${response.sessions.length}件のセッションを取得 (合計: ${allSessions.length}/${this.totalSessions})`);
                
                hasMore = allSessions.length < this.totalSessions;
                page++;
            } else {
                hasMore = false;
            }

            if (hasMore) {
                await this.sleep(500);
            }
        }

        console.log(`🎉 API収集完了: ${allSessions.length}件のセッション`);
        return allSessions;
    }

    /**
     * 指定ページのセッションデータを取得
     */
    async fetchSessionPage(page, pageSize) {
        const url = `${this.baseUrl}/org_${this.orgId}/billing/usage/sessions?page=${page}&page_size=${pageSize}`;
        
        const headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        };

        const csrfToken = this.getCSRFToken();
        if (csrfToken) {
            headers['X-CSRF-Token'] = csrfToken;
        }

        const authToken = this.getAuthToken();
        if (authToken) {
            headers['Authorization'] = `${authToken.token_type} ${authToken.access_token}`;
        }

        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: headers,
            mode: 'cors'
        });

        if (!response.ok) {
            let errorMessage = `API呼び出し失敗: ${response.status} ${response.statusText}`;
            try {
                const errorData = await response.text();
                if (errorData) {
                    errorMessage += ` - ${errorData}`;
                }
            } catch (e) {
            }
            throw new Error(errorMessage);
        }

        return await response.json();
    }

    /**
     * CSRFトークンを取得
     */
    getCSRFToken() {
        const csrfMeta = document.querySelector('meta[name="csrf-token"]');
        if (csrfMeta) {
            return csrfMeta.getAttribute('content');
        }

        const cookies = document.cookie.split(';');
        for (let cookie of cookies) {
            const [name, value] = cookie.trim().split('=');
            if (name === 'csrf_token' || name === '_csrf' || name === 'XSRF-TOKEN') {
                return decodeURIComponent(value);
            }
        }

        return null;
    }

    /**
     * 認証トークンを取得
     */
    getAuthToken() {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            if (key && key.includes('@@auth0spajs@@') && key.includes('backend.webapp.devin.ai')) {
                try {
                    const value = localStorage.getItem(key);
                    const authData = JSON.parse(value);
                    
                    if (authData && authData.body && authData.body.access_token) {
                        return {
                            access_token: authData.body.access_token,
                            token_type: authData.body.token_type || 'Bearer'
                        };
                    }
                } catch (error) {
                    console.log(`Auth0トークン解析エラー: ${error.message}`);
                }
            }
        }
        
        const authToken = localStorage.getItem('auth_token') || 
                         localStorage.getItem('access_token') ||
                         localStorage.getItem('jwt_token');
        
        if (authToken) {
            return { access_token: authToken, token_type: 'Bearer' };
        }

        const sessionToken = sessionStorage.getItem('auth_token') || 
                           sessionStorage.getItem('access_token') ||
                           sessionStorage.getItem('jwt_token');
        
        if (sessionToken) {
            return { access_token: sessionToken, token_type: 'Bearer' };
        }

        return null;
    }

    /**
     * 既存システムと互換性のあるJSON形式で出力
     */
    formatOutput() {
        const formattedData = {
            metadata: {
                last_updated: new Date().toISOString().replace('T', ' ').replace(/\.\d{3}Z$/, ' UTC'),
                total_records: this.sessions.length,
                description: "Devin usage history data collected via Chrome DevTools",
                format_version: "1.0",
                collection_method: "browser_api",
                org_id: this.orgId
            },
            data: this.sessions.map(session => ({
                session: session.session_name || 'Untitled',
                session_id: session.session_id,
                created_at: this.formatDate(session.created_at),
                acus_used: session.acu_used || 0,
                acu_used_since_last_reset: session.acu_used_since_last_reset || 0,
                max_acu_limit: session.max_acu_limit || 10
            }))
        };

        return formattedData;
    }

    /**
     * 日付を標準形式に変換
     */
    formatDate(dateStr) {
        if (!dateStr) return null;
        
        try {
            const date = new Date(dateStr);
            return date.toISOString().split('T')[0];
        } catch (error) {
            console.warn('日付解析エラー:', dateStr);
            return dateStr;
        }
    }

    /**
     * 指定ミリ秒待機
     */
    sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * データをJSONファイルとしてダウンロード
     */
    downloadAsJson(data, filename = 'devin_sessions.json') {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log(`💾 ${filename} としてダウンロードしました`);
    }

    /**
     * データをコンソールに表示
     */
    extractSessionDataFromUI() {
        console.log('🔍 UIからセッションデータを抽出中...');
        
        const sessions = [];
        
        const gridContainer = document.querySelector('.divide-y.divide-neutral-200.dark\\:divide-neutral-800');
        if (!gridContainer) {
            console.log('❌ Usage Historyグリッドコンテナが見つかりません');
            return sessions;
        }
        
        const gridRows = gridContainer.querySelectorAll('div.grid.grid-cols-4.gap-4.px-4.py-3');
        console.log(`🔍 Usage Historyグリッド行: ${gridRows.length} 個`);
        
        gridRows.forEach((row, index) => {
            if (row.classList.contains('cursor-pointer')) {
                const sessionData = this.extractSessionFromGridRow(row);
                if (sessionData) {
                    sessions.push(sessionData);
                    console.log(`✅ セッション ${index + 1}: ${sessionData.session_name}`);
                }
            }
        });
        
        if (sessions.length === 0) {
            console.log('🔍 フォールバック: 他のセレクターを試行中...');
            
            const fallbackSelectors = [
                '.grid.grid-cols-4.gap-4.px-4.py-3.cursor-pointer',
                '.grid.grid-cols-4[class*="hover:bg-"]',
                '.divide-y > div.grid.grid-cols-4'
            ];
            
            for (const selector of fallbackSelectors) {
                const elements = document.querySelectorAll(selector);
                console.log(`🔍 フォールバックセレクター "${selector}": ${elements.length} 個の要素`);
                
                elements.forEach((element, index) => {
                    const sessionData = this.extractSessionFromGridRow(element);
                    if (sessionData && !sessions.find(s => s.session_name === sessionData.session_name)) {
                        sessions.push(sessionData);
                        console.log(`✅ フォールバックセッション ${index + 1}: ${sessionData.session_name}`);
                    }
                });
                
                if (sessions.length > 0) break;
            }
        }
        
        const scripts = document.querySelectorAll('script');
        scripts.forEach(script => {
            if (script.textContent && script.textContent.includes('sessions')) {
                try {
                    const matches = script.textContent.match(/sessions["\']?\s*:\s*(\[.*?\])/);
                    if (matches) {
                        const sessionsData = JSON.parse(matches[1]);
                        sessions.push(...sessionsData.map(s => this.formatSessionData(s)));
                        console.log(`✅ スクリプトから ${sessionsData.length} セッションを抽出`);
                    }
                } catch (error) {
                }
            }
        });
        
        console.log(`📊 合計 ${sessions.length} セッションを抽出`);
        return sessions;
    }

    extractSessionFromGridRow(row) {
        const sessionData = {};
        
        const columns = row.children;
        if (columns.length < 3) {
            return null;
        }
        
        const sessionNameElement = columns[0];
        if (sessionNameElement) {
            const nameText = sessionNameElement.textContent.trim();
            if (nameText && nameText !== 'Session') {
                sessionData.session_name = nameText;
            }
        }
        
        const createdAtElement = columns[1];
        if (createdAtElement) {
            const dateText = createdAtElement.textContent.trim();
            if (dateText && dateText !== 'Created At') {
                sessionData.created_at = this.parseDate(dateText);
            }
        }
        
        const acuElement = columns[2];
        if (acuElement) {
            const acuText = acuElement.textContent.trim();
            if (acuText && acuText !== 'ACUs Used') {
                const acuMatch = acuText.match(/([\d.]+)/);
                if (acuMatch) {
                    sessionData.acu_used = parseFloat(acuMatch[1]);
                }
            }
        }
        
        const sessionIdMatch = row.innerHTML.match(/session[_-]?id["\']?\s*[:=]\s*["\']?([a-f0-9]{32})["\']?/i);
        if (sessionIdMatch) {
            sessionData.session_id = sessionIdMatch[1];
        }
        
        const linkElement = row.querySelector('a[href*="/sessions/"]');
        if (linkElement) {
            const href = linkElement.getAttribute('href');
            const sessionIdFromHref = href.match(/\/sessions\/([a-f0-9]{32})/);
            if (sessionIdFromHref) {
                sessionData.session_id = sessionIdFromHref[1];
            }
        }
        
        return sessionData.session_name ? sessionData : null;
    }

    parseDate(dateText) {
        try {
            const date = new Date(dateText);
            if (!isNaN(date.getTime())) {
                return date.toISOString();
            }
        } catch (error) {
        }
        
        const relativeMatch = dateText.match(/(\d+)\s*(minute|hour|day|week|month)s?\s*ago/i);
        if (relativeMatch) {
            const amount = parseInt(relativeMatch[1]);
            const unit = relativeMatch[2].toLowerCase();
            const now = new Date();
            
            switch (unit) {
                case 'minute':
                    now.setMinutes(now.getMinutes() - amount);
                    break;
                case 'hour':
                    now.setHours(now.getHours() - amount);
                    break;
                case 'day':
                    now.setDate(now.getDate() - amount);
                    break;
                case 'week':
                    now.setDate(now.getDate() - (amount * 7));
                    break;
                case 'month':
                    now.setMonth(now.getMonth() - amount);
                    break;
            }
            
            return now.toISOString();
        }
        
        return new Date().toISOString();
    }

    formatSessionData(sessionData) {
        return {
            session_name: sessionData.session_name || sessionData.name || 'Unknown Session',
            session_id: sessionData.session_id || sessionData.id,
            created_at: sessionData.created_at || sessionData.createdAt || new Date().toISOString(),
            acu_used: sessionData.acu_used || sessionData.acuUsed || sessionData.acus_used || 0
        };
    }

    displaySummary(data) {
        console.log('\n📊 収集データサマリー:');
        console.log(`総セッション数: ${data.data.length}`);
        console.log(`総ACU使用量: ${data.data.reduce((sum, s) => sum + s.acus_used, 0).toFixed(2)}`);
        console.log(`収集期間: ${data.metadata.last_updated}`);
        
        console.log('\n📋 最新セッション (上位5件):');
        data.data.slice(0, 5).forEach((session, index) => {
            console.log(`${index + 1}. ${session.session} (${session.created_at}) - ${session.acus_used} ACU`);
        });
    }
}

async function collectDevinSessions(orgId = 'AgnIPhGma3zfPVXZ', autoDownload = true) {
    const collector = new DevinSessionCollector(orgId);
    
    try {
        const data = await collector.collectAllSessions();
        
        collector.displaySummary(data);
        
        if (autoDownload) {
            const filename = `devin_sessions_${new Date().toISOString().split('T')[0]}.json`;
            collector.downloadAsJson(data, filename);
        }
        
        return data;
        
    } catch (error) {
        console.error('❌ セッション収集に失敗しました:', error);
        console.log('\n🔧 トラブルシューティング:');
        console.log('1. Devin管理コンソールにログインしていることを確認');
        console.log('2. 組織IDが正しいことを確認');
        console.log('3. ネットワーク接続を確認');
        console.log('4. ブラウザの開発者ツールのNetworkタブで実際のAPIリクエストを確認');
        console.log('5. 管理者権限があることを確認');
        
        console.log('\n🔍 デバッグ情報:');
        console.log(`組織ID: ${orgId}`);
        console.log(`現在のURL: ${window.location.href}`);
        console.log(`CSRFトークン: ${collector.getCSRFToken() ? '取得済み' : '未取得'}`);
        console.log(`認証トークン: ${collector.getAuthToken() ? '取得済み' : '未取得'}`);
        
        throw error;
    }
}

/**
 * ネットワークリクエストを監視してAPIエンドポイントを確認
 */
function debugNetworkRequests() {
    console.log('🔍 ネットワークリクエスト監視を開始します...');
    console.log('管理コンソールで何かアクションを実行してください（例：ページ更新、メニュークリック）');
    
    const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
            if (entry.name.includes('api.devin.ai') && entry.name.includes('sessions')) {
                console.log('📡 セッション関連APIリクエスト発見:');
                console.log(`URL: ${entry.name}`);
                console.log(`Duration: ${entry.duration}ms`);
                console.log(`Response Status: ${entry.responseStatus || 'N/A'}`);
            }
        }
    });
    
    observer.observe({ entryTypes: ['resource'] });
    
    setTimeout(() => {
        observer.disconnect();
        console.log('🔍 ネットワーク監視を停止しました');
    }, 10000);
}

function startCollection() {
    return collectDevinSessions();
}

console.log('✅ Devin Session Collector が読み込まれました');
console.log('📝 使用方法: startCollection() を実行してデータ収集を開始');
console.log('🔧 カスタム実行: collectDevinSessions("your_org_id", false) で組織IDを指定');
console.log('🔍 デバッグ: debugNetworkRequests() でAPIリクエストを監視');
