/**
 * DOM専用セッションデータ抽出スクリプト
 * Devin管理コンソールのUsage HistoryページからDOMを直接解析してセッションデータを収集
 * 複数ページ対応: 各ページでデータを累積し、最後に一括出力
 */

window.DevinSessionStorage = window.DevinSessionStorage || {
    sessions: [],
    pageCount: 0,
    totalACU: 0,
    startTime: new Date().toISOString(),
    duplicateIds: new Set()
};

class DOMSessionExtractor {
    constructor() {
        this.sessions = [];
        this.debugMode = true;
        this.storage = window.DevinSessionStorage;
    }

    /**
     * 現在のページからセッションデータを抽出して累積ストレージに追加
     */
    async extractCurrentPageSessions() {
        console.log('🚀 現在のページからセッションデータを抽出中...');
        
        try {
            if (!this.isOnUsageHistoryPage()) {
                throw new Error('Usage Historyページに移動してください: https://app.devin.ai/settings/usage?tab=history');
            }

            const sessions = this.extractSessionsFromGrid();
            
            if (sessions.length === 0) {
                console.log('⚠️ セッションデータが見つかりません。フォールバック抽出を試行中...');
                const fallbackSessions = this.fallbackExtraction();
                this.addSessionsToStorage(fallbackSessions);
                return fallbackSessions.length;
            }

            this.addSessionsToStorage(sessions);
            console.log(`✅ ${sessions.length} 個のセッションを累積ストレージに追加しました`);
            
            return sessions.length;
            
        } catch (error) {
            console.error('❌ DOM抽出エラー:', error.message);
            throw error;
        }
    }

    /**
     * セッションデータを累積ストレージに追加（重複チェック付き）
     */
    addSessionsToStorage(sessions) {
        let addedCount = 0;
        let duplicateCount = 0;
        
        for (const session of sessions) {
            // session_idによる重複チェック
            if (!this.storage.duplicateIds.has(session.session_id)) {
                this.storage.sessions.push({
                    ...session,
                    page_number: this.storage.pageCount + 1,
                    extraction_timestamp: new Date().toISOString()
                });
                this.storage.duplicateIds.add(session.session_id);
                this.storage.totalACU += (session.acu_used || 0);
                addedCount++;
            } else {
                duplicateCount++;
            }
        }
        
        this.storage.pageCount++;
        
        console.log(`📊 ページ ${this.storage.pageCount}: ${addedCount} 件追加, ${duplicateCount} 件重複スキップ`);
        console.log(`📈 累積: ${this.storage.sessions.length} セッション, ${this.storage.totalACU.toFixed(4)} ACU`);
    }

    /**
     * 累積データの状況を表示
     */
    showStorageStatus() {
        console.log('📊 累積データ状況:');
        console.log(`   セッション数: ${this.storage.sessions.length}`);
        console.log(`   処理ページ数: ${this.storage.pageCount}`);
        console.log(`   総ACU使用量: ${this.storage.totalACU.toFixed(4)}`);
        console.log(`   開始時刻: ${this.storage.startTime}`);
        console.log(`   最新更新: ${new Date().toISOString()}`);
        
        if (this.storage.sessions.length > 0) {
            const latestSession = this.storage.sessions[this.storage.sessions.length - 1];
            console.log(`   最新セッション: ${latestSession.session_name?.substring(0, 50)}...`);
        }
    }

    /**
     * 累積データをクリア
     */
    clearStorage() {
        this.storage.sessions = [];
        this.storage.pageCount = 0;
        this.storage.totalACU = 0;
        this.storage.startTime = new Date().toISOString();
        this.storage.duplicateIds.clear();
        console.log('🗑️ 累積データをクリアしました');
    }

    /**
     * 累積データを全てJSONでエクスポート
     */
    exportAllData() {
        if (this.storage.sessions.length === 0) {
            console.log('⚠️ エクスポートするデータがありません。先にページからデータを抽出してください。');
            return null;
        }
        
        const exportData = {
            sessions: this.storage.sessions,
            total: this.storage.sessions.length,
            total_acu_used: this.storage.totalACU,
            pages_processed: this.storage.pageCount,
            extraction_start: this.storage.startTime,
            extraction_end: new Date().toISOString(),
            extraction_method: 'dom-multi-page'
        };
        
        this.downloadAsJSON(exportData);
        
        console.log('📥 累積データをJSONファイルとしてダウンロードしました');
        console.log(`📊 最終結果: ${exportData.total} セッション, ${exportData.total_acu_used.toFixed(4)} ACU, ${exportData.pages_processed} ページ`);
        
        return exportData;
    }

