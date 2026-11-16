
require('dotenv').config();

const express = require('express');
const path = require('path');
const routes = require('./routes');

const app = express();

// 接收 JSON 格式的 API 請求。
app.use(express.json({ limit: '1mb' }));

// 首頁：案件選擇與遊戲介面。
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 簡易健康檢查。
app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

// 遊戲 API。
app.use('/api', routes);

// 未找到的 API 或頁面。
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: '找不到指定的 API 或頁面'
    });
});

// 統一處理未預期的伺服器錯誤。
app.use((err, req, res, next) => {
    console.error('Server Error:', err);

    if (res.headersSent) {
        return next(err);
    }

    res.status(err.status || 500).json({
        success: false,
        error: err.status === 400
            ? '請求資料格式錯誤'
            : '伺服器發生錯誤，請稍後再試'
    });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
});
