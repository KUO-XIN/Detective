
const express = require('express');
const router = express.Router();
const { randomUUID } = require('crypto');
const { askGroq } = require('../services/groq');

// ======================================
// 原本的 Sample data API（保留）
// ======================================
const data = [];

router.get('/data', (req, res) => {
    res.json(data);
});

router.post('/data', (req, res) => {
    const newItem = req.body;
    data.push(newItem);
    res.json(newItem);
});

router.put('/data/:id', (req, res) => {
    const id = req.params.id;
    const updatedItem = req.body;
    data[id] = updatedItem;
    res.json(updatedItem);
});

// ======================================
// 共用遊戲設定
// ======================================
const MAX_QUESTIONS = 12;

const CASE_SUSPECTS = {
    case01: ['lin', 'chen', 'wang'],
    case02: ['girl', 'parent', 'nurse', 'doctor', 'patient']
};

const CASE01_CORRECT_ANSWERS = [
    '陳柏勳',
    '陈柏勋',
    'chen',
    '兇手是陳柏勳',
    '凶手是陈柏勋',
    '陳柏勳是兇手',
    '陈柏勋是凶手'
];

// ======================================
// CASE 01：午夜書房的最後訪客
// ======================================
const CASE01_TRUTH = {
    culprit: '陳柏勳',
    summary: '真正的兇手是死者周明遠的私人秘書陳柏勳。陳柏勳長期挪用公司資金，周明遠發現帳目異常，並準備將完整帳目交給會計師。為了阻止事情曝光，陳柏勳在案發當晚殺害了周明遠。',
    motive: '陳柏勳長期挪用公司資金。周明遠發現異常款項與陳柏勳經手的業務有關，並準備將完整帳目交給會計師。陳柏勳擔心挪用資金的事情曝光，因此決定殺害周明遠。',
    method: '陳柏勳在書房內與周明遠發生爭執，之後拿起書桌上的銅製鎮紙攻擊周明遠頭部，造成致命傷。犯案後，他離開書房。',
    timeline: [
        { time: '20:20', event: '林予安因遺產安排與父親周明遠發生爭執。' },
        { time: '20:35', event: '王美玲進入書房放置茶水。' },
        { time: '20:45', event: '周明遠傳訊息給會計師，表示隔天早上九點會交出完整帳目。' },
        { time: '20:52', event: '陳柏勳進入書房。' },
        { time: '21:00', event: '王美玲在書房附近聽到周明遠與一名男性爭吵，但沒有看清對方。' },
        { time: '21:04', event: '陳柏勳使用書桌上的銅製鎮紙攻擊周明遠。' },
        { time: '21:09', event: '陳柏勳離開書房。' },
        { time: '21:15', event: '王美玲將茶水放在書房外。' },
        { time: '21:30', event: '林予安發現周明遠的屍體。' }
    ],
    evidence: [
        { name: '銅製鎮紙', explanation: '鎮紙上有血跡及擦拭痕跡，與周明遠頭部的傷勢相符，是犯案使用的工具。' },
        { name: '走廊監視器', explanation: '監視器顯示陳柏勳於20:52進入書房，21:09離開，期間沒有其他人進入。' },
        { name: '廚房監視器', explanation: '畫面顯示林予安在20:55至21:18持續待在廚房，期間沒有離開。' },
        { name: '死者手機訊息', explanation: '周明遠在20:45傳訊息給會計師，表示隔天早上九點會交出完整帳目。' },
        { name: '公司帳目', explanation: '公司有多筆異常支出，與陳柏勳經手的業務有關，另有一份未寄出的調查報告草稿。' },
        { name: '王美玲的證詞', explanation: '王美玲在約21:00聽到周明遠與一名男性爭吵，但沒有看清對方的臉。' },
        { name: '林予安與父親的爭執', explanation: '林予安確實在20:20因遺產安排與父親發生爭執，但她在案發時段有廚房監視器作為不在場證明。' }
    ],
    suspects: [
        { name: '林予安', result: '不是兇手', explanation: '她曾與父親發生爭執，但20:55至21:18都在廚房，並非犯案者。' },
        { name: '陳柏勳', result: '真正的兇手', explanation: '他因挪用公司資金被周明遠發現，為了阻止事情曝光而犯案。' },
        { name: '王美玲', result: '不是兇手', explanation: '她曾在書房附近聽到爭吵，但沒有參與犯案，也沒有看清男性的身份。' }
    ]
};

