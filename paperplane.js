class PaperPlane {
    constructor(onUpdate) {
        this.onUpdate = onUpdate; // UI更新回调

        // 状态变量
        this.values = {
            v: 0, Yaw: 0, Pitch: 0, Roll: 0, buttonRelease: false, p: 0,
            D: 0, F: 0, S: 0, sPrime: 0, thrustCount: 0, B: 1,
            intensityScore: 0, // 用于计算报告周期内的强度累积值
            thrustCountPeriod: 0, // 用于计算报告周期内的抽插次数
            sessionStartTime: null, // 会话开始时间
            sessionDuration: 0, // 会话持续时间 (ms)
        };

        // 内部计算变量
        this.lastV = 0;
        this.L = 0;
        this.lastL = 0;
        this.tempF = 0;
        this.lastDirectionChangeTime = 0;
        this.lastDirectionChangeV = 0;
        this.sPrimeHistory = [];
        this.timeOfLastMotion = Date.now();
        this.lastMotionP = 0; // Store the last position during motion
        this.timeOfStillnessStart = null; // Track when v first becomes 0

        // 每秒更新一次内部状态
        this.periodicUpdater = setInterval(() => this.updatePeriodicValues(), 1000);
    }

    // 接收实时数据
    update(realtimeData) {
        // Start session timer on first motion
        if (realtimeData.v > 0 && this.values.sessionStartTime === null) {
            this.values.sessionStartTime = Date.now();
        }

        // 1. 更新原始值 (根据用户反馈, v 的范围是 0-18，直接使用)
        this.values.v = realtimeData.v || 0;
        this.values.p = realtimeData.p;
        this.values.Yaw = realtimeData.Yaw;
        this.values.Pitch = realtimeData.Pitch;
        this.values.Roll = realtimeData.Roll;

        // 2. 计算运动方向 D
        let D = 0;
        if (this.values.v > this.lastV) D = 1;
        else if (this.values.v < this.lastV) D = -1;
        this.values.D = D;

        // 3. 计算运动次数 F, 运动频率 tempF, 运动速度 S
        if (D !== 0) {
            this.L = D;
            this.timeOfLastMotion = Date.now(); // Update time of last motion
            this.timeOfStillnessStart = null; // Motion is happening, so not still
        } else {
            // Motion has just stopped
            if (this.timeOfStillnessStart === null) {
                this.timeOfStillnessStart = Date.now();
            }
        }
        if (this.L !== 0 && this.L !== this.lastL) {
            this.values.thrustCount++;
            this.values.thrustCountPeriod++; // Increment period-specific counter
            this.tempF++;

            const T2 = Date.now();
            const v2 = this.values.v;
            if (this.lastDirectionChangeTime > 0) {
                const timeDiff = T2 - this.lastDirectionChangeTime;
                if (timeDiff > 0) {
                    // S is the speed of a single thrust
                    const speed = Math.abs(Math.ceil((v2 - this.lastDirectionChangeV) / timeDiff * 1000));
                    this.values.S = speed;
                    // sPrime is the accumulated intensity over 5 seconds
                    this.values.sPrime += speed;
                    this.values.intensityScore += speed; // 累加到新的强度值变量
                }
            }
            this.lastDirectionChangeTime = T2;
            this.lastDirectionChangeV = v2;
        }
        this.lastL = this.L;
        this.lastV = this.values.v;

        // 4. 触发更新
        if (this.onUpdate) {
            this.onUpdate(this.values);
        }
    }

    // 接收按键事件
    updateKeyEvent() {
        this.values.buttonRelease = true;
        // Stop the session timer on button release
        if (this.values.sessionStartTime) {
            this.values.sessionDuration = Date.now() - this.values.sessionStartTime;
            this.values.sessionStartTime = null;
        }

        if (this.onUpdate) {
            // Pass a second argument to indicate the event type
            this.onUpdate(this.values, 'keyEvent');
        }
        setTimeout(() => {
            this.values.buttonRelease = false;
            // We don't need to notify the UI again when it turns false
        }, 1000);
    }

    // 周期性更新的参数
    updatePeriodicValues() {
        // Update session duration if it's running
        if (this.values.sessionStartTime) {
            this.values.sessionDuration = Date.now() - this.values.sessionStartTime;
        }

        // This function now runs every second
        // 1. 更新运动频率 F (strokes per minute)
        // We now calculate this over a 10-second window
        const TEN_SECONDS = 10;
        this.values.F = this.tempF * (60 / TEN_SECONDS);
        
        // 2. 更新角色兴奋度 B (every 10 seconds)
        if (Date.now() % 10000 < 1000) { // A bit hacky, but runs roughly every 10s
            const s_ = this.values.sPrime;
            let b = this.values.B;
            if (b === 1 && s_ > 200) b++;
            else if (b === 2 && s_ <= 150) b--;
            else if (b === 2 && s_ > 250) b++;
            else if (b === 3 && s_ <= 350) b--;
            else if (b === 3 && s_ > 600) b++;
            else if (b === 4 && s_ <= 700) b--;
            else if (b === 4 && s_ > 900) b++;
            else if (b === 5 && s_ <= 1000) b--;
            this.values.B = b;
            this.values.sPrime = 0; // Reset sPrime after B is calculated
        }

        // 3. 触发UI更新
        if (this.onUpdate) {
            this.onUpdate(this.values);
        }

        // 4. Reset tempF every 10 seconds
        if (Date.now() % 10000 < 1000) {
            this.tempF = 0;
        }
    }

    // 提供一个方法来重置强度分数，在消息成功发送后由外部调用
    resetIntensityScore() {
        this.values.intensityScore = 0;
    }

    // 提供一个方法来重置周期性抽插次数
    resetThrustCountPeriod() {
        this.values.thrustCountPeriod = 0;
    }

    // Clean up when the object is no longer needed
    destroy() {
        clearInterval(this.periodicUpdater);
    }

    // Reset state, can be called on disconnect
    reset() {
        this.values.sessionStartTime = null;
        this.values.sessionDuration = 0;
        this.values.thrustCount = 0;
        this.values.B = 1;
        // etc., reset other relevant values if needed
    }
}

// 导出PaperPlane类
export { PaperPlane };
