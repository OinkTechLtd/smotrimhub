require('dotenv').config();
const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const dayjs = require('dayjs');

const SOURCE_URL = process.env.SOURCE_URL || 'https://streamlive.freedev.app';
const SAVE_INTERVAL_DAYS = parseInt(process.env.SAVE_INTERVAL_DAYS || '30', 10);
const ARCHIVE_DIR = path.join(__dirname, 'archive');
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

const log = (level, message) => {
    if (LOG_LEVEL === 'debug' || LOG_LEVEL === 'info' || LOG_LEVEL === 'warn' || LOG_LEVEL === 'error' && (level === 'debug' && LOG_LEVEL === 'debug' || level === 'info' && (LOG_LEVEL === 'info' || LOG_LEVEL === 'warn' || LOG_LEVEL === 'error') || level === 'warn' && (LOG_LEVEL === 'warn' || LOG_LEVEL === 'error') || level === 'error' && LOG_LEVEL === 'error')) {
        console.log(`[${dayjs().format('YYYY-MM-DD HH:mm:ss')}] [${level.toUpperCase()}] ${message}`);
    }
};

const ensureDirExists = (dirPath) => {
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
        log('info', `Directory created: ${dirPath}`);
    }
};

const fetchChannelData = async (url) => {
    try {
        const { data } = await axios.get(url);
        const $ = cheerio.load(data);
        const channels = [];
        
        $('h3.title').each((_, element) => {
            const channelName = $(element).text().trim();
            const channelUrl = $(element).next('a').attr('href');
            if (channelName && channelUrl) {
                channels.push({
                    name: channelName,
                    url: new URL(channelUrl, SOURCE_URL).href
                });
            }
        });
        log('debug', `Fetched ${channels.length} channels from ${url}`);
        return channels;
    } catch (error) {
        log('error', `Error fetching channel data from ${url}: ${error.message}`);
        return [];
    }
};

const saveChannelArchive = (channel) => {
    ensureDirExists(ARCHIVE_DIR);
    const timestamp = dayjs().format('YYYYMMDD_HHmmss');
    const safeChannelName = channel.name.replace(/[^a-zA-Z0-9]/g, '_');
    const filename = `${safeChannelName}_${timestamp}.html`;
    const filepath = path.join(ARCHIVE_DIR, filename);

    try {
        const channelContent = fs.readFileSync(path.join(__dirname, 'templates', 'channel.html'), 'utf-8');
        const finalContent = channelContent
            .replace('{{CHANNEL_NAME}}', channel.name)
            .replace('{{CHANNEL_URL}}', channel.url)
            .replace('{{CURRENT_DATE}}', dayjs().format('YYYY-MM-DD HH:mm:ss'))
            .replace('{{SOURCE_URL}}', SOURCE_URL);
            
        fs.writeFileSync(filepath, finalContent, 'utf-8');
        log('info', `Channel archived: ${filename}`);
    } catch (error) {
        log('error', `Error saving archive for channel ${channel.name}: ${error.message}`);
    }
};

const updateChannelInfo = async (channel) => {
    try {
        const { data } = await axios.get(channel.url);
        const $ = cheerio.load(data);
        
        // Example: Extracting view count (adjust selectors based on actual site structure)
        const viewCount = $('.view-count').first().text().trim(); // This is a placeholder selector
        log('debug', `Updating info for ${channel.name}: Views - ${viewCount}`);
        
        // In a real scenario, you would update a database or a local file with these new details.
        // For this example, we'll just log it.
        return { ...channel, views: viewCount || 'N/A' };
    } catch (error) {
        log('warn', `Could not update info for ${channel.name}: ${error.message}`);
        return channel;
    }
};

const processChannels = async () => {
    log('info', 'Starting channel processing...');
    const channels = await fetchChannelData(SOURCE_URL);
    
    if (channels.length === 0) {
        log('warn', 'No channels found. Skipping processing.');
        return;
    }

    ensureDirExists(ARCHIVE_DIR);

    log('info', `Found ${channels.length} channels. Processing...`);

    for (const channel of channels) {
        // Update channel info (views, schedule, etc.)
        const updatedChannel = await updateChannelInfo(channel);
        
        // Archive the channel periodically
        const archiveFilePath = path.join(ARCHIVE_DIR, `${updatedChannel.name.replace(/[^a-zA-Z0-9]/g, '_')}_latest.html`); // Keep a 'latest' version
        if (!fs.existsSync(archiveFilePath) || dayjs(fs.statSync(archiveFilePath).mtime).add(SAVE_INTERVAL_DAYS, 'day').isBefore(dayjs())) {
            saveChannelArchive(updatedChannel);
            // Optionally, update a 'latest' archive file
            try {
                const timestamp = dayjs().format('YYYYMMDD_HHmmss');
                const safeChannelName = updatedChannel.name.replace(/[^a-zA-Z0-9]/g, '_');
                const latestFilename = `${safeChannelName}_latest.html`;
                const latestFilepath = path.join(ARCHIVE_DIR, latestFilename);
                const channelContent = fs.readFileSync(path.join(__dirname, 'templates', 'channel.html'), 'utf-8');
                const finalContent = channelContent
                    .replace('{{CHANNEL_NAME}}', updatedChannel.name)
                    .replace('{{CHANNEL_URL}}', updatedChannel.url)
                    .replace('{{CURRENT_DATE}}', dayjs().format('YYYY-MM-DD HH:mm:ss'))
                    .replace('{{SOURCE_URL}}', SOURCE_URL);
                fs.writeFileSync(latestFilepath, finalContent, 'utf-8');
                log('debug', `Updated latest archive for ${updatedChannel.name}`);
            } catch (error) {
                log('error', `Failed to update latest archive for ${updatedChannel.name}: ${error.message}`);
            }
        } else {
            log('debug', `Channel ${updatedChannel.name} already archived recently.`);
        }
    }
    log('info', 'Channel processing finished.');
};

// Command line argument parsing for specific tasks
const [, , cmd] = process.argv;

if (cmd === 'archive') {
    log('info', 'Executing manual archive task...');
    processChannels().catch(error => {
        log('error', `Manual archive task failed: ${error.message}`);
    });
} else {
    log('info', 'Starting SmotrimHub application...');
    // Initial run
    processChannels();

    // Schedule recurring tasks
    const intervalMinutes = SAVE_INTERVAL_DAYS * 24 * 60;
    setInterval(processChannels, intervalMinutes * 60 * 1000); // Convert days to milliseconds
    log('info', `Scheduled channel processing every ${SAVE_INTERVAL_DAYS} days.`);
}

// Placeholder for a template file (create a 'templates' directory and 'channel.html' inside it)
// Example content for templates/channel.html:
// <!DOCTYPE html>
// <html lang="en">
// <head>
//     <meta charset="UTF-8">
//     <meta name="viewport" content="width=device-width, initial-scale=1.0">
//     <title>{{CHANNEL_NAME}} - Archived {{CURRENT_DATE}}</title>
//     <meta name="description" content="Archive of {{CHANNEL_NAME}} from {{SOURCE_URL}}">
//     <link rel="canonical" href="{{CHANNEL_URL}}">
// </head>
// <body>
//     <h1>{{CHANNEL_NAME}}</h1>
//     <p>This is an archived copy of the channel from {{SOURCE_URL}}.</p>
//     <p>Archived on: {{CURRENT_DATE}}</p>
//     <p>Original URL: <a href="{{CHANNEL_URL}}">{{CHANNEL_URL}}</a></p>
//     <p>Current Views (as of archive): {{VIEWS}}</p>
// </body>
// </html>
