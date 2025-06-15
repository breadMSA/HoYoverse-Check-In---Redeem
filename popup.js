document.addEventListener('DOMContentLoaded', function() {
  // 設置語言切換
  setupLanguageSwitcher();
  
  // Load saved settings and update UI
  loadSavedSettings();
  loadDefaultUIDs();
  updateStatus();
  checkAuthStatus();
  setupGameToggles(); // 添加遊戲切換事件監聽
  
  // Setup game selection with proper localization
  setupGameSelection();
  
  // Auth button events
  const saveCredentialsBtn = document.getElementById('save-credentials');
  const changeCredentials = document.getElementById('change-credentials');
  
  if (saveCredentialsBtn) {
    saveCredentialsBtn.addEventListener('click', saveCredentials);
  }
  
  if (changeCredentials) {
    changeCredentials.addEventListener('click', showCredentialsForm);
  }
  
  // Save UIDs button
  const saveUIDsButton = document.getElementById('save-uids');
  if (saveUIDsButton) {
    saveUIDsButton.addEventListener('click', saveUIDs);
  }
  
  // Check-in Now button
  const checkNowButton = document.getElementById('check-now');
  if (checkNowButton) {
    checkNowButton.addEventListener('click', checkInNow);
  }
  
  // Check Codes Now button
  const checkCodesButton = document.getElementById('check-codes-now');
  if (checkCodesButton) {
    checkCodesButton.addEventListener('click', checkCodesNow);
  }
  
  // Open Logs button
  const openLogsButton = document.getElementById('open-logs');
  if (openLogsButton) {
    openLogsButton.addEventListener('click', openLogs);
  }
  
  // Redeem Code button
  const redeemButton = document.getElementById('redeem-button');
  if (redeemButton) {
    redeemButton.addEventListener('click', redeemCode);
  }
  
  // Info icon
  const infoIcon = document.querySelector('.info-icon');
  const infoPopup = document.querySelector('.info-popup');
  const infoClose = document.querySelector('.info-close');
  
  if (infoIcon && infoPopup) {
    infoIcon.addEventListener('click', function() {
      infoPopup.classList.remove('hidden');
    });
  }
  
  if (infoClose && infoPopup) {
    infoClose.addEventListener('click', function() {
      infoPopup.classList.add('hidden');
    });
  }
  
  // Language switching
  const langButtons = document.querySelectorAll('.lang-btn');
  for (const btn of langButtons) {
    btn.addEventListener('click', function() {
      const lang = this.classList.contains('lang-en') ? 'en' : 'zh';
      switchLanguage(lang);
      // Save language preference
      chrome.storage.local.set({language: lang});
      
      // Update active class
      document.querySelectorAll('.lang-btn').forEach(b => b.classList.remove('active'));
      this.classList.add('active');
    });
  }
  
  // Poll for updates every 30 seconds
  setInterval(updateStatus, 30000);
});

// Update game select options based on current language
function updateGameSelectLocalization() {
  const gameSelect = document.getElementById('game-select');
  const options = gameSelect.options;
  const isZhLang = document.body.classList.contains('lang-zh');
  
  for (let i = 0; i < options.length; i++) {
    const option = options[i];
    if (isZhLang && option.dataset.zh) {
      option.textContent = option.dataset.zh;
    } else if (option.dataset.en) {
      option.textContent = option.dataset.en;
    }
  }
}

// Load game UID for the selected game
function loadGameUID(gameType) {
  const uidInput = document.getElementById('uid-input');
  if (!uidInput) return;
  
  chrome.storage.local.get({
    genshin_uid: '',
    starrail_uid: '',
    zzz_uid: '',
    honkai3rd_uid: ''
  }, function(items) {
    switch (gameType) {
      case 'genshin':
        uidInput.value = items.genshin_uid || '';
        break;
      case 'starrail':
        uidInput.value = items.starrail_uid || '';
        break;
      case 'zzz':
        uidInput.value = items.zzz_uid || '';
        break;
      case 'honkai3rd':
        uidInput.value = items.honkai3rd_uid || '';
        break;
    }
  });
}

