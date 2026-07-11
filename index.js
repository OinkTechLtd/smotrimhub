const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cheerio = require('cheerio');
const dayjs = require('dayjs');

require('dotenv').config();

const SOURCE_URL = process.env.SOURCE_URL || 'https://streamlive.freedev.app';
const SAVE_INTERVAL_DAYS = parseInt(process.env.SAVE_INTERVAL_DAYS || '30', 10);
const DATA_DIR = path.join(__dirname, 'data');
const CHANNELS_FILE = path.join(DATA_DIR, 'channels.json');
const ARCHIVE_DIR = path.join(__dirname, 'archive');

let cachedChannels = [];

// Создаем директории, если они не существуют
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR);
}
if (!fs.existsSync(ARCHIVE_DIR)) {
    fs.mkdirSync(ARCHIVE_DIR);
}

// Функция для загрузки каналов
async function fetchChannels() {
    try {
        console.log(`Fetching channels from ${SOURCE_URL}...`);
        const response = await axios.get(SOURCE_URL);
        const $ = cheerio.load(response.data);
        const channels = [];

        // Пример парсинга. Необходимо адаптировать под реальную структуру HTML
        // Этот код предполагает, что каналы представлены как элементы списка или div'ы с определенным классом
        // Пример: $('.channel-item').each(...) 
        // Замените '.channel-item' на реальный селектор.
        
        // Для примера, предположим, что у нас есть список <a> тегов с каналами
        // В реальном приложении вам потребуется более точный парсинг HTML.
        
        // Пример: предположим, что каждый канал имеет ссылку и название
        $('a.channel-link').each((index, element) => {
            const channelName = $(element).text().trim();
            const channelUrl = $(element).attr('href');
            if (channelName && channelUrl) {
                channels.push({
                    id: index.toString(), // Или другой уникальный идентификатор
                    name: channelName,
                    url: new URL(channelUrl, SOURCE_URL).toString(), // Полный URL
                    views: Math.floor(Math.random() * 10000), // Placeholder для просмотров
                    schedule: `Schedule for ${channelName}` // Placeholder для расписания
                });
            }
        });

        console.log(`Fetched ${channels.length} channels.`);
        return channels;
    } catch (error) {
        console.error('Error fetching channels:', error.message);
        return [];
    }
}

// Функция для сохранения каналов в файл
function saveChannelsToFile(channels, filename) {
    try {
        fs.writeFileSync(filename, JSON.stringify(channels, null, 2), 'utf-8');
        console.log(`Channels saved to ${filename}`);
    } catch (error) {
        console.error('Error saving channels to file:', error.message);
    }
}

// Функция для загрузки каналов из файла
function loadChannelsFromFile() {
    if (fs.existsSync(CHANNELS_FILE)) {
        try {
            const data = fs.readFileSync(CHANNELS_FILE, 'utf-8');
            cachedChannels = JSON.parse(data);
            console.log(`Loaded ${cachedChannels.length} channels from ${CHANNELS_FILE}`);
        } catch (error) {
            console.error('Error loading channels from file:', error.message);
            cachedChannels = [];
        }
    }
}

