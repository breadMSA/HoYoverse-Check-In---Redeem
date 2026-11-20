// logs.js - 日誌和兌換碼顯示

document.addEventListener('DOMContentLoaded', function() {
  // 創建控制按鈕區域
  const header = document.createElement('div');
  header.className = 'header';
  document.body.insertBefore(header, document.body.firstChild);
  
  const title = document.createElement('div');
  title.className = 'title';
  title.textContent = 'HoYoverse Check-In & Redeem Logs';
  header.appendChild(title);
  
  const controls = document.createElement('div');
  controls.className = 'controls';
  header.appendChild(controls);
  
  // 添加按鈕
  const refreshBtn = document.createElement('button');
  refreshBtn.id = 'refresh-logs';
  refreshBtn.className = 'button';
  refreshBtn.textContent = 'Refresh';
  controls.appendChild(refreshBtn);
  
  const copyBtn = document.createElement('button');
  copyBtn.id = 'copy-logs';
  copyBtn.className = 'button';
  copyBtn.textContent = 'Copy Logs';
  controls.appendChild(copyBtn);
  
  const clearLogsBtn = document.createElement('button');
  clearLogsBtn.id = 'clear-logs';
  clearLogsBtn.className = 'button danger';
  clearLogsBtn.textContent = 'Clear Logs';
  controls.appendChild(clearLogsBtn);
  
  // 添加事件監聽器
  refreshBtn.addEventListener('click', loadLogs);
  copyBtn.addEventListener('click', copyLogs);
  clearLogsBtn.addEventListener('click', clearLogs);
  
  // 設置標籤頁切換
  document.querySelectorAll('.nav-tab').forEach(function(tab) {
    tab.addEventListener('click', function() {
      // 移除所有標籤頁的活動狀態
      document.querySelectorAll('.nav-tab').forEach(function(t) {
        t.classList.remove('active');
      });
      
      // 添加活動狀態到當前標籤頁
      this.classList.add('active');
      
      // 隱藏所有內容區域
      document.querySelectorAll('.tab-content').forEach(function(content) {
        content.classList.remove('active');
      });
      
      // 顯示選擇的內容區域
      const tabId = this.getAttribute('data-tab');
      document.getElementById(tabId).classList.add('active');
    });
  });
  
  // 設置遊戲過濾器
  const gameFilter = document.getElementById('game-filter');
  if (gameFilter) {
    gameFilter.addEventListener('change', function() {
      filterCodesByGame(this.value);
    });
  }
  
  // 清除代碼按鈕
  const clearCodesBtn = document.getElementById('clear-codes');
  if (clearCodesBtn) {
    clearCodesBtn.addEventListener('click', function() {
      if (confirm('確定要清除所有已兌換的代碼嗎？此操作不可逆！')) {
        clearRedeemedCodes();
      }
    });
  }
  
  // 清理系統忙代碼按鈕
  const cleanupBusyCodesBtn = document.getElementById('cleanup-busy-codes');
  if (cleanupBusyCodesBtn) {
    cleanupBusyCodesBtn.addEventListener('click', function() {
      cleanupSystemBusyCodes();
    });
  }
  
  // 轉換代碼按鈕
  const convertCodesBtn = document.getElementById('convert-codes');
  if (convertCodesBtn) {
    convertCodesBtn.addEventListener('click', function() {
      if (confirm('確定要將舊格式的代碼轉換為新格式嗎？將會自動創建備份。')) {
        convertUsedCodes();
      }
    });
  }
  
  // 加載日誌和已兌換代碼
  loadLogs();
  loadRedeemedCodes();
});

// Copy logs to clipboard
function copyLogs() {
  chrome.storage.local.get({debug_logs: []}, function(data) {
    const logs = data.debug_logs || [];
    
    if (logs.length === 0) {
      alert('No logs to copy');
      return;
    }
    
    const logText = logs.join('\n');
    
    // Copy to clipboard
    navigator.clipboard.writeText(logText).then(function() {
      // Show success message
      const copyButton = document.getElementById('copy-logs');
      const originalText = copyButton.textContent;
      copyButton.textContent = 'Copied!';
      
      setTimeout(function() {
        copyButton.textContent = originalText;
      }, 1500);
    }).catch(function(err) {
      console.error('Failed to copy logs: ', err);
      alert('Failed to copy logs: ' + err);
    });
  });
}

