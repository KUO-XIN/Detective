
const fs = require('fs');
const path = require('path');

const MODEL = process.env.GROQ_MODEL || 'openai/gpt-oss-120b';
const PROMPT_DIRECTORY = path.join(__dirname, '../prompts');

const PROMPTS = {
    case01: {
        lin: 'lin.txt',
        chen: 'chen.txt',
        wang: 'wang.txt'
    },
    case02: {
        girl: 'girl.txt',
        parent: 'parent.txt',
        nurse: 'nurse.txt',
        doctor: 'doctor.txt',
        patient: 'patient.txt'
    }
};

function getSystemPrompt(caseId, suspect) {
    // 相容舊版 getSystemPrompt(suspect)
    if (typeof suspect === 'undefined') {
        suspect = caseId;
        caseId = 'case01';
    }

    const filename = PROMPTS[caseId]?.[suspect];

    if (!filename) {
        throw new Error(`找不到指定的案件或角色 Prompt：${caseId}/${suspect}`);
    }

    const promptPath = path.join(PROMPT_DIRECTORY, filename);

    if (!fs.existsSync(promptPath)) {
        throw new Error(`找不到角色設定檔：${filename}`);
    }

    return fs.readFileSync(promptPath, 'utf8').trim();
}

async function askGroq(caseId, suspect, conversationHistory = []) {
    // 相容舊版 askGroq(suspect, history)
    if (Array.isArray(suspect)) {
        conversationHistory = suspect;
        suspect = caseId;
        caseId = 'case01';
    }

    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        throw new Error('找不到 GROQ_API_KEY，請確認 .env 設定');
    }

    if (!Array.isArray(conversationHistory)) {
        throw new Error('對話紀錄格式錯誤');
    }

    const systemPrompt = getSystemPrompt(caseId, suspect);

    const validHistory = conversationHistory
        .filter(item =>
            item &&
            (item.role === 'user' || item.role === 'assistant') &&
            typeof item.content === 'string'
        )
        .map(item => ({
            role: item.role,
            content: item.content
        }));

    if (validHistory.length === 0) {
        throw new Error('沒有可供 AI 回覆的對話內容');
    }

    const messages = [
        {
            role: 'system',
            content: systemPrompt
        },
        ...validHistory
    ];

    let response;

    try {
        const requestBody = {
            model: MODEL,
            messages,
            temperature: 0.7
        };

        response = await fetch(
            'https://api.groq.com/openai/v1/chat/completions',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify(requestBody)
            }
        );
    } catch (error) {
        throw new Error(`無法連線至 Groq API：${error.message}`);
    }

    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error('Groq API 回傳的資料格式無效');
    }

    if (!response.ok) {
        const apiMessage = data?.error?.message;

        throw new Error(
            apiMessage
                ? `Groq API 錯誤：${apiMessage}`
                : `Groq API 呼叫失敗，HTTP 狀態碼：${response.status}`
        );
    }

    const answer = data?.choices?.[0]?.message?.content;

    if (typeof answer !== 'string' || !answer.trim()) {
        throw new Error('Groq API 沒有回傳有效內容');
    }

    return answer.trim();
}

module.exports = {
    askGroq,
    getSystemPrompt
};