// Load all default UIDs from storage
function loadDefaultUIDs() {
  chrome.storage.local.get({
    genshin_uid: '',
    starrail_uid: '',
    zzz_uid: '',
    honkai3rd_uid: ''
  }, function(items) {
    // 填充UID到各輸入框
    const genshinUidInput = document.getElementById('genshin-uid');
    const starrailUidInput = document.getElementById('starrail-uid');
    const zzzUidInput = document.getElementById('zzz-uid');
    
    if (genshinUidInput) genshinUidInput.value = items.genshin_uid || '';
    if (starrailUidInput) starrailUidInput.value = items.starrail_uid || '';
    if (zzzUidInput) zzzUidInput.value = items.zzz_uid || '';
  });
}

// Language switching functionality
function setupLanguageSwitcher() {
  const languageSwitcher = document.querySelector('.language-switcher');
  const enBtn = document.querySelector('.lang-btn.lang-en');
  const zhBtn = document.querySelector('.lang-btn.lang-zh');
  
  // Check if language preference is saved
  chrome.storage.local.get('language', function(result) {
    if (result.language === 'zh') {
      switchLanguage('zh');
      // Update active class for buttons
      if (enBtn && zhBtn) {
        enBtn.classList.remove('active');
        zhBtn.classList.add('active');
      }
    }
  });
  
  // Set up click handlers for language buttons
  if (enBtn) {
    enBtn.addEventListener('click', function() {
      switchLanguage('en');
      chrome.storage.local.set({language: 'en'});
      enBtn.classList.add('active');
      if (zhBtn) zhBtn.classList.remove('active');
    });
  }
  
  if (zhBtn) {
    zhBtn.addEventListener('click', function() {
      switchLanguage('zh');
      chrome.storage.local.set({language: 'zh'});
      zhBtn.classList.add('active');
      if (enBtn) enBtn.classList.remove('active');
    });
  }
}

function switchLanguage(lang) {
  const body = document.body;
  
  if (lang === 'zh') {
    body.classList.remove('lang-en');
    body.classList.add('lang-zh');
    
    // Show Chinese text, hide English text
    document.querySelectorAll('.lang-en-text').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.lang-zh-text').forEach(el => el.classList.remove('hidden'));
    
    // Update game select options to Chinese
    updateGameSelectLocalization();
    
    // Copy email for Chinese display
    const emailEl = document.getElementById('logged-email');
    if (emailEl) {
      document.getElementById('logged-email-zh').textContent = emailEl.textContent;
    }
  } else {
    body.classList.remove('lang-zh');
    body.classList.add('lang-en');
    
    // Show English text, hide Chinese text
    document.querySelectorAll('.lang-zh-text').forEach(el => el.classList.add('hidden'));
    document.querySelectorAll('.lang-en-text').forEach(el => el.classList.remove('hidden'));
    
    // Update game select options to English
    updateGameSelectLocalization();
  }
}

// Load saved settings
function loadSavedSettings() {
  chrome.storage.local.get({
    genshin_enabled: true,
    starrail_enabled: true,
    zzz_enabled: true,
    honkai3rd_enabled: true,
    auto_check: true,
    genshin_uid: '',
    starrail_uid: '',
    zzz_uid: '',
    honkai3rd_uid: ''
  }, function(items) {
    // 確保元素存在再設置值
    const genshinToggle = document.getElementById('genshin');
    const starrailToggle = document.getElementById('starrail');
    const zzzToggle = document.getElementById('zzz');
    const honkai3rdToggle = document.getElementById('honkai3rd');
    
    if (genshinToggle) genshinToggle.checked = items.genshin_enabled;
    if (starrailToggle) starrailToggle.checked = items.starrail_enabled;
    if (zzzToggle) zzzToggle.checked = items.zzz_enabled;
    if (honkai3rdToggle) honkai3rdToggle.checked = items.honkai3rd_enabled;
    
    // 填充UID到各輸入框
    const genshinUidInput = document.getElementById('genshin-uid');
    const starrailUidInput = document.getElementById('starrail-uid');
    const zzzUidInput = document.getElementById('zzz-uid');
    
    if (genshinUidInput) genshinUidInput.value = items.genshin_uid || '';
    if (starrailUidInput) starrailUidInput.value = items.starrail_uid || '';
    if (zzzUidInput) zzzUidInput.value = items.zzz_uid || '';
    
    console.log("Loaded settings:", items);
  });
}

