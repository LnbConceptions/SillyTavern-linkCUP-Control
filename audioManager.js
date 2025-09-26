// audioManager.js
// This module encapsulates all logic related to audio playback.

// State variables
let audioLogicState = {
    lastNonZeroD: 0,
    stillnessStartTime: null, // 记录D=0开始的时间
    breathTimer: null,
    latestB: 1,
    latestP: 0,
};
let lastPlayedMoan = [];
let lastPlayedBreath = [];
let lastPlayedBang = [];
let moanFiles = [];
let breathFiles = [];
let bangFiles = [];
let isAudioPlaying = false; // Mutex to prevent overlapping sounds
let currentBangAudio = null; // Track current bang audio for stopping
const extensionFolderPath = `scripts/extensions/third-party/linkCUP`;

// Audio control state
let audioControlState = {
    moanEnabled: true,
    breathEnabled: true,
    bangEnabled: true
};

// --- Private Functions ---

const playMoanSound = (values) => {
    if (isAudioPlaying || !audioControlState.moanEnabled) return;

    const { p, B: b } = values;
    let matchingFiles = moanFiles.filter(file => {
        const nameOnly = file.split('.')[0];
        const parts = nameOnly.split('_');
        const fileP_part = parts.find(part => part.startsWith('P'));
        if (!fileP_part) return false;
        const fileP = parseInt(fileP_part.substring(1));
        const fileB_parts = parts.filter(part => part.startsWith('B'));
        if (fileB_parts.length === 0) return (fileP === p || fileP === 0);
        const fileB_values = fileB_parts.map(part => parseInt(part.substring(1)));
        return (fileP === p || fileP === 0) && (fileB_values.includes(b) || fileB_values.includes(0));
    });

    if (matchingFiles.length === 0) return;

    let availableFiles = matchingFiles.filter(f => !lastPlayedMoan.includes(f));
    if (availableFiles.length === 0) {
        lastPlayedMoan = lastPlayedMoan.filter(f => !matchingFiles.includes(f));
        availableFiles = matchingFiles;
    }

    const fileToPlay = availableFiles[Math.floor(Math.random() * availableFiles.length)];
    if (fileToPlay) {
        isAudioPlaying = true;
        const audioPath = `${extensionFolderPath}/public/moan/${fileToPlay}`;
        const audio = new Audio(audioPath);
        audio.play().catch(e => {
            console.error("Audio playback failed:", e);
            isAudioPlaying = false;
        });
        audio.onended = () => { isAudioPlaying = false; };
        lastPlayedMoan.push(fileToPlay);
    }
};

const playBreathSound = (values) => {
    if (isAudioPlaying || !audioControlState.breathEnabled) return;

    const { p, B: b } = values;
    let matchingFiles = breathFiles.filter(file => {
        const nameOnly = file.split('.')[0];
        const parts = nameOnly.split('_');
        const fileP_part = parts.find(part => part.startsWith('P'));
        const fileB_part = parts.find(part => part.startsWith('B'));
        if (!fileP_part || !fileB_part) return false;
        const fileP = parseInt(fileP_part.substring(1));
        const fileB = parseInt(fileB_part.substring(1));
        return (fileP === p || fileP === 0) && (fileB === b || fileB === 0);
    });

    if (matchingFiles.length === 0) return;

    let availableFiles = matchingFiles.filter(f => !lastPlayedBreath.includes(f));
    if (availableFiles.length === 0) {
        lastPlayedBreath = lastPlayedBreath.filter(f => !matchingFiles.includes(f));
        availableFiles = matchingFiles;
    }

    const fileToPlay = availableFiles[Math.floor(Math.random() * availableFiles.length)];
    if (fileToPlay) {
        isAudioPlaying = true;
        const audioPath = `${extensionFolderPath}/public/breath/${fileToPlay}`;
        const audio = new Audio(audioPath);
        audio.play().catch(e => {
            console.error("Audio playback failed:", e);
            isAudioPlaying = false;
        });
        audio.onended = () => { isAudioPlaying = false; };
        lastPlayedBreath.push(fileToPlay);
    }
};