    /**
     * Usage Historyページにいるかチェック
     */
    isOnUsageHistoryPage() {
        const url = window.location.href;
        
        const usageHistorySelectors = [
            'h1, h2, h3, h4, h5, h6',
            '[class*="heading"], [class*="title"], [class*="header"]',
            'div, span, p',
            '*'
        ];
        
        let hasUsageHistory = false;
        
        for (const selector of usageHistorySelectors) {
            try {
                const elements = document.querySelectorAll(selector);
                for (const element of elements) {
                    const text = element.textContent || '';
                    if (text.toLowerCase().includes('usage') && text.toLowerCase().includes('history')) {
                        hasUsageHistory = true;
                        console.log(`📋 Usage Historyヘッダー発見: "${text.trim()}" (${selector})`);
                        break;
                    }
                }
                if (hasUsageHistory) break;
            } catch (e) {
            }
        }
        
        if (!hasUsageHistory) {
            const urlCheck = url.includes('usage') || url.includes('history');
            const bodyText = document.body.textContent.toLowerCase();
            const contentCheck = bodyText.includes('usage') && (bodyText.includes('history') || bodyText.includes('session'));
            hasUsageHistory = urlCheck || contentCheck;
            
            if (hasUsageHistory) {
                console.log('📋 Usage History判定: URL/コンテンツベース ✅');
            }
        }
        
        const acuPatterns = [
            'ACUs Used', 'ACU Used', 'ACUs', 'ACU', 
            'Usage', 'Compute Units', 'Units Used'
        ];
        
        let hasACUColumn = false;
        const bodyText = document.body.textContent;
        
        for (const pattern of acuPatterns) {
            if (bodyText.includes(pattern)) {
                hasACUColumn = true;
                console.log(`📋 ACUカラム発見: "${pattern}"`);
                break;
            }
        }
        
        console.log('📍 現在のURL:', url);
        console.log('📋 Usage Historyヘッダー:', hasUsageHistory ? '✅' : '❌');
        console.log('📋 ACUs Usedカラム:', hasACUColumn ? '✅' : '❌');
        
        return hasUsageHistory || hasACUColumn;
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
            
            '[class*="grid"][class*="cursor-pointer"][class*="grid-cols-4"]',
            '[class*="grid"][class*="grid-cols-4"][class*="gap-4"]',
            'div[class*="grid-cols-4"]',
            
            'tbody tr, table tr',
            '[role="row"]',
            
            'div[class*="cursor-pointer"]',
            '[class*="hover:bg"]',
            
            'div[onclick], div[data-testid*="row"], div[data-testid*="session"]'
        ];

        for (const selector of gridSelectors) {
            try {
                const gridRows = document.querySelectorAll(selector);
                console.log(`🔍 セレクター "${selector}": ${gridRows.length} 行発見`);
                
                if (gridRows.length > 0) {
                    const validRows = Array.from(gridRows).filter(row => {
                        const text = row.textContent || '';
                        return text.length > 10 && (
                            text.includes('ACU') || 
                            text.match(/\d+\.?\d*/) || 
                            text.toLowerCase().includes('session') ||
                            text.includes('ago') ||
                            text.includes('2025') || text.includes('2024')
                        );
                    });
                    
                    console.log(`✅ 有効な行: ${validRows.length}/${gridRows.length}`);
                    
                    if (validRows.length > 0) {
                        validRows.forEach((row, index) => {
                            const sessionData = this.extractSessionFromGridRow(row, index);
                            if (sessionData) {
                                sessions.push(sessionData);
                            }
                        });
                        break; // 成功したら他のセレクターは試さない
                    }
                }
            } catch (error) {
                console.log(`❌ セレクター "${selector}" でエラー:`, error.message);
            }
        }

        if (sessions.length === 0) {
            console.log('🔍 デバッグ: ページ構造を調査中...');
            
            const gridElements = document.querySelectorAll('[class*="grid"]');
            console.log(`📊 grid要素: ${gridElements.length} 個`);
            
            const clickableElements = document.querySelectorAll('[class*="cursor-pointer"]');
            console.log(`👆 cursor-pointer要素: ${clickableElements.length} 個`);
            
            const acuElements = Array.from(document.querySelectorAll('*')).filter(el => 
                el.textContent && el.textContent.includes('ACU')
            );
            console.log(`💰 ACU要素: ${acuElements.length} 個`);
            
            if (acuElements.length > 0) {
                console.log('📋 ACU要素の例:', acuElements[0].textContent.substring(0, 100));
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
                    extraction_method: 'fallback-text'
                });
            });
        }
        
        const allElements = document.querySelectorAll('*');
        const acuElements = Array.from(allElements).filter(el => {
            const text = el.textContent || '';
            return text.match(/\d+\.?\d*\s*ACU/i) && text.length < 200; // 長すぎる要素は除外
        });
        
        console.log(`🔍 ACU要素発見: ${acuElements.length} 個`);
        
        acuElements.forEach((element, index) => {
            const text = element.textContent || '';
            const acuMatch = text.match(/(\d+\.?\d*)\s*ACU/i);
            
            if (acuMatch && !sessions.some(s => s.acu_used === parseFloat(acuMatch[1]))) {
                let sessionName = 'Unknown Session';
                let parent = element.parentElement;
                
                for (let i = 0; i < 5 && parent; i++) {
                    const parentText = parent.textContent || '';
                    const lines = parentText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                    
                    for (const line of lines) {
                        if (line.length > 5 && line.length < 100 && 
                            !line.includes('ACU') && 
                            !line.includes('ago') &&
                            !line.match(/^\d+$/)) {
                            sessionName = line;
                            break;
                        }
                    }
                    
                    if (sessionName !== 'Unknown Session') break;
                    parent = parent.parentElement;
                }
                
                sessions.push({
                    session_name: sessionName,
                    session_id: `fallback-element-${index}`,
                    created_at: new Date().toISOString(),
                    acu_used: parseFloat(acuMatch[1]),
                    extraction_method: 'fallback-element'
                });
            }
        });
        
        const dateElements = Array.from(allElements).filter(el => {
            const text = el.textContent || '';
            return text.match(/\d+\s*(minute|hour|day|week|month)s?\s*ago/i) ||
                   text.match(/202[4-5]-\d{2}-\d{2}/) ||
                   text.includes('ago');
        });
        
        console.log(`📅 日付要素発見: ${dateElements.length} 個`);
        
        const uniqueSessions = sessions.filter((session, index, self) => 
            index === self.findIndex(s => s.acu_used === session.acu_used)
        );

        console.log(`🔄 フォールバック抽出で ${uniqueSessions.length} セッションを発見`);
        return uniqueSessions;
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