// Save settings when button is clicked
function saveSettings() {
  const genshinToggle = document.getElementById('genshin');
  const starrailToggle = document.getElementById('starrail');
  const zzzToggle = document.getElementById('zzz');
  const honkai3rdToggle = document.getElementById('honkai3rd');
  
  const settings = {
    genshin_enabled: genshinToggle ? genshinToggle.checked : true,
    starrail_enabled: starrailToggle ? starrailToggle.checked : true,
    zzz_enabled: zzzToggle ? zzzToggle.checked : true,
    honkai3rd_enabled: honkai3rdToggle ? honkai3rdToggle.checked : true
  };
  
  chrome.runtime.sendMessage({
    action: "saveSettings",
    settings: settings
  }, function(response) {
    console.log('Settings saved:', settings);
  });
}
  
  // Add a manual check-in button
function checkInNow() {
  const statusElem = document.getElementById('status');
  if (statusElem) {
    statusElem.textContent = 'Checking in...';
  }
  
  chrome.runtime.sendMessage({ action: "manualCheckin" }, function(response) {
    // Handle potential error
    if (chrome.runtime.lastError) {
      console.error("Error during check-in:", chrome.runtime.lastError);
      if (statusElem) {
        statusElem.textContent = 'Error during check-in. Please try again.';
      }
      return;
    }
    
    // Wait a moment for check-ins to complete, then refresh status
    setTimeout(function() {
      if (statusElem) {
        statusElem.textContent = 'Check-in completed!';
      }
      updateStatus(); // 使用updateStatus替代updateStatusFromStorage
    }, 3000); // Give check-ins time to complete
  });
}
  
  // Add a login button
function loginToHoyolab() {
    chrome.tabs.create({ url: "https://www.hoyolab.com/home" });
    
    // Call the authentication function in the background script
    chrome.runtime.sendMessage({ action: "authenticate" }, function(response) {
    // Handle potential error
    if (chrome.runtime.lastError) {
      console.error("Error during authentication:", chrome.runtime.lastError);
      return;
    }
    
      // After the user logs in, let's try to authenticate with the cookies
      setTimeout(function() {
        updateStatus();
      }, 5000);
    });
}

// Add event listener for the change credentials button
function showCredentialsForm() {
  // Hide the credentials display and show the form
  const credentialsDisplayElem = document.getElementById('credentials-display');
  const credentialsFormElem = document.getElementById('credentials-form');
  
  if (credentialsDisplayElem) {
    credentialsDisplayElem.classList.add('hidden');
  }
  
  if (credentialsFormElem) {
    credentialsFormElem.classList.remove('hidden');
  }
}
  
  // Add a verify authentication button
