const breathRateMap = {
    1: 3000, // 3 seconds per cycle
    2: 1500, // 1.5 seconds per cycle
    3: 1000, // 1 second per cycle
    4: 750,  // 0.75 seconds per cycle
    5: 600,  // 0.6 seconds per cycle
};

let animationFrameId = null;
let currentRate = breathRateMap[1];
let startTime = 0;
let isRunning = false;

const animateBreath = (timestamp) => {
    if (!isRunning) return;

    if (!startTime) {
        startTime = timestamp;
    }

    const elapsedTime = timestamp - startTime;
    const progress = (elapsedTime % currentRate) / currentRate;

    // Use a sine wave for smooth, easing in/out motion.
    // The formula (Math.sin(x * 2 * PI) + 1) / 2 creates a full 0 -> 1 -> 0 cycle.
    const breathValue = (Math.sin(progress * 2 * Math.PI - Math.PI / 2) + 1) / 2;

    if (window.live2d && typeof window.live2d.setLinkCupBreath === 'function') {
        const context = SillyTavern.getContext();
        const characterName = context.name2;
        if (characterName) {
            window.live2d.setLinkCupBreath(characterName, breathValue);
        }
    }

    animationFrameId = requestAnimationFrame(animateBreath);
};

export const startBreathing = () => {
    if (isRunning) return;
    console.log("linkCUP: Starting breathing animation.");
    isRunning = true;
    startTime = 0; // Reset start time
    animationFrameId = requestAnimationFrame(animateBreath);
};

export const stopBreathing = () => {
    if (!isRunning) return;
    console.log("linkCUP: Stopping breathing animation.");
    isRunning = false;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }
};

export const updateBreathRate = (b_value) => {
    const rate = breathRateMap[b_value];
    if (rate && rate !== currentRate) {
        console.log(`linkCUP: Updating breath rate for b=${b_value} to ${rate}ms.`);
        currentRate = rate;
        startTime = 0; // Reset start time to avoid jump in animation
    }
};

export const resetBreathState = () => {
    stopBreathing();
    currentRate = breathRateMap[1];
};
