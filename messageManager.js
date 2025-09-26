// messageManager.js v4.0 - Natural Language Text Generation Integration
// This module routes different event types to generate natural language descriptions for the LLM
// using System identity and provides immediate visual feedback in the UI.

// Import the text generator module
import { TextGenerator } from './textGenerator.js';

// --- State and Configuration ---
let autoSendTimer = null;
let isCountingDown = false;
let isCoolingDown = false;
let lastPosition = null; // 用于跟踪体位变化
const REPORTING_INTERVAL = 10000; // 10 seconds for periodic reports
const COOLDOWN_PERIOD = 5000;    // 5 seconds cooldown after any report to prevent spam
const EVENT_MESSAGE_DURATION = 3000; // 3 seconds for event notifications

// Initialize the text generator
const textGenerator = new TextGenerator();

// --- Private Helper Functions ---

/**
 * Sends a report for the "position change" event using natural language and shows UI feedback.
 * @param {object} data - Contains previousPosition and currentPosition.
 */
const sendPositionChangeReport = (data) => {
    const naturalLanguageMessage = textGenerator.generatePositionChange(data);
    sendMessageToAI(naturalLanguageMessage);
    if (window.linkcup) {
        const positionNames = {
            1: "传教士", 2: "左侧位", 3: "右侧位", 4: "后入式", 5: "女上位",
            6: "反向女上位", 7: "左侧女上位", 8: "右侧女上位", 9: "面对面压制", 10: "俯卧位"
        };
        const prevName = positionNames[data.previousPosition] || `体位${data.previousPosition}`;
        const currName = positionNames[data.currentPosition] || `体位${data.currentPosition}`;
        window.linkcup.updateStatusMessage(`体位变化：${prevName} → ${currName}`, EVENT_MESSAGE_DURATION, 'linkcup-status-event');
    }
};

/**
 * Formats milliseconds into HH:MM:SS string.
 * @param {number} ms - The duration in milliseconds.
 * @returns {string} The formatted time string.
 */
const formatDuration = (ms) => {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return [hours, minutes, seconds]
        .map(v => v.toString().padStart(2, '0'))
        .join(':');
};

/**
 * 检查用户是否选择了角色
 */
const hasCharacterSelected = () => {
    try {
        const context = SillyTavern.getContext();
        return context && context.name2 && context.name2.trim() !== '';
    } catch (error) {
        console.warn("linkCUP messageManager: Failed to get character context:", error);
        return false;
    }
};

/**
 * A generic helper to construct and send a system message to SillyTavern.
 * @param {string} messageContent - The final formatted string to be sent.
 */
const sendMessageToAI = (messageContent) => {
    if (!hasCharacterSelected()) {
        // console.log("MessageManager: No character selected, skipping message:", messageContent);
        return;
    }
    
    const context = SillyTavern.getContext();
    console.log("System Message ->", messageContent);

    const message = {
        mes: messageContent,
        is_user: false,
        is_system: true,
        name: 'System',
        send_date: Date.now(),
        is_api: false,
        force_no_shadow_clone: true,
    };

    context.chat.push(message);
    context.generate();

    // Reset state and start cooldown after any message
    isCountingDown = false;
    isCoolingDown = true;
    setTimeout(() => { isCoolingDown = false; }, COOLDOWN_PERIOD);
};

/**
 * Sends the standard 10-second periodic action report using natural language.
 * @param {object} paperPlane - The instance of the PaperPlane class.
 */
const sendPeriodicActionReport = (paperPlane) => {
    if (!paperPlane) {
        isCountingDown = false;
        return;
    }
    const values = paperPlane.values;
    if (values.thrustCountPeriod === 0 && values.intensityScore === 0) {
        isCountingDown = false;
        return;
    }
    
    // 检查体位变化
    const positionChange = (lastPosition !== null && lastPosition !== values.p) ? 
        { previousPosition: lastPosition, currentPosition: values.p } : null;
    
    // Use the text generator to create natural language message
    const naturalLanguageMessage = textGenerator.generatePeriodicAction({
        P: values.p,
        C: values.thrustCountPeriod,
        I: Math.round(values.intensityScore),
        B: values.B
    }, positionChange);
    
    sendMessageToAI(naturalLanguageMessage);
    paperPlane.resetIntensityScore();
    paperPlane.resetThrustCountPeriod();
    if (window.linkcup) window.linkcup.updateStatusMessage("常规动作数据已发送...");
};

/**
 * Sends a report for the "re-insertion" event using natural language and shows UI feedback.
 * @param {object} values - The latest data from paperPlane.
 */