function verifyAuthentication() {
  const statusElem = document.getElementById('status');
  if (statusElem) {
    statusElem.textContent = 'Verifying authentication...';
  }
    
    chrome.runtime.sendMessage({ action: "authenticate" }, function(response) {
      setTimeout(function() {
        updateStatus();
        
        // Also try a test code redemption
        chrome.storage.local.get({last_used_uids: {}}, function(data) {
          const uids = data.last_used_uids;
          
          if (uids.genshin) {
          if (statusElem) {
            statusElem.textContent = 'Testing authentication with Genshin...';
          }
            
            chrome.runtime.sendMessage({
              action: "redeemCode",
              game: "genshin", 
              uid: uids.genshin,
              code: "THISISATESTCODE"
            }, function(result) {
              if (result.data && result.data.reason && result.data.reason.includes("log in")) {
              if (statusElem) {
                statusElem.textContent = 'Authentication failed. Please log in to HoYoLAB.';
              }
              } else {
              if (statusElem) {
                statusElem.textContent = 'Authentication successful!';
              }
              }
              
              setTimeout(function() {
                updateStatus();
              }, 3000);
            });
          } else if (uids.starrail) {
          if (statusElem) {
            statusElem.textContent = 'Testing authentication with Star Rail...';
          }
            
            chrome.runtime.sendMessage({
              action: "redeemCode",
              game: "starrail", 
              uid: uids.starrail,
              code: "THISISATESTCODE"
            }, function(result) {
              if (result.data && result.data.reason && result.data.reason.includes("log in")) {
              if (statusElem) {
                statusElem.textContent = 'Authentication failed. Please log in to HoYoLAB.';
              }
              } else {
              if (statusElem) {
                statusElem.textContent = 'Authentication successful!';
              }
              }
              
              setTimeout(function() {
                updateStatus();
              }, 3000);
            });
          } else {
          if (statusElem) {
            statusElem.textContent = 'Please enter at least one UID first';
          }
            
            setTimeout(function() {
              updateStatus();
            }, 3000);
          }
        });
      }, 1000);
    });
}
  
  // Add a debug cookies button
function showCookieDebug() {
  const statusElem = document.getElementById('status');
  if (statusElem) {
    statusElem.textContent = 'Debugging cookies...';
  }
    
    chrome.runtime.sendMessage({ action: "debugCookies" }, function(response) {
    if (statusElem) {
      statusElem.textContent = 'Cookie debugging completed';
    }
      
      // Also show the debug logs section
      const debugButton = document.getElementById('debug');
      if (debugButton) {
        debugButton.click();
      }
      
      setTimeout(function() {
        updateStatus();
      }, 5000);
    });
}
  
  // Add a clear data button
function clearAllData() {
    if (confirm('Are you sure you want to clear all data? This will reset all settings and check-in history.')) {
      chrome.storage.local.clear(function() {
      const statusElem = document.getElementById('status');
      if (statusElem) {
        statusElem.textContent = 'All data cleared!';
      }
      
        setTimeout(function() {
          window.location.reload();
        }, 1000);
      });
    }
}
  
  // Add debug button
function toggleDebugInfo() {
    const debugStatus = document.getElementById('debug-status');
    
    if (debugStatus.style.display === 'block') {
      debugStatus.style.display = 'none';
      return;
    }
    
    debugStatus.style.display = 'block';
    debugStatus.innerHTML = 'Loading debug info...';
    
    // Get all storage data
    chrome.storage.local.get(null, function(data) {
      let debugHtml = '<h4>Storage Data</h4>';
      debugHtml += '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
      
      // Get logs
      chrome.runtime.sendMessage({ action: "getLogs" }, function(response) {
        if (response && response.logs) {
          debugHtml += '<h4>Debug Logs</h4>';
          debugHtml += '<button id="clear-logs" class="debug-button">Clear Logs</button>';
          debugHtml += '<pre class="debug-logs">' + response.logs.join('\n') + '</pre>';
          
          debugStatus.innerHTML = debugHtml;
          
          // Add clear logs button handler
        const clearLogsButton = document.getElementById('clear-logs');
        if (clearLogsButton) {
          clearLogsButton.addEventListener('click', function() {
            chrome.runtime.sendMessage({ action: "clearLogs" }, function() {
              const logsElement = document.querySelector('.debug-logs');
              if (logsElement) {
              logsElement.textContent = 'Logs cleared';
              }
            });
          });
        }
        } else {
          debugStatus.innerHTML = debugHtml + '<h4>No logs available</h4>';
        }
      });
    });
}

