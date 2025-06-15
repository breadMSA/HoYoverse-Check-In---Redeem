if (typeof browser === "undefined") {
	browser = chrome;
	browser.browserAction = chrome.action;
}

const GAME_CONFIGS = {
	genshin: {
		name: "Genshin Impact",
		act_id: "e202102251931481",
		apiHost: "sg-hk4e-api.hoyolab.com",
		page: "act.hoyolab.com/ys/event/signin-sea-v3/index.html",
		referer: "https://act.hoyolab.com/ys/event/signin-sea-v3/index.html?act_id=e202102251931481",
		apiEndpoint: "/event/sol/sign"
	},
	starrail: {
		name: "Honkai: Star Rail",
		act_id: "e202303301540311",
		apiHost: "sg-public-api.hoyolab.com",
		page: "act.hoyolab.com/bbs/event/signin/hkrpg/index.html",
		referer: "https://act.hoyolab.com/bbs/event/signin/hkrpg/index.html?act_id=e202303301540311",
		apiEndpoint: "/event/luna/os/sign"
	},
	zzz: {
		name: "Zenless Zone Zero",
		act_id: "e202406031448091",
		apiHost: "sg-act-nap-api.hoyolab.com",
		page: "act.hoyolab.com/bbs/event/signin/zzz/e202406031448091.html",
		referer: "https://act.hoyolab.com/bbs/event/signin/zzz/e202406031448091.html?act_id=e202406031448091",
		apiEndpoint: "/event/luna/zzz/os/sign"
	},
	honkai3rd: {
		name: "Honkai Impact 3rd",
		act_id: "e202110291205111",
		apiHost: "sg-public-api.hoyolab.com",
		page: "act.hoyolab.com/bbs/event/signin-bh3/index.html",
		referer: "https://act.hoyolab.com/bbs/event/signin-bh3/index.html?act_id=e202110291205111",
		apiEndpoint: "/event/mani/sign"
	}
};

// Code redemption endpoints and functions
const REDEMPTION_CONFIGS = {
	"genshin": {
		name: "Genshin Impact",
		endpoint: "https://sg-hk4e-api.hoyoverse.com/common/apicdkey/api/webExchangeCdkey",
		referer: "https://genshin.hoyoverse.com/en/gift",
		getParams: (code, uid) => ({
			uid: uid,
			region: getRegionFromUID(uid, "genshin"),
			lang: "en",
			cdkey: code,
			game_biz: "hk4e_global"
		})
	},
	"starrail": {
		name: "Honkai: Star Rail",
		endpoint: "https://sg-pass-api.hoyoverse.com/common/apicdkey/api/webExchangeCdkey",
		referer: "https://hsr.hoyoverse.com/gift",
		getParams: (code, uid) => ({
			uid: uid,
			region: getRegionFromUID(uid, "starrail"),
			lang: "en",
			cdkey: code,
			game_biz: "hkrpg_global"
		})
	},
	"zzz": {
		name: "Zenless Zone Zero",
		endpoint: "https://sg-pass-api.hoyoverse.com/common/apicdkey/api/webExchangeCdkey",
		referer: "https://zenless.hoyoverse.com/gift",
		getParams: (code, uid) => ({
			uid: uid,
			region: getRegionFromUID(uid, "zzz"),
			lang: "en",
			cdkey: code,
			game_biz: "nap_global"
		})
	}
};

