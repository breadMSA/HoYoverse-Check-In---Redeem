if (typeof browser === "undefined") {
	browser = chrome;
	browser.browserAction = chrome.action;
}

const GAME_CONFIGS = {
	genshin: {
		name: "Genshin Impact",
		act_id: "e202102251931481",
		apiHost: "sg-hk4e-api.hoyolab.com",
		referer: "https://act.hoyolab.com/ys/event/signin-sea-v3/index.html?act_id=e202102251931481",
		apiEndpoint: "/event/sol/sign"
	},
	starrail: {
		name: "Honkai: Star Rail",
		act_id: "e202303301540311",
		apiHost: "sg-public-api.hoyolab.com",
		referer: "https://act.hoyolab.com/bbs/event/signin/hkrpg/index.html?act_id=e202303301540311",
		apiEndpoint: "/event/luna/os/sign"
	},
	zzz: {
		name: "Zenless Zone Zero",
		act_id: "e202406031448091",
		apiHost: "sg-act-nap-api.hoyolab.com",
		referer: "https://act.hoyolab.com/bbs/event/signin/zzz/e202406031448091.html?act_id=e202406031448091",
		apiEndpoint: "/event/luna/zzz/os/sign"
	},
	honkai3rd: {
		name: "Honkai Impact 3rd",
		act_id: "e202110291205111",
		apiHost: "sg-public-api.hoyolab.com",
		referer: "https://act.hoyolab.com/bbs/event/signin-bh3/index.html?act_id=e202110291205111",
		apiEndpoint: "/event/mani/sign"
	}
};