// Check auth status
function checkAuthStatus() {
  chrome.storage.local.get(['hoyolab_username', 'hoyolab_password', 'auth_status'], function(data) {
    const authStatusElem = document.getElementById('auth-status');
    const credentialsDisplayElem = document.getElementById('credentials-display');
    const credentialsFormElem = document.getElementById('credentials-form');
    const loggedEmailElem = document.getElementById('logged-email');
    const loggedEmailZhElem = document.getElementById('logged-email-zh');
    
    // 始終顯示為已登入，如果有用戶名和密碼
    if (data.hoyolab_username && data.hoyolab_password) {
      if (authStatusElem) {
        authStatusElem.className = 'auth-status logged-in';
        authStatusElem.innerHTML = '<span class="lang-en-text">Logged in to HoYoLAB</span><span class="lang-zh-text hidden">已登入HoYoLAB</span>';
      }
      
      if (credentialsDisplayElem && loggedEmailElem && loggedEmailZhElem) {
        loggedEmailElem.textContent = data.hoyolab_username;
        loggedEmailZhElem.textContent = data.hoyolab_username;
        credentialsDisplayElem.classList.remove('hidden');
      }
      
      if (credentialsFormElem) {
        credentialsFormElem.classList.add('hidden');
      }
      
      // 設置為已驗證狀態
      chrome.storage.local.set({auth_status: 'authenticated'});
      
      // 後台驗證，但不影響顯示
      chrome.runtime.sendMessage({ action: "checkAuth" });
    } else {
      // 沒有保存的憑據
      if (authStatusElem) {
        authStatusElem.className = 'auth-status not-logged-in';
        authStatusElem.innerHTML = '<span class="lang-en-text">Not logged in. Please enter your HoYoLAB credentials.</span><span class="lang-zh-text hidden">未登入。請輸入您的HoYoLAB憑證。</span>';
      }
      
      if (credentialsFormElem) {
        credentialsFormElem.classList.remove('hidden');
      }
      
      if (credentialsDisplayElem) {
        credentialsDisplayElem.classList.add('hidden');
      }
      
      chrome.storage.local.set({auth_status: 'not-authenticated'});
    }
  });
}

// Save credentials button
function saveCredentials() {
  const username = document.getElementById('hoyolab-username').value.trim();
  const password = document.getElementById('hoyolab-password').value;
  
  if (!username || !password) {
    const credentialsSavedElem = document.getElementById('credentials-saved');
    if (credentialsSavedElem) {
      credentialsSavedElem.textContent = document.body.classList.contains('lang-zh') 
        ? '請輸入用戶名和密碼' 
        : 'Please enter both username and password';
      credentialsSavedElem.classList.remove('hidden');
    
    setTimeout(function() {
        credentialsSavedElem.classList.add('hidden');
    }, 3000);
    }
    return;
  }
  
  chrome.storage.local.set({
    hoyolab_username: username,
    hoyolab_password: password,
    auth_status: 'authenticated' // 直接設為已認證
  }, function() {
    // Show saved confirmation
    const credentialsSavedElem = document.getElementById('credentials-saved');
    if (credentialsSavedElem) {
      credentialsSavedElem.textContent = document.body.classList.contains('lang-zh') 
        ? '憑證已保存！' 
        : 'Credentials saved!';
      credentialsSavedElem.classList.remove('hidden');
      
      setTimeout(function() {
        credentialsSavedElem.classList.add('hidden');
      }, 3000);
    }
    
    // Hide the form and show credentials display
    const credentialsDisplayElem = document.getElementById('credentials-display');
    const credentialsFormElem = document.getElementById('credentials-form');
    const loggedEmailElem = document.getElementById('logged-email');
    const loggedEmailZhElem = document.getElementById('logged-email-zh');
    
    if (credentialsDisplayElem && loggedEmailElem && loggedEmailZhElem) {
      loggedEmailElem.textContent = username;
      loggedEmailZhElem.textContent = username;
      credentialsDisplayElem.classList.remove('hidden');
    }
    
    if (credentialsFormElem) {
      credentialsFormElem.classList.add('hidden');
    }
    
    // Update auth status display
    const authStatusElem = document.getElementById('auth-status');
    if (authStatusElem) {
      authStatusElem.className = 'auth-status logged-in';
      authStatusElem.innerHTML = '<span class="lang-en-text">Logged in to HoYoLAB</span><span class="lang-zh-text hidden">已登入HoYoLAB</span>';
    }
    
    // Verify authentication in background
    chrome.runtime.sendMessage({ action: "authenticate" });
  });
}