const playBangSound = (values) => {
    if (!audioControlState.bangEnabled) return;

    const { p, B: b } = values;
    let matchingFiles = bangFiles.filter(file => {
        const nameOnly = file.split('.')[0];
        const parts = nameOnly.split('_');
        
        // 查找P部分，支持多个P值（如P2_P3_P5）
        const pParts = parts.filter(part => part.startsWith('P'));
        const pValues = pParts.map(part => parseInt(part.substring(1)));
        const pMatches = pValues.includes(p) || pValues.includes(0);
        
        // 查找B部分
        const bPart = parts.find(part => part.startsWith('B'));
        if (!bPart) return false;
        const fileB = parseInt(bPart.substring(1));
        const bMatches = (fileB === b || fileB === 0);
        
        return pMatches && bMatches;
    });

    if (matchingFiles.length === 0) return;

    // 立即停止当前播放的bang音效
    if (currentBangAudio) {
        currentBangAudio.pause();
        currentBangAudio.currentTime = 0;
        currentBangAudio = null;
    }

    // 选择文件播放
    let availableFiles = matchingFiles.filter(f => !lastPlayedBang.includes(f));
    if (availableFiles.length === 0) {
        lastPlayedBang = lastPlayedBang.filter(f => !matchingFiles.includes(f));
        availableFiles = matchingFiles;
    }

    const fileToPlay = availableFiles[Math.floor(Math.random() * availableFiles.length)];
    if (fileToPlay) {
        const audioPath = `${extensionFolderPath}/public/bang/${fileToPlay}`;
        currentBangAudio = new Audio(audioPath);
        currentBangAudio.play().catch(e => {
            console.error("Bang audio playback failed:", e);
            currentBangAudio = null;
        });
        currentBangAudio.onended = () => { 
            currentBangAudio = null; 
        };
        lastPlayedBang.push(fileToPlay);
    }
};

// --- Public API ---

export const initializeAudio = () => {
    // Populate file lists
    moanFiles = [
        "P0_B1_B2_moan_1.wav", "P0_B1_B2_moan_2.wav", "P0_B1_B2_moan_3.wav", "P0_B1_B2_moan_4.wav",
        "P0_B1_B2_moan_5.wav", "P0_B1_B2_moan_6.wav", "P0_B1_B2_moan_7.wav", "P0_B1_B2_moan_8.wav",
        "P0_B1_B2_moan_9.wav", "P0_B1_B2_moan_10.wav", "P0_B1_B2_moan_11.wav", "P0_B1_B2_moan_12.wav",
        "P0_B1_B2_moan_15.wav", "P0_B1_B2_B3_moan_1.wav", "P0_B1_B2_B3_moan_2.wav", "P0_B1_B2_B3_moan_3.wav",
        "P0_B1_B2_B3_moan_4.wav", "P0_B1_B2_B3_moan_5.wav", "P0_B1_B2_B3_moan_6.wav", "P0_B1_moan_1.wav",
        "P0_B1_moan_2.wav", "P0_B1_moan_3.wav", "P0_B1_moan_4.wav", "P0_B1_moan_5.wav", "P0_B1_moan_6.wav",
        "P0_B2_B3_moan_1.wav", "P0_B2_B3_moan_2.wav", "P0_B2_B3_moan_3.wav", "P0_B2_B3_moan_4.wav",
        "P0_B2_B3_moan_5.wav", "P0_B2_B3_moan_6.wav", "P0_B2_B3_moan_7.wav", "P0_B2_B3_moan_8.wav",
        "P0_B2_B3_B4_moan_1.wav", "P0_B2_moan_1.wav", "P0_B2_moan_2.wav", "P0_B2_moan_3.wav",
        "P0_B2_moan_4.wav", "P0_B2_moan_5.wav", "P0_B3_B4_B5_moan_1.wav", "P0_B3_B4_B5_moan_2.wav",
        "P0_B3_B4_B5_moan_3.wav", "P0_B3_B4_B5_moan_4.wav", "P0_B3_B4_B5_moan_5.wav", "P0_B3_B4_B5_moan_6.wav",
        "P0_B3_B4_B5_moan_7.wav", "P0_B3_B4_B5_moan_8.wav", "P0_B3_B4_B5_moan_9.wav", "P0_B3_B4_B5_moan_10.wav",
        "P0_B3_B4_B5_moan_11.wav", "P0_B3_B4_B5_moan_12.wav", "P0_B3_B4_moan_1.wav", "P0_B3_B4_moan_2.wav",
        "P0_B3_B4_moan_3.wav", "P0_B3_B4_moan_4.wav", "P0_B3_B4_moan_5.wav", "P0_B3_B4_moan_6.wav",
        "P0_B3_B4_moan_7.wav", "P0_B3_B4_moan_8.wav", "P0_B3_moan_1.wav", "P0_B3_moan_2.wav",
        "P0_B3_moan_3.wav", "P0_B3_moan_4.wav", "P0_B4_B5_moan_1.wav", "P0_B4_B5_moan_2.wav",
        "P0_B4_B5_moan_3.wav", "P0_B4_B5_moan_4.wav", "P0_B4_B5_moan_5.wav", "P0_B4_B5_moan_6.wav",
        "P0_B4_B5_moan_7.wav", "P0_B4_B5_moan_8.wav", "P0_B4_B5_moan_9.wav", "P0_B4_B5_moan_10.wav",
        "P0_B4_B5_moan_11.wav", "P0_B4_moan_1.wav", "P0_B4_moan_2.wav", "P0_B4_moan_3.wav",
        "P0_B5_moan_1.wav", "P0_B5_moan_2.wav", "P0_B5_moan_3.wav", "P0_B5_moan_4.wav",
        "P0_B5_moan_5.wav", "P0_B5_moan_6.wav"
    ];
    breathFiles = [
        "P0_B1_breath_1.wav", "P0_B1_breath_2.wav", "P0_B1_breath_3.wav", "P0_B1_breath_4.wav",
        "P0_B2_breath_1.wav", "P0_B2_breath_2.wav", "P0_B2_breath_3.wav",
        "P0_B3_breath_1.wav", "P0_B3_breath_2.wav", "P0_B3_breath_3.wav", "P0_B3_breath_4.wav", "P0_B3_breath_5.wav", "P0_B3_breath_6.wav",
        "P0_B4_breath_1.wav", "P0_B4_breath_2.wav", "P0_B4_breath_3.wav", "P0_B4_breath_4.wav",
        "P0_B5_breath_1.wav", "P0_B5_breath_2.wav", "P0_B5_breath_3.wav", "P0_B5_breath_4.wav", "P0_B5_breath_5.wav"
    ];
    bangFiles = [
        "P10_B0_bang_01.wav",
        "P1_B0_bang_01.wav", "P1_B0_bang_02.wav",
        "P2_P3_P5_B0_bang_01.wav", "P2_P3_P5_B0_bang_02.wav", "P2_P3_P5_B0_bang_03.wav", "P2_P3_P5_B0_bang_04.wav", "P2_P3_P5_B0_bang_05.wav",
        "P4_P6_P7_P8_B0_bang_01.wav",
        "P9_B0_bang_01.wav"
    ];
    console.log("AudioManager: Audio files populated.");
};