// ======================================
// CASE 02：沉默的病房
// ======================================
const CASE02_TRUTH = {
    culprit: '小女孩',

    summary: '真正殺害男嬰的人是他的姐姐小女孩。中午家長離開病房後，小女孩仍獨自留在病房內，最後以雙手壓迫男嬰喉部，造成男嬰死亡。',

    motive: '小女孩非常喜歡弟弟，希望能一直陪伴他。她長期受到家長不當管教，也擔心弟弟長大後會遭受相同傷害。她認為自己無法改變家長，也無法保護弟弟免於未來的痛苦，因此產生扭曲的想法，認為只要讓弟弟不再長大，就能讓他永遠不必承受那些傷害。她將殺害弟弟錯誤地理解成保護。',

    method: '家長離開病房後，小女孩仍留在男嬰身旁，接著以雙手壓迫男嬰喉部，造成致命傷。',

    timeline: [
        { time: '上午', event: '護士進入病房替男嬰送藥。' },
        { time: '上午稍後', event: '護士離開病房後，在走廊與小女孩交談一段時間。' },
        { time: '中午', event: '小女孩與家長一同進入男嬰病房。' },
        { time: '中午', event: '家長責罵小女孩，並將她推倒。' },
        { time: '中午', event: '小女孩撞上金屬桌，桌子倒落並發出巨大聲響。' },
        { time: '中午稍後', event: '家長先離開病房，小女孩仍留在病房內。' },
        { time: '隨後', event: '小女孩以雙手壓迫男嬰喉部，造成男嬰死亡，之後離開病房。' },
        { time: '下午', event: '護士進入病房發現男嬰死亡，卻沒有立即通報。' }
    ],

    evidence: [
        {
            id: 'E01',
            name: '小女孩的日記',
            explanation: '日記顯示她非常喜歡弟弟，也對弟弟未來可能遭遇的事情感到擔憂。她希望弟弟能平安快樂，不直接提及家長施暴或殺害弟弟的動機。'
        },
        {
            id: 'E02',
            name: '死者檢查紀錄',
            explanation: '男嬰喉部有明顯手指壓迫痕跡，體內有藥物殘留；身體其他部位沒有明顯硬物敲擊傷。'
        },
        {
            id: 'E03',
            name: '走廊監控',
            explanation: '上午護士進入病房送藥，離開後與小女孩交談。中午小女孩與家長進入病房，家長先離開，小女孩稍後才離開。下午護士進入病房，很快又離開。監控沒有病房內部畫面。'
        },
        {
            id: 'E04',
            name: '病房現場紀錄',
            explanation: '病房內金屬桌倒落，桌面及部分結構有撞擊損壞。桌子倒落會發出明顯金屬撞擊聲，但無法判斷倒落時間與原因。'
        },
        {
            id: 'E05',
            name: '小女孩身體檢查',
            explanation: '小女孩身上有多處不同時期形成的瘀青，分布於四肢、頭部及身體其他部位。部分瘀青已逐漸消退，部分傷痕較新，其中一些新傷外觀與撞擊造成的傷害相符。舊傷與長期受到不當對待有關，新傷則與中午撞上金屬桌的事件相符。'
        },
        {
            id: 'E06',
            name: '醫療用藥紀錄',
            explanation: '紀錄列出男嬰當日藥物處方、使用時間與劑量。醫生開錯具鎮靜作用的處方藥，但藥物與劑量不足以造成死亡。'
        }
    ],

    suspects: [
        { name: '小女孩', result: '真正的兇手', explanation: '家長離開後，她仍留在病房，並以雙手壓迫男嬰喉部。' },
        { name: '家長', result: '不是直接兇手', explanation: '家長長期不當管教小女孩，中午也推倒她，但沒有證據證明家長直接殺害男嬰。' },
        { name: '護士', result: '不是兇手', explanation: '護士發現男嬰死亡後未立即通報，行為可疑，但不是殺害男嬰的人。' },
        { name: '醫生', result: '不是兇手', explanation: '醫生開錯藥，但藥物與劑量不足以造成死亡。' },
        { name: '隔壁房病人', result: '不是兇手', explanation: '病人只聽見聲音及看見走廊情況，沒有進入病房犯案。' }
    ]
};

// ======================================
// CASE02 結局
// ======================================
const CASE02_ENDINGS = {
    girl: {
        title: '真相揭露',
        message: '你成功找出真正的兇手。小女孩終於承認，是自己在家長離開後殺害了弟弟。她非常愛弟弟，卻因長期遭受家長不當對待，逐漸相信弟弟長大後也會遭遇相同的痛苦。她認為自己是在保護弟弟，卻做出了無法挽回的事。'
    },

    nurse: {
        title: '錯誤的結案',
        message: '你將護士認定為兇手。她下午進出病房後迅速離開，卻沒有立即通報，確實留下可疑之處。但目前的證據仍不足以證明她殺害男嬰，這次調查以錯誤的方向結案。'
    },

    doctor: {
        title: '錯誤的方向',
        message: '醫生確實開錯藥，男嬰體內也有藥物殘留，但藥物與劑量不足以造成死亡。你找到了一項醫療疏失，卻沒有提出足以證明醫生殺害男嬰的證據。'
    },

    patient: {
        title: '無法成立的指控',
        message: '隔壁房病人只聽見爭吵與撞擊聲，也看見部分走廊情況，沒有證據顯示他曾進入病房。你的指控缺乏實際依據。'
    },

    parent: {
        title: '悲劇的另一個源頭',
        message: '家長長期以不當方式管教小女孩，中午也曾推倒她。這些行為是整起悲劇的重要背景，但目前證據無法證明家長直接殺害男嬰。你雖然發現了家庭中的問題，卻仍未能確認真正的犯案者。'
    }
};