// Function to load logs from storage
function loadLogs() {
  const logsContainer = document.getElementById('logs-list');
  if (!logsContainer) {
    console.error('找不到logs-list元素');
    return;
  }
  
  logsContainer.innerHTML = '<div class="empty-logs">Loading logs...</div>';
  
  chrome.storage.local.get('debug_logs', function(data) {
    const logs = data.debug_logs || [];
    
    if (logs.length === 0) {
      logsContainer.innerHTML = '<div class="empty-logs">No logs found</div>';
      return;
    }
    
    logsContainer.innerHTML = '';
    
    // 顯示日誌，最新的在最上面
    logs.slice().reverse().forEach(function(log) {
      const logItem = document.createElement('div');
      logItem.className = 'log-item';
      
      // 解析時間戳和消息
      const parts = log.split(': ');
      const timestamp = parts[0];
      const message = parts.slice(1).join(': ');
      
      // 創建時間戳元素
      const timestampElem = document.createElement('span');
      timestampElem.className = 'log-timestamp';
      timestampElem.textContent = timestamp;
      
      // 創建消息元素
      const messageElem = document.createElement('span');
      messageElem.className = 'log-message';
      messageElem.textContent = message;
      
      // 添加時間戳和消息到日誌項
      logItem.appendChild(timestampElem);
      logItem.appendChild(messageElem);
      
      // 添加日誌項到容器
      logsContainer.appendChild(logItem);
    });
    
    // 自動滾動到頂部，因為最新的日誌在頂部
    logsContainer.scrollTop = 0;
  });
}

