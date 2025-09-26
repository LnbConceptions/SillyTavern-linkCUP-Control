class PaperPlane {
    constructor(onUpdate) {
        this.onUpdate = onUpdate; // UI/事件更新回调

        this.reset(); // 初始化所有状态

        // 每秒更新一次内部状态（用于计算频率F等）
        this.periodicUpdater = setInterval(() => this.updatePeriodicValues(), 1000);
        
        // 每5秒更新一次B值
        this.bUpdater = setInterval(() => this.updateBValue(), 5000);
    }

    // 核心：接收实时数据并更新所有逻辑
    update(realtimeData) {
        const now = Date.now();
        const deltaTime = this.lastUpdateTime ? now - this.lastUpdateTime : 0;
        this.lastUpdateTime = now;

        // --- 1. 更新原始值 ---
        this.values.v = realtimeData.v || 0;
        this.values.p = realtimeData.p;
        this.values.Yaw = realtimeData.Yaw;
        this.values.Pitch = realtimeData.Pitch;
        this.values.Roll = realtimeData.Roll;

        // --- 2. 计算运动方向 D ---
        let D = 0;
        if (this.values.v > this.lastV) D = 1;
        else if (this.values.v < this.lastV) D = -1;
        this.values.D = D;

        // --- 3. 处理新的即时事件和计时器 ---
        this.handleTimersAndEvents(D, deltaTime);

        // --- 4. 计算运动次数 F, 运动速度 S 等原有逻辑 ---
        if (D !== 0) {
            this.L = D;
        }
        if (this.L !== 0 && this.L !== this.lastL) {
            this.values.thrustCount++;
            this.values.thrustCountPeriod++;

            this.tempF++;

            // Bang音效触发逻辑：当D从-1变为1时触发（忽略D=0的情况）
            if (this.lastL === -1 && this.L === 1) {
                if (this.onUpdate) {
                    this.onUpdate(this.values, 'bang');
                }
            }

            const T2 = now;
            const v2 = this.values.v;
            if (this.lastDirectionChangeTime > 0) {
                const timeDiff = T2 - this.lastDirectionChangeTime;
                if (timeDiff > 0) {
                    const speed = Math.ceil((v2 - this.lastDirectionChangeV) / timeDiff * 1000);
                    this.values.S = speed;
                    this.values.sPrime += Math.abs(speed);
                    this.values.intensityScore += Math.abs(speed);
                }
            }
            this.lastDirectionChangeTime = T2;
            this.lastDirectionChangeV = v2;
        }
        this.lastL = this.L;
        this.lastV = this.values.v;

        // --- 5. 触发常规更新 ---
        if (this.onUpdate) {
            this.onUpdate(this.values, 'realtime');
        }
    }

    // 新增：处理所有计时器和即时事件的核心逻辑
    handleTimersAndEvents(D, deltaTime) {
        // --- 性爱时长计时器逻辑（修正版）---
        const isInserted = (this.values.v !== 0); // 基于V值而不是D值判断插入状态
        
        // 首次插入时开始计时
        if (isInserted && !this.sexTimerStarted) {
            this.sexTimerStarted = true;
            console.log("性爱计时开始 - 首次插入检测到");
        }
        
        // 计时重启逻辑：当一次计时统计停止后，发生V=0转为V≠0的情况，新一轮计时开始
        if (isInserted && this.sexTimerEnded) {
            // 重置计时器状态，开始新一轮计时
            this.sexTimerStarted = true;
            this.sexTimerEnded = false;
            this.values.effectiveInteractionTime = 0;
            this.isDurationPaused = false;
            if (this.pauseTimer) {
                clearTimeout(this.pauseTimer);
                this.pauseTimer = null;
            }
            console.log("性爱计时重启 - 检测到V=0转为V≠0");
        }
        
        // 只有在计时已开始且未结束的情况下才进行计时逻辑
        if (this.sexTimerStarted && !this.sexTimerEnded) {
            if (isInserted) {
                // 如果插入状态，则计时器不暂停
                this.isDurationPaused = false;
                if (this.pauseTimer) {
                    clearTimeout(this.pauseTimer);
                    this.pauseTimer = null;
                }
            } else {
                // 如果未插入状态，且计时器未暂停，则启动一个1秒的暂停延迟
                if (!this.isDurationPaused && !this.pauseTimer) {
                    this.pauseTimer = setTimeout(() => {
                        this.isDurationPaused = true;
                        console.log("性爱计时暂停 - V=0超过1秒");
                    }, 1000); // 改为1秒
                }
            }
            
            // 如果计时器未暂停，则累加时长
            if (!this.isDurationPaused) {
                this.values.effectiveInteractionTime += deltaTime;
            }
        }

        // --- “再次插入”和“彻底拔出”事件检测逻辑 ---
        const isMoving = (this.values.v > 0);

        if (isMoving) { // 当前在活动
            if (this.wasStill) { // 状态从静止变为活动
                // 检查是否满足“再次插入”条件
                if (this.stillnessDuration > 10000) {
                    // console.log("EVENT: Re-insertion detected."); // Temporarily disabled for cleaner logs
                    if (this.onUpdate) this.onUpdate(this.values, 're-insertion');
                }
                // 重置状态
                this.activityDuration = 0;
                this.wasContinuouslyActive = false;
            }
            this.wasStill = false;
            this.activityDuration += deltaTime;
            this.stillnessDuration = 0;
        } else { // 当前是静止
            if (!this.wasStill) { // 状态从活动变为静止
                // 记录下我们刚刚结束了一段活动
                this.wasContinuouslyActive = (this.activityDuration > 10000);
                this.stillnessDuration = 0;
            }
            this.wasStill = true;
            this.stillnessDuration += deltaTime;
            this.activityDuration = 0;

            // 检查是否满足新的“彻底拔出”条件
            // 1. 之前有过超过10秒的连续活动
            // 2. 现在已经静止超过1秒
            if (this.wasContinuouslyActive && this.stillnessDuration > 1000) {
                // console.log("EVENT: Withdrawal confirmed after 1s of stillness."); // Temporarily disabled for cleaner logs
                if (this.onUpdate) this.onUpdate(this.values, 'withdrawal');
                // 重置标志位，防止在同一次长暂停中重复触发
                this.wasContinuouslyActive = false;
            }
        }
    }

    // 接收按键事件（高潮）
    updateKeyEvent() {
        // 只有在计时已开始且未结束时才处理射精事件
        if (this.sexTimerStarted && !this.sexTimerEnded) {
            this.sexTimerEnded = true;
            console.log("性爱计时结束 - 射精事件触发");
            
            // 触发高潮事件，并附带上"有效交互时长"
            if (this.onUpdate) {
                this.onUpdate(this.values, 'keyEvent');
            }
        }
    }

    // 周期性更新（每秒）
    updatePeriodicValues() {
        // 更新运动频率 F (每分钟搏动次数)
        this.values.F = this.tempF * 6; // tempF是10秒内的计数，乘以6得到每分钟的
        this.tempF = 0; // 每秒重置一次
    }

    // 每5秒更新一次 B：根据5秒内累积的S的绝对值（sPrime）决定+1还是-1，然后重置sPrime
    updateBValue() {
        const s_ = this.values.sPrime;
        let b = this.values.B;
        // 使用阈值窗口判断上/下调，保留原有的滞回特性，但以sPrime为依据
        if (b === 1 && s_ > 200) b++;
        else if (b === 2 && s_ <= 150) b--;
        else if (b === 2 && s_ > 250) b++;
        else if (b === 3 && s_ <= 350) b--;
        else if (b === 3 && s_ > 600) b++;
        else if (b === 4 && s_ <= 700) b--;
        else if (b === 4 && s_ > 900) b++;
        else if (b === 5 && s_ <= 1000) b--;
        this.values.B = b;
        // 每5秒一次判断后重置sPrime
        this.values.sPrime = 0;
    }

    // 重置报告周期内的累积值
    resetIntensityScore() {
        this.values.intensityScore = 0;
    }
    resetThrustCountPeriod() {
        this.values.thrustCountPeriod = 0;
    }

    // 销毁实例时清理
    destroy() {
        clearInterval(this.periodicUpdater);
        if (this.bUpdater) clearInterval(this.bUpdater);
        if (this.pauseTimer) clearTimeout(this.pauseTimer);
    }

    // 重置所有状态
    // 重置方法（可选择保留性爱计时器状态或从全局状态恢复）
    reset(preserveSexTimer = false, globalState = null) {
        // 保存性爱计时器状态
        let savedSexTimerStarted, savedSexTimerEnded, savedEffectiveInteractionTime, savedIsDurationPaused;
        
        if (globalState) {
            // 从全局状态恢复
            savedSexTimerStarted = globalState.sexTimerStarted;
            savedSexTimerEnded = globalState.sexTimerEnded;
            savedEffectiveInteractionTime = globalState.effectiveInteractionTime;
            savedIsDurationPaused = globalState.isDurationPaused;
        } else if (preserveSexTimer) {
            // 保留当前状态
            savedSexTimerStarted = this.sexTimerStarted;
            savedSexTimerEnded = this.sexTimerEnded;
            savedEffectiveInteractionTime = this.values.effectiveInteractionTime;
            savedIsDurationPaused = this.isDurationPaused;
        } else {
            // 完全重置
            savedSexTimerStarted = false;
            savedSexTimerEnded = false;
            savedEffectiveInteractionTime = 0;
            savedIsDurationPaused = false;
        }
        
        this.values = {
            v: 0, Yaw: 0, Pitch: 0, Roll: 0, p: 0,
            D: 0, F: 0, S: 0, sPrime: 0, thrustCount: 0, B: 1,
            intensityScore: 0,
            thrustCountPeriod: 0,
            effectiveInteractionTime: savedEffectiveInteractionTime, // 可能保留的有效交互时长
        };

        // 内部计算变量
        this.lastV = 0;
        this.L = 0;
        this.lastL = 0;
        this.tempF = 0;
        this.lastDirectionChangeTime = 0;
        this.lastDirectionChangeV = 0;
        this.lastUpdateTime = null;

        // 新增：事件和计时器相关状态
        this.wasStill = true;
        this.stillnessDuration = 0;
        this.activityDuration = 0;
        this.isDurationPaused = savedIsDurationPaused;
        this.wasContinuouslyActive = false; // 新增：用于"彻底拔出"事件的标志位
        if (this.pauseTimer) clearTimeout(this.pauseTimer);
        this.pauseTimer = null;
        
        // 新增：性爱计时器状态（可能保留）
        this.sexTimerStarted = savedSexTimerStarted;
        this.sexTimerEnded = savedSexTimerEnded;
        
        if (globalState && this.sexTimerStarted && !this.sexTimerEnded) {
            console.log("蓝牙重连 - 性爱计时器状态已从全局状态恢复");
        } else if (preserveSexTimer && this.sexTimerStarted && !this.sexTimerEnded) {
            console.log("蓝牙重连 - 性爱计时器状态已保留");
        }
    }
}

export { PaperPlane };