function getCurrDay() {
	var now = new Date();
	now.setMinutes(now.getMinutes() + now.getTimezoneOffset());
	now.setHours(now.getHours() + 8);
	return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

// For debugging
function logToStorage(message) {
	const timestamp = new Date().toISOString();
	const logMessage = `${timestamp}: ${message}`;
	
	browser.storage.local.get({debug_logs: []}, function(data) {
		const logs = data.debug_logs || [];
		logs.push(logMessage);
		
		// Keep only the last 100 logs
		if (logs.length > 100) {
			logs.shift();
		}
		
		browser.storage.local.set({debug_logs: logs});
	});
	
	console.log(message);
}

function requestGameCheckin(gameKey, config, currDay) {
	return new Promise((resolve, reject) => {
		logToStorage(`Starting check-in for ${config.name}`);
		
		const apiEndpoint = config.apiEndpoint || "/event/luna/os/sign";
		
		const headers = {
			"Content-Type": "application/json",
			"Referer": config.referer,
			"Origin": "https://act.hoyolab.com",
			"Accept": "application/json, text/plain, */*",
			"Accept-Encoding": "gzip, deflate, br, zstd",
			"Accept-Language": "en-US,en;q=0.6",
			"Connection": "keep-alive",
			"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
			"Sec-Ch-Ua": '"Not/A)Brand";v="8", "Chromium";v="126", "Brave";v="126"',
			"Sec-Ch-Ua-Mobile": "?0",
			"Sec-Ch-Ua-Platform": '"Windows"',
			"Sec-Fetch-Dest": "empty",
			"Sec-Fetch-Mode": "cors",
			"Sec-Fetch-Site": "same-site"
		};
		
		// Add game-specific headers
		if (gameKey === 'zzz') {
			headers["x-rpc-signgame"] = "zzz";
		} else if (gameKey === 'honkai3rd') {
			headers["x-rpc-signgame"] = "hi3";
		} else if (gameKey === 'genshin') {
			headers["x-rpc-signgame"] = "gi";
		} else if (gameKey === 'starrail') {
			headers["x-rpc-signgame"] = "hsr";
		}
		
		fetch(`https://${config.apiHost}${apiEndpoint}`, {
			method: "POST",
			headers: headers,
			credentials: "include",
			body: JSON.stringify({
				"act_id": config.act_id,
				"lang": "zh-tw"
			})
		})
		.then(response => {
			logToStorage(`${config.name} response status: ${response.status}`);
			if (!response.ok && response.status !== 400) {
				throw new Error(`HTTP error! Status: ${response.status}`);
			}
			return response.text();
		})
		.then(text => {
			logToStorage(`${config.name} raw response: ${text}`);
			try {
				return JSON.parse(text);
			} catch (e) {
				logToStorage(`${config.name} JSON parse error: ${e.toString()}`);
				throw new Error(`JSON parse error: ${e.toString()}`);
			}
		})
		.then(data => {
			logToStorage(`${config.name} response data: ${JSON.stringify(data)}`);
			
			const result = {
				game: gameKey,
				gameName: config.name,
				success: data.retcode === 0 || data.retcode === -5003,
				message: data.message || "",
				retcode: data.retcode,
				time: new Date().toISOString()
			};
			
			browser.storage.local.get({last_check_status: {}}, (storage) => {
				const statusObj = storage.last_check_status || {};
				statusObj[gameKey] = result;
				browser.storage.local.set({last_check_status: statusObj});
				
				logToStorage(`${config.name} status saved: ${result.success ? 'Success' : 'Failed'}`);
			});
			
			if (result.success) {
				const storageKey = `${gameKey}_lastChecked`;
				const storageObj = {};
				storageObj[storageKey] = currDay;
				browser.storage.local.set(storageObj);
				
				logToStorage(`${config.name} lastChecked timestamp updated to ${new Date(currDay).toISOString()}`);
			}
			
			resolve(result);
		})
		.catch(error => {
			logToStorage(`Error checking in ${config.name}: ${error.toString()}`);
			
			const result = {
				game: gameKey,
				gameName: config.name,
				success: false,
				message: error.toString(),
				time: new Date().toISOString()
			};
			
			browser.storage.local.get({last_check_status: {}}, (storage) => {
				const statusObj = storage.last_check_status || {};
				statusObj[gameKey] = result;
				browser.storage.local.set({last_check_status: statusObj});
			});
			
			resolve(result);
		});
	});
}

function checkGameActivity(gameKey, config) {
	return new Promise((resolve) => {
		logToStorage(`Checking if ${config.name} activity is available`);
		
		fetch(`https://${config.page}?act_id=${config.act_id}`, {
			method: "GET",
			headers: {
				"Referer": config.referer,
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
			},
			credentials: "include"
		})
		.then(response => {
			logToStorage(`${config.name} activity page status: ${response.status}`);
			
			if (gameKey === 'genshin' && response.status === 404) {
				logToStorage(`Trying alternate URL for Genshin Impact`);
				return fetch(`https://act.hoyolab.com/ys/event/signin-sea-v3/index.html?act_id=${config.act_id}`, {
					method: "GET",
					credentials: "include"
				})
				.then(altResponse => {
					logToStorage(`Genshin alternate URL status: ${altResponse.status}`);
					if (altResponse.ok) {
						return altResponse.text();
					} else {
						throw new Error(`Alternate URL also failed: ${altResponse.status}`);
					}
				});
			}
			
			if (!response.ok) {
				if (response.status === 404) {
					logToStorage(`${config.name} activity page not found (404)`);
					resolve(false);
					return Promise.reject("Page not found");
				}
			}
			
			return response.text();
		})
		.then(html => {
			const activityEnded = html.includes("活动已结束") || 
								  html.includes("活動已結束") || 
								  html.includes("Activity has ended");
			
			if (activityEnded) {
				logToStorage(`${config.name} activity has ended or is not available`);
				resolve(false);
			} else {
				logToStorage(`${config.name} activity is available`);
				resolve(true);
			}
		})
		.catch(error => {
			logToStorage(`Error checking ${config.name} activity: ${error.toString()}`);
			resolve(false);
		});
	});
}

function needsCheckin(lastChecked, currentDay) {
	if (!lastChecked) return true;
	
	const lastCheckedDate = new Date(lastChecked);
	lastCheckedDate.setHours(0, 0, 0, 0);
	
	return lastCheckedDate < currentDay;
}

function openCheckInTab(game) {
	const config = GAME_CONFIGS[game];
	if (!config) return Promise.reject("Game not found");
	
	return new Promise((resolve) => {
		const url = `https://${config.page}?act_id=${config.act_id}`;
		logToStorage(`Opening tab to ${url} for direct check-in`);
		
		// Create tab in background
		browser.tabs.create({ url: url, active: false }, (tab) => {
			// Give it a few seconds to load
			setTimeout(() => {
				// Try to find and click the check-in button
				browser.tabs.executeScript(tab.id, {
					code: `
						try {
							console.log("Looking for check-in button...");
							// Find all buttons
							const buttons = Array.from(document.querySelectorAll('button'));
							
							// Find the check-in button
							const checkInBtn = buttons.find(btn => 
								btn.textContent.includes('Check-In') || 
								btn.textContent.includes('Sign In') || 
								btn.textContent.includes('簽到') || 
								btn.textContent.includes('签到'));
							
							if (checkInBtn) {
								console.log("Found check-in button, clicking...");
								checkInBtn.click();
								"success";
							} else {
								console.log("No check-in button found");
								"no-button";
							}
						} catch (e) {
							console.error("Error in script:", e);
							"error-" + e.toString();
						}
					`
				}, (results) => {
					// Wait a bit for the check-in to process
					setTimeout(() => {
						// Close tab and resolve
						browser.tabs.remove(tab.id);
						
						if (results && results[0] === "success") {
							// Update last checked time
		const currentDay = new Date();
		currentDay.setHours(0, 0, 0, 0);
		
							const storageKey = `${game}_lastChecked`;
							const storageObj = {};
							storageObj[storageKey] = currentDay.getTime();
							
							// Update status
		const result = {
			game: game,
			gameName: config.name,
								success: true,
								message: "Check-in completed via web page",
			time: new Date().toISOString()
		};
		
							browser.storage.local.get({last_check_status: {}}, (storage) => {
								const statusObj = storage.last_check_status || {};
			statusObj[game] = result;
			browser.storage.local.set({
				last_check_status: statusObj,
									...storageObj
			});
		});
		
							resolve(result);
						} else {
							resolve({
								game: game,
								gameName: config.name,
								success: false,
								message: `Failed to check-in via web page: ${results ? results[0] : "unknown error"}`,
								time: new Date().toISOString()
							});
						}
					}, 3000);
				});
			}, 5000);
		});
	});
}

// Replace the checkIn function
async function checkIn(game) {
	const config = GAME_CONFIGS[game];
	if (!config) {
		logToStorage(`Game ${game} not found in configs`);
		return {
			success: false,
			game: game,
			message: `Game ${game} not found in configs`
		};
	}
	
	logToStorage(`Checking in for ${config.name}`);
	
	try {
		// First try the standard API method
		try {
			const apiResult = await requestGameCheckin(game, config, getCurrDay());
			if (apiResult.success) {
				return apiResult;
			}
			
			// If API method fails and it's Genshin or Honkai, try direct web method
			if (game === 'genshin' || game === 'honkai3rd') {
				logToStorage(`API method failed for ${config.name}, trying web page method`);
				return await openCheckInTab(game);
			}
			
			return apiResult;
		} catch (error) {
			// If API request fails, try direct web method for these games
			if (game === 'genshin' || game === 'honkai3rd') {
				logToStorage(`API request failed for ${config.name}: ${error}, trying web page method`);
				return await openCheckInTab(game);
			}
			throw error;
		}
	} catch (error) {
		logToStorage(`Error during check-in for ${game}: ${error.toString()}`);
		
		const result = {
			game: game,
			gameName: config.name,
			success: false,
			message: error.toString(),
			time: new Date().toISOString()
		};
		
		// Update check-in status
		browser.storage.local.get({last_check_status: {}}, function(data) {
			const statusObj = data.last_check_status || {};
			statusObj[game] = result;
			browser.storage.local.set({last_check_status: statusObj});
		});
		
		return result;
	}
}

// Function to perform daily check-in
function performDailyCheckIn(forceCheck = false) {
	const currentDay = new Date();
	currentDay.setHours(0, 0, 0, 0);
	
	logToStorage(`Starting check-ins, forceCheck: ${forceCheck}, currentDay: ${currentDay.toISOString()}`);
	
	browser.storage.local.get({
		genshin_enabled: true,
		starrail_enabled: true,
		zzz_enabled: true,
		honkai3rd_enabled: true,
		genshin_lastChecked: null,
		starrail_lastChecked: null,
		zzz_lastChecked: null,
		honkai3rd_lastChecked: null
	}, function(data) {
		// Log the full storage data for debugging
		logToStorage(`Storage data: ${JSON.stringify(data)}`);
		
		// Array to store the check-in promises
		const promises = [];
		
		// Check each game
		if (forceCheck || data.genshin_enabled && needsCheckin(data.genshin_lastChecked, currentDay)) {
			logToStorage(`Starting check-in for Genshin Impact`);
			promises.push(checkIn("genshin"));
		}
		
		if (forceCheck || data.starrail_enabled && needsCheckin(data.starrail_lastChecked, currentDay)) {
			logToStorage(`Starting check-in for Honkai: Star Rail`);
			promises.push(checkIn("starrail"));
		}
		
		if (forceCheck || data.zzz_enabled && needsCheckin(data.zzz_lastChecked, currentDay)) {
			logToStorage(`Starting check-in for Zenless Zone Zero`);
			promises.push(checkIn("zzz"));
		}
		
		if (forceCheck || data.honkai3rd_enabled && needsCheckin(data.honkai3rd_lastChecked, currentDay)) {
			logToStorage(`Starting check-in for Honkai Impact 3rd`);
			promises.push(checkIn("honkai3rd"));
		}
		
		if (promises.length > 0) {
			Promise.all(promises).then(results => {
				// Update the extension icon based on the results
				if (results.some(result => !result.success)) {
					// setActionIcon("error"); // Remove this line
				} else {
					// setActionIcon("success"); // Remove this line
				}
			});
		} else {
			logToStorage("No check-ins to perform");
		}
	});
}

logToStorage("Extension initialized");

// Call authentication on startup
authenticateHoYoLAB();

// Set up daily check-in
const DAILY_CHECK_ALARM = "dailyCheckIn";
browser.alarms.create(DAILY_CHECK_ALARM, { periodInMinutes: 15 });

// Set up hourly code redemption check
const CODE_CHECK_ALARM = "codeCheck";
browser.alarms.create(CODE_CHECK_ALARM, { periodInMinutes: 15 });

// 記錄定時器創建
logToStorage("定時器已創建: 每15分鐘檢查一次簽到和兌換碼");

// 定期檢查定時器是否存在，如果不存在則重新創建
setInterval(async function() {
	try {
		const alarms = await browser.alarms.getAll();
		const hasCheckInAlarm = alarms.some(alarm => alarm.name === DAILY_CHECK_ALARM);
		const hasCodeCheckAlarm = alarms.some(alarm => alarm.name === CODE_CHECK_ALARM);
		
		if (!hasCheckInAlarm) {
			browser.alarms.create(DAILY_CHECK_ALARM, { periodInMinutes: 15 });
			logToStorage("簽到定時器丟失，已重新創建");
		}
		
		if (!hasCodeCheckAlarm) {
			browser.alarms.create(CODE_CHECK_ALARM, { periodInMinutes: 15 });
			logToStorage("兌換碼檢查定時器丟失，已重新創建");
		}
	} catch (error) {
		logToStorage(`檢查定時器時出錯: ${error.message}`);
	}
}, 5 * 60 * 1000); // 每5分鐘檢查一次

// Handle alarms
browser.alarms.onAlarm.addListener(function(alarm) {
	if (alarm.name === DAILY_CHECK_ALARM) {
		logToStorage("觸發每日簽到定時器");
		performDailyCheckIn(false);
	}
	else if (alarm.name === CODE_CHECK_ALARM) {
		logToStorage("觸發兌換碼檢查定時器");
		checkAndRedeemCodes();
	}
});

// 監聽擴展安裝或更新事件
browser.runtime.onInstalled.addListener(function(details) {
	if (details.reason === "install") {
		logToStorage("擴展已安裝，創建定時器");
	} else if (details.reason === "update") {
		logToStorage(`擴展已更新到版本 ${browser.runtime.getManifest().version}，重新創建定時器`);
	}
	
	// 創建或重新創建定時器
	browser.alarms.clear(DAILY_CHECK_ALARM).then(() => {
		browser.alarms.create(DAILY_CHECK_ALARM, { periodInMinutes: 15 });
		logToStorage("簽到定時器已創建");
	});
	
	browser.alarms.clear(CODE_CHECK_ALARM).then(() => {
		browser.alarms.create(CODE_CHECK_ALARM, { periodInMinutes: 15 });
		logToStorage("兌換碼檢查定時器已創建");
	});
});

// Listen for messages from the popup
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
	switch (message.action) {
		case "manualCheckin":
		performDailyCheckIn(true);
		sendResponse({ success: true });
			break;
			
		case "redeemCode":
			// 對於ZZZ使用專用的兌換函數
			if (message.game === 'zzz') {
				redeemZZZCode(message.uid, message.code)
					.then(result => sendResponse(result))
					.catch(error => {
						logToStorage(`Error redeeming ZZZ code: ${error.message}`);
						sendResponse({
							success: false,
							data: { reason: error.message }
						});
					});
			} else {
				redeemCode(message.game, message.uid, message.code, sendResponse);
			}
			return true; // Keep the messaging channel open for the asynchronous response
			
		case "checkCodes":
		checkAndRedeemCodes();
		sendResponse({ success: true });
			break;
			
		case "getProfileData":
			getProfileData()
				.then(profileData => {
					sendResponse({ success: true, data: profileData });
				})
				.catch(error => {
					logToStorage(`Error getting profile data: ${error.message}`);
					sendResponse({ success: false, error: error.message });
				});
			return true; // Keep the messaging channel open for the asynchronous response
			
		case "saveSettings":
			// Save user settings
			browser.storage.local.set({
				genshin_enabled: message.settings.genshin_enabled,
				starrail_enabled: message.settings.starrail_enabled,
				zzz_enabled: message.settings.zzz_enabled,
				honkai3rd_enabled: message.settings.honkai3rd_enabled
			}, function() {
				logToStorage(`Settings saved: ${JSON.stringify(message.settings)}`);
				sendResponse({ success: true });
			});
			return true; // Keep the messaging channel open for the asynchronous response
			
		case "authenticate":
			// Actually authenticate instead of just sending success
			authenticateHoYoLAB()
				.then(() => {
			sendResponse({ success: true });
				})
				.catch(error => {
					logToStorage(`Error during authentication: ${error.toString()}`);
					sendResponse({ success: false, error: error.toString() });
				});
			return true; // Keep the message channel open for the async response
			
		case "checkAuth":
			authenticateHoYoLAB()
				.then(() => {
					sendResponse({ success: true });
				})
				.catch(error => {
					logToStorage(`Error during authentication: ${error.toString()}`);
					sendResponse({ success: false, error: error.toString() });
				});
			return true; // Keep the message channel open for the async response
			
		    case "debugCookies":
		logAllCookies()
		.then(() => {
			sendResponse({ success: true });
		});
		return true; // Keep the message channel open for the async response
			
		case "getLogs":
		browser.storage.local.get({debug_logs: []}, function(data) {
			sendResponse({ logs: data.debug_logs });
		});
		return true; // Keep the message channel open for the async response
			
		case "clearLogs":
		browser.storage.local.set({debug_logs: []}, function() {
			sendResponse({ success: true });
		});
		return true; // Keep the message channel open for the async response
			
		default:
			sendResponse({ success: false, error: "Unknown action" });
	}
});