// Load redeemed codes from storage
function loadRedeemedCodes() {
  const codesContainer = document.getElementById('codes-list');
  if (!codesContainer) {
    console.error('找不到codes-list元素');
    return;
  }
  
  codesContainer.innerHTML = '<div class="empty-logs">Loading redeemed codes...</div>';
  
  chrome.storage.local.get('usedCodes', function(data) {
    // 確保codes是一個數組
    const codes = Array.isArray(data.usedCodes) ? data.usedCodes : [];
    
    // 如果usedCodes不是數組，初始化為空數組並保存
    if (!Array.isArray(data.usedCodes)) {
      chrome.storage.local.set({ usedCodes: [] });
      console.log('Initialized usedCodes as empty array');
    }
    
    if (codes.length === 0) {
      codesContainer.innerHTML = '<div class="empty-logs">No redeemed codes found</div>';
      return;
    }
    
    codesContainer.innerHTML = '';
    
    // 遊戲計數
    const gameCounts = {
      genshin: 0,
      starrail: 0,
      zzz: 0,
      honkai3rd: 0,
      unknown: 0
    };
    
    // 計算每個遊戲的代碼數量
    codes.forEach(codeItem => {
      const game = typeof codeItem === 'object' ? codeItem.game : 'unknown';
      if (gameCounts.hasOwnProperty(game)) {
        gameCounts[game]++;
      } else {
        gameCounts.unknown++;
      }
    });
    
    // 顯示總數和遊戲分佈
    const totalCount = document.createElement('div');
    totalCount.className = 'codes-count';
    totalCount.innerHTML = `Total redeemed codes: ${codes.length}<br>
      <span class="game-count genshin">Genshin: ${gameCounts.genshin}</span>
      <span class="game-count starrail">HSR: ${gameCounts.starrail}</span>
      <span class="game-count zzz">ZZZ: ${gameCounts.zzz}</span>
      <span class="game-count honkai3rd">HI3: ${gameCounts.honkai3rd}</span>
      ${gameCounts.unknown > 0 ? `<span class="game-count unknown">Unknown: ${gameCounts.unknown}</span>` : ''}
    `;
    codesContainer.appendChild(totalCount);
    
    // Process and display codes
    try {
      // 按遊戲和字母順序排序代碼
      const sortedCodes = [...codes].sort((a, b) => {
        const gameA = typeof a === 'object' ? a.game : 'unknown';
        const gameB = typeof b === 'object' ? b.game : 'unknown';
        
        // 首先按遊戲排序
        if (gameA !== gameB) {
          const gameOrder = { genshin: 1, starrail: 2, zzz: 3, honkai3rd: 4, unknown: 5 };
          return (gameOrder[gameA] || 999) - (gameOrder[gameB] || 999);
        }
        
        // 然後按代碼字母順序排序
        const codeA = typeof a === 'object' ? a.code : a;
        const codeB = typeof b === 'object' ? b.code : b;
        return codeA.localeCompare(codeB);
      });
      
      // 創建遊戲分組標題
      let currentGame = null;
      
      sortedCodes.forEach(codeItem => {
        // 從對象或字符串中獲取代碼值和遊戲信息
        const code = typeof codeItem === 'object' ? codeItem.code : codeItem;
        const game = typeof codeItem === 'object' ? codeItem.game : 'unknown';
        const status = typeof codeItem === 'object' ? codeItem.status : 'unknown';
        const timestamp = typeof codeItem === 'object' ? codeItem.timestamp : '';
        
        // 如果是新的遊戲分組，添加標題
        if (game !== currentGame) {
          currentGame = game;
          
          const gameHeader = document.createElement('div');
          gameHeader.className = 'game-header ' + game;
          
          let gameName = 'Unknown';
          switch(game) {
            case 'genshin':
              gameName = 'Genshin Impact';
              break;
            case 'starrail':
              gameName = 'Honkai: Star Rail';
              break;
            case 'zzz':
              gameName = 'Zenless Zone Zero';
              break;
            case 'honkai3rd':
              gameName = 'Honkai Impact 3rd';
              break;
          }
          
          gameHeader.textContent = gameName;
          codesContainer.appendChild(gameHeader);
        }
        
        // Create code item element
        const listItem = document.createElement('li');
        listItem.className = 'code-item';
        listItem.dataset.code = code;
        listItem.dataset.game = game;
        
        // Add code text
        const codeText = document.createElement('div');
        codeText.className = 'code-text';
        codeText.textContent = code;
        
        // Add game badge
        const gameBadge = document.createElement('span');
        gameBadge.className = 'game-badge';
        
        // 設置遊戲徽章的顏色和文本
        switch(game) {
          case 'genshin':
            gameBadge.textContent = 'Genshin';
            gameBadge.classList.add('genshin');
            break;
          case 'starrail':
            gameBadge.textContent = 'HSR';
            gameBadge.classList.add('starrail');
            break;
          case 'zzz':
            gameBadge.textContent = 'ZZZ';
            gameBadge.classList.add('zzz');
            break;
          case 'honkai3rd':
            gameBadge.textContent = 'HI3';
            gameBadge.classList.add('honkai3rd');
            break;
          default:
            gameBadge.textContent = '?';
            gameBadge.classList.add('unknown');
        }
        
        // Add status badge if available
        if (status) {
          const statusBadge = document.createElement('span');
          statusBadge.className = 'status-badge';
          
          switch(status) {
            case 'success':
              statusBadge.textContent = '✓';
              statusBadge.classList.add('success');
              break;
            case 'failed':
              statusBadge.textContent = '✗';
              statusBadge.classList.add('failed');
              break;
            case 'already_redeemed':
              statusBadge.textContent = '✓';
              statusBadge.classList.add('already');
              break;
            case 'expired':
              statusBadge.textContent = '⌛';
              statusBadge.classList.add('failed');
              statusBadge.title = 'Expired';
              break;
            case 'invalid':
              statusBadge.textContent = '✗';
              statusBadge.classList.add('failed');
              statusBadge.title = 'Invalid code';
              break;
            default:
              statusBadge.textContent = '?';
          }
          
          codeText.appendChild(statusBadge);
        }
        
        // 添加代碼和徽章到列表項
        listItem.appendChild(codeText);
        listItem.appendChild(gameBadge);
        
        // 添加時間戳提示
        if (timestamp) {
          listItem.title = `Redeemed: ${new Date(timestamp).toLocaleString()}`;
        }
        
        // Add to container
        codesContainer.appendChild(listItem);
      });
    } catch (error) {
      console.error('Error displaying codes:', error);
      codesContainer.innerHTML = '<div class="empty-logs">Error loading codes: ' + error.message + '</div>';
    }
  });
}

