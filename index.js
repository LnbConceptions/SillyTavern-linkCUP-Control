import { PaperPlane } from './paperplane.js';
import { initializeAudio, handleAudio, resetAudioState } from './audioManager.js';
import { handleMessages, resetMessageState } from './messageManager.js';
import { initUI, updateUI, resetUI, resizeChart } from './uiManager.js';
import { startBreathing, stopBreathing, updateBreathRate, resetBreathState } from './breathManager.js';

const extensionName = "linkcup";
const extensionFolderPath = `scripts/extensions/third-party/${extensionName}`;

// Global state variables
let linkCUPDevice = null;
let writeCharacteristic = null;
let notifyCharacteristic = null;
let paperPlane = null;
let handshakeState = {
    uuid_acked: false,
    mac_acked: false,
    firmware_acked: false,
};

// Helper function to show a temporary message in the status bar
const updateStatusMessage = (message, duration = 3000, className = null) => {
    const { status } = getDOM();
    if (!status) return;

    // Always reset to base class first, then set the message
    status.className = 'linkcup-status';
    status.textContent = message;

    // Add the special class if provided
    if (className) {
        status.classList.add(className);
    }

    // Set a timer to clear the message and reset the class
    setTimeout(() => {
        // Only clear if the message hasn't been replaced by another one
        if (status.textContent === message) {
            status.textContent = '';
            status.className = 'linkcup-status';
        }
    }, duration);
};

// Expose the status updater globally for other modules
window.linkcup = {
    ...(window.linkcup || {}),
    updateStatusMessage,
};

// Constants for Bluetooth communication
const LCU_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
const LCU_WRITE_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
const LCU_NOTIFY_CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

// UI Elements
const getDOM = () => {
    const status = document.getElementById(`linkcup-status`);
    const connectBtn = document.getElementById(`linkcup-connect-btn`);
    const resetBtn = document.getElementById(`linkcup-reset-btn`);
    const dataContainer = document.getElementById(`linkcup-data-container`);
    return { status, connectBtn, resetBtn, dataContainer };
};

// Function to handle the special key event
const handleKeyEvent = (values) => {
    const context = SillyTavern.getContext();
    // Key event messaging can be complex, so it stays here for now.
    // It could be moved to messageManager if it grows.
    resetMessageState(); // Reset any pending reports

    const zhClimax = values.v > 0 ? '而且是内射！' : '他射在了外面！';
    const enClimax = values.v > 0 ? 'and came inside!' : 'and came outside!';
    const zhMessage = `{{user}}：“射精了！” (${zhClimax})`;
    const enMessage = `{{user}}: "I'm cumming!" (${enClimax})`;
    
    const finalMessage = `${zhMessage}\n${enMessage}`;

    console.log("linkCUP key event message:", finalMessage);

    const message = { mes: finalMessage, is_user: true, is_system: false, name: '{{user}}', send_date: Date.now(), is_api: false };
    context.chat.push(message);
    if (paperPlane) paperPlane.resetIntensityScore();

    context.generate();
    updateStatusMessage("特殊事件已发送！");
};

// Function to send data to the device
const sendToDevice = async (data) => {
    if (!writeCharacteristic) {
        console.error("Write characteristic not available.");
        updateStatusMessage("Error: Write characteristic unavailable");
        return;
    }
    try {
        const encoder = new TextEncoder();
        await writeCharacteristic.writeValue(encoder.encode(JSON.stringify(data)));
        console.log("Sent:", data);
    } catch (error) {
        console.error("Error writing to device:", error);
        updateStatusMessage("Error: Failed to send data");
    }
};

