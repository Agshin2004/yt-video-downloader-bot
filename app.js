const TelegramApi = require('node-telegram-bot-api');
const fs = require('fs');
const ytdl = require('ytdl-core');
const slugify = require('slugify');
const _ = require('dotenv').config();
const path = require('path');
const { getYoutubeVideoID } = require('./utils');

const bot = new TelegramApi(process.env.API_KEY, {
    polling: true,
});

const commands = [
    {
        command: 'start',
        description: 'Start the bot',
    },
];

bot.setMyCommands(commands);

const downloadAndSendYtVideo = async (link, chatId, option) => {
    const { message_id: downloadStartedMsgId } = await bot.sendMessage(
        chatId,
        'Downloading started...'
    );

    if (option === 'video') {
        try {
            const video = ytdl(link, {
                quality: 'highest',
                filter: 'audioandvideo',
            });

            const uniqueFileName = `video_${chatId}_${Date.now()}.mp4`;
            const writableStream = fs.createWriteStream(uniqueFileName);
            video.pipe(writableStream);

            writableStream.on('finish', async () => {
                await bot.deleteMessage(chatId, downloadStartedMsgId);
                const { message_id: finishedMsgId } = await bot.sendMessage(
                    chatId,
                    'Finished downloading, sending video back...'
                );

                const stats = fs.statSync(`./${uniqueFileName}`);
                const fileSizeMB = Math.round(stats.size / (1024 * 1024));

                if (fileSizeMB > process.env.MAX_FILE_SIZE) {
                    await bot.deleteMessage(chatId, finishedMsgId);

                    await bot.sendMessage(
                        chatId,
                        'Video size is too big. Please choose a smaller video.'
                    );
                    fs.unlink(path.resolve(`./${uniqueFileName}`), (err) => {
                        if (err) throw err;

                        console.log('file deleted.');
                    });

                    return; // Exit the function to prevent further execution
                }

                await bot.sendVideo(chatId, `./${uniqueFileName}`);
                await bot.deleteMessage(chatId, finishedMsgId);

                fs.unlink(path.resolve(`./${uniqueFileName}`), (err) => {
                    if (err) throw err;

                    console.log('file deleted.');
                });
            });

            video.on('error', async (err) => {
                console.error('Download error:', err);
                await bot.sendMessage(
                    chatId,
                    'Error downloading the video. Please try again.'
                );
            });

            writableStream.on('error', (err) => {
                console.error('File writing error:', err);
            });
        } catch (err) {
            bot.sendMessage(
                chatId,
                'Unexpected error occured while downloading video, please try again.'
            );
        }
    } else if (option === 'audio') {
        try {
            const videoInfo = await ytdl.getInfo(link);
            const audio = ytdl(link, {
                quality: 'highest',
                filter: 'audioonly',
            });
            const title = videoInfo.videoDetails.title;

            const uniqueFileName = `audio_${slugify(title)}_${Date.now()}.mp3`;
            const writableStream = fs.createWriteStream(uniqueFileName);
            audio.pipe(writableStream);

            writableStream.on('finish', async () => {
                await bot.deleteMessage(chatId, downloadStartedMsgId);
                const { message_id: finishedMsgId } = await bot.sendMessage(
                    chatId,
                    'Finished downloading, sending audio back...'
                );

                await bot.sendAudio(chatId, `./${uniqueFileName}`);
                await bot.deleteMessage(chatId, finishedMsgId);

                fs.unlink(path.resolve(`./${uniqueFileName}`), (err) => {
                    if (err) throw new err();

                    console.log('file deleted.');
                });
            });

            audio.on('error', async (err) => {
                console.error('Download error:', err);
                await bot.sendMessage(
                    chatId,
                    'Error downloading the audio. Please try again.'
                );
            });

            writableStream.on('error', (err) => {
                console.error('File writing error:', err);
            });
        } catch (err) {
            bot.sendMessage(
                chatId,
                'Unexpected error occured while downloading audio, please try again.'
            );
        }
    }
};