function getCurrDay() {
	var now = new Date();
	now.setMinutes(now.getMinutes() + now.getTimezoneOffset());
	now.setHours(now.getHours() + 8);
	return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

// For debugging
// Writes are chained so concurrent calls don't overwrite each other's entries
// (previously each call did its own get+set, and parallel logs were silently lost).
let logWriteChain = Promise.resolve();
function logToStorage(message) {
	const timestamp = new Date().toISOString();
	const logMessage = `${timestamp}: ${message}`;

	logWriteChain = logWriteChain
		.then(() => browser.storage.local.get({debug_logs: []}))
		.then(data => {
			const logs = data.debug_logs || [];
			logs.push(logMessage);

			// Keep only the last 100 logs
			while (logs.length > 100) {
				logs.shift();
			}

			return browser.storage.local.set({debug_logs: logs});
		})
		.catch(error => console.error("Failed to write log:", error));

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

function needsCheckin(lastChecked, currentDay) {
	if (!lastChecked) return true;
	
	const lastCheckedDate = new Date(lastChecked);
	lastCheckedDate.setHours(0, 0, 0, 0);
	
	return lastCheckedDate < currentDay;
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
		// The old "open a tab and click the button" fallback relied on tabs.executeScript,
		// which does not exist in Manifest V3: it left a background tab open on every
		// failed attempt (every 15 minutes) and never resolved. Just use the API result.
		return await requestGameCheckin(game, config, getCurrDay());
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
		
		if (promises.length === 0) {
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
			redeemCode(message.game, message.uid, message.code).then(sendResponse);
			return true; // Keep the messaging channel open for the asynchronous response
			
		case "checkCodes":
		checkAndRedeemCodes();
		sendResponse({ success: true });
			break;
			
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
	
	// ZZZ regions: decided by the UID prefix (the digits before the last 8)
	// 10 = America, 15 = Europe, 13 = Asia, 17 = TW/HK/MO
	// "global01" is not a valid ZZZ region; the API answers it with -1009 "System busy"
	if (game === "zzz") {
		const prefix = uid.length > 8 ? uid.slice(0, uid.length - 8) : "";
		const zzzRegions = {
			"10": "prod_gf_us",
			"15": "prod_gf_eu",
			"13": "prod_gf_jp",
			"17": "prod_gf_sg"
		};
		return zzzRegions[prefix] || "prod_gf_us";
	}
	
	// Default to USA/Global
	return "os_usa";
}

// Redemption endpoint per game
const REDEEM_ENDPOINTS = {
	genshin: {
		url: 'https://sg-hk4e-api.hoyoverse.com/common/apicdkey/api/webExchangeCdkey',
		game_biz: 'hk4e_global',
		extraParams: { sLangKey: 'en-us' }
	},
	starrail: {
		url: 'https://sg-hkrpg-api.hoyoverse.com/common/apicdkey/api/webExchangeCdkey',
		game_biz: 'hkrpg_global'
	},
	zzz: {
		url: 'https://public-operation-nap.hoyoverse.com/common/apicdkey/api/webExchangeCdkey',
		game_biz: 'nap_global',
		cookieOnly: true // the ZZZ endpoint is only sent the Cookie header
	},
	honkai3rd: {
		url: 'https://sg-public-api.hoyoverse.com/common/apicdkey/api/webExchangeCdkey',
		game_biz: 'bh3_global'
	}
};

const AUTH_COOKIE_NAMES = ['cookie_token_v2', 'account_mid_v2', 'account_id_v2', 'ltoken_v2', 'ltuid_v2', 'cookie_token', 'account_id'];

// Decide what a redemption response means for this code.
// Returns a status to remember the code with, or null if it is a temporary
// problem (cooldown, system busy, not logged in...) and should be retried later.
function classifyRedeemResult(data) {
	const retcode = data.retcode;
	const msg = (data.message || '').toLowerCase();

	if (retcode === 0) return 'success';
	if (retcode === -2017 || retcode === -2018 ||
		/already (been )?(used|claimed|redeemed|in use)|已領取|已使用|已被使用|已兌換/.test(msg)) {
		return 'already_redeemed';
	}
	if (retcode === -2001 || /expired|usage limit|過期|已失效|已達上限/.test(msg)) {
		return 'expired';
	}
	if (retcode === -2003 || /invalid (redemption )?code|兌換碼無效|無效的兌換碼/.test(msg)) {
		return 'invalid';
	}
	return null;
}

// Serialise read-modify-write access to usedCodes so the manual redeem in the popup
// and the automatic redemption loop can't overwrite each other's entries.
let usedCodesChain = Promise.resolve();
function withUsedCodes(fn) {
	const run = usedCodesChain.then(async () => {
		const obj = await browser.storage.local.get('usedCodes');
		const usedCodes = Array.isArray(obj.usedCodes) ? obj.usedCodes : [];
		const changed = await fn(usedCodes);
		if (changed) {
			await browser.storage.local.set({ usedCodes: usedCodes });
		}
	});
	usedCodesChain = run.catch(() => {});
	return run;
}

// A code counts as handled for a game if it was recorded for that game,
// or recorded without a known game (legacy entries).
function isCodeRecorded(usedCodes, code, game) {
	return usedCodes.some(c => {
		if (typeof c === 'string') return c === code;
		return c && c.code === code && (c.game === game || !c.game || c.game === 'unknown');
	});
}

async function recordCodeResult(code, game, status) {
	try {
		await withUsedCodes(usedCodes => {
			if (isCodeRecorded(usedCodes, code, game)) return false;
			usedCodes.push({
				code: code,
				game: game,
				timestamp: new Date().toISOString(),
				status: status
			});
			logToStorage(`Recorded code "${code}" for ${game} with status: ${status}`);
			return true;
		});
	} catch (error) {
		logToStorage(`Error recording code "${code}": ${error.message}`);
	}
}

// Redeem a code for any supported game. Returns { success, status, data }.
async function redeemCode(game, uid, code) {
	try {
		logToStorage(`Attempting to redeem code "${code}" for ${game} (UID: ${uid})`);

		const endpoint = REDEEM_ENDPOINTS[game];
		if (!endpoint) {
			const errorMsg = `Unsupported game: ${game}`;
			logToStorage(errorMsg);
			return { success: false, status: null, data: { reason: errorMsg } };
		}

		const cookies = await browser.cookies.getAll({ domain: '.hoyoverse.com' });
		const cookieStr = cookies
			.filter(cookie => AUTH_COOKIE_NAMES.includes(cookie.name))
			.map(cookie => `${cookie.name}=${cookie.value}`)
			.join('; ');

		if (!cookieStr.includes('cookie_token_v2') || !cookieStr.includes('account_mid_v2')) {
			const errorMsg = 'Missing required authentication cookies';
			logToStorage(errorMsg);
			return { success: false, status: null, data: { reason: errorMsg } };
		}

		const url = new URL(endpoint.url);
		const params = {
			uid: uid,
			region: getRegionFromUID(uid, game),
			lang: 'en',
			cdkey: code,
			game_biz: endpoint.game_biz,
			...(endpoint.extraParams || {}),
			t: Date.now()
		};
		for (const [key, value] of Object.entries(params)) {
			url.searchParams.append(key, value);
		}

		const headers = endpoint.cookieOnly
			? { 'Cookie': cookieStr }
			: {
				'Cookie': cookieStr,
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/113.0.0.0 Safari/537.36'
			};

		const response = await fetch(url.toString(), { method: 'GET', headers: headers });
		const data = await response.json();
		logToStorage(`Redemption response for "${code}" (${game}): ${JSON.stringify(data)}`);

		const status = classifyRedeemResult(data);
		if (status) {
			await recordCodeResult(code, game, status);
		}

		if (status === 'success') {
			logToStorage(`Successfully redeemed code "${code}" for ${game} (UID: ${uid})`);
			return { success: true, status: status, data: { message: 'Code redeemed successfully!' } };
		}

		const reason = data.message || 'Unknown error';
		logToStorage(`Failed to redeem code "${code}" for ${game} (UID: ${uid}) [retcode ${data.retcode}]: ${reason}`);
		return { success: false, status: status, data: { reason: reason } };
	} catch (error) {
		const errorMsg = `Error redeeming code "${code}" for ${game}: ${error.message}`;
		logToStorage(errorMsg);
		return { success: false, status: null, data: { reason: errorMsg } };
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

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
// HoYoverse rejects redemptions sent less than ~5 seconds apart
const REDEEM_INTERVAL_MS = 6000;

// Function to check for and redeem new codes
async function checkAndRedeemCodes() {
	try {
		logToStorage('Starting automatic code redemption check');

		// 設定是存在 storage.local（見 saveSettings）
		const settings = await browser.storage.local.get({
			genshin_enabled: true,
			starrail_enabled: true,
			zzz_enabled: true,
			auto_redeem_enabled: true
		});

		if (!settings.auto_redeem_enabled) {
			logToStorage('Automatic code redemption is disabled');
			return;
		}

		// Only games that have a public code feed (see fetchNewCodes)
		const games = ['genshin', 'starrail', 'zzz'].filter(id => settings[`${id}_enabled`]);

		await migrateLegacyUsedCodes();

		for (const game of games) {
			try {
				const uids = await getUidsForGame(game);
				if (uids.length === 0) {
					logToStorage(`No UIDs found for ${game}`);
					continue;
				}

				const activeCodes = await fetchNewCodes(game);
				const { usedCodes = [] } = await browser.storage.local.get('usedCodes');
				const pending = activeCodes.filter(code => !isCodeRecorded(usedCodes, code, game));

				if (pending.length === 0) {
					logToStorage(`No new codes to redeem for ${game}`);
					continue;
				}

				logToStorage(`Found ${pending.length} new codes for ${game}: ${pending.join(', ')}`);

				for (const uid of uids) {
					for (let i = 0; i < pending.length; i++) {
						await redeemCode(game, uid, pending[i]);
						if (i < pending.length - 1) {
							await sleep(REDEEM_INTERVAL_MS);
						}
					}
				}
			} catch (error) {
				logToStorage(`Error processing ${game}: ${error.message}`);
			}
		}

		logToStorage('Automatic code redemption check completed');
	} catch (error) {
		logToStorage(`Error in checkAndRedeemCodes: ${error.message}`);
	}
}

// Old versions stored used codes as plain strings; convert them to objects
async function migrateLegacyUsedCodes() {
	await withUsedCodes(usedCodes => {
		let changed = false;
		for (let i = 0; i < usedCodes.length; i++) {
			const c = usedCodes[i];
			if (typeof c !== 'string') continue;
			let game = 'unknown';
			if (c === 'GENSHINGIFT' || c.startsWith('GS') || c.includes('GENSHIN')) {
				game = 'genshin';
			} else if (c === 'STARRAILGIFT' || c.includes('STARRAIL') || c === 'HYACINEHEALS' || c === 'CIPHERLOOT') {
				game = 'starrail';
			} else if (c === 'ZENLESSGIFT' || c.includes('ZZZ')) {
				game = 'zzz';
			}
			usedCodes[i] = { code: c, game: game, timestamp: new Date().toISOString(), status: 'converted' };
			changed = true;
		}
		if (changed) logToStorage('Converted old usedCodes format to new format');
		return changed;
	});
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