// Function to determine region from UID
function getRegionFromUID(uid, game) {
	if (!uid) return "os_usa";
	
	uid = String(uid).trim();
	const firstDigit = uid.charAt(0);
	
	// Genshin regions
	if (game === "genshin") {
		if (firstDigit === "6") return "os_usa"; // NA
		if (firstDigit === "7") return "os_euro"; // Europe
		if (firstDigit === "8") return "os_asia"; // Asia
		if (firstDigit === "9") return "os_cht"; // TW, HK, MO
		return "os_usa"; // Default to USA
	}
	
	// Star Rail regions
	if (game === "starrail") {
		if (firstDigit === "6") return "prod_official_usa"; // NA
		if (firstDigit === "7") return "prod_official_euro"; // Europe
		if (firstDigit === "8") return "prod_official_asia"; // Asia
		if (firstDigit === "9") return "prod_official_cht"; // TW, HK, MO
		return "prod_official_usa"; // Default to USA
	}
	
	// ZZZ regions
	if (game === "zzz") {
		return "global01"; // ZZZ currently has a single global server
	}
	
	// Default to USA/Global
	return "os_usa";
}

// Function to redeem a code with improved cookie handling
async function redeemCode(game, uid, code, sendResponse) {
	try {
		logToStorage(`Attempting to redeem code "${code}" for ${game} (UID: ${uid})`);
		
		// Map game to proper API endpoint
		const gameApiMap = {
			genshin: {
				url: 'https://sg-hk4e-api.hoyoverse.com/common/apicdkey/api/webExchangeCdkey',
				params: {
					uid: uid,
					region: getRegionFromUID(uid, game),
					lang: 'en',
					cdkey: code,
					game_biz: 'hk4e_global',
					sLangKey: 'en-us'
				}
			},
			starrail: {
				url: 'https://sg-hkrpg-api.hoyoverse.com/common/apicdkey/api/webExchangeCdkey',
				params: {
					uid: uid,
					region: getRegionFromUID(uid, game),
					lang: 'en',
					cdkey: code,
					game_biz: 'hkrpg_global',
					t: Date.now()
				}
			},
			zzz: {
				url: 'https://public-operation-nap.hoyoverse.com/common/apicdkey/api/webExchangeCdkey',
				params: {
					uid: uid,
					region: getRegionFromUID(uid, game),
					lang: 'en',
					cdkey: code,
					game_biz: 'nap_global',
					t: Date.now()
				},
				// 為ZZZ使用簡化的請求頭
				simpleHeaders: true
			},
			honkai3rd: {
				url: 'https://sg-public-api.hoyoverse.com/common/apicdkey/api/webExchangeCdkey',
				params: {
					uid: uid,
					region: getRegionFromUID(uid, game),
					lang: 'en',
					cdkey: code,
					game_biz: 'bh3_global'
				}
			}
		};
		
		if (!gameApiMap[game]) {
			const errorMsg = `Unsupported game: ${game}`;
			logToStorage(errorMsg);
			if (sendResponse) {
				sendResponse({
					success: false,
					data: { reason: errorMsg }
				});
			}
			return { success: false, data: { reason: errorMsg } };
		}
		
		const gameInfo = gameApiMap[game];
		
		// Get authentication cookies
		const cookies = await browser.cookies.getAll({domain: '.hoyoverse.com'});
		
		// Build the cookie string
		const requiredCookies = ['cookie_token_v2', 'account_mid_v2', 'account_id_v2', 'ltoken_v2', 'ltuid_v2'];
		const cookieStr = cookies
			.filter(cookie => requiredCookies.includes(cookie.name))
			.map(cookie => `${cookie.name}=${cookie.value}`)
			.join('; ');
		
		if (!cookieStr.includes('cookie_token_v2') || !cookieStr.includes('account_mid_v2')) {
			const errorMsg = 'Missing required authentication cookies';
			logToStorage(errorMsg);
			if (sendResponse) {
				sendResponse({
					success: false,
					data: { reason: errorMsg }
				});
			}
			return { success: false, data: { reason: errorMsg } };
		}
		
		// Prepare the URL with parameters
		const url = new URL(gameInfo.url);
		Object.keys(gameInfo.params).forEach(key => {
			url.searchParams.append(key, gameInfo.params[key]);
		});
		
		// Make the redemption request
		let headers = {
			'Cookie': cookieStr,
			'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36'
		};
		
		// 如果是ZZZ遊戲並且設置了簡化請求頭，則只使用Cookie
		if (game === 'zzz' && gameInfo.simpleHeaders) {
			logToStorage('Using simplified headers for ZZZ');
			headers = { 'Cookie': cookieStr };
		}
		
		const response = await fetch(url.toString(), {
			method: 'GET',
			headers: headers
		});
		
		const data = await response.json();
		logToStorage(`Code redemption response for ${code}: ${JSON.stringify(data)}`);
		
		// 檢測特定的代碼屬於哪個遊戲
		let detectedGame = game;
		if (code === 'GENSHINGIFT' || code.startsWith('GS') || code.includes('GENSHIN')) {
			detectedGame = 'genshin';
		} else if (code === 'STARRAILGIFT' || code.includes('STARRAIL') || code === 'HYACINEHEALS' || code === 'CIPHERLOOT') {
			detectedGame = 'starrail';
		} else if (code === 'ZENLESSGIFT' || code.includes('ZZZ')) {
			detectedGame = 'zzz';
		}
		
		// 只將成功或已使用的代碼添加到已使用列表中，錯誤的代碼（包括System busy）不添加
		try {
			// 檢查是否是System busy錯誤或其他錯誤
			const isSystemBusy = data.message && data.message.includes('System busy');
			const isSuccess = data.retcode === 0;
			const isAlreadyUsed = data.message && (
				data.message.includes('already been used') || 
				data.message.includes('already claimed') || 
				data.message.includes('already redeemed') || 
				data.message.includes('已領取') ||
				data.message.includes('already in use')
			);
			
			// 只有成功兌換或已經兌換過的代碼才添加到已使用列表
			if (isSuccess || isAlreadyUsed) {
				const usedCodesObj = await browser.storage.local.get('usedCodes');
				let usedCodes = Array.isArray(usedCodesObj.usedCodes) ? usedCodesObj.usedCodes : [];
				
				// 檢查代碼是否已存在
				const codeExists = usedCodes.some(c => 
					typeof c === 'object' && c.code === code || 
					typeof c === 'string' && c === code
				);
				
				if (!codeExists) {
					// 確定代碼狀態
					let status = isSuccess ? 'success' : 'already_redeemed';
					
					// 使用對象格式存儲代碼，包含遊戲信息
					usedCodes.push({
						code: code,
						game: detectedGame,
						timestamp: new Date().toISOString(),
						status: status
					});
					await browser.storage.local.set({ usedCodes: usedCodes });
					logToStorage(`Added code "${code}" to used codes list for ${detectedGame} with status: ${status}`);
				}
			}
		} catch (error) {
			logToStorage(`Error adding code to usedCodes: ${error.message}`);
		}
		
		if (data.retcode === 0) {
			logToStorage(`Successfully redeemed code "${code}" for ${game} (UID: ${uid})`);
			
			if (sendResponse) {
				sendResponse({
					success: true,
					data: {
						message: 'Code redeemed successfully!'
					}
				});
			}
			return { success: true, data: { message: 'Code redeemed successfully!' } };
		} else {
			// Handle error responses
			const errorMsg = data.message || 'Unknown error';
			logToStorage(`Failed to redeem code "${code}" for ${game} (UID: ${uid}): ${errorMsg}`);
			
			// 處理特殊情況：ZZZ的System busy錯誤
			if (game === 'zzz' && errorMsg.includes('System busy')) {
				logToStorage(`ZZZ API返回System busy錯誤 (Error Code: ${data.retcode}): ${errorMsg}`);
				logToStorage(`ZZZ遊戲的兌換API目前不穩定，請稍後再試或手動兌換。`);
				
				if (sendResponse) {
					sendResponse({
						success: false,
						data: {
							reason: errorMsg
						}
					});
				}
				return { success: false, data: { reason: errorMsg } };
			}
			
			if (sendResponse) {
				sendResponse({
					success: false,
					data: {
						reason: errorMsg
					}
				});
			}
			return { success: false, data: { reason: errorMsg } };
		}
	} catch (error) {
		const errorMsg = `Error redeeming code "${code}" for ${game}: ${error.message}`;
		logToStorage(errorMsg);
		if (sendResponse) {
			sendResponse({
				success: false,
				data: {
					reason: errorMsg
				}
			});
		}
		return { success: false, data: { reason: errorMsg } };
	}
}

