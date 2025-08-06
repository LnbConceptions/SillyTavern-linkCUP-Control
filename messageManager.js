// messageManager.js v3.1 - UI Feedback Integration
// This module routes different event types to generate specific, structured data blocks for the LLM
// and provides immediate visual feedback in the UI.

// --- State and Configuration ---
let autoSendTimer = null;
let isCountingDown = false;
let isCoolingDown = false;
const REPORTING_INTERVAL = 10000; // 10 seconds for periodic reports
const COOLDOWN_PERIOD = 5000;    // 5 seconds cooldown after any report to prevent spam
const EVENT_MESSAGE_DURATION = 3000; // 3 seconds for event notifications

// --- Private Helper Functions ---

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
 * A generic helper to construct and send a system message to SillyTavern.
 * @param {string} messageContent - The final formatted string to be sent.
 */
const sendMessageToAI = (messageContent) => {
    const context = SillyTavern.getContext();
    console.log("MessageManager: Sending to AI ->", messageContent);

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
 * Sends the standard 10-second periodic action report.
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
    const messageParts = [
        `P:${values.p}`,
        `C:${values.thrustCountPeriod}`,
        `I:${Math.round(values.intensityScore)}`,
        `B:${values.B}`
    ];
    const finalMessage = `[linkCUP_Action|${messageParts.join('|')}]`;
    sendMessageToAI(finalMessage);
    paperPlane.resetIntensityScore();
    paperPlane.resetThrustCountPeriod();
    if (window.linkcup) window.linkcup.updateStatusMessage("常规动作数据已发送...");
};

/**
 * Sends a report for the "re-insertion" event and shows UI feedback.
 * @param {object} values - The latest data from paperPlane.
 */
const sendReInsertionReport = (values) => {
    const messageParts = [`P:${values.p}`, `B:${values.B}`];
    const finalMessage = `[linkCUP_ReInsertion|${messageParts.join('|')}]`;
    sendMessageToAI(finalMessage);
    if (window.linkcup) {
        window.linkcup.updateStatusMessage("及时事件：突然插入", EVENT_MESSAGE_DURATION, 'linkcup-status-event');
    }
};

/**
 * Sends a report for the "withdrawal" event and shows UI feedback.
 * @param {object} values - The latest data from paperPlane.
 */
const sendWithdrawalReport = (values) => {
    const messageParts = [`P:${values.p}`, `B:${values.B}`];
    const finalMessage = `[linkCUP_Withdrawal|${messageParts.join('|')}]`;
    sendMessageToAI(finalMessage);
    if (window.linkcup) {
        window.linkcup.updateStatusMessage("及时事件：突然拔出", EVENT_MESSAGE_DURATION, 'linkcup-status-event');
    }
};

/**
 * Sends a report for the "climax" (keyEvent) and shows UI feedback.
 * @param {object} values - The latest data from paperPlane.
 */
const sendClimaxReport = (values) => {
    const ejaculationType = values.v > 0 ? 'inside' : 'outside';
    const durationInSeconds = Math.round(values.effectiveInteractionTime / 1000);
    const messageParts = [
        `P:${values.p}`,
        `B:${values.B}`,
        `E:${ejaculationType}`,
        `T:${durationInSeconds}s`
    ];
    const finalMessage = `[linkCUP_Climax|${messageParts.join('|')}]`;
    sendMessageToAI(finalMessage);
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
        console.log("MessageManager: Periodic report cancelled due to special event.");
    }

    switch (eventType) {
        case 're-insertion':
            sendReInsertionReport(values);
            break;
        case 'withdrawal':
            sendWithdrawalReport(values);
            break;
        case 'keyEvent':
            sendClimaxReport(values);
            break;
        case 'realtime':
            // This is the logic for the standard periodic report
            if (values.D !== 0 && !isCountingDown) {
                isCountingDown = true;
                if (window.linkcup) window.linkcup.updateStatusMessage(`检测到动作，${REPORTING_INTERVAL / 1000}秒后将发送报告...`);
                autoSendTimer = setTimeout(() => {
                    sendPeriodicActionReport(paperPlane);
                }, REPORTING_INTERVAL);
            }
            break;
        default:
            // Do nothing for other event types
            break;
    }
};

/**
 * Resets the state of the message manager.
 */
export const resetMessageState = () => {
    if (autoSendTimer) {
        clearTimeout(autoSendTimer);
    }
    autoSendTimer = null;
    isCountingDown = false;
    isCoolingDown = false;
    console.log("MessageManager: State reset.");
};