// Функция для генерации SEO-оптимизированного контента
function generateSeoContent(channel) {
    // Здесь будет логика генерации SEO-оптимизированного HTML или текстового контента
    // Например, создание страницы с описанием канала, его расписанием и ссылками.
    return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>SmotrimHub - ${channel.name}</title>
            <meta name="description" content="Watch ${channel.name} live stream on SmotrimHub. Get updates on schedule and views.">
        </head>
        <body>
            <h1>${channel.name}</h1>
            <p>Current Views: ${channel.views}</p>
            <h2>Schedule</h2>
            <p>${channel.schedule}</p>
            <p>Live stream available at: <a href="${channel.url}">Link</a></p>
            <p>Content updated regularly.</p>
        </body>
        </html>
    `;
}

// Функция для сохранения архива
async function archiveChannels() {
    console.log('Starting archiving process...');
    const timestamp = dayjs().format('YYYY-MM-DD_HH-mm-ss');
    const archiveFilePath = path.join(ARCHIVE_DIR, `channels_archive_${timestamp}.json`);

    try {
        // Сохраняем текущее состояние каналов
        fs.writeFileSync(archiveFilePath, JSON.stringify(cachedChannels, null, 2), 'utf-8');
        console.log(`Archive saved to ${archiveFilePath}`);

        // Также можно сохранить SEO-контент для каждого канала
        for (const channel of cachedChannels) {
            const seoContent = generateSeoContent(channel);
            const seoFileName = `${channel.name.replace(/[^a-zA-Z0-9]/g, '_')}_${timestamp}.html`;
            const seoFilePath = path.join(ARCHIVE_DIR, seoFileName);
            fs.writeFileSync(seoFilePath, seoContent, 'utf-8');
            console.log(`SEO content saved for ${channel.name} to ${seoFilePath}`);
        }
        console.log('Archiving process completed.');
    } catch (error) {
        console.error('Error during archiving process:', error.message);
    }
}

// Основная функция для обновления и сохранения
async function updateAndSave() {
    const newChannels = await fetchChannels();

    // Обновляем кеш каналов, сохраняя новые и удаляя отсутствующие (или просто перезаписывая)
    // В данном случае, для простоты, мы просто перезаписываем cachedChannels
    // Более сложная логика может включать сравнение и обновление существующих каналов.
    cachedChannels = newChannels;

    // Сохраняем актуальный список каналов
    saveChannelsToFile(cachedChannels, CHANNELS_FILE);

    // Выполняем архивацию, если прошло достаточно времени
    // Для первого запуска архивация может быть выполнена сразу или по расписанию
    // Здесь предполагается, что архивация происходит раз в SAVE_INTERVAL_DAYS
    // Более точная логика могла бы проверять дату последнего архивирования.
    console.log(`Next archiving will be based on interval of ${SAVE_INTERVAL_DAYS} days.`);
    // Можно добавить проверку текущей даты и даты последнего архивирования для точного запуска
    // Например: if (dayjs().diff(lastArchiveDate, 'days') >= SAVE_INTERVAL_DAYS) { archiveChannels(); lastArchiveDate = dayjs(); }
}

// Функция для периодического добавления новых каналов (имитация)
// В реальном приложении эта логика будет частью fetchChannels или отдельным процессом
async function addNewChannelsPeriodically() {
    // Эта функция предполагает, что fetchChannels уже возвращает актуальный список,
    // включая новые каналы, которые появились на SOURCE_URL.
    // Если нужно добавить каналы, которых НЕТ на SOURCE_URL, эта функция должна быть иной.
    // Для данной задачи, предполагается, что новые каналы появляются на SOURCE_URL
    // и fetchChannels их подхватывает.
    console.log('Checking for new channels to add (handled by fetchChannels).');
}

// Основная логика запуска
async function main() {
    console.log('SmotrimHub starting...');

    loadChannelsFromFile(); // Загружаем предыдущие данные

    // Первый запуск: обновление каналов и сохранение
    await updateAndSave();

    // Периодическая архивация (например, каждые SAVE_INTERVAL_DAYS)
    // Это простой пример, в реальном приложении нужна более надежная система планирования
    setInterval(async () => {
        console.log('\n--- Running scheduled tasks ---');
        await updateAndSave(); // Обновляем данные
        await archiveChannels(); // Выполняем архивацию
        await addNewChannelsPeriodically(); // Проверяем и добавляем новые каналы
        console.log('--- Scheduled tasks finished ---\n');
    }, SAVE_INTERVAL_DAYS * 24 * 60 * 60 * 1000); // Интервал в миллисекундах

}

main().catch(error => {
    console.error('An unexpected error occurred in main:', error);
});