export const handleAudio = (values) => {
    // 跟踪最新的P和B值以便呼吸循环使用最新筛选与间隔
    audioLogicState.latestB = values.B;
    audioLogicState.latestP = values.p;

    const d = values.D;
    const now = Date.now();

    if (d !== 0) {
        // 清除呼吸循环与静止状态
        if (audioLogicState.breathTimer) {
            clearTimeout(audioLogicState.breathTimer);
            audioLogicState.breathTimer = null;
        }
        audioLogicState.stillnessStartTime = null;

        // 方向变化触发呻吟
        if (audioLogicState.lastNonZeroD !== 0 && d !== audioLogicState.lastNonZeroD) {
            playMoanSound(values);
        }
        audioLogicState.lastNonZeroD = d;
        return;
    }

    // d === 0 的情况，记录开始静止的时间
    if (audioLogicState.stillnessStartTime == null) {
        audioLogicState.stillnessStartTime = now;
    }

    // 满足静止超过0.5秒，启动/维持呼吸循环
    const stillnessDuration = now - audioLogicState.stillnessStartTime;
    if (stillnessDuration >= 500 && !audioLogicState.breathTimer) {
        const breathLoop = () => {
            // 设备断开或UI失效时停止
            const statusEl = document.getElementById('linkcup-status');
            if (!statusEl) {
                clearTimeout(audioLogicState.breathTimer);
                audioLogicState.breathTimer = null;
                return;
            }
            // 使用最新的P/B进行筛选并播放
            playBreathSound({ p: audioLogicState.latestP, B: audioLogicState.latestB });
            // B对应的周期：1->3000ms, 2->2000ms, 3->1000ms, 4->750ms, 5->600ms（动态获取最新B）
            const intervalMap = { 1: 3000, 2: 2000, 3: 1000, 4: 750, 5: 600 };
            const interval = intervalMap[audioLogicState.latestB] || 3000;
            audioLogicState.breathTimer = setTimeout(breathLoop, interval);
        };
        breathLoop();
    }
};

export const resetAudioState = () => {
    if (audioLogicState.breathTimer) {
        clearTimeout(audioLogicState.breathTimer);
    }
    // Stop current bang audio if playing
    if (currentBangAudio) {
        currentBangAudio.pause();
        currentBangAudio.currentTime = 0;
        currentBangAudio = null;
    }
    audioLogicState = { lastNonZeroD: 0, stillnessStartTime: null, breathTimer: null, latestB: 1, latestP: 0 };
    isAudioPlaying = false;
    // console.log("AudioManager: State reset.");
};

// Audio control functions
export const toggleMoan = () => {
    audioControlState.moanEnabled = !audioControlState.moanEnabled;
    return audioControlState.moanEnabled;
};

export const toggleBreath = () => {
    audioControlState.breathEnabled = !audioControlState.breathEnabled;
    return audioControlState.breathEnabled;
};

export const toggleBang = () => {
    audioControlState.bangEnabled = !audioControlState.bangEnabled;
    return audioControlState.bangEnabled;
};

export const getMoanEnabled = () => audioControlState.moanEnabled;
export const getBreathEnabled = () => audioControlState.breathEnabled;
export const getBangEnabled = () => audioControlState.bangEnabled;

// Export bang sound function for external use
export const playBang = playBangSound;
