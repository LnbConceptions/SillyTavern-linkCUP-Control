// messageManager.js v2.0
// This module constructs and sends structured data blocks to the LLM.

// --- State and Configuration ---

let autoSendTimer = null;
let isCountingDown = false;
let isCoolingDown = false;
const REPORTING_INTERVAL = 10000; // 10 seconds between reports
const COOLDOWN_PERIOD = 15000;   // 15 seconds cooldown after a report

// --- Private Functions ---

/**
 * Constructs and sends the structured action report to SillyTavern.
 * This is the core function for communicating user actions to the LLM.
 * @param {object} paperPlane - The instance of the PaperPlane class.
 */
const sendActionReport = (paperPlane) => {
    if (!paperPlane) {
        isCountingDown = false;
        return;
    }

    const values = paperPlane.values;

    // Don't send a report if there was no activity in the period.
    if (values.thrustCountPeriod === 0 && values.intensityScore === 0) {
        isCountingDown = false;
        console.log("MessageManager: No activity detected in the period. Skipping report.");
        return;
    }

    const context = SillyTavern.getContext();

    // Construct the new structured data message
    const messageParts = [
        `P:${values.p}`,
        `C:${values.thrustCountPeriod}`,
        `I:${Math.round(values.intensityScore)}`,
        `B:${values.B}`
    ];
    const finalMessage = `[linkCUP_Action|${messageParts.join('|')}]`;

    console.log("MessageManager: Sending structured action report:", finalMessage);

    const message = {
        mes: finalMessage,
        is_user: false,
        is_system: true,
        name: 'System',
        send_date: Date.now(),
        is_api: false,
        force_no_shadow_clone: true, // Important for system messages that shouldn't be altered
    };

    context.chat.push(message);

    // Reset the periodic counters in paperPlane
    paperPlane.resetIntensityScore();
    paperPlane.resetThrustCountPeriod();

    // Trigger AI response
    context.generate();

    if (window.linkcup && window.linkcup.updateStatusMessage) {
        window.linkcup.updateStatusMessage("动作数据已发送，AI正在生成回应...");
    }

    // Reset state and start cooldown
    isCountingDown = false;
    isCoolingDown = true;
    setTimeout(() => { isCoolingDown = false; }, COOLDOWN_PERIOD);
};


// --- Public API ---

/**
 * Main handler called on every data update from paperPlane.
 * It decides when to trigger an action report.
 * @param {object} values - The latest data from paperPlane.
 * @param {object} paperPlane - The instance of the PaperPlane class.
 */
export const handleMessages = (values, paperPlane) => {
    if (!paperPlane) return;

    // If there is motion and we are not already in a reporting cycle or cooldown, start one.
    if (values.D !== 0 && !isCountingDown && !isCoolingDown) {
        isCountingDown = true;
        if (window.linkcup && window.linkcup.updateStatusMessage) {
            window.linkcup.updateStatusMessage(`检测到动作，${REPORTING_INTERVAL / 1000}秒后将发送报告...`);
        }
        if (autoSendTimer) clearTimeout(autoSendTimer);

        // Set a timer to send the report after the interval.
        autoSendTimer = setTimeout(() => {
            sendActionReport(paperPlane);
        }, REPORTING_INTERVAL);
    }
};

/**
 * Resets the state of the message manager.
 * Called on disconnect or other reset events.
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