// Handle incoming data notifications from the device
const handleNotifications = (event) => {
    const value = event.target.value;
    const decoder = new TextDecoder('utf-8');
    const jsonString = decoder.decode(value);

    try {
        const data = JSON.parse(jsonString);
        const { status } = getDOM();

        switch (data.type) {
            case 1:
                if (!handshakeState.uuid_acked) {
                    sendToDevice({ "type": 2, "ack": 1 });
                    handshakeState.uuid_acked = true;
                }
                break;
            case 4:
                if (!handshakeState.mac_acked) {
                    sendToDevice({ "type": 2, "ack": 2 });
                    handshakeState.mac_acked = true;
                }
                break;
            case 5:
                if (!handshakeState.firmware_acked) {
                    sendToDevice({ "type": 2, "ack": 3 });
                    handshakeState.firmware_acked = true;
                    updateStatusMessage("linkCUP Connected");
                }
                break;
            case 7:
            case 14:
                if (handshakeState.firmware_acked) {
                    const valueData = data.value || data;
                    const v_value = Array.isArray(valueData.v) ? valueData.v[0] : valueData.v;
                    const realtimeData = {
                        v: v_value, p: valueData.p,
                        Yaw: Math.round(valueData.Yaw / 100),
                        Pitch: Math.round(valueData.Pitch / 100),
                        Roll: Math.round(valueData.Roll / 100),
                    };
                    if (paperPlane) paperPlane.update(realtimeData);
                }
                break;
            case 6: // Discovered through debugging: This is the actual key press event
            case 11: // Keep this for protocol compliance / future firmware
                if (handshakeState.firmware_acked && paperPlane) {
                    paperPlane.updateKeyEvent();
                }
                break;
        }
    } catch (error) {
        console.error("Failed to parse notification JSON:", error, "Raw data:", jsonString);
    }
};

// Function to handle the reset/re-center command
const onResetClick = async () => {
    console.log("Sending reset command to linkCUP...");
    // Corrected payload based on the provided protocol document. TYPE_EVENT_ORIGIN is 13.
    await sendToDevice({ "type": 13, "mode": 2 });
    toastr.success('归位指令已发送！', 'linkCUP');
};

// Main connection function
const onConnectClick = async () => {
    const { connectBtn, resetBtn } = getDOM();

    if (!navigator.bluetooth) {
        updateStatusMessage("Bluetooth not supported.");
        return;
    }

    if (linkCUPDevice && linkCUPDevice.gatt.connected) {
        linkCUPDevice.gatt.disconnect();
        return;
    }

    try {
        updateStatusMessage("Requesting device...", 60000); // Long timeout for user selection

        linkCUPDevice = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [LCU_SERVICE_UUID]
        });

        linkCUPDevice.addEventListener('gattserverdisconnected', onDisconnected);
        updateStatusMessage("Connecting to GATT server...");
        const server = await linkCUPDevice.gatt.connect();

        // Unlock audio context by playing a silent sound right after user interaction
        unlockAudioContext();

        updateStatusMessage("Getting service...");
        const service = await server.getPrimaryService(LCU_SERVICE_UUID);
        updateStatusMessage("Getting characteristics...");
        writeCharacteristic = await service.getCharacteristic(LCU_WRITE_CHARACTERISTIC_UUID);
        notifyCharacteristic = await service.getCharacteristic(LCU_NOTIFY_CHARACTERISTIC_UUID);
        updateStatusMessage("Starting notifications...");
        await notifyCharacteristic.startNotifications();
        notifyCharacteristic.addEventListener('characteristicvaluechanged', handleNotifications);

        updateStatusMessage("Connected. Waiting for handshake...");
        connectBtn.textContent = "Disconnect";
        resetBtn.style.display = 'block'; // Show the reset button

        paperPlane = new PaperPlane((values, eventType = 'realtime') => {
            // The new, clean delegation model
            updateUI(values);

            // The new event-driven message handler
            handleMessages(values, paperPlane, eventType);

            if (eventType === 'keyEvent') {
                // The original key event handler can be simplified or removed
                // if all logic is moved to messageManager. For now, we keep it.
                // handleKeyEvent(values); 
            } else {
                handleAudio(values);
                updateBreathRate(values.B); // Update breath rate based on B value
            }

            // Live2D Integration - The new, correct way
            try {
                const context = SillyTavern.getContext();
                const characterName = context.name2;
                const directValue = values.v;

                // The check for the model's existence is now left to the Live2D extension itself,
                // which is more robust against race conditions during initialization.
                if (window.live2d && typeof window.live2d.setLinkCupValue === 'function') {
                    window.live2d.setLinkCupValue(characterName, directValue);
                }
            } catch (error) {
                // This error handling is more robust now.
                console.error("linkCUP: Failed to call setLinkCupValue on Live2D extension.", error);
                if (!window.live2dErrorLogged) {
                    updateStatusMessage("Live2D Error: See console");
                    window.live2dErrorLogged = true;
                }
            }
        });
        
        // Initialize all modules
        initializeAudio();
        initUI();
        startBreathing();

    } catch (error) {
        console.error("Bluetooth connection failed:", error);
        const errorMessage = `Error: ${error.message.replace('GATT operation failed for service', 'Service')}`;
        updateStatusMessage(errorMessage, 5000);
        onDisconnected();
    }
};

