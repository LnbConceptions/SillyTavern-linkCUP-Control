// IIFE to prevent global scope pollution
(function () {
    // Plugin metadata
    const name = "linkCUP Interface";
    const displayName = "linkCUP";
    const LCU_ID = "linkcup-interface";
    const LCU_SETTINGS_ID = "linkcup-interface-settings";

    // Import the PaperPlane class
    // Make sure paperplane.js is in the same directory
    let PaperPlane;
    try {
        // For SillyTavern plugin system, we need to use require instead of import
        const paperplaneModule = require('./paperplane.js');
        PaperPlane = paperplaneModule.PaperPlane;
    } catch (err) {
        console.error("Failed to load paperplane.js:", err);
        // Let the user know that the plugin failed to load
        if (typeof toastr !== 'undefined') {
            toastr.error("linkCUP Interface: Failed to load paperplane.js. The plugin will not work.", "Plugin Error");
        }
    }


    // Constants for Bluetooth communication based on your protocol
    const LCU_SERVICE_UUID = "6e400001-b5a3-f393-e0a9-e50e24dcca9e";
    const LCU_WRITE_CHARACTERISTIC_UUID = "6e400002-b5a3-f393-e0a9-e50e24dcca9e";
    const LCU_NOTIFY_CHARACTERISTIC_UUID = "6e400003-b5a3-f393-e0a9-e50e24dcca9e";

    // Global state variables
    let linkCUPDevice = null;
    let writeCharacteristic = null;
    let notifyCharacteristic = null;
    let paperPlane = null;
    let reportInterval = null;
    let handshakeState = {
        uuid_acked: false,
        mac_acked: false,
        firmware_acked: false,
    };

    // UI Elements
    const getDOM = () => {
        const status = document.getElementById(`${LCU_ID}-status`);
        const connectBtn = document.getElementById(`${LCU_ID}-connect-btn`);
        const dataContainer = document.getElementById(`${LCU_ID}-data-container`);
        return { status, connectBtn, dataContainer };
    };

    // Update UI with data from paperplane.js
    const updateUI = (values) => {
        const { dataContainer } = getDOM();
        if (!dataContainer) return;

        // Map position 'p' to a descriptive string
        const positionMap = {
            1: '后入位 (Rear-entry)',
            2: '传教士 (Missionary)',
            3: '侧卧位 (Spooning)',
            4: '女上位 (Cowgirl)',
            5: '站立位 (Standing)',
            6: '反向女上位 (Reverse Cowgirl)',
            7: '莲花位 (Lotus)',
            8: '骑乘位 (Lap dance)',
            9: '十字位 (Cross)',
            10: '悬挂位 (Suspended)',
        };

        // Map excitement 'B' to a descriptive string
        const excitementMap = {
            1: '平静 (Calm)',
            2: '微兴 (Aroused)',
            3: '兴奋 (Excited)',
            4: '高涨 (Heightened)',
            5: '极乐 (Ecstatic)',
        };


        dataContainer.innerHTML = `
            <li><strong>当前体位 (Position):</strong> ${values.p} (${positionMap[values.p] || '未知'})</li>
            <li><strong>运动方向 (Direction):</strong> ${values.D === 1 ? '进入' : values.D === -1 ? '退出' : '静止'}</li>
            <li><strong>抽插频率 (Thrust Freq.):</strong> ${values.F} 次/分钟</li>
            <li><strong>抽插速度 (Thrust Speed):</strong> ${values.S}</li>
            <li><strong>累计兴奋值 (sPrime):</strong> ${values.sPrime}</li>
            <li><strong>总计次数 (Total Thrusts):</strong> ${values.thrustCount}</li>
            <li><strong>角色兴奋度 (Excitement):</strong> ${values.B} (${excitementMap[values.B] || '未知'})</li>
            <li><strong>Yaw:</strong> ${values.Yaw.toFixed(2)} | <strong>Pitch:</strong> ${values.Pitch.toFixed(2)} | <strong>Roll:</strong> ${values.Roll.toFixed(2)}</li>
        `;
    };

    // Function to send data to the device
    const sendToDevice = async (data) => {
        if (!writeCharacteristic) {
            console.error("Write characteristic not available.");
            if (typeof toastr !== 'undefined') {
                toastr.error("linkCUP: Write characteristic not available.", "Connection Error");
            }
            return;
        }
        try {
            const encoder = new TextEncoder();
            await writeCharacteristic.writeValue(encoder.encode(JSON.stringify(data)));
            console.log("Sent:", data);
        } catch (error) {
            console.error("Error writing to device:", error);
            if (typeof toastr !== 'undefined') {
                toastr.error("linkCUP: Failed to send data to device.", "Connection Error");
            }
        }
    };

    // Handle incoming data notifications from the device
    const handleNotifications = (event) => {
        const value = event.target.value;
        const decoder = new TextDecoder('utf-8');
        const jsonString = decoder.decode(value);

        try {
            const data = JSON.parse(jsonString);
            console.log("Received:", data);

            // Handle handshake protocol
            if (!handshakeState.uuid_acked && data.type === 1) { // TYPE_UUID
                sendToDevice({ "type": 2, "ack": 1 }); // ACK_UUID
                handshakeState.uuid_acked = true;
                return;
            }
            if (!handshakeState.mac_acked && data.type === 4) { // TYPE_MAC_ADDRESS
                sendToDevice({ "type": 2, "ack": 2 }); // ACK_MAC_ADDRESS
                handshakeState.mac_acked = true;
                return;
            }
            if (!handshakeState.firmware_acked && data.type === 5) { // TYPE_FIRMWARE_VER
                sendToDevice({ "type": 2, "ack": 3 }); // ACK_FIRMWARE_VER
                handshakeState.firmware_acked = true;
                if (typeof toastr !== 'undefined') {
                    toastr.success("linkCUP: Handshake complete. Ready for action!", "Connected");
                }
                return;
            }

            // After handshake, process real-time data
            if (handshakeState.firmware_acked) {
                switch (data.type) {
                    case 7: // TYPE_REAL_TIME_VALUE in your protocol, but example shows 14? Using 7 based on enum.
                    case 14: // Based on your example data
                        // The protocol doc says v is a number, but example shows an array.
                        // We'll handle both cases for robustness.
                        const v_value = Array.isArray(data.value.v) ? data.value.v[0] : data.value.v;
                        const realtimeData = {
                            v: v_value,
                            p: data.value.p,
                            Yaw: data.value.Yaw,
                            Pitch: data.value.Pitch,
                            Roll: data.value.Roll,
                        };
                        if (paperPlane) {
                            paperPlane.update(realtimeData);
                        }
                        break;
                    case 11: // TYPE_EVENT_KEY
                        if (paperPlane && data.k === 1) {
                            paperPlane.updateKeyEvent();
                        }
                        break;
                }
            }
        } catch (error) {
            console.error("Failed to parse notification JSON:", error, "Raw data:", jsonString);
        }
    };

    // Function to send the action report to the AI
    const sendActionReport = () => {
        // Check if paperPlane exists
        if (!paperPlane) return;

        // Check if API is connected (if the function exists)
        if (typeof isApiConnected !== 'undefined' && !isApiConnected()) return;

        const values = paperPlane.values;

        // Calculate thrusts in the last 5 seconds.
        // paperplane.js calculates F (freq per min) every 5s. F = tempF * 12.
        // So, thrusts in last 5s is tempF. We need to access it before it's reset.
        // A small modification to paperplane.js might be needed, or we can just use F.
        // Let's use F/12 for simplicity.
        const thrustsLast5s = Math.round(values.F / 12);

        // Format the report string
        const report = `[linkCUP Action Report: Position=${values.p}, Thrusts=${thrustsLast5s}, Intensity=${values.sPrime}, Excitement=${values.B}]`;

        // Create a system message. This message will be added to context but not shown to the user.
        // It will instruct the AI to react to the user's actions.
        const systemMessage = `(System note: The user has just performed a series of physical actions. Based on the following data, generate a response that reflects your character's reaction to these actions. The data is as follows: ${report})`;
        
        // Use SillyTavern's internal functions to send a silent message and trigger a response
        // Only proceed if the required functions exist
        if (typeof getChat !== 'undefined' && typeof updateChat !== 'undefined' && typeof getApiMessage !== 'undefined') {
            const message = {
                mes: systemMessage,
                is_user: false,
                is_system: true,
                name: 'System',
                send_date: Date.now(),
                is_api: false, // Important: keeps it internal
            };

            // Add the message to the chat log internally without displaying it
            const chat = getChat();
            chat.push(message);
            updateChat(chat);
            
            console.log("Sending action report to AI:", systemMessage);
            
            // Trigger the AI to generate a response based on the new context
            getApiMessage();
        }

        if (typeof toastr !== 'undefined') {
            toastr.info("Action report sent to character.", "linkCUP");
        }
    };


    // Main connection function
    const onConnectClick = async () => {
        const { status, connectBtn } = getDOM();

        if (!navigator.bluetooth) {
            if (typeof toastr !== 'undefined') {
                toastr.error("Web Bluetooth is not available on this browser.", "Compatibility Error");
            }
            status.textContent = "Bluetooth not supported.";
            return;
        }

        if (linkCUPDevice && linkCUPDevice.gatt.connected) {
            // Disconnect logic
            linkCUPDevice.gatt.disconnect();
            return;
        }

        try {
            status.textContent = "Requesting device...";
            if (typeof toastr !== 'undefined') {
                toastr.info("Please select your linkCUP from the list.", "Bluetooth");
            }

            // Request device
            linkCUPDevice = await navigator.bluetooth.requestDevice({
                filters: [{ services: [LCU_SERVICE_UUID] }],
                optionalServices: [LCU_SERVICE_UUID]
            });

            linkCUPDevice.addEventListener('gattserverdisconnected', onDisconnected);
            status.textContent = "Connecting to GATT server...";
            const server = await linkCUPDevice.gatt.connect();

            status.textContent = "Getting service...";
            const service = await server.getPrimaryService(LCU_SERVICE_UUID);

            status.textContent = "Getting characteristics...";
            writeCharacteristic = await service.getCharacteristic(LCU_WRITE_CHARACTERISTIC_UUID);
            notifyCharacteristic = await service.getCharacteristic(LCU_NOTIFY_CHARACTERISTIC_UUID);

            status.textContent = "Starting notifications...";
            await notifyCharacteristic.startNotifications();
            notifyCharacteristic.addEventListener('characteristicvaluechanged', handleNotifications);

            // Initialize PaperPlane
            if (PaperPlane) {
                 paperPlane = new PaperPlane(updateUI);
            } else if (window.PaperPlane) {
                 paperPlane = new window.PaperPlane(updateUI);
            } else {
                if (typeof toastr !== 'undefined') {
                    toastr.error("PaperPlane class not found. Plugin cannot process data.", "Plugin Error");
                }
                return;
            }
           

            status.textContent = "Connected. Waiting for handshake...";
            connectBtn.textContent = "Disconnect";
            if (typeof toastr !== 'undefined') {
                toastr.info("linkCUP connected. Starting handshake...", "Success");
            }

            // Start the 5-second report interval
            if (reportInterval) clearInterval(reportInterval);
            reportInterval = setInterval(sendActionReport, 5000);

        } catch (error) {
            console.error("Bluetooth connection failed:", error);
            status.textContent = `Error: ${error.message}`;
            if (typeof toastr !== 'undefined') {
                toastr.error(`Connection failed: ${error.message}`, "Bluetooth Error");
            }
            onDisconnected();
        }
    };

    const onDisconnected = () => {
        const { status, connectBtn, dataContainer } = getDOM();
        status.textContent = "Disconnected";
        connectBtn.textContent = "Connect linkCUP";
        dataContainer.innerHTML = '';

        if (reportInterval) {
            clearInterval(reportInterval);
            reportInterval = null;
        }

        linkCUPDevice = null;
        writeCharacteristic = null;
        notifyCharacteristic = null;
        paperPlane = null;
        handshakeState = { uuid_acked: false, mac_acked: false, firmware_acked: false };

        if (typeof toastr !== 'undefined') {
            toastr.warning("linkCUP has been disconnected.", "Connection Lost");
        }
    };

    // Function to create the plugin's UI
    const createUI = () => {
        const settingsHtml = `
            <div id="${LCU_SETTINGS_ID}" class="linkcup-settings">
                <button id="${LCU_ID}-connect-btn" class="menu_button">Connect linkCUP</button>
                <div id="${LCU_ID}-status" class="linkcup-status">Not connected</div>
                <ul id="${LCU_ID}-data-container" class="linkcup-data"></ul>
            </div>
        `;
        $("#extensions_settings").append(settingsHtml);
        $(`#${LCU_ID}-connect-btn`).on('click', onConnectClick);
    };

    // Function to run when the plugin is loaded
    const onStart = () => {
        createUI();
    };

    // Register the plugin with SillyTavern
    // Check if jQuery is available before using it
    if (typeof jQuery !== 'undefined') {
        jQuery(async () => {
            const settings = {
                name: name,
                displayName: displayName,
                id: LCU_ID,
                onstart: onStart,
            };
            // Check if addExtensionSettings is available before calling it
            if (typeof addExtensionSettings !== 'undefined') {
                addExtensionSettings(settings);
            }
        });
    } else {
        // Fallback: try to register the plugin without jQuery
        console.warn("jQuery not available, attempting to register plugin without it");
        // Wait a bit for other scripts to load
        setTimeout(() => {
            if (typeof addExtensionSettings !== 'undefined') {
                addExtensionSettings({
                    name: name,
                    displayName: displayName,
                    id: LCU_ID,
                    onstart: onStart,
                });
            }
        }, 1000);
    }
})();
