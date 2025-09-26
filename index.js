// index.js - ✨ FINAL CORRECTED VERSION (using import.meta.url) ✨

import { PaperPlane } from './paperplane.js';
import { initializeAudio, handleAudio, resetAudioState, toggleMoan, toggleBreath, getMoanEnabled, getBreathEnabled } from './audioManager.js';
import { handleMessages, resetMessageState } from './messageManager.js';
import { initUI, updateUI, resetUI, resizeChart } from './uiManager.js';
import { startBreathing, stopBreathing, updateBreathRate, resetBreathState } from './breathManager.js';

// Global state variables
let linkCUPDevice = null;
let writeCharacteristic = null;
let notifyCharacteristic = null;
let paperPlane = null;
let lastKeyEventTime = null; // 用于按键事件防抖
const CLIMAX_COOLDOWN_TIME = 5000; // 冷却时间5秒
let handshakeState = {
    uuid_acked: false,
    mac_acked: false,
    firmware_acked: false,
};

// 全局性爱计时器状态
let globalSexTimerState = {
    sexTimerStarted: false,
    sexTimerEnded: false,
    effectiveInteractionTime: 0,
    isDurationPaused: false
};

// 将全局状态暴露到window对象，供其他模块访问
window.globalSexTimerState = globalSexTimerState;

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
    const moanToggle = document.getElementById('linkcup-moan-toggle');
    const breathToggle = document.getElementById('linkcup-breath-toggle');
    const floatingWindow = document.getElementById('linkcup-floating-window');
    const contentWrapper = document.getElementById('linkcup-content-wrapper');
    const collapsibleContent = document.querySelector('.linkcup-collapsible-content');
    const collapseBtn = document.getElementById('linkcup-collapse-btn');
    return { status, connectBtn, resetBtn, dataContainer, moanToggle, breathToggle, floatingWindow, contentWrapper, collapsibleContent, collapseBtn };
};

// Function to handle the special key event
const handleKeyEvent = (values) => {
    const context = SillyTavern.getContext();
    resetMessageState();

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
        switch (data.type) {
            case 1:
                if (!handshakeState.uuid_acked) { sendToDevice({ "type": 2, "ack": 1 }); handshakeState.uuid_acked = true; }
                break;
            case 4:
                if (!handshakeState.mac_acked) { sendToDevice({ "type": 2, "ack": 2 }); handshakeState.mac_acked = true; }
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
                        Yaw: Math.round(valueData.Yaw / 100), Pitch: Math.round(valueData.Pitch / 100), Roll: Math.round(valueData.Roll / 100),
                    };
                    if (paperPlane) paperPlane.update(realtimeData);
                }
                break;
            case 11:
                if (handshakeState.firmware_acked && paperPlane) {
                    const now = Date.now();
                    if (!lastKeyEventTime || now - lastKeyEventTime > CLIMAX_COOLDOWN_TIME) {
                        lastKeyEventTime = now;
                        console.log("EVENT: Key press detected. Triggering key event.");
                        paperPlane.updateKeyEvent();
                    } else {
                        console.log(`EVENT: Key press ignored due to ${CLIMAX_COOLDOWN_TIME/1000}s cooldown.`);
                    }
                }
                break;
        }
    } catch (error) {
        console.error("Failed to parse notification JSON:", error, "Raw data:", jsonString);
    }
};

// Function to handle the reset/re-center command
const onResetClick = async () => {
    await sendToDevice({ "type": 13, "mode": 2 });
    toastr.success('归位指令已发送！', 'linkCUP');
};