// Filter codes by game
function filterCodesByGame(game) {
  // 首先顯示所有遊戲標題和代碼
  document.querySelectorAll('.game-header, .code-item').forEach(item => {
    item.style.display = item.classList.contains('game-header') ? 'block' : 'flex';
  });
  
  if (game !== 'all') {
    // 隱藏不匹配的遊戲標題和代碼
    document.querySelectorAll('.game-header:not(.' + game + ')').forEach(header => {
      header.style.display = 'none';
    });
    
    document.querySelectorAll('.code-item').forEach(item => {
      if (item.dataset.game !== game) {
        item.style.display = 'none';
      }
    });
  }
  
  // 更新顯示的代碼數量
  updateFilteredCount(game);
}

// 更新過濾後的代碼數量
function updateFilteredCount(game) {
  const totalCountElement = document.querySelector('.codes-count');
  if (!totalCountElement) return;
  
  const allCodes = document.querySelectorAll('.code-item');
  const visibleCodes = Array.from(allCodes).filter(item => 
    window.getComputedStyle(item).display !== 'none'
  );
  
  // 獲取原始計數信息
  const originalHTML = totalCountElement.innerHTML.split('<br>')[0];
  
  if (game === 'all') {
    // 不需要更新，保留原始計數
  } else {
    // 更新為過濾後的計數
    let gameName = '';
    switch(game) {
      case 'genshin': gameName = 'Genshin Impact'; break;
      case 'starrail': gameName = 'Honkai: Star Rail'; break;
      case 'zzz': gameName = 'Zenless Zone Zero'; break;
      case 'honkai3rd': gameName = 'Honkai Impact 3rd'; break;
      default: gameName = game;
    }
    
    totalCountElement.innerHTML = `${originalHTML}<br>Showing ${visibleCodes.length} codes for ${gameName}`;
  }
}

// Clear all logs
function clearLogs() {
  if (confirm('Are you sure you want to clear all logs?')) {
    chrome.storage.local.set({debug_logs: []}, function() {
      loadLogs();
    });
  }
}

// Clear all redeemed codes
function clearRedeemedCodes() {
  if (confirm('Are you sure you want to clear all redeemed codes? This will allow the extension to try redeeming these codes again.')) {
    chrome.storage.local.set({usedCodes: []}, function() {
      loadRedeemedCodes();
      alert('All redeemed codes have been cleared successfully!');
    });
  }
}

// 轉換舊格式的usedCodes為新格式
function convertUsedCodes() {
  try {
    // 獲取當前的usedCodes
    chrome.storage.local.get('usedCodes', function(data) {
      const currentCodes = data.usedCodes || [];
      
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
          alert(`成功轉換了${convertedCount}個兌換碼！已創建備份。`);
          
          // 重新加載代碼列表
          loadRedeemedCodes();
        });
      });
    });
  } catch (error) {
    console.error('轉換usedCodes時出錯:', error);
    alert('轉換usedCodes失敗: ' + error.message);
  }
}

// Clean up system_busy codes
function cleanupSystemBusyCodes() {
  if (confirm('Are you sure you want to clean up all codes with "system_busy" status? This will allow the extension to try redeeming these codes again.')) {
    chrome.storage.local.get({usedCodes: []}, function(data) {
      // 確保codes是一個數組
      let codes = Array.isArray(data.usedCodes) ? data.usedCodes : [];
      
      // 過濾掉所有狀態為system_busy的代碼
      const originalLength = codes.length;
      codes = codes.filter(code => {
        return !(typeof code === 'object' && code.status === 'system_busy');
      });
      
      // 保存回存儲
      chrome.storage.local.set({usedCodes: codes}, function() {
        const removedCount = originalLength - codes.length;
        loadRedeemedCodes();
        alert(`${removedCount} codes with "system_busy" status have been cleaned up successfully!`);
      });
    });
  }
} 