/**
 * DOM専用セッションデータ抽出スクリプト
 * Devin管理コンソールのUsage HistoryページからDOMを直接解析してセッションデータを収集
 */

class DOMSessionExtractor {
    constructor() {
        this.sessions = [];
        this.debugMode = true;
    }

    /**
     * メイン実行関数
     */
    async extractAllSessions() {
        console.log('🚀 DOM専用セッションデータ抽出を開始...');
        
        try {
            if (!this.isOnUsageHistoryPage()) {
                throw new Error('Usage Historyページに移動してください: https://app.devin.ai/settings/usage?tab=history');
            }

            const sessions = this.extractSessionsFromGrid();
            
            if (sessions.length === 0) {
                console.log('⚠️ セッションデータが見つかりません。ページが完全に読み込まれているか確認してください。');
                return this.fallbackExtraction();
            }

            console.log(`✅ ${sessions.length} 個のセッションを抽出しました`);
            
            const formattedData = this.formatSessionData(sessions);
            
            this.downloadAsJSON(formattedData);
            
            return formattedData;
            
        } catch (error) {
            console.error('❌ DOM抽出エラー:', error.message);
            throw error;
        }
    }

    /**
     * Usage Historyページにいるかチェック
     */
    isOnUsageHistoryPage() {
        const url = window.location.href;
        const hasUsageHistory = document.querySelector('h2')?.textContent?.includes('Usage History');
        const hasACUColumn = document.body.textContent.includes('ACUs Used');
        
        console.log('📍 現在のURL:', url);
        console.log('📋 Usage Historyヘッダー:', hasUsageHistory ? '✅' : '❌');
        console.log('📋 ACUs Usedカラム:', hasACUColumn ? '✅' : '❌');
        
        return hasUsageHistory && hasACUColumn;
    }

    /**
     * グリッドからセッションデータを抽出
     */
    extractSessionsFromGrid() {
        console.log('🔍 グリッドからセッションデータを抽出中...');
        
        const sessions = [];
        
        const gridSelectors = [
            '.divide-y.divide-neutral-200.dark\\:divide-neutral-800 > div.grid.grid-cols-4.gap-4.px-4.py-3.cursor-pointer',
            'div.grid.cursor-pointer.grid-cols-4.gap-4.px-4.py-3',
            '[class*="grid"][class*="cursor-pointer"][class*="grid-cols-4"]'
        ];

        for (const selector of gridSelectors) {
            try {
                const gridRows = document.querySelectorAll(selector);
                console.log(`🔍 セレクター "${selector}": ${gridRows.length} 行発見`);
                
                if (gridRows.length > 0) {
                    gridRows.forEach((row, index) => {
                        const sessionData = this.extractSessionFromGridRow(row, index);
                        if (sessionData) {
                            sessions.push(sessionData);
                        }
                    });
                    break; // 成功したら他のセレクターは試さない
                }
            } catch (error) {
                console.log(`❌ セレクター "${selector}" でエラー:`, error.message);
            }
        }

        return sessions;
    }

    /**
     * グリッド行からセッションデータを抽出
     */
    extractSessionFromGridRow(row, index) {
        try {
            const cells = row.querySelectorAll('div');
            
            if (cells.length < 3) {
                console.log(`⚠️ 行 ${index + 1}: セル数が不足 (${cells.length})`);
                return null;
            }

            const sessionCell = cells[0];
            const createdAtCell = cells[1];
            const acuCell = cells[2];

            const sessionData = {
                session_name: this.extractSessionName(sessionCell),
                session_id: this.extractSessionId(sessionCell, row),
                created_at: this.extractCreatedAt(createdAtCell),
                acu_used: this.extractACUUsed(acuCell),
                raw_index: index
            };

            if (this.debugMode) {
                console.log(`📊 行 ${index + 1}:`, {
                    name: sessionData.session_name?.substring(0, 30) + '...',
                    id: sessionData.session_id?.substring(0, 20) + '...',
                    date: sessionData.created_at,
                    acu: sessionData.acu_used
                });
            }

            return sessionData;

        } catch (error) {
            console.log(`❌ 行 ${index + 1} の解析エラー:`, error.message);
            return null;
        }
    }

    /**
     * セッション名を抽出
     */
    extractSessionName(cell) {
        const patterns = [
            () => cell.querySelector('span')?.textContent?.trim(),
            () => cell.querySelector('div')?.textContent?.trim(),
            () => cell.textContent?.trim(),
            () => cell.querySelector('[class*="font"]')?.textContent?.trim()
        ];

        for (const pattern of patterns) {
            try {
                const result = pattern();
                if (result && result.length > 0 && !result.includes('View session')) {
                    return result;
                }
            } catch (e) {
            }
        }

        return 'Unknown Session';
    }