// ======================================
// 小女孩身體檢查
// 不作為獨立證據按鈕。
// 玩家透過推薦問題送出後才扣除詢問次數。
// ======================================
const GIRL_BODY_EXAM_QUESTION = '檢查小女孩的四肢及頭部';

const GIRL_BODY_EXAM_ANSWER =
    '檢查結果顯示，小女孩身上有多處不同時期形成的瘀青，分布於四肢、頭部及身體其他部位。部分瘀青已逐漸消退，部分傷痕則比較新；其中一些較新的傷勢外觀與撞擊造成的傷害相符。僅憑檢查結果，無法確認每一處傷痕的實際成因。';

// ======================================
// Session 管理
// 每個 Session 固定綁定一個案件。
// 各角色對話彼此獨立。
// ======================================
const sessions = new Map();

function createConversationMap(caseId) {
    return Object.fromEntries(
        CASE_SUSPECTS[caseId].map(id => [id, []])
    );
}

// ======================================
// 查詢案件設定
// ======================================
router.get('/case/:caseId', (req, res) => {
    const { caseId } = req.params;

    if (!CASE_SUSPECTS[caseId]) {
        return res.status(404).json({
            success: false,
            error: '案件不存在'
        });
    }

    res.json({
        success: true,
        caseId,
        suspects: CASE_SUSPECTS[caseId],
        maxQuestions: MAX_QUESTIONS
    });
});

// ======================================
// 建立遊戲 Session
// ======================================
router.post('/session', (req, res) => {
    const caseId = req.body?.caseId || 'case01';

    if (!CASE_SUSPECTS[caseId]) {
        return res.status(400).json({
            success: false,
            error: '無效的案件代號'
        });
    }

    const sessionId = randomUUID();

    sessions.set(sessionId, {
        caseId,
        conversations: createConversationMap(caseId),
        remainingQuestions: MAX_QUESTIONS,
        isProcessing: false,
        gameOver: false,
        submittedAnswer: null,
        isCorrect: null
    });

    res.json({
        success: true,
        sessionId,
        caseId,
        remainingQuestions: MAX_QUESTIONS,
        gameOver: false
    });
});

// ======================================
// 重新開始遊戲
// ======================================
router.post('/session/:sessionId/restart', (req, res) => {
    const { sessionId } = req.params;
    const session = sessions.get(sessionId);

    if (!session) {
        return res.status(404).json({
            success: false,
            error: 'Session 不存在'
        });
    }

    if (session.isProcessing) {
        return res.status(409).json({
            success: false,
            error: '目前仍有問題正在處理，請稍後再重新遊玩'
        });
    }

    session.conversations = createConversationMap(session.caseId);
    session.remainingQuestions = MAX_QUESTIONS;
    session.gameOver = false;
    session.submittedAnswer = null;
    session.isCorrect = null;

    res.json({
        success: true,
        message: '遊戲已重新開始',
        sessionId,
        caseId: session.caseId,
        remainingQuestions: MAX_QUESTIONS,
        gameOver: false
    });
});