const onDisconnected = () => {
    const { connectBtn, resetBtn } = getDOM();
    updateStatusMessage("linkCUP Disconnected");
    connectBtn.textContent = "Connect linkCUP";
    if(resetBtn) resetBtn.style.display = 'none'; // Hide the reset button

    // Reset all modules
    resetUI();
    resetAudioState();
    resetMessageState();
    resetBreathState();

    linkCUPDevice = null;
    writeCharacteristic = null;
    notifyCharacteristic = null;

    if (paperPlane) {
        paperPlane.reset(); // Reset session-specific data
        paperPlane.destroy();
        paperPlane = null;
    }
    handshakeState = { uuid_acked: false, mac_acked: false, firmware_acked: false };
};

// This function is called when the extension is loaded
jQuery(async () => {
    const floatingWindow = $(`
        <div id="linkcup-floating-window" class="linkcup-floating-window">
            <div id="linkcup-drag-handle" class="linkcup-drag-handle">
                <span>linkCUP Control</span>
                <button id="linkcup-close-btn" class="linkcup-close-btn">X</button>
            </div>
            <div id="linkcup-content-wrapper"></div>
        </div>
    `);
    $('body').append(floatingWindow);

    const settingsHtml = await $.get(`${extensionFolderPath}/public/linkcup.html`);
    $("#linkcup-content-wrapper").html(settingsHtml);

    // Wait for SillyTavern to be ready before setting up event listeners
    const context = SillyTavern.getContext();
    context.eventSource.on(context.event_types.APP_READY, () => {
        console.log("linkCUP: SillyTavern is ready. Initializing.");
        $("#linkcup-connect-btn").on("click", onConnectClick);
        $("#linkcup-reset-btn").on("click", onResetClick);
        $("#linkcup-close-btn").on("click", () => floatingWindow.hide());
    });

    let offsetX, offsetY;
    const dragHandle = document.getElementById('linkcup-drag-handle');
    const windowEl = document.getElementById('linkcup-floating-window');
    const move = (e) => {
        windowEl.style.left = `${e.clientX - offsetX}px`;
        windowEl.style.top = `${e.clientY - offsetY}px`;
    };
    dragHandle.addEventListener('mousedown', (e) => {
        offsetX = e.clientX - windowEl.offsetLeft;
        offsetY = e.clientY - windowEl.offsetTop;
        document.addEventListener('mousemove', move);
    });
    document.addEventListener('mouseup', () => {
        document.removeEventListener('mousemove', move);
    });

    const drawerHtml = `
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header">
                <b>linkCUP</b>
                <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
            </div>
            <div class="inline-drawer-content">
                <button id="open-linkcup-window-btn" class="menu_button">Open linkCUP Window</button>
            </div>
        </div>
    `;
    $("#extensions_settings").append(drawerHtml);

    // The toggle functionality is handled by SillyTavern's global script,
    // so we only need to bind the click event to our button.
    $("#open-linkcup-window-btn").on("click", () => {
        floatingWindow.show();
        resizeChart();
    });
});

// Function to play a silent sound to unlock the AudioContext.
// This is required by modern browsers to allow audio playback initiated by scripts.
function unlockAudioContext() {
    const silentWav = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
    const audio = new Audio(silentWav);
    audio.volume = 0;
    audio.play().catch(e => console.warn("Could not unlock audio context:", e));
    console.log("Attempting to unlock audio context.");
}
