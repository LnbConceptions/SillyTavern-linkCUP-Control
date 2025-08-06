// audioManager.js
// This module encapsulates all logic related to audio playback.

// State variables
let audioLogicState = {
    lastNonZeroD: 0,
    stillnessCounter: 0,
    breathTimer: null,
};
let lastPlayedMoan = [];
let lastPlayedBreath = [];
let moanFiles = [];
let breathFiles = [];
let isAudioPlaying = false; // Mutex to prevent overlapping sounds
const extensionFolderPath = `scripts/extensions/third-party/linkcup`;

// --- Private Functions ---

const playMoanSound = (values) => {
    if (isAudioPlaying) return;

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
    if (isAudioPlaying) return;

    const { B: b } = values;
    let matchingFiles = breathFiles.filter(file => {
        const nameOnly = file.split('.')[0];
        const parts = nameOnly.split('_');
        const fileB_part = parts.find(part => part.startsWith('B'));
        if (!fileB_part) return false;
        const fileB = parseInt(fileB_part.substring(1));
        return fileB === b || fileB === 0;
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
        "P0_B1_breath_1.wav", "P0_B1_breath_2.wav", "P0_B2_breath_1.wav",
        "P0_B2_breath_2.wav", "P0_B3_breath_1.wav", "P0_B3_breath_2.wav",
        "P0_B3_breath_3.wav", "P0_B4_breath_1.wav", "P0_B4_breath_2.wav",
        "P0_B5_breath_1.wav", "P0_B5_breath_2.wav"
    ];
    console.log("AudioManager: Audio files populated.");
};

export const handleAudio = (values) => {
    const d = values.D;
    if (d !== 0) {
        if (audioLogicState.breathTimer) {
            clearTimeout(audioLogicState.breathTimer);
            audioLogicState.breathTimer = null;
        }
        audioLogicState.stillnessCounter = 0;

        if (audioLogicState.lastNonZeroD !== 0 && d !== audioLogicState.lastNonZeroD) {
            playMoanSound(values);
        }
        audioLogicState.lastNonZeroD = d;
    } else {
        audioLogicState.stillnessCounter++;
        if (audioLogicState.stillnessCounter === 50 && !audioLogicState.breathTimer) {
            const breathLoop = () => {
                // This check is important for when the device disconnects
                if (!document.getElementById('linkcup-status') || document.getElementById('linkcup-status').textContent !== 'Connected') {
                    clearTimeout(audioLogicState.breathTimer);
                    audioLogicState.breathTimer = null;
                    return;
                }
                playBreathSound(values);
                const intervalMap = { 1: 3000, 2: 1500, 3: 1000, 4: 750, 5: 600 };
                const interval = intervalMap[values.B] || 3000;
                audioLogicState.breathTimer = setTimeout(breathLoop, interval);
            };
            breathLoop();
        }
    }
};

export const resetAudioState = () => {
    if (audioLogicState.breathTimer) {
        clearTimeout(audioLogicState.breathTimer);
    }
    audioLogicState = { lastNonZeroD: 0, stillnessCounter: 0, breathTimer: null };
    isAudioPlaying = false;
    console.log("AudioManager: State reset.");
};