// Save UIDs
function saveUIDs() {
  const genshinUID = document.getElementById('genshin-uid');
  const starrailUID = document.getElementById('starrail-uid');
  const zzzUID = document.getElementById('zzz-uid');
  const uidsSaved = document.getElementById('uids-saved');
  
  if (!genshinUID || !starrailUID || !zzzUID || !uidsSaved) {
    console.error('Could not find all required elements for saving UIDs');
    return;
  }
  
  const uids = {
    genshin_uid: genshinUID.value.trim(),
    starrail_uid: starrailUID.value.trim(),
    zzz_uid: zzzUID.value.trim()
  };
  
  chrome.storage.local.set(uids, function() {
    uidsSaved.classList.remove('hidden');
    setTimeout(() => {
      uidsSaved.classList.add('hidden');
    }, 3000);
  });
}

// Add a check codes button
function checkCodesNow() {
  const statusElem = document.getElementById('check-codes-status');
  if (statusElem) {
    statusElem.textContent = 'Checking for codes...';
  }
  
  chrome.runtime.sendMessage({ action: "checkCodes" }, function(response) {
    // Handle potential error
    if (chrome.runtime.lastError) {
      console.error("Error checking codes:", chrome.runtime.lastError);
      if (statusElem) {
        statusElem.textContent = 'Error checking codes. Please try again.';
      }
      return;
    }
    
    // Wait a moment for code check to complete, then refresh status
    setTimeout(function() {
      if (statusElem) {
        statusElem.textContent = 'Code check completed!';
      }
      // Clear status after a delay
      setTimeout(function() {
        if (statusElem) statusElem.textContent = '';
        updateStatus(); // 使用updateStatus替代updateStatusFromStorage
      }, 2000);
    }, 3000);
  });
}

// Update status
function updateStatus() {
  chrome.storage.local.get({
    last_check_status: {},
    genshin_lastChecked: null,
    starrail_lastChecked: null,
    zzz_lastChecked: null,
    honkai3rd_lastChecked: null
  }, function(data) {
    const statusObj = data.last_check_status || {};
    
    // 更新各遊戲狀態
    updateGameStatusDisplay('genshin', statusObj.genshin, data.genshin_lastChecked);
    updateGameStatusDisplay('starrail', statusObj.starrail, data.starrail_lastChecked);
    updateGameStatusDisplay('zzz', statusObj.zzz, data.zzz_lastChecked);
    updateGameStatusDisplay('honkai3rd', statusObj.honkai3rd, data.honkai3rd_lastChecked);
  });
}

// 更新單個遊戲狀態顯示
function updateGameStatusDisplay(game, statusData, lastChecked) {
  const statusElement = document.getElementById(`${game}-status`);
  if (!statusElement) return;
  
  statusElement.classList.remove('success', 'failed', 'pending');
  
  // 如果沒有狀態數據，顯示為等待中
  if (!statusData) {
    statusElement.textContent = document.body.classList.contains('lang-zh') ? '等待中' : 'Pending';
    statusElement.classList.add('pending');
    return;
  }
  
  // 根據成功狀態顯示
  if (statusData.success) {
    statusElement.textContent = document.body.classList.contains('lang-zh') ? '已簽到' : 'Checked-in';
    statusElement.classList.add('success');
  } else {
    statusElement.textContent = document.body.classList.contains('lang-zh') ? '簽到失敗' : 'Failed';
    statusElement.classList.add('failed');
  }
}