// Main connection function
const onConnectClick = async () => {
    if (!navigator.bluetooth) { updateStatusMessage("Bluetooth not supported."); return; }
    if (linkCUPDevice && linkCUPDevice.gatt.connected) { linkCUPDevice.gatt.disconnect(); return; }

    try {
        updateStatusMessage("Requesting device...", 60000);
        // Filter to only show device named "LS Dis Server"
        linkCUPDevice = await navigator.bluetooth.requestDevice({
            filters: [{ name: 'LS Dis Server' }],
            optionalServices: [LCU_SERVICE_UUID],
        });
        linkCUPDevice.addEventListener('gattserverdisconnected', onDisconnected);
        updateStatusMessage("Connecting to GATT server...");
        const server = await linkCUPDevice.gatt.connect();
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
        const dom = getDOM();
        dom.connectBtn.textContent = "Disconnect";
        dom.connectBtn.classList.remove('linkcup-connect-style');
        dom.connectBtn.classList.add('linkcup-disconnect-style');
        dom.resetBtn.style.display = 'block';
        // 在连接后标记窗口为已连接，用于折叠态选择性显示内容
        const fwAfterConnect = document.getElementById('linkcup-floating-window');
        if (fwAfterConnect) fwAfterConnect.classList.add('connected');

        paperPlane = new PaperPlane((values, eventType = 'realtime') => {
            // Override P value based on manual position setting
            if (window.linkCUPPositionOverride && !window.linkCUPPositionOverride.autoEnabled) {
                values = { ...values, p: window.linkCUPPositionOverride.manualValue };
            }
            
            // 同步性爱计时器状态到全局变量
            globalSexTimerState.sexTimerStarted = paperPlane.sexTimerStarted;
            globalSexTimerState.sexTimerEnded = paperPlane.sexTimerEnded;
            globalSexTimerState.effectiveInteractionTime = values.effectiveInteractionTime;
            globalSexTimerState.isDurationPaused = paperPlane.isDurationPaused;
            
            updateUI(values);
            // 未选择角色时，不发送系统报告，不发声
            const context = SillyTavern.getContext();
            const characterSelected = context && context.name2 && context.name2.trim() !== '';
            if (characterSelected) {
                handleMessages(values, paperPlane, eventType);
                if (eventType !== 'keyEvent') {
                    handleAudio(values);
                    updateBreathRate(values.B);
                }
            }
            try {
                if (window.live2d && typeof window.live2d.setLinkCupValue === 'function') {
                    window.live2d.setLinkCupValue(context.name2, values.v);
                }
            } catch (error) {
                console.error("linkCUP: Failed to call setLinkCupValue on Live2D extension.", error);
                if (!window.live2dErrorLogged) { updateStatusMessage("Live2D Error: See console"); window.live2dErrorLogged = true; }
            }
        });
        // 如果有全局保存的性爱计时器状态，则恢复它
        if (globalSexTimerState.sexTimerStarted && !globalSexTimerState.sexTimerEnded) {
            paperPlane.reset(false, globalSexTimerState);
        }
        
        initializeAudio(); initUI(); startBreathing();
        // 连接建立后，保险起见进行多次resize，确保图表正常
        try {
            resizeChart();
            setTimeout(() => resizeChart(), 150);
            setTimeout(() => resizeChart(), 350);
        } catch (e) { /* ignore */ }
    } catch (error) {
        console.error("Bluetooth connection failed:", error);
        updateStatusMessage(`Error: ${error.message.replace('GATT operation failed for service', 'Service')}`, 5000);
        onDisconnected();
    }
};

const onDisconnected = () => {
    updateStatusMessage("linkCUP Disconnected");
    const dom = getDOM();
    dom.connectBtn.textContent = "Connect linkCUP";
    dom.connectBtn.classList.remove('linkcup-disconnect-style');
    dom.connectBtn.classList.add('linkcup-connect-style');
    if(dom.resetBtn) dom.resetBtn.style.display = 'none';
    // 断开后移除连接标记
    const fwOnDisconnected = document.getElementById('linkcup-floating-window');
    if (fwOnDisconnected) fwOnDisconnected.classList.remove('connected');
    resetUI(); resetAudioState(); resetMessageState(); resetBreathState(); stopBreathing();
    linkCUPDevice = null; writeCharacteristic = null; notifyCharacteristic = null;
    
    // 保留性爱计时器状态，只重置其他状态
    if (paperPlane) { 
        paperPlane.reset(true); // 传入true保留性爱计时器状态
        paperPlane.destroy(); 
        paperPlane = null; 
    }
    handshakeState = { uuid_acked: false, mac_acked: false, firmware_acked: false };
};