const sendQualityOptions = async (chatId, videoId) => {
    try {
        const link = `https://youtube.com/watch?v=${videoId}`;

        const info = await ytdl.getInfo(link);
        const video = ytdl(link);
        const contentLength = info.formats.find(
            (f) => f.hasAudio && f.hasVideo && f.qualityLabel
        ).contentLength;

        const title = info.videoDetails.title;
        const likes = info.videoDetails.likes;
        const lengthSeconds = info.videoDetails.lengthSeconds;
        const author = `${info.videoDetails.author.name} ${info.videoDetails.author.user} ${info.videoDetails.author.user_url}`;
        const uploadDate = info.videoDetails.uploadDate;
        const fileSizeBytes = parseInt(contentLength, 10); // Convert string to number
        const fileSizeMB = Math.round(fileSizeBytes / (1024 * 1024)); // Convert to MB

        const inlineKeyboard = [
            [
                {
                    text: 'video',
                    callback_data: `o_video_${videoId}_${chatId}`,
                },
            ],
            [
                {
                    text: 'audio',
                    callback_data: `o_audio_${videoId}_${chatId}`,
                },
            ],
        ];

        // Send options as inline keyboard
        const videoQualityOptions = {
            reply_markup: JSON.stringify({
                inline_keyboard: inlineKeyboard,
            }),
            parse_mode: 'html',
        };

        if (Number(fileSizeMB) > Number(process.env.MAX_FILE_SIZE)) {
            await bot.sendMessage(
                chatId,
                'Video size is too big. Please choose a smaller video.'
            );
            video.destroy(); // Stop the download
            return; // Exit the function to prevent further execution
        }

        await bot.sendMessage(
            chatId,
            `
            <b>
                <i>${title}</i>\n
                <u>${fileSizeMB}MB</u>\n
                <em>Please select download options below👇👇👇</em>
                
                <u>Likes: ${likes}</u> 
                <u>Duration: ${(lengthSeconds / 60).toFixed(2)}</u>
                <u>Author: ${author}</u>
                <u>Upload Date: ${new Date(uploadDate)}</u>
            </b>
            `,
            videoQualityOptions
        );
    } catch (err) {
        console.log(err.message);
        console.log(err.name);
        await bot.sendMessage(chatId, 'Error occurred');
    }
};

const start = () => {
    bot.on('text', async (msg) => {
        const text = msg.text;
        const chatId = msg.chat.id;
        const youtubeRegex =
            /https?:\/\/(?:m\.|www\.)?youtube\.com\/watch\?v=[^&\s]+|https?:\/\/youtu\.be\/[^&\s]+/;

        if (text === '/start') {
            console.log(`NEW USER JOINED ${msg.chat.username}`);
            await bot.sendSticker(
                chatId,
                'CAACAgIAAxkBAAJnbmeY4z-vd2dRm7x536yTBXUWQssOAAIFAAPANk8T-WpfmoJrTXU2BA'
            );
            return bot.sendMessage(
                chatId,
                `Welcome, <b><em>${msg.chat.username}</em></b>\nSend YouTube link to download the video.`,
                {
                    parse_mode: 'html',
                }
            );
        }

        if (youtubeRegex.test(text)) {
            const link = getYoutubeVideoID(text);
            return sendQualityOptions(chatId, link);
        }

        return bot.sendMessage(chatId, 'I do not understand you.');
    });

    //* CALLBACK QUERY
    bot.on('callback_query', async (msg) => {
        if (msg.data.startsWith('o_')) {
            const option = msg.data.split('_')[1];
            const link = `https://youtube.com/watch?v=${
                msg.data.split('_')[2]
            }`;
            const chatId = msg.data.split('_')[3];
            downloadAndSendYtVideo(link, chatId, option);
            await bot.deleteMessage(chatId, msg.message.message_id);
        }
    });

    // if polling_error happens log it out to console
    bot.on('polling_error', (err) => console.log(err.data.error.message));
};

start();