const sendReInsertionReport = (values) => {
    // 检查体位变化
    const positionChange = (lastPosition !== null && lastPosition !== values.p) ? 
        { previousPosition: lastPosition, currentPosition: values.p } : null;
    
    const naturalLanguageMessage = textGenerator.generateReInsertion({
        P: values.p,
        B: values.B
    }, positionChange);
    sendMessageToAI(naturalLanguageMessage);
    if (window.linkcup) {
        window.linkcup.updateStatusMessage("及时事件：突然插入", EVENT_MESSAGE_DURATION, 'linkcup-status-event');
    }
};

/**
 * Sends a report for the "withdrawal" event using natural language and shows UI feedback.
 * @param {object} values - The latest data from paperPlane.
 */
const sendWithdrawalReport = (values) => {
    // 检查体位变化
    const positionChange = (lastPosition !== null && lastPosition !== values.p) ? 
        { previousPosition: lastPosition, currentPosition: values.p } : null;
    
    const naturalLanguageMessage = textGenerator.generateWithdrawal({
        P: values.p,
        B: values.B
    }, positionChange);
    sendMessageToAI(naturalLanguageMessage);
    if (window.linkcup) {
        window.linkcup.updateStatusMessage("及时事件：突然拔出", EVENT_MESSAGE_DURATION, 'linkcup-status-event');
    }
};

/**
 * Sends a report for the "climax" (keyEvent) using natural language and shows UI feedback.
 * @param {object} values - The latest data from paperPlane.
 */
const sendClimaxReport = (values) => {
    const ejaculationType = values.v > 0 ? 'inside' : 'outside';
    const durationInSeconds = Math.round(values.effectiveInteractionTime / 1000);
    
    // 检查体位变化
    const positionChange = (lastPosition !== null && lastPosition !== values.p) ? 
        { previousPosition: lastPosition, currentPosition: values.p } : null;
    
    const naturalLanguageMessage = textGenerator.generateClimax({
        P: values.p,
        B: values.B,
        E: ejaculationType,
        T: durationInSeconds
    }, positionChange);
    
    sendMessageToAI(naturalLanguageMessage);
    if (window.linkcup) {
        const formattedTime = formatDuration(values.effectiveInteractionTime);
        window.linkcup.updateStatusMessage(`及时事件：Finish! 持续时间：${formattedTime}`, EVENT_MESSAGE_DURATION, 'linkcup-status-event');
    }
};


// --- Public API ---

/**
 * Main handler, now acts as a router for different event types.
 * @param {object} values - The latest data from paperPlane.
 * @param {object} paperPlane - The instance of the PaperPlane class.
 * @param {string} eventType - The type of event from paperPlane.
 */
export const handleMessages = (values, paperPlane, eventType) => {
    if (!paperPlane || isCoolingDown) return;

    // Interrupt any pending periodic report if a special event occurs
    const isSpecialEvent = ['re-insertion', 'withdrawal', 'keyEvent'].includes(eventType);
    if (isSpecialEvent && autoSendTimer) {
        clearTimeout(autoSendTimer);
        isCountingDown = false;
        // console.log("MessageManager: Periodic report cancelled due to special event.");
    }

    switch (eventType) {
        case 're-insertion':
            if (hasCharacterSelected()) sendReInsertionReport(values);
            break;
        case 'withdrawal':
            if (hasCharacterSelected()) sendWithdrawalReport(values);
            break;
        case 'keyEvent':
            if (hasCharacterSelected()) sendClimaxReport(values);
            break;
        case 'realtime':
            // This is the logic for the standard periodic report
            if (!hasCharacterSelected()) {
                // 未选角直接跳过，不倒计时
                break;
            }
            if (values.D !== 0 && !isCountingDown) {
                isCountingDown = true;
                if (window.linkcup) window.linkcup.updateStatusMessage(`检测到动作，${(10000) / 1000}秒后将发送报告...`);
                autoSendTimer = setTimeout(() => {
                    sendPeriodicActionReport(paperPlane);
                }, 10000);
            }
            break;
        default:
            // Do nothing for other event types
            break;
    }

    // 更新上次体位记录（在处理完事件后）
    lastPosition = values.p;
};

/**
 * Resets the state of the message manager.
 */
export const resetMessageState = () => {
    if (autoSendTimer) {
        clearTimeout(autoSendTimer);
        autoSendTimer = null;
    }
    isCountingDown = false;
    isCoolingDown = false;
    lastPosition = null; // 重置体位记录
    // console.log("MessageManager: State reset.");
};