// This function is called when the extension is loaded
jQuery(async () => {
    const floatingWindow = $(`
        <div id="linkcup-floating-window" class="linkcup-floating-window collapsed">
            <div id="linkcup-drag-handle" class="linkcup-drag-handle">
                <div style="display:flex; align-items:center; gap:6px;">
                    <button id="linkcup-collapse-btn" class="linkcup-collapse-btn" title="折叠/展开">▸</button>
                    <span>linkCUP Control</span>
                </div>
                <button id="linkcup-close-btn" class="linkcup-close-btn">X</button>
            </div>
            <div id="linkcup-content-wrapper"></div>
        </div>
    `);
    $('body').append(floatingWindow);

    // ✨ --- ROBUST UI LOADING FOR ALL ENVIRONMENTS (LOCAL & REMOTE) --- ✨
    try {
        // Try multiple paths to ensure compatibility with both local and remote environments
        let settingsHtml = null;
        const possiblePaths = [
            'scripts/extensions/third-party/linkCUP/public/linkcup.html',
            '/scripts/extensions/third-party/linkCUP/public/linkcup.html',
            new URL('public/linkcup.html', import.meta.url).href
        ];

        for (const path of possiblePaths) {
            try {
                console.log(`[linkCUP] Attempting to load UI from: ${path}`);
                settingsHtml = await $.get(path);
                console.log(`[linkCUP] Successfully loaded UI from: ${path}`);
                break;
            } catch (err) {
                console.warn(`[linkCUP] Failed to load from ${path}:`, err.message);
            }
        }

        if (settingsHtml) {
            $("#linkcup-content-wrapper").html(settingsHtml);
            // 确保内容注入后执行一次chart resize
            setTimeout(() => {
                try { resizeChart(); } catch (e) { console.warn('resizeChart after UI load failed', e); }
            }, 0);
        } else {
            throw new Error("All UI loading paths failed");
        }

    } catch (error) {
        console.error(`[linkCUP] FATAL: Failed to load UI. Extension will not function.`, error);
        $("#linkcup-content-wrapper").html('<p style="color: red; padding: 10px;">Error: Could not load plugin UI. Check console (F12) for details.</p>');
        return; // Stop execution if UI fails to load
    }
    // ✨ --- END OF THE SOLUTION --- ✨

    const context = SillyTavern.getContext();
    context.eventSource.on(context.event_types.APP_READY, () => {
        console.log("linkCUP: SillyTavern is ready. Initializing UI event listeners.");
        const dom = getDOM();
        if (dom.connectBtn) {
            dom.connectBtn.classList.add('linkcup-connect-style');
        }
        $("#linkcup-connect-btn").on("click", onConnectClick);
        $("#linkcup-reset-btn").on("click", onResetClick);
        $("#linkcup-close-btn").on("click", () => $("#linkcup-floating-window").hide());

        // Audio toggles
        const { moanToggle, breathToggle } = getDOM();
        if (moanToggle) {
            moanToggle.addEventListener('click', () => {
                const enabled = toggleMoan();
                moanToggle.classList.toggle('enabled', enabled);
                moanToggle.classList.toggle('disabled', !enabled);
                moanToggle.textContent = enabled ? '呻吟：ON' : '呻吟：OFF';
            });
            // Initialize state
            moanToggle.classList.toggle('enabled', getMoanEnabled());
            moanToggle.classList.toggle('disabled', !getMoanEnabled());
            moanToggle.textContent = getMoanEnabled() ? '呻吟：ON' : '呻吟：OFF';
        }
        if (breathToggle) {
            breathToggle.addEventListener('click', () => {
                const enabled = toggleBreath();
                breathToggle.classList.toggle('enabled', enabled);
                breathToggle.classList.toggle('disabled', !enabled);
                breathToggle.textContent = enabled ? '呼吸：ON' : '呼吸：OFF';
            });
            breathToggle.classList.toggle('enabled', getBreathEnabled());
            breathToggle.classList.toggle('disabled', !getBreathEnabled());
            breathToggle.textContent = getBreathEnabled() ? '呼吸：ON' : '呼吸：OFF';
        }

        // Auto/Manual Position Controls
        const autoToggle = document.getElementById('linkcup-auto-position-toggle');
        const manualSelector = document.getElementById('linkcup-manual-position-selector');
        const positionButtons = Array.from(document.querySelectorAll('.linkcup-position-btn'));

        // Global state for position override to be read by PaperPlane callback
        window.linkCUPPositionOverride = window.linkCUPPositionOverride || { autoEnabled: true, manualValue: 1 };

        const setAutoPosition = (enabled) => {
            window.linkCUPPositionOverride.autoEnabled = enabled;
            autoToggle.classList.toggle('enabled', enabled);
            autoToggle.classList.toggle('disabled', !enabled);
            autoToggle.textContent = enabled ? '自动体位：ON' : '自动体位：OFF';
            manualSelector.style.display = enabled ? 'none' : 'flex';
        };

        if (autoToggle && manualSelector) {
            setAutoPosition(true);
            autoToggle.addEventListener('click', () => setAutoPosition(!window.linkCUPPositionOverride.autoEnabled));
        }

        // Manual position selection handling
        positionButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                positionButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const val = parseInt(btn.getAttribute('data-position'), 10) || 1;
                window.linkCUPPositionOverride.manualValue = val;
            });
        });



        // Collapse/expand behavior
        const collapseBtn = document.getElementById('linkcup-collapse-btn');
        const dragHandle = document.getElementById('linkcup-drag-handle');
        const floatingWindowEl = document.getElementById('linkcup-floating-window');
        const collapsibleContent = document.querySelector('.linkcup-collapsible-content');
        const basicContent = document.querySelector('.linkcup-basic-content');

        let isCollapsed = true; // 默认折叠状态
        const setCollapsed = (collapsed) => {
            isCollapsed = collapsed;
            floatingWindowEl.classList.toggle('collapsed', collapsed);
            collapseBtn.textContent = collapsed ? '▸' : '▾';
            // Resize chart after animation
            setTimeout(() => resizeChart(), 320);
        };

        // 检查用户是否选择了角色
        const hasCharacterSelected = () => {
            try {
                const context = SillyTavern.getContext();
                return context && context.name2 && context.name2.trim() !== '';
            } catch (error) {
                console.warn("linkCUP: Failed to get character context:", error);
                return false;
            }
        };

        if (collapseBtn && collapsibleContent) {
            // 初始化为折叠状态（已在初始HTML上添加collapsed类和▸，这里再同步一次状态与箭头）
            setCollapsed(true);
            
            // 仅点击箭头按钮可以切换折叠/展开状态
            collapseBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                setCollapsed(!isCollapsed);
            });
        }
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

    $("#extensions_settings").append(`
        <div class="inline-drawer">
            <div class="inline-drawer-toggle inline-drawer-header"><b>linkCUP</b><div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div></div>
            <div class="inline-drawer-content"><button id="open-linkcup-window-btn" class="menu_button">Open linkCUP Window</button></div>
        </div>
    `);
    
    $("#open-linkcup-window-btn").on("click", () => {
        $("#linkcup-floating-window").show();
        try { initUI(); } catch (e) { /* ignore */ }
        resizeChart();
        setTimeout(() => resizeChart(), 200);
    });

    // Observe floating window size changes and resize chart accordingly
    const floatingWindowObserverTarget = document.getElementById('linkcup-floating-window');
    if (floatingWindowObserverTarget && typeof ResizeObserver !== 'undefined') {
        let resizeRAF = null;
        const ro = new ResizeObserver(() => {
            if (resizeRAF) cancelAnimationFrame(resizeRAF);
            resizeRAF = requestAnimationFrame(() => {
                resizeChart();
            });
        });
        ro.observe(floatingWindowObserverTarget);
    } else {
        // Fallback: throttle on window resize
        let resizeTimeout = null;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => resizeChart(), 120);
        });
    }
});

function unlockAudioContext() {
    const silentWav = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA";
    const audio = new Audio(silentWav);
    audio.volume = 0;
    audio.play().catch(e => console.warn("Could not unlock audio context:", e));
}
