// linkCUP UI Extension Script
(function () {
    // Get SillyTavern context
    const context = SillyTavern.getContext();

    // Import PaperPlane module
    import('./paperplane.js').then((module) => {
        window.PaperPlane = module.PaperPlane;
    }).catch((err) => {
        console.error('Failed to load PaperPlane:', err);
        if (toastr) toastr.error('linkCUP: Failed to load processing module.', 'Error');
    });

    // Bluetooth UUIDs
    const SERVICE_UUID = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
    const WRITE_UUID = '6e400002-b5a3-f393-e0a9-e50e24dcca9e';
    const NOTIFY_UUID = '6e400003-b5a3-f393-e0a9-e50e24dcca9e';

    let device = null;
    let writeChar = null;
    let notifyChar = null;
    let paperPlane = null;
    let reportInterval = null;
    let handshakeState = { uuid_acked: false, mac_acked: false, firmware_acked: false };

    // Create UI in extensions panel
    function createUI() {
        const html = `
            <div class="linkcup-settings">
                <button id="linkcup-connect" class="menu_button">Connect linkCUP</button>
                <div class="linkcup-status">Not connected</div>
                <ul class="linkcup-data"></ul>
            </div>
        `;
        $('#extensions_settings').append(html);

        $('#linkcup-connect').on('click', connectDevice);
    }

    // Update data display
    function updateDataDisplay(values) {
        const container = $('.linkcup-data');
        container.empty();

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
        // 生成粉色爱心图标显示兴奋度
        const generateExcitementHearts = (level) => {
            const hearts = [];
            for (let i = 1; i <= 5; i++) {
                if (i <= level) {
                    hearts.push('<span style="color: #ff69b4; font-size: 16px;">♥</span>'); // 实心粉色爱心
                } else {
                    hearts.push('<span style="color: #ff69b4; font-size: 16px;">♡</span>'); // 空心粉色爱心
                }
            }
            return hearts.join(' ');
        };

        container.append(`<li><strong>当前体位:</strong> ${values.p} (${positionMap[values.p] || '未知'})</li>`);
        container.append(`<li><strong>运动方向:</strong> ${values.D === 1 ? '进入' : values.D === -1 ? '退出' : '静止'}</li>`);
        container.append(`<li><strong>抽插频率:</strong> ${values.F} 次/分钟</li>`);
        container.append(`<li><strong>抽插速度:</strong> ${values.S}</li>`);
        container.append(`<li><strong>累计兴奋值:</strong> ${values.sPrime}</li>`);
        container.append(`<li><strong>总计次数:</strong> ${values.thrustCount}</li>`);
        container.append(`<li><strong>角色兴奋度:</strong> ${generateExcitementHearts(values.B)}</li>`);
        container.append(`<li><strong>Yaw/Pitch/Roll:</strong> ${values.Yaw.toFixed(2)} / ${values.Pitch.toFixed(2)} / ${values.Roll.toFixed(2)}</li>`);
    }

    // Send to device
    async function sendData(data) {
        if (!writeChar) return;
        const encoder = new TextEncoder();
        await writeChar.writeValue(encoder.encode(JSON.stringify(data)));
    }

    // Handle notifications
    function handleNotification(event) {
        const value = event.target.value;
        const decoder = new TextDecoder('utf-8');
        const data = JSON.parse(decoder.decode(value));

        if (!handshakeState.firmware_acked) {
            if (data.type === 1) {
                sendData({ type: 2, ack: 1 });
                handshakeState.uuid_acked = true;
            } else if (data.type === 4) {
                sendData({ type: 2, ack: 2 });
                handshakeState.mac_acked = true;
            } else if (data.type === 5) {
                sendData({ type: 2, ack: 3 });
                handshakeState.firmware_acked = true;
                toastr.success('Handshake complete!');
                $('.linkcup-status').text('Connected and ready');
            }
            return;
        }

        if (data.type === 14) {
            const v = Array.isArray(data.value.v) ? data.value.v[0] : data.value.v;
            const realtimeData = {
                v: v,
                p: data.value.p,
                Yaw: data.value.Yaw,
                Pitch: data.value.Pitch,
                Roll: data.value.Roll,
            };
            paperPlane.update(realtimeData);
        } else if (data.type === 11 && data.k === 1) {
            paperPlane.updateKeyEvent();
        }
    }

    // Send report to AI
    function sendReport() {
        if (!paperPlane || context.online_status === 'no_connection') return;

        const values = paperPlane.values;
        const thrusts5s = Math.round(values.F / 12);
        const report = `当前体位:${values.p}, 抽插次数:${thrusts5s}, 抽插强度:${values.sPrime}, 角色兴奋度:${values.B}`;
        const systemMes = `(System note: The user has performed actions: ${report}. Make your character respond proactively to these changes in the chat window.)`;

        context.chat.push({
            name: 'System',
            mes: systemMes,
            is_user: false,
            is_system: true,
            extra: { isSmallSys: true },
            send_date: Date.now(),
        });
        context.saveMetadata();
        context.generate();
        toastr.info('Report sent to AI.');
    }

    // Connect device
    async function connectDevice() {
        const status = $('.linkcup-status');
        const btn = $('#linkcup-connect');

        if (device && device.gatt.connected) {
            device.gatt.disconnect();
            return;
        }

        try {
            status.text('Connecting...');
            device = await navigator.bluetooth.requestDevice({
                filters: [{ services: [SERVICE_UUID] }],
            });

            device.addEventListener('gattserverdisconnected', () => {
                status.text('Disconnected');
                btn.text('Connect linkCUP');
                clearInterval(reportInterval);
                paperPlane = null;
            });

            const server = await device.gatt.connect();
            const service = await server.getPrimaryService(SERVICE_UUID);
            writeChar = await service.getCharacteristic(WRITE_UUID);
            notifyChar = await service.getCharacteristic(NOTIFY_UUID);

            await notifyChar.startNotifications();
            notifyChar.addEventListener('characteristicvaluechanged', handleNotification);

            paperPlane = new window.PaperPlane(updateDataDisplay);
            status.text('Connected. Handshaking...');
            btn.text('Disconnect');

            reportInterval = setInterval(sendReport, 5000);
        } catch (err) {
            console.error('Connection failed:', err);
            status.text('Error: ' + err.message);
        }
    }

    // Init
    document.addEventListener('DOMContentLoaded', createUI);
})();
