// 重置usedCodes的腳本
async function resetUsedCodes() {
    try {
        // 獲取當前的usedCodes
        chrome.storage.local.get('usedCodes', function(result) {
            const currentCodes = result.usedCodes || [];
            
            // 備份當前的usedCodes
            chrome.storage.local.set({ usedCodes_backup: currentCodes }, function() {
                console.log('已備份當前的usedCodes');
                
                // 重置usedCodes為空數組
                chrome.storage.local.set({ usedCodes: [] }, function() {
                    console.log('usedCodes已重置為空數組');
                    alert('usedCodes已成功重置！已創建備份，可以使用restoreUsedCodes()恢復。');
                });
            });
        });
    } catch (error) {
        console.error('重置usedCodes時出錯:', error);
        alert('重置usedCodes失敗: ' + error.message);
    }
}

// 恢復usedCodes的腳本
async function restoreUsedCodes() {
    try {
        // 獲取備份的usedCodes
        chrome.storage.local.get('usedCodes_backup', function(result) {
            const backupCodes = result.usedCodes_backup || [];
            
            if (backupCodes.length === 0) {
                alert('沒有找到usedCodes的備份');
                return;
            }
            
            // 恢復usedCodes
            chrome.storage.local.set({ usedCodes: backupCodes }, function() {
                console.log('已從備份恢復usedCodes');
                alert(`已成功恢復${backupCodes.length}個兌換碼！`);
            });
        });
    } catch (error) {
        console.error('恢復usedCodes時出錯:', error);
        alert('恢復usedCodes失敗: ' + error.message);
    }
}

// 轉換舊格式的usedCodes為新格式
async function convertUsedCodes() {
    try {
        // 獲取當前的usedCodes
        chrome.storage.local.get('usedCodes', function(result) {
            const currentCodes = result.usedCodes || [];
            
            if (currentCodes.length === 0) {
                alert('usedCodes為空，沒有需要轉換的數據');
                return;
            }
            
            // 檢查是否需要轉換
            const needsConversion = currentCodes.some(c => typeof c === 'string');
            
            if (!needsConversion) {
                alert('所有兌換碼已經是新格式，不需要轉換');
                return;
            }
            
            // 備份當前的usedCodes
            chrome.storage.local.set({ usedCodes_backup: currentCodes }, function() {
                console.log('已備份當前的usedCodes');
                
                // 轉換格式
                const convertedCodes = currentCodes.map(c => {
                    if (typeof c === 'string') {
                        // 檢測代碼屬於哪個遊戲
                        let game = 'unknown';
                        if (c === 'GENSHINGIFT' || c.startsWith('GS') || c.includes('GENSHIN')) {
                            game = 'genshin';
                        } else if (c === 'STARRAILGIFT' || c.includes('STARRAIL') || c === 'HYACINEHEALS' || c === 'CIPHERLOOT') {
                            game = 'starrail';
                        } else if (c === 'ZENLESSGIFT' || c.includes('ZZZ')) {
                            game = 'zzz';
                        }
                        
                        return {
                            code: c,
                            game: game,
                            timestamp: new Date().toISOString(),
                            status: 'converted'
                        };
                    }
                    return c;
                });
                
                // 保存轉換後的usedCodes
                chrome.storage.local.set({ usedCodes: convertedCodes }, function() {
                    console.log('已將usedCodes轉換為新格式');
                    
                    const convertedCount = convertedCodes.filter(c => typeof c === 'object' && c.status === 'converted').length;
                    alert(`成功轉換了${convertedCount}個兌換碼！已創建備份，可以使用restoreUsedCodes()恢復。`);
                });
            });
        });
    } catch (error) {
        console.error('轉換usedCodes時出錯:', error);
        alert('轉換usedCodes失敗: ' + error.message);
    }
}

// 顯示所有usedCodes的詳細信息
async function showUsedCodes() {
    try {
        // 獲取當前的usedCodes
        chrome.storage.local.get('usedCodes', function(result) {
            const codes = result.usedCodes || [];
            
            if (codes.length === 0) {
                console.log('usedCodes為空');
                return;
            }
            
            // 按遊戲分組
            const gameGroups = {
                genshin: [],
                starrail: [],
                zzz: [],
                honkai3rd: [],
                unknown: []
            };
            
            codes.forEach(c => {
                const game = typeof c === 'object' ? c.game : 'unknown';
                const code = typeof c === 'object' ? c.code : c;
                
                if (gameGroups[game]) {
                    gameGroups[game].push(code);
                } else {
                    gameGroups.unknown.push(code);
                }
            });
            
            // 輸出分組信息
            console.log(`總共有 ${codes.length} 個兌換碼：`);
            console.log(`- 原神: ${gameGroups.genshin.length}`);
            console.log(`- 崩壞：星穹鐵道: ${gameGroups.starrail.length}`);
            console.log(`- 絕區零: ${gameGroups.zzz.length}`);
            console.log(`- 崩壞3rd: ${gameGroups.honkai3rd.length}`);
            console.log(`- 未知: ${gameGroups.unknown.length}`);
            
            // 輸出詳細代碼
            console.log('\n詳細代碼列表:');
            Object.keys(gameGroups).forEach(game => {
                if (gameGroups[game].length > 0) {
                    console.log(`\n${game}:`);
                    gameGroups[game].forEach(code => {
                        console.log(`- ${code}`);
                    });
                }
            });
        });
    } catch (error) {
        console.error('顯示usedCodes時出錯:', error);
    }
}

// 導出函數
window.resetUsedCodes = resetUsedCodes;
window.restoreUsedCodes = restoreUsedCodes;
window.convertUsedCodes = convertUsedCodes;
window.showUsedCodes = showUsedCodes;

console.log('可用的函數：');
console.log('1. resetUsedCodes() - 重置所有已使用的兌換碼');
console.log('2. restoreUsedCodes() - 從備份恢復已使用的兌換碼');
console.log('3. convertUsedCodes() - 將舊格式的兌換碼轉換為新格式');
console.log('4. showUsedCodes() - 顯示所有已使用的兌換碼詳細信息');
