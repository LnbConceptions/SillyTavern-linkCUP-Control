// messageManager.js
// This module encapsulates all logic for generating and sending system messages.

// --- State and Configuration ---

let autoSendTimer = null;
let isCountingDown = false;
let isCoolingDown = false;
const COOLDOWN_PERIOD = 15000;
let messageQueue = [];

const positionMap = {
    1: { zh: '正常位', en: 'missionary' }, 2: { zh: '左侧入位', en: 'left entry' },
    3: { zh: '右侧入位', en: 'right entry' }, 4: { zh: '背后位', en: 'doggy style' },
    5: { zh: '正面骑乘位', en: 'cowgirl' }, 6: { zh: '背面骑乘位', en: 'reverse cowgirl' },
    7: { zh: '左侧骑乘位', en: 'left side riding' }, 8: { zh: '右侧骑乘位', en: 'right side riding' },
    9: { zh: '正面压迫位', en: 'standing front' }, 10: { zh: '背面压迫位', en: 'standing back' },
    default: { zh: '未知', en: 'an unknown position' }
};
const intensityMap = {
    light: { zh: '轻柔的', en: 'gently' },
    steady: { zh: '平稳的', en: 'steadily' },
    strong: { zh: '强烈的', en: 'intensely' },
    beast: { zh: '像野兽一般疯狂的', en: 'like a wild beast' }
};
const excitementMap = {
    1: { zh: '平静', en: 'calm' }, 2: { zh: '唤起', en: 'aroused' },
    3: { zh: '兴奋', en: 'excited' }, 4: { zh: '激动', en: 'thrilled' },
    5: { zh: '浪尖', en: 'ecstatic' },
    default: { zh: '未知', en: 'unknown' }
};

// --- Private Functions ---

const formatDuration = (ms) => {
    if (ms <= 0) return { zh: '', en: '' };
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const zh = `你们已经持续了${hours}小时/${minutes}分钟/${seconds}秒。`;
    const en = `You have been going for ${hours}h ${minutes}m ${seconds}s.`;
    return { zh, en };
};

const sendSystemMessages = (paperPlane) => {
    if (messageQueue.length === 0) {
        isCountingDown = false;
        return;
    }

    const context = SillyTavern.getContext();
    let combinedZh = messageQueue.map(m => m.zh).join(' ');
    let combinedEn = messageQueue.map(m => m.en).join(' ');

    // Append duration
    if (paperPlane && paperPlane.values.sessionDuration > 0) {
        const duration = formatDuration(paperPlane.values.sessionDuration);
        combinedZh += ` ${duration.zh}`;
        combinedEn += ` ${duration.en}`;
    }
    
    const finalMessage = `( ${combinedZh} )\n( ${combinedEn} )`;

    console.log("MessageManager: Sending message:", finalMessage);

    const message = { mes: finalMessage, is_user: false, is_system: true, name: 'System', send_date: Date.now(), is_api: false };
    context.chat.push(message);
    if (paperPlane) paperPlane.resetIntensityScore();

    context.generate();
    if (window.linkcup && window.linkcup.updateStatusMessage) {
        window.linkcup.updateStatusMessage("动作已自动发送，正在生成AI回应...");
    }

    messageQueue = [];
    isCountingDown = false;
    isCoolingDown = true;
    setTimeout(() => { isCoolingDown = false; }, COOLDOWN_PERIOD);
};

const queueStandardReport = (values) => {
    const intensityValue = values.intensityScore;
    if (intensityValue <= 0) return;

    const pos = positionMap[values.p] || positionMap.default;
    const excitement = excitementMap[values.B] || excitementMap.default;

    let intensity;
    if (intensityValue < 200) intensity = intensityMap.light;
    else if (intensityValue < 600) intensity = intensityMap.steady;
    else if (intensityValue < 1600) intensity = intensityMap.strong;
    else intensity = intensityMap.beast;

    const zhMessage = `{{user}}正在以${pos.zh}进行着${intensity.zh}的抽插动作，{{char}}内心的状态是${excitement.zh}。`;
    const enMessage = `{{user}} is thrusting ${intensity.en} in the ${pos.en} position, making {{char}} feel ${excitement.en}.`;

    messageQueue.push({ zh: zhMessage, en: enMessage });
};

// --- Public API ---

export const handleMessages = (values, paperPlane) => {
    if (!paperPlane) return;
    let sendMessages = false;

    // Corrected "Insertion after stillness" logic
    if (values.v > 0 && paperPlane.timeOfStillnessStart !== null && (Date.now() - paperPlane.timeOfStillnessStart > 5000)) {
        const pos = positionMap[values.p] || positionMap.default;
        const zhMessage = `{{user}}以${pos.zh}插入了{{char}}。`;
        const enMessage = `{{user}} has inserted into {{char}} in the ${pos.en} position.`;
        messageQueue.push({ zh: zhMessage, en: enMessage });
        sendMessages = true;
        paperPlane.timeOfStillnessStart = null; // Reset after firing
    }

    if (values.v !== 0) {
        paperPlane.lastMotionP = values.p;
    } else {
        // If we are in a state of stillness for more than 5 seconds, reset the last motion position.
        if (paperPlane.timeOfStillnessStart !== null && (Date.now() - paperPlane.timeOfStillnessStart > 5000)) {
            paperPlane.lastMotionP = 0;
        }
    }

    if (values.D !== 0 && !isCountingDown && !isCoolingDown) {
        isCountingDown = true;
        if (window.linkcup && window.linkcup.updateStatusMessage) {
            window.linkcup.updateStatusMessage("检测到动作，10秒后将自动发送报告...");
        }
        if (autoSendTimer) clearTimeout(autoSendTimer);
        autoSendTimer = setTimeout(() => {
            queueStandardReport(paperPlane.values);
            sendSystemMessages(paperPlane);
        }, 10000);
    }

    if (sendMessages && !isCoolingDown) {
        if (isCountingDown) {
            clearTimeout(autoSendTimer);
            queueStandardReport(paperPlane.values);
        }
        sendSystemMessages(paperPlane);
    }
};

export const resetMessageState = () => {
    if (autoSendTimer) {
        clearTimeout(autoSendTimer);
    }
    autoSendTimer = null;
    isCountingDown = false;
    isCoolingDown = false;
    messageQueue = [];
    console.log("MessageManager: State reset.");
};