// Open logs page
function openLogs() {
  console.log("Opening logs page");
  // Create and open logs page in a new tab
  chrome.tabs.create({
    url: 'logs.html'
  });
}

// Function to redeem a code
function redeemCode() {
  const codeInput = document.getElementById('code-input');
  const gameSelect = document.getElementById('game-select');
  const redeemStatus = document.getElementById('redeem-status');
  
  if (!codeInput || !gameSelect || !redeemStatus) {
    console.error("Could not find all required elements for code redemption");
    return;
  }
  
  const code = codeInput.value.trim();
  const game = gameSelect.value;
  
  if (!code) {
    redeemStatus.textContent = document.body.classList.contains('lang-zh') 
      ? '請輸入兌換碼' 
      : 'Please enter a code';
    return;
  }
  
  // 從存儲中獲取UID
  chrome.storage.local.get({
    genshin_uid: '',
    starrail_uid: '',
    zzz_uid: '',
    honkai3rd_uid: ''
  }, function(items) {
    let uid = '';
    
    // 根據選擇的遊戲獲取UID
    switch(game) {
      case 'genshin':
        uid = items.genshin_uid;
        break;
      case 'starrail':
        uid = items.starrail_uid;
        break;
      case 'zzz':
        uid = items.zzz_uid;
        break;
      case 'honkai3rd':
        uid = items.honkai3rd_uid;
        break;
    }
    
    if (!uid) {
      redeemStatus.textContent = document.body.classList.contains('lang-zh') 
        ? '請先在上方UID設置區域填寫並保存UID' 
        : 'Please save your UID in the UID settings section above first';
      return;
    }
    
    redeemStatus.textContent = document.body.classList.contains('lang-zh') 
      ? '正在兌換...' 
      : 'Redeeming code...';
    
    chrome.runtime.sendMessage({
      action: "redeemCode",
      game: game,
      uid: uid,
      code: code
    }, function(response) {
      // Handle potential error
      if (chrome.runtime.lastError) {
        console.error("Error redeeming code:", chrome.runtime.lastError);
        redeemStatus.textContent = document.body.classList.contains('lang-zh') 
          ? '兌換過程中出錯，請重試' 
          : 'Error during redemption. Please try again.';
        return;
      }
      
      if (response && response.success) {
        redeemStatus.textContent = document.body.classList.contains('lang-zh') 
          ? '兌換成功！' 
          : (response.data && response.data.message) || 'Code redeemed successfully!';
      } else {
        redeemStatus.textContent = document.body.classList.contains('lang-zh') 
          ? '兌換失敗: ' + ((response && response.data && response.data.reason) || '未知錯誤') 
          : 'Failed to redeem code: ' + ((response && response.data && response.data.reason) || 'Unknown error');
      }
    });
  });
}

// Setup game selection with proper localization
function setupGameSelection() {
  const gameSelect = document.getElementById('game-select');
  if (gameSelect) {
    gameSelect.addEventListener('change', updateGameSelectLocalization);
    // 初始化選擇器本地化
    updateGameSelectLocalization();
  }
}

// 監聽遊戲切換
function setupGameToggles() {
  const genshinToggle = document.getElementById('genshin');
  const starrailToggle = document.getElementById('starrail');
  const zzzToggle = document.getElementById('zzz');
  const honkai3rdToggle = document.getElementById('honkai3rd');
  
  // 添加事件監聽器以保存設置
  if (genshinToggle) {
    genshinToggle.addEventListener('change', saveSettings);
  }
  
  if (starrailToggle) {
    starrailToggle.addEventListener('change', saveSettings);
  }
  
  if (zzzToggle) {
    zzzToggle.addEventListener('change', saveSettings);
  }
  
  if (honkai3rdToggle) {
    honkai3rdToggle.addEventListener('change', saveSettings);
  }
} 