# miHoYo Games Auto Check-in Extension

A Chrome extension that automatically performs daily check-ins and code redemptions for miHoYo games in the background.

## Supported Games

- Genshin Impact
- Honkai: Star Rail
- Zenless Zone Zero
- Honkai Impact 3rd

## Features

- Automatic background check-ins without needing to open game pages
- Configurable settings to choose which games to check-in for
- Status tracking of successful check-ins
- Manual check-in option for immediate results
- Automatic code redemption in the background
- Hourly checks for new redemption codes
- Only requires your browser to be running

## Installation

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the folder containing the extension files
5. The extension icon should appear in your browser toolbar

## Usage

### Daily Check-ins
1. **Important**: You must be logged into [HoYoLAB](https://www.hoyolab.com/) in your browser. Use the "Log in to HoYoLAB" button if you're not already logged in.
2. Click on the extension icon to open the settings popup
3. Select which games you want to enable auto check-ins for
4. Click "Save Settings"
5. The extension will automatically check-in for your selected games once per day
6. If you want to perform a check-in immediately, click the "Check-in Now" button

### Automatic Code Redemption
1. Make sure you're logged into [HoYoLAB](https://www.hoyolab.com/) in your browser
2. Click on the extension icon to open the popup
3. Enter your UIDs for each game in the Auto Code Redemption section
4. Click "Save UIDs" to store your UIDs
5. Enable "Enable automatic code redemption" option
6. Click "Save Settings" to save your preferences
7. The extension will automatically check for and redeem new codes hourly
8. You can manually trigger a code check by clicking the "Check for Codes Now" button

## Code Source

This extension uses the api.ennead.cc service to fetch active redemption codes for all supported games. The codes are automatically fetched and applied in the background without any user intervention needed.

## Troubleshooting

If your check-ins or code redemptions are not successful, try these steps:

1. Ensure you're logged into HoYoLAB in your browser
2. Try clicking the "Check-in Now" button to perform a manual check-in
3. If manual check-in fails, click the "Log in to HoYoLAB" button to ensure your login is still valid
4. Check that you have selected at least one game in the settings
5. For code redemption issues, verify that:
   - Your UID is correct (9 digits)
   - You're properly logged into HoYoLAB
   - You've enabled automatic code redemption
6. If you're getting "Please log in to your account first" errors, try:
   - Logging out and back in to HoYoLAB
   - Visiting the official redemption page once manually

## Requirements

- You must be logged into your miHoYo/HoYoLAB account in the browser
- Your browser must be running for the check-ins and code redemptions to occur
- Internet connection is required
- Valid in-game UIDs are required for code redemptions

## Privacy

This extension only interacts with official miHoYo API endpoints and api.ennead.cc (for code fetching). No personal data is collected or transmitted to any third parties.

## License

This project is for educational purposes only. All game names and properties are trademarks of miHoYo/HoYoverse. 