// Function to fetch codes from an external source
async function fetchNewCodes(game) {
	logToStorage(`Fetching new codes for ${game}`);
	
	// Use the api.ennead.cc service to fetch active codes
	try {
		let url;
		if (game === "genshin") {
			url = "https://api.ennead.cc/mihoyo/genshin/codes";
		}
		else if (game === "starrail") {
			url = "https://api.ennead.cc/mihoyo/starrail/codes";
		}
		else if (game === "zzz") {
			url = "https://api.ennead.cc/mihoyo/zenless/codes"; // This endpoint might not exist yet
		}
		else {
			logToStorage(`No API endpoint for game: ${game}`);
			return [];
		}
		
		const response = await fetch(url, {
			method: "GET",
			headers: {
				"User-Agent": "MihoyoAutoCheckin/1.0",
				"Accept": "application/json"
			}
		});
		
		if (!response.ok) {
			logToStorage(`API returned status code ${response.status} for ${game}`);
			return [];
		}
		
		const data = await response.json();
		
		if (!Array.isArray(data.active)) {
			logToStorage(`API returned malformed data for ${game}`);
			return [];
		}
		
		const codes = data.active.map(item => item.code);
		logToStorage(`Found ${codes.length} active codes for ${game}: ${codes.join(", ")}`);
		return codes;
	} 
	catch (error) {
		logToStorage(`Error fetching codes for ${game}: ${error.toString()}`);
		return [];
	}
}