/**
 * 現在のページからデータを抽出して累積ストレージに追加
 */
async function addCurrentPage() {
    const extractor = new DOMSessionExtractor();
    try {
        const count = await extractor.extractCurrentPageSessions();
        extractor.showStorageStatus();
        return count;
    } catch (error) {
        console.error('❌ ページ抽出失敗:', error.message);
        throw error;
    }
}

/**
 * 累積データの状況を表示
 */
function showStatus() {
    const extractor = new DOMSessionExtractor();
    extractor.showStorageStatus();
}

/**
 * 累積データを全てJSONでエクスポート
 */
function exportAll() {
    const extractor = new DOMSessionExtractor();
    return extractor.exportAllData();
}

/**
 * 累積データをクリア
 */
function clearAll() {
    const extractor = new DOMSessionExtractor();
    extractor.clearStorage();
}

async function extractSessionsFromDOM() {
    console.log('⚠️ 注意: この関数は単一ページ用です。複数ページ対応には addCurrentPage() を使用してください。');
    const extractor = new DOMSessionExtractor();
    const sessions = extractor.extractSessionsFromGrid();
    if (sessions.length === 0) {
        return extractor.fallbackExtraction();
    }
    const formattedData = extractor.formatSessionData(sessions);
    extractor.downloadAsJSON(formattedData);
    return formattedData;
}

async function extractSessionsDebug() {
    console.log('⚠️ 注意: この関数は単一ページ用です。複数ページ対応には addCurrentPage() を使用してください。');
    const extractor = new DOMSessionExtractor();
    extractor.debugMode = true;
    const sessions = extractor.extractSessionsFromGrid();
    if (sessions.length === 0) {
        return extractor.fallbackExtraction();
    }
    const formattedData = extractor.formatSessionData(sessions);
    extractor.downloadAsJSON(formattedData);
    return formattedData;
}

async function startDOMExtraction() {
    console.log('🚀 DOM抽出（複数ページ対応）を開始します...');
    console.log('');
    console.log('📋 複数ページ対応の使用方法:');
    console.log('1. Devin管理コンソールのUsage Historyページに移動');
    console.log('2. ページが完全に読み込まれるまで待機');
    console.log('3. addCurrentPage() を実行してデータを累積');
    console.log('4. 次のページに移動して再度 addCurrentPage() を実行');
    console.log('5. 全ページ処理後、exportAll() で全データをダウンロード');
    console.log('');
    console.log('📋 利用可能なコマンド:');
    console.log('   addCurrentPage()  - 現在のページのデータを累積に追加');
    console.log('   showStatus()      - 累積データの状況を表示');
    console.log('   exportAll()       - 累積データを全てJSONでダウンロード');
    console.log('   clearAll()        - 累積データをクリア');
    console.log('');
    
    try {
        console.log('🔄 最初のページを自動処理中...');
        const count = await addCurrentPage();
        console.log('✅ 初期ページ処理完了!');
        console.log('');
        console.log('📝 次の手順:');
        console.log('1. 次のページに移動');
        console.log('2. addCurrentPage() を実行');
        console.log('3. 全ページ完了後、exportAll() を実行');
        return count;
    } catch (error) {
        console.error('❌ 初期ページ処理失敗:', error.message);
        console.log('');
        console.log('🔧 トラブルシューティング:');
        console.log('1. Usage Historyページ (https://app.devin.ai/settings/usage?tab=history) にいることを確認');
        console.log('2. ページが完全に読み込まれていることを確認');
        console.log('3. セッションデータが表示されていることを確認');
        console.log('4. clearAll() でデータをクリアしてやり直し');
        throw error;
    }
}

console.log('✅ DOM専用セッション抽出スクリプト（複数ページ対応）が読み込まれました');
console.log('🚀 実行方法: startDOMExtraction()');
console.log('📋 複数ページ対応コマンド: addCurrentPage(), showStatus(), exportAll(), clearAll()');