// ======================================
// 嫌疑人對話
// ======================================
router.post('/chat', async (req, res) => {
    let session = null;

    try {
        const { sessionId, suspect, message } = req.body || {};

        if (typeof message !== 'string' || !message.trim()) {
            return res.status(400).json({
                success: false,
                error: '請輸入問題'
            });
        }

        if (typeof sessionId !== 'string' || !sessions.has(sessionId)) {
            return res.status(404).json({
                success: false,
                error: 'Session 不存在，請重新建立遊戲'
            });
        }

        session = sessions.get(sessionId);

        if (!CASE_SUSPECTS[session.caseId].includes(suspect)) {
            return res.status(400).json({
                success: false,
                error: '這名角色不屬於目前案件'
            });
        }

        if (session.gameOver) {
            return res.status(403).json({
                success: false,
                error: '遊戲已經結束，請重新遊玩',
                gameOver: true
            });
        }

        if (session.isProcessing) {
            return res.status(409).json({
                success: false,
                error: '目前正在處理問題，請稍後再試',
                remainingQuestions: session.remainingQuestions
            });
        }

        if (session.remainingQuestions <= 0) {
            return res.status(403).json({
                success: false,
                error: '詢問次數已用完，無法繼續詢問',
                remainingQuestions: 0
            });
        }

        session.isProcessing = true;

        try {
            const cleanMessage = message.trim();
            const history = session.conversations[suspect];

            const updatedHistory = [
                ...history,
                {
                    role: 'user',
                    content: cleanMessage
                }
            ];

            let answer;

            // E05 身體檢查使用固定回覆，不呼叫 AI。
            // 但仍然視為一次正常詢問。
            if (
                session.caseId === 'case02' &&
                suspect === 'girl' &&
                cleanMessage === GIRL_BODY_EXAM_QUESTION
            ) {
                answer = GIRL_BODY_EXAM_ANSWER;
            } else {
                answer = await askGroq(
                    session.caseId,
                    suspect,
                    updatedHistory
                );
            }

            // 成功取得回答後才儲存對話及扣除次數。
            session.conversations[suspect] = [
                ...updatedHistory,
                {
                    role: 'assistant',
                    content: answer
                }
            ];

            session.remainingQuestions--;

            return res.json({
                success: true,
                sessionId,
                caseId: session.caseId,
                suspect,
                answer,
                messageCount: session.conversations[suspect].length / 2,
                remainingQuestions: session.remainingQuestions,
                maxQuestions: MAX_QUESTIONS,
                gameOver: false
            });

        } finally {
            session.isProcessing = false;
        }

    } catch (error) {
        console.error('Chat API Error:', error);

        return res.status(500).json({
            success: false,
            error: error.message || 'AI 回覆發生錯誤',
            remainingQuestions: session
                ? session.remainingQuestions
                : null
        });
    }
});

// ======================================
// 最終指認
// ======================================
router.post('/answer', (req, res) => {
    const { sessionId, answer } = req.body || {};

    if (typeof answer !== 'string' || !answer.trim()) {
        return res.status(400).json({
            success: false,
            error: '請輸入你的推理答案'
        });
    }

    if (typeof sessionId !== 'string' || !sessions.has(sessionId)) {
        return res.status(404).json({
            success: false,
            error: 'Session 不存在'
        });
    }

    const session = sessions.get(sessionId);

    if (session.isProcessing) {
        return res.status(409).json({
            success: false,
            error: '目前仍有問題正在處理，請稍後提交答案'
        });
    }

    if (session.gameOver) {
        return res.status(403).json({
            success: false,
            error: '答案已經提交，遊戲已結束',
            gameOver: true
        });
    }

    const normalizedAnswer = answer
        .trim()
        .replace(/\s/g, '')
        .replace(/[，。！？、,.!?「」『』"'：:]/g, '');

    // ==================================
    // CASE02 指認
    // ==================================
    if (session.caseId === 'case02') {
        const answerAliases = {
            girl: [
                'girl',
                '小女孩',
                '女孩',
                '姐姐'
            ],
            parent: [
                'parent',
                '家長',
                '父母',
                '父親',
                '母親'
            ],
            nurse: [
                'nurse',
                '護士'
            ],
            doctor: [
                'doctor',
                '醫生',
                '醫師'
            ],
            patient: [
                'patient',
                '隔壁房病人',
                '隔壁病人',
                '病人'
            ]
        };

        const selected = Object.keys(answerAliases).find(id =>
            answerAliases[id].some(alias => {
                const normalizedAlias = alias
                    .replace(/\s/g, '')
                    .replace(/[，。！？、,.!?「」『』"'：:]/g, '');

                return normalizedAlias === normalizedAnswer;
            })
        );

        if (!selected) {
            return res.status(400).json({
                success: false,
                error: '請選擇有效的調查對象'
            });
        }

        const ending = CASE02_ENDINGS[selected];
        const isCorrect = selected === 'girl';

        session.gameOver = true;
        session.submittedAnswer = selected;
        session.isCorrect = isCorrect;

        return res.json({
            success: true,
            caseId: 'case02',
            gameOver: true,
            isCorrect,
            submittedAnswer: selected,
            ending: ending.title,
            message: ending.message,
            truth: isCorrect ? CASE02_TRUTH : null
        });
    }

    // ==================================
    // CASE01 指認（保留原本判定）
    // ==================================
    const isCorrect = CASE01_CORRECT_ANSWERS.includes(normalizedAnswer);

    session.gameOver = true;
    session.submittedAnswer = answer.trim();
    session.isCorrect = isCorrect;

    return res.json({
        success: true,
        caseId: 'case01',
        gameOver: true,
        isCorrect,
        submittedAnswer: session.submittedAnswer,
        message: isCorrect
            ? '恭喜你，成功找出真正的兇手！'
            : '很遺憾，你沒有找出真正的兇手。以下是案件的完整真相。',
        truth: CASE01_TRUTH
    });
});

module.exports = router;