// Function to get UIDs for a game
async function getUidsForGame(game) {
	try {
		const uidKey = `${game}_uid`;
		const result = await browser.storage.local.get(uidKey);
		
		if (result[uidKey]) {
			return [result[uidKey]]; // Return as an array for consistency
		}
		return [];
	} catch (error) {
		logToStorage(`Error getting UID for ${game}: ${error.message}`);
		return [];
	}
}

// Function to check for and redeem new codes
async function checkAndRedeemCodes() {
	try {
		logToStorage('Starting automatic code redemption check');
		
		// 獲取設置
		const settings = await browser.storage.sync.get({
			genshin_enabled: true,
			starrail_enabled: true,
			zzz_enabled: true,
			honkai3rd_enabled: false,
			auto_redeem_enabled: true
		});
		
		// 如果自動兌換功能未啟用，則退出
		if (!settings.auto_redeem_enabled) {
			logToStorage('Automatic code redemption is disabled');
			return;
		}
		
		// 定義要處理的遊戲
		const games = [
			{ id: 'genshin', enabled: settings.genshin_enabled },
			{ id: 'starrail', enabled: settings.starrail_enabled },
			{ id: 'zzz', enabled: settings.zzz_enabled },
			{ id: 'honkai3rd', enabled: settings.honkai3rd_enabled }
		];
		
		// 確保usedCodes是一個數組
		let usedCodesObj = await browser.storage.local.get('usedCodes');
		let usedCodes = Array.isArray(usedCodesObj.usedCodes) ? usedCodesObj.usedCodes : [];
		
		// 如果usedCodes不是數組，初始化為空數組並保存
		if (!Array.isArray(usedCodes)) {
			usedCodes = [];
			await browser.storage.local.set({ usedCodes: [] });
			logToStorage('Initialized usedCodes as empty array');
		}
		
		// 將舊格式轉換為新格式
		const needsConversion = usedCodes.some(c => typeof c === 'string');
		if (needsConversion) {
			logToStorage('Converting old usedCodes format to new format');
			usedCodes = usedCodes.map(c => {
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
			await browser.storage.local.set({ usedCodes: usedCodes });
			logToStorage('Conversion complete');
		}
		
		// 獲取所有已使用代碼的列表（只獲取code屬性）
		const usedCodesList = usedCodes.map(c => typeof c === 'object' ? c.code : c);
		
		// 為每個遊戲設置冷卻時間跟踪
		const cooldowns = {
			genshin: 0,
			starrail: 0,
			zzz: 0,
			honkai3rd: 0
		};
		
		for (const game of games) {
			if (!game.enabled) continue;
			
			try {
				const uids = await getUidsForGame(game.id);
				if (!uids || uids.length === 0) {
					logToStorage(`No UIDs found for ${game.id}`);
					continue;
				}
				
				const newCodes = await fetchNewCodes(game.id);
				if (!newCodes || newCodes.length === 0) {
					logToStorage(`No new codes found for ${game.id}`);
					continue;
				}
				
				logToStorage(`Found ${newCodes.length} new codes for ${game.id}`);
				
				for (const uid of uids) {
					// 嘗試兌換所有代碼，即使已經在usedCodes列表中
					// 這樣可以確保所有代碼都被正確記錄
					for (const code of newCodes) {
						try {
							// 檢查代碼是否已經在usedCodes列表中
							const isCodeUsed = usedCodesList.includes(code);
							
							if (isCodeUsed) {
								logToStorage(`Code "${code}" for ${game.id} is already in used codes list, skipping redemption`);
								continue;
							}
							
							// 檢查遊戲是否處於冷卻期
							const now = Date.now();
							if (cooldowns[game.id] > now) {
								const remainingTime = Math.ceil((cooldowns[game.id] - now) / 1000);
								logToStorage(`Game ${game.id} is in cooldown, waiting for ${remainingTime} seconds before redeeming code "${code}"`);
								
								// 等待冷卻時間結束
								await new Promise(resolve => setTimeout(resolve, cooldowns[game.id] - now + 100)); // 額外等待100毫秒以確保安全
							}
							
							logToStorage(`Attempting to redeem code "${code}" for ${game.id} (UID: ${uid})`);
							
							// 對於ZZZ遊戲使用專用的兌換函數
							let result;
							if (game.id === 'zzz') {
								result = await redeemZZZCode(uid, code);
							} else {
								result = await redeemCode(game.id, uid, code);
							}
							if (result.success) {
								logToStorage(`Successfully redeemed code "${code}" for ${game.id} (UID: ${uid})`);
								
								// 成功兌換後設置6秒冷卻時間
								cooldowns[game.id] = Date.now() + 6000;
							} else {
								const errorMsg = result.data.reason;
								logToStorage(`Failed to redeem code "${code}" for ${game.id} (UID: ${uid}): ${errorMsg}`);
								
								// 處理冷卻時間
								if (errorMsg.includes('cooldown') || errorMsg.includes('try again in')) {
									// 提取冷卻時間
									const cooldownMatch = errorMsg.match(/(\d+) second/);
									let cooldownTime = 6;
									
									// 確保至少有10秒冷卻
									cooldownTime = 6;
									
									logToStorage(`Waiting for ${cooldownTime} seconds due to cooldown`);
									
									// 設置遊戲的冷卻時間
									cooldowns[game.id] = Date.now() + (cooldownTime * 1000);
									
									// 等待冷卻時間
									await new Promise(resolve => setTimeout(resolve, cooldownTime * 1000));
								}
								// 處理系統忙
								else if (errorMsg.includes('System busy')) {
									logToStorage(`System busy, waiting for 6 seconds before next code`);
									
									// 設置遊戲的冷卻時間
									cooldowns[game.id] = Date.now() + 6000;
									
									// 重要：System busy 錯誤不應該添加到已使用列表中，因為這是臨時錯誤
									// 我們只需要等待冷卻時間，然後再次嘗試
									
									// 等待6秒
									await new Promise(resolve => setTimeout(resolve, 6000));
								}
								// 其他所有錯誤，包括已使用的代碼，都等待6秒
								else {
									// 設置遊戲的冷卻時間
									cooldowns[game.id] = Date.now() + 6000;
									
									// 等待6秒
									await new Promise(resolve => setTimeout(resolve, 6000));
								}
							}
						} catch (codeError) {
							logToStorage(`Error processing code ${code} for ${game.id}: ${codeError.message}`);
							// 出錯後等待6秒
							cooldowns[game.id] = Date.now() + 6000;
							await new Promise(resolve => setTimeout(resolve, 6000));
						}
					}
				}
			} catch (error) {
				logToStorage(`Error processing ${game.id}: ${error.message}`);
			}
		}
		
		logToStorage('Automatic code redemption check completed');
	} catch (error) {
		logToStorage(`Error in checkAndRedeemCodes: ${error.message}`);
	}
}

// Function to pre-authenticate by visiting HoYoLAB
async function authenticateHoYoLAB() {
	logToStorage("Pre-authenticating with HoYoLAB...");
	
	try {
		// First visit HoYoLAB main site
		await fetch("https://www.hoyolab.com/", {
			method: "GET",
			credentials: "include",
			headers: {
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
				"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
				"Accept-Language": "en-US,en;q=0.9"
			}
		});
		
		// Then visit HoYoLAB account page to ensure account cookies are set
		await fetch("https://www.hoyolab.com/accountCenter", {
			method: "GET",
			credentials: "include",
			headers: {
				"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
				"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
				"Accept-Language": "en-US,en;q=0.9",
				"Referer": "https://www.hoyolab.com/"
			}
		});
		
		// Visit each game's site to ensure all necessary cookies are set
		const gameSites = [
			"https://genshin.hoyoverse.com/",
			"https://hsr.hoyoverse.com/",
			"https://zenless.hoyoverse.com/"
		];
		
		for (const site of gameSites) {
			try {
				await fetch(site, {
					method: "GET",
					credentials: "include",
					headers: {
						"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
						"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
						"Accept-Language": "en-US,en;q=0.9",
						"Referer": "https://www.hoyolab.com/"
					}
				});
				
				// Also visit the gift pages
				const giftUrl = `${site}gift`;
				await fetch(giftUrl, {
					method: "GET",
					credentials: "include",
					headers: {
						"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
						"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
						"Accept-Language": "en-US,en;q=0.9",
						"Referer": site
					}
				});
			} catch (e) {
				logToStorage(`Error visiting ${site}: ${e.toString()}`);
			}
		}
		
		// Check cookies to see if we're authenticated
		await logAllCookies();
		
		const cookies = await new Promise(resolve => {
			browser.cookies.getAll({}, cookies => {
				resolve(cookies);
			});
		});
		
		// Filter for relevant domains
		const hoyoverseCookies = cookies.filter(cookie => 
			cookie.domain.includes("hoyoverse.com") || 
			cookie.domain.includes("hoyolab.com") || 
			cookie.domain.includes("mihoyo.com")
		);
		
		// Filter for critical cookies
		const criticalCookieNames = ["cookie_token_v2", "account_mid_v2", "account_id_v2", "ltoken_v2", "ltuid_v2"];
		const foundCriticalCookies = hoyoverseCookies.filter(cookie => 
			criticalCookieNames.includes(cookie.name)
		);
		
		// Check if we have critical cookies
		if (foundCriticalCookies.length > 0) {
			logToStorage("Authentication successful");
		} else {
			logToStorage("Missing critical authentication cookies. Please log in to HoYoLAB manually.");
		}
	} catch (error) {
		logToStorage(`Error during pre-authentication: ${error.toString()}`);
	}
}

// Function to parse cookies with whitelist similar to original code
function parseCookie(cookieString, options = {}) {
	const whitelist = options.whitelist || ["cookie_token_v2", "account_mid_v2", "account_id_v2", "cookie_token", "account_id", "ltoken_v2", "ltuid_v2"];
	
	if (!cookieString) {
		return "";
	}
	
	// Split cookie string into individual cookies
	const cookies = cookieString.split('; ').reduce((acc, curr) => {
		const [key, value] = curr.split('=');
		acc[key] = value;
		return acc;
	}, {});
	
	// Filter only whitelisted cookies and reconstruct cookie string
	const filteredCookies = Object.keys(cookies)
		.filter(key => whitelist.includes(key))
		.map(key => `${key}=${cookies[key]}`)
		.join('; ');
	
	return filteredCookies;
}

// Function to log all cookies we have for debugging
async function logAllCookies() {
	logToStorage("Checking all authentication cookies...");
	
	const cookies = await new Promise(resolve => {
		browser.cookies.getAll({}, cookies => {
			resolve(cookies);
		});
	});
	
	// Filter for relevant domains
	const hoyoverseCookies = cookies.filter(cookie => 
		cookie.domain.includes("hoyoverse.com") || 
		cookie.domain.includes("hoyolab.com") || 
		cookie.domain.includes("mihoyo.com")
	);
	
	// Group cookies by domain
	const cookiesByDomain = {};
	hoyoverseCookies.forEach(cookie => {
		if (!cookiesByDomain[cookie.domain]) {
			cookiesByDomain[cookie.domain] = [];
		}
		cookiesByDomain[cookie.domain].push({
			name: cookie.name,
			value: cookie.value.substring(0, 5) + "..." // For privacy, only log first 5 chars
		});
	});
	
	// Log cookies by domain
	logToStorage(`Found ${hoyoverseCookies.length} cookies across ${Object.keys(cookiesByDomain).length} domains`);
	
	for (const [domain, domainCookies] of Object.entries(cookiesByDomain)) {
		logToStorage(`Domain ${domain}: ${domainCookies.length} cookies`);
		domainCookies.forEach(cookie => {
			logToStorage(`  - ${cookie.name}: ${cookie.value}`);
		});
	}
	
	// Check for critical cookies
	const criticalCookieNames = ["cookie_token_v2", "account_mid_v2", "account_id_v2", "ltoken_v2", "ltuid_v2"];
	const foundCriticalCookies = hoyoverseCookies.filter(cookie => 
		criticalCookieNames.includes(cookie.name)
	);
	
	logToStorage(`Found ${foundCriticalCookies.length}/${criticalCookieNames.length} critical cookies: ${foundCriticalCookies.map(c => c.name).join(", ")}`);
	
	return hoyoverseCookies;
}

// Function to get profile data for games
async function getProfileData() {
	const cookies = await browser.cookies.getAll({ domain: '.hoyoverse.com' });
	
	// Check if we have required cookies
	const cookieStr = cookies
		.filter(cookie => ['ltoken_v2', 'ltuid_v2', 'account_id_v2'].includes(cookie.name))
		.map(cookie => `${cookie.name}=${cookie.value}`)
		.join('; ');
		
	if (!cookieStr.includes('ltoken_v2') || !cookieStr.includes('ltuid_v2')) {
		throw new Error('Missing required authentication cookies');
	}
	
	logToStorage('Fetching profile data from HoYoLAB');
	
	// Get profile data from HoYoLAB
	const profileData = {};
	
	try {
		// First fetch Genshin Impact data
		const genshinResponse = await fetch('https://bbs-api-os.hoyolab.com/game_record/genshin/api/index', {
			method: 'GET',
			headers: {
				'Cookie': cookieStr,
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
			}
		});
		
		const genshinData = await genshinResponse.json();
		if (genshinData.retcode === 0 && genshinData.data && genshinData.data.list) {
			for (const account of genshinData.data.list) {
				profileData.genshin = {
					uid: account.game_role_id,
					nickname: account.nickname,
					region: account.region,
					level: account.level
				};
				break; // Just get the first account
			}
		}
	} catch (error) {
		logToStorage(`Error fetching Genshin Impact profile: ${error.message}`);
	}
	
	try {
		// Fetch Honkai Star Rail data
		const starRailResponse = await fetch('https://bbs-api-os.hoyolab.com/game_record/hkrpg/api/index', {
			method: 'GET',
			headers: {
				'Cookie': cookieStr,
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
			}
		});
		
		const starRailData = await starRailResponse.json();
		if (starRailData.retcode === 0 && starRailData.data && starRailData.data.list) {
			for (const account of starRailData.data.list) {
				profileData.starrail = {
					uid: account.game_role_id,
					nickname: account.nickname,
					region: account.region,
					level: account.level
				};
				break;
			}
		}
	} catch (error) {
		logToStorage(`Error fetching Star Rail profile: ${error.message}`);
	}
	
	try {
		// Fetch ZZZ data
		const zzzResponse = await fetch('https://bbs-api-os.hoyolab.com/game_record/nap/api/index', {
			method: 'GET',
			headers: {
				'Cookie': cookieStr,
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
			}
		});
		
		const zzzData = await zzzResponse.json();
		if (zzzData.retcode === 0 && zzzData.data && zzzData.data.list) {
			for (const account of zzzData.data.list) {
				profileData.zzz = {
					uid: account.game_role_id,
					nickname: account.nickname,
					region: account.region,
					level: account.level
				};
				break;
			}
		}
	} catch (error) {
		logToStorage(`Error fetching ZZZ profile: ${error.message}`);
	}
	
	try {
		// Fetch Honkai Impact 3rd data
		const honkaiResponse = await fetch('https://bbs-api-os.hoyolab.com/game_record/hi3/api/index', {
			method: 'GET',
			headers: {
				'Cookie': cookieStr,
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
			}
		});
		
		const honkaiData = await honkaiResponse.json();
		if (honkaiData.retcode === 0 && honkaiData.data && honkaiData.data.list) {
			for (const account of honkaiData.data.list) {
				profileData.honkai3rd = {
					uid: account.game_role_id,
					nickname: account.nickname,
					region: account.region,
					level: account.level
				};
				break;
			}
		}
	} catch (error) {
		logToStorage(`Error fetching Honkai Impact profile: ${error.message}`);
	}
	
	return profileData;
}

// Function to clean up system_busy codes
async function cleanupSystemBusyCodes() {
	try {
		const usedCodesObj = await browser.storage.local.get('usedCodes');
		let usedCodes = Array.isArray(usedCodesObj.usedCodes) ? usedCodesObj.usedCodes : [];
		
		// 過濾掉所有狀態為system_busy的代碼
		const filteredCodes = usedCodes.filter(code => {
			return !(typeof code === 'object' && code.status === 'system_busy');
		});
		
		// 如果有變化，則保存回存儲
		if (filteredCodes.length !== usedCodes.length) {
			const removedCount = usedCodes.length - filteredCodes.length;
			await browser.storage.local.set({ usedCodes: filteredCodes });
			logToStorage(`Cleaned up ${removedCount} codes with system_busy status from used codes list`);
		}
	} catch (error) {
		logToStorage(`Error cleaning up system_busy codes: ${error.message}`);
	}
}

// Add event listener for extension initialization
browser.runtime.onInstalled.addListener(async () => {
	// ... existing code if any ...
	
	// Clean up system_busy codes
	await cleanupSystemBusyCodes();
	
	// ... existing code if any ...
});

// 專門為ZZZ處理的兌換函數，模仿成功的實現
async function redeemZZZCode(uid, code) {
	try {
		logToStorage(`使用專用方法兌換ZZZ代碼 "${code}" (UID: ${uid})`);
		
		// 獲取認證cookies
		const cookies = await browser.cookies.getAll({domain: '.hoyoverse.com'});
		
		// 只保留必要的cookie
		const whitelist = ["cookie_token_v2", "account_mid_v2", "account_id_v2", "cookie_token", "account_id"];
		const cookieStr = cookies
			.filter(cookie => whitelist.includes(cookie.name))
			.map(cookie => `${cookie.name}=${cookie.value}`)
			.join('; ');
		
		if (!cookieStr.includes('cookie_token_v2') || !cookieStr.includes('account_mid_v2')) {
			const errorMsg = 'Missing required authentication cookies';
			logToStorage(errorMsg);
			return { success: false, data: { reason: errorMsg } };
		}
		
		// 準備URL和參數
		const url = new URL("https://public-operation-nap.hoyoverse.com/common/apicdkey/api/webExchangeCdkey");
		url.searchParams.append("uid", uid);
		url.searchParams.append("region", getRegionFromUID(uid, "zzz"));
		url.searchParams.append("lang", "en");
		url.searchParams.append("cdkey", code);
		url.searchParams.append("game_biz", "nap_global");
		url.searchParams.append("t", Date.now());
		
		// 發送請求，只使用Cookie頭
		const response = await fetch(url.toString(), {
			method: 'GET',
			headers: {
				'Cookie': cookieStr
			}
		});
		
		const data = await response.json();
		logToStorage(`ZZZ專用方法兌換結果: ${JSON.stringify(data)}`);
		
		// 處理結果
		if (data.retcode === 0) {
			logToStorage(`Successfully redeemed ZZZ code "${code}" (UID: ${uid})`);
			
			// 添加到已使用列表
			try {
				const usedCodesObj = await browser.storage.local.get('usedCodes');
				let usedCodes = Array.isArray(usedCodesObj.usedCodes) ? usedCodesObj.usedCodes : [];
				
				// 檢查代碼是否已存在
				const codeExists = usedCodes.some(c => 
					typeof c === 'object' && c.code === code || 
					typeof c === 'string' && c === code
				);
				
				if (!codeExists) {
					usedCodes.push({
						code: code,
						game: 'zzz',
						timestamp: new Date().toISOString(),
						status: 'success'
					});
					await browser.storage.local.set({ usedCodes: usedCodes });
					logToStorage(`Added ZZZ code "${code}" to used codes list with status: success`);
				}
			} catch (error) {
				logToStorage(`Error adding ZZZ code to usedCodes: ${error.message}`);
			}
			
			return { success: true, data: { message: 'Code redeemed successfully!' } };
		} else {
			// 處理錯誤
			const errorMsg = data.message || 'Unknown error';
			logToStorage(`Failed to redeem ZZZ code "${code}" (UID: ${uid}): ${errorMsg}`);
			
			// 如果是已使用的代碼，添加到已使用列表
			if (data.retcode === -2017 || 
				(data.message && (
					data.message.includes('already been used') || 
					data.message.includes('already claimed') || 
					data.message.includes('already redeemed') || 
					data.message.includes('已領取') ||
					data.message.includes('already in use')
				))
			) {
				try {
					const usedCodesObj = await browser.storage.local.get('usedCodes');
					let usedCodes = Array.isArray(usedCodesObj.usedCodes) ? usedCodesObj.usedCodes : [];
					
					// 檢查代碼是否已存在
					const codeExists = usedCodes.some(c => 
						typeof c === 'object' && c.code === code || 
						typeof c === 'string' && c === code
					);
					
					if (!codeExists) {
						usedCodes.push({
							code: code,
							game: 'zzz',
							timestamp: new Date().toISOString(),
							status: 'already_redeemed'
						});
						await browser.storage.local.set({ usedCodes: usedCodes });
						logToStorage(`Added ZZZ code "${code}" to used codes list with status: already_redeemed`);
					}
				} catch (error) {
					logToStorage(`Error adding ZZZ code to usedCodes: ${error.message}`);
				}
			}
			
			return { success: false, data: { reason: errorMsg } };
		}
	} catch (error) {
		const errorMsg = `Error redeeming ZZZ code "${code}": ${error.message}`;
		logToStorage(errorMsg);
		return { success: false, data: { reason: errorMsg } };
	}
}