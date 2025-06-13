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
