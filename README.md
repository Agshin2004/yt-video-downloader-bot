# YouTube Downloader Telegram Bot
This project is a Telegram bot that allows users to download YouTube videos and audio files directly by sending a YouTube link. The bot provides an option to download either video or audio and sends the requested file back to the user.

## Features
1. Download YouTube videos in the highest available quality (that has Audio in it, not the highest quality usually).

2. Download YouTube audio files.

3. Provides video information before downloading (title, likes, upload date, duration, author, size in MB).

3. Automatically deletes temporary files after sending them.

4. Uses Telegram's inline keyboard for an interactive user experience

## Prerequisites
- Node.js
- Telegram Bot Token

## Installation
1. Clone the repository
`git clone https://github.com/your-repo/telegram-youtube-downloader.git`
`cd telegram-youtube-downloader`
2. Install Dependencies
`npm install`
3. Create a .env file in the root directory and add your Telegram bot token:
`API_KEY=your_telegram_bot_token`

## Usage
`npm start`

## How it works
1. The bot listens for text messages and detects YouTube links.

2. When a YouTube link is detected, the bot fetches video details and presents download options.

3. The user selects either 'video' or 'audio' using inline buttons.

4. The bot downloads the selected format and sends it back to the user.

5. Temporary files are deleted from your machine after sending the file.

NOTE: File size cannot be larger than 100MB by default, can be changed though from .env MAX_FILE_SIZE