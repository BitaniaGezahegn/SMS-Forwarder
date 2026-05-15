# SMS Forwarder to Telegram

A Chrome Extension that reliably forwards SMS and MMS messages from a specific contact on [Google Messages for Web](https://messages.google.com/web/) directly to a Telegram channel or chat.

This extension is particularly useful for automatically forwarding 2FA codes, bank transaction alerts, or any other important messages from a specific sender to a central Telegram group.

## Features

- **Real-time Forwarding**: Automatically detects incoming messages from your configured contact and forwards them instantly.
- **Manual Batch Forwarding**: Need to forward past messages? Enter a specific Transaction ID (or keyword) to trigger a manual forward of that message and all subsequent messages in the conversation.
- **Specific Contact Filtering**: Only messages from the exact contact name or number you specify will be forwarded, ensuring privacy and avoiding spam.
- **Stateless & Resilient**: The extension is built to be robust, processing messages without relying on heavy local state, reducing the risk of duplicates or missed messages.
- **No Background Script Overhead**: Uses modern Chrome Extension Manifest V3 features with content scripts taking the heavy lifting, ensuring efficiency.

## Installation

### Prerequisites
1. You must use Google Messages as your default SMS app on your Android phone.
2. You must be signed into [Google Messages for Web](https://messages.google.com/web/) in your Chrome browser.
3. You need a Telegram Bot Token and a Channel/Chat ID.

### Loading the Extension

Since this extension is not published on the Chrome Web Store, you need to load it manually:

1. Download or clone this repository to your local machine.
2. Open Google Chrome and navigate to `chrome://extensions/`.
3. Enable **"Developer mode"** in the top right corner.
4. Click on **"Load unpacked"** in the top left corner.
5. Select the folder containing the extension files.

## Configuration

### 1. Set Up Your Telegram Bot
1. Open Telegram and search for the **@BotFather**.
2. Send the command `/newbot` and follow the instructions to create a new bot.
3. Copy the **HTTP API Token** provided by the BotFather (e.g., `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`).
4. Create a new Telegram Channel or Group.
5. Add your newly created bot to the channel/group as an **Administrator** with at least "Post Messages" permission.
6. Get your Channel/Chat ID:
   - You can use bots like `@userinfobot` or forward a message from your channel to `@JsonDumpBot` to find the channel ID (usually starts with `-100`).

### 2. Configure the Extension
1. Click on the extension icon in your Chrome toolbar to open the settings popup.
2. Enter your **Telegram Bot Token**.
3. Enter your **Telegram Channel ID**.
4. Enter the **Target Contact**. This *must* exactly match the name or number as it appears in the chat header on Google Messages Web.
5. Click **"Save Settings"**.
6. (Optional) Click **"Test Message"** to verify that your Telegram configuration is correct.

## Usage

### Automatic Forwarding
Once configured, simply keep Google Messages for Web open in a tab. Whenever a new message arrives from the target contact, it will be automatically forwarded to Telegram.

### Manual Batch Forwarding
If you missed some messages or need to sync historical data:
1. Open the target contact's chat in Google Messages Web.
2. Click the extension icon.
3. In the **Manual Batch Forward** section, enter a unique string from a past message (like a Transaction ID).
4. Click **"Start Forwarding"**.
5. The extension will locate the message containing that string and forward it, along with all messages that appear after it in the loaded chat history.

## Permissions Explained

- `storage`: Used to securely save your Bot Token, Channel ID, Target Contact, and forwarding history locally in your browser.
- `alarms`: Used for background scheduling and retry mechanisms.
- `notifications`: Used to alert you if a forward fails or if a batch process completes.
- `Host Permissions`:
  - `*://messages.google.com/web/*`: Required to read the messages from the web interface.
  - `https://api.telegram.org/*`: Required to send the messages to the Telegram API.

## Contributing

Contributions are welcome! If you find a bug or have a feature request, please open an issue or submit a pull request.