    /**
     * セッションIDを抽出
     */
    extractSessionId(cell, row) {
        const dataAttributes = ['data-session-id', 'data-id', 'id'];
        
        for (const attr of dataAttributes) {
            const id = row.getAttribute(attr) || cell.getAttribute(attr);
            if (id) return id;
        }

        const links = cell.querySelectorAll('a[href*="/sessions/"]');
        for (const link of links) {
            const match = link.href.match(/\/sessions\/([a-f0-9-]+)/);
            if (match) return match[1];
        }

        const text = cell.textContent || '';
        const uuidMatch = text.match(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i);
        if (uuidMatch) return uuidMatch[0];

        return `generated-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * 作成日時を抽出
     */
    extractCreatedAt(cell) {
        const patterns = [
            () => cell.querySelector('time')?.getAttribute('datetime'),
            () => cell.querySelector('time')?.textContent?.trim(),
            () => cell.textContent?.trim()
        ];

        for (const pattern of patterns) {
            try {
                const result = pattern();
                if (result && result.length > 0) {
                    return this.normalizeDate(result);
                }
            } catch (e) {
            }
        }

        return new Date().toISOString();
    }

    /**
     * ACU使用量を抽出
     */
    extractACUUsed(cell) {
        const text = cell.textContent?.trim() || '';
        
        const patterns = [
            /(\d+\.?\d*)\s*ACU/i,
            /(\d+\.?\d*)/,
            /(\d+\.?\d*)\s*units?/i
        ];

        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match) {
                const value = parseFloat(match[1]);
                if (!isNaN(value)) return value;
            }
        }

        return 0;
    }

    /**
     * 日付を正規化
     */
    normalizeDate(dateStr) {
        try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return date.toISOString();
            }
        } catch (e) {
        }

        const relativeMatch = dateStr.match(/(\d+)\s*(minute|hour|day|week|month)s?\s*ago/i);
        if (relativeMatch) {
            const amount = parseInt(relativeMatch[1]);
            const unit = relativeMatch[2].toLowerCase();
            const now = new Date();
            
            switch (unit) {
                case 'minute': now.setMinutes(now.getMinutes() - amount); break;
                case 'hour': now.setHours(now.getHours() - amount); break;
                case 'day': now.setDate(now.getDate() - amount); break;
                case 'week': now.setDate(now.getDate() - (amount * 7)); break;
                case 'month': now.setMonth(now.getMonth() - amount); break;
            }
            
            return now.toISOString();
        }

        return new Date().toISOString();
    }

    /**
     * フォールバック抽出方法
     */
    fallbackExtraction() {
        console.log('🔄 フォールバック抽出を実行中...');
        
        const sessions = [];
        
        const allText = document.body.textContent;
        const sessionMatches = allText.match(/session[^.]*?(\d+\.?\d*)\s*ACU/gi);
        
        if (sessionMatches) {
            sessionMatches.forEach((match, index) => {
                const acuMatch = match.match(/(\d+\.?\d*)\s*ACU/i);
                sessions.push({
                    session_name: `Extracted Session ${index + 1}`,
                    session_id: `fallback-${index}`,
                    created_at: new Date().toISOString(),
                    acu_used: acuMatch ? parseFloat(acuMatch[1]) : 0,
                    extraction_method: 'fallback'
                });
            });
        }

        console.log(`🔄 フォールバック抽出で ${sessions.length} セッションを発見`);
        return sessions;
    }

    /**
     * セッションデータを整形
     */
    formatSessionData(sessions) {
        const total = sessions.length;
        const totalACU = sessions.reduce((sum, s) => sum + (s.acu_used || 0), 0);
        
        return {
            sessions: sessions,
            total: total,
            total_acu_used: totalACU,
            extraction_timestamp: new Date().toISOString(),
            extraction_method: 'dom',
            page_url: window.location.href
        };
    }

    /**
     * JSONファイルとしてダウンロード
     */
    downloadAsJSON(data) {
        const jsonStr = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `devin-sessions-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('📥 JSONファイルをダウンロードしました:', a.download);
    }
}

async function extractSessionsFromDOM() {
    const extractor = new DOMSessionExtractor();
    return await extractor.extractAllSessions();
}

async function extractSessionsDebug() {
    const extractor = new DOMSessionExtractor();
    extractor.debugMode = true;
    return await extractor.extractAllSessions();
}

async function startDOMExtraction() {
    console.log('🚀 DOM抽出を開始します...');
    console.log('📋 使用方法:');
    console.log('1. Devin管理コンソールのUsage Historyページに移動');
    console.log('2. ページが完全に読み込まれるまで待機');
    console.log('3. このスクリプトを実行');
    console.log('');
    
    try {
        const result = await extractSessionsFromDOM();
        console.log('✅ 抽出完了!');
        console.log(`📊 ${result.sessions.length} セッション、合計 ${result.total_acu_used} ACU`);
        return result;
    } catch (error) {
        console.error('❌ 抽出失敗:', error.message);
        console.log('');
        console.log('🔧 トラブルシューティング:');
        console.log('1. Usage Historyページ (https://app.devin.ai/settings/usage?tab=history) にいることを確認');
        console.log('2. ページが完全に読み込まれていることを確認');
        console.log('3. セッションデータが表示されていることを確認');
        console.log('4. extractSessionsDebug() でデバッグモードを試す');
        throw error;
    }
}

console.log('✅ DOM専用セッション抽出スクリプトが読み込まれました');
console.log('🚀 実行方法: startDOMExtraction()');
console.log('🔧 デバッグ: extractSessionsDebug()');
