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
            let page = 1;
            const pageSize = 20;
            let hasMore = true;

            while (hasMore) {
                console.log(`📄 ページ ${page} を取得中...`);
                
                const response = await this.fetchSessionPage(page, pageSize);
                
                if (response.sessions && response.sessions.length > 0) {
                    this.sessions.push(...response.sessions);
                    this.totalSessions = response.total || this.sessions.length;
                    
                    console.log(`✅ ${response.sessions.length}件のセッションを取得 (合計: ${this.sessions.length}/${this.totalSessions})`);
                    
                    hasMore = this.sessions.length < this.totalSessions;
                    page++;
                } else {
                    hasMore = false;
                }

                if (hasMore) {
                    await this.sleep(500);
                }
            }

            console.log(`🎉 収集完了: ${this.sessions.length}件のセッション`);
            return this.formatOutput();

        } catch (error) {
            console.error('❌ データ収集エラー:', error);
            throw error;
        }
    }

    /**
     * 指定ページのセッションデータを取得
     */
    async fetchSessionPage(page, pageSize) {
        const url = `${this.baseUrl}/org_${this.orgId}/billing/usage/sessions?page=${page}&page_size=${pageSize}`;
        
        const response = await fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`API呼び出し失敗: ${response.status} ${response.statusText}`);
        }

        return await response.json();
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
        throw error;
    }
}

function startCollection() {
    return collectDevinSessions();
}

console.log('✅ Devin Session Collector が読み込まれました');
console.log('📝 使用方法: startCollection() を実行してデータ収集を開始');
console.log('🔧 カスタム実行: collectDevinSessions("your_org_id", false) で組織IDを指定');
