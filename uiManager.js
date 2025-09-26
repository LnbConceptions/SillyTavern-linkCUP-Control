// uiManager.js
// This module encapsulates all logic for updating the user interface.

// --- State and Configuration ---

let chartInstance = null;
let chartData = [];
const MAX_CHART_DATA_POINTS = 100;

// --- Private Functions ---

const updateChart = (value) => {
    if (!chartInstance) return;
    const now = new Date();
    chartData.push({ name: now.toISOString(), value: [now, value] });
    if (chartData.length > MAX_CHART_DATA_POINTS) chartData.shift();
    chartInstance.setOption({ series: [{ data: chartData }] });
};

// --- Public API ---

export const initUI = () => {
    const chartContainer = document.getElementById('linkcup-chart-container');
    if (!chartContainer) return;

    const eChartsUrl = 'https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js';

    const initChart = () => {
        try {
            if (chartInstance && chartInstance.dispose) {
                chartInstance.dispose();
            }
        } catch (e) { /* ignore */ }
        try {
            chartInstance = echarts.init(chartContainer);
            const option = {
                grid: { top: 8, right: 10, bottom: 24, left: 10 },
                xAxis: { type: 'time', splitLine: { show: false }, axisLabel: { show: false } },
                yAxis: { type: 'value', min: 0, max: 18, splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } }, axisLabel: { show: false } },
                tooltip: { show: false },
                series: [{ data: chartData, type: 'line', smooth: true, showSymbol: false, lineStyle: { color: '#ff007f', width: 2 } }]
            };
            chartInstance.setOption(option);
        } catch (e) {
            console.error('Failed to init ECharts instance:', e);
        }
    };

    // If echarts already loaded, init immediately
    if (typeof window !== 'undefined' && typeof window.echarts !== 'undefined') {
        initChart();
        return;
    }

    // Load ECharts script dynamically if not present
    if (!document.querySelector(`script[src="${eChartsUrl}"]`)) {
        const script = document.createElement('script');
        script.src = eChartsUrl;
        script.onload = () => {
            // console.log('ECharts loaded successfully for UI Manager.');
            initChart();
        };
        script.onerror = (err) => console.error('Failed to load ECharts:', err);
        document.head.appendChild(script);
    } else {
        // Script tag exists but echarts not yet available, poll for availability
        const start = Date.now();
        const poll = setInterval(() => {
            if (typeof window.echarts !== 'undefined') {
                clearInterval(poll);
                initChart();
            } else if (Date.now() - start > 5000) {
                clearInterval(poll);
                console.warn('ECharts script tag found but library not available after timeout.');
            }
        }, 50);
    }
};

export const updateUI = (values) => {
    const dataContainer = document.getElementById(`linkcup-data-container`);
    if (!dataContainer) return;

    const positionMap = {
        1: '正常位', 2: '左侧入位', 3: '右侧入位', 4: '背后位', 5: '正面骑乘位',
        6: '背面骑乘位', 7: '左侧骑乘位', 8: '右侧骑乘位', 9: '正面压迫位', 10: '背面压迫位'
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

    dataContainer.innerHTML = `
        <li><strong>当前体位:</strong> ${positionMap[values.p] || '未知'}</li>
        <li><strong>运动方向:</strong> ${values.D === 1 ? '进入' : values.D === -1 ? '退出' : '静止'}</li>
        <li><strong>抽插速度:</strong> <span style="color: ${values.S > 0 ? '#00ff00' : values.S < 0 ? '#ff0000' : '#ffffff'}">${values.S}</span></li>
        <li><strong>抽插频率:</strong> ${values.F} 次/分钟</li>
        <li><strong>总计次数:</strong> ${Math.floor(values.thrustCount / 2)}</li>
        <li><strong>性爱时长:</strong> <span id="linkcup-duration-display">${getDurationDisplayText(values)}</span></li>
        <li><strong>角色兴奋度:</strong> ${generateExcitementHearts(values.B)}</li>
        <li><strong>Yaw:</strong> ${values.Yaw} | <strong>Pitch:</strong> ${values.Pitch} | <strong>Roll:</strong> ${values.Roll}</li>
    `;

    // 更新时长显示的闪烁效果
    updateDurationDisplay(values);

    if (chartInstance) {
        updateChart(values.v);
    }
};

export const resetUI = () => {
    const dataContainer = document.getElementById(`linkcup-data-container`);
    if (dataContainer) dataContainer.innerHTML = '';

    if (chartInstance) {
        chartData = [];
        chartInstance.setOption({ series: [{ data: chartData }] });
    }
    // console.log("UIManager: UI reset.");
};

export const resizeChart = () => {
    if (chartInstance) {
        chartInstance.resize();
    }
};

// 性爱时长显示相关变量
let blinkingInterval = null;
let lastTimerState = null; // 用于检测计时器状态变化

// 格式化时长为"X小时X分X秒"格式
const formatDurationChinese = (ms) => {
    if (ms < 0) ms = 0;
    const totalSeconds = Math.floor(ms / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    let result = "";
    if (hours > 0) {
        result += `${hours}小时`;
    }
    if (minutes > 0) {
        result += `${minutes}分`;
    }
    if (seconds > 0 || result === "") {
        result += `${seconds}秒`;
    }
    
    return result;
};

// 获取时长显示文本的函数
const getDurationDisplayText = (values) => {
    const globalState = window.globalSexTimerState || {};
    const { sexTimerStarted, sexTimerEnded, effectiveInteractionTime, isDurationPaused } = globalState;
    
    // console.log('Duration Display Debug:', {
    //     sexTimerStarted,
    //     sexTimerEnded,
    //     effectiveTime: effectiveInteractionTime,
    //     thrustCount: values.thrustCount
    // });

    if (!sexTimerStarted) {
        return '尚未开始';
    }

    if (sexTimerEnded) {
        // 计时器已结束，显示最终时长
        return formatDurationChinese(effectiveInteractionTime);
    } else {
        // 计时器进行中，显示实时时长
        return formatDurationChinese(effectiveInteractionTime);
    }
};

// 更新性爱时长显示
const updateDurationDisplay = (values) => {
    const durationElement = document.getElementById('linkcup-duration-display');
    if (!durationElement) return;

    const globalState = window.globalSexTimerState || {};
    const { sexTimerStarted, sexTimerEnded, effectiveInteractionTime, isDurationPaused } = globalState;
    
    // console.log('Duration Display Debug:', {
    //     sexTimerStarted,
    //     sexTimerEnded,
    //     effectiveTime: effectiveInteractionTime,
    //     thrustCount: values.thrustCount
    // });

    if (!sexTimerStarted) {
        durationElement.textContent = '尚未开始';
        durationElement.style.color = '';
        // 停止之前的闪烁效果
        if (blinkingInterval) {
            clearInterval(blinkingInterval);
            blinkingInterval = null;
        }
        return;
    }

    if (sexTimerEnded) {
        // 计时器已结束，显示最终时长并开始闪烁
        durationElement.textContent = formatDurationChinese(effectiveInteractionTime);
        
        // 检查是否需要开始新的闪烁效果
        if (!blinkingInterval || lastTimerState !== 'ended') {
            // 停止之前的闪烁效果
            if (blinkingInterval) {
                clearInterval(blinkingInterval);
            }
            
            // 开始新的闪烁效果
            blinkingInterval = setInterval(() => {
                durationElement.style.color = durationElement.style.color === 'red' ? 'white' : 'red';
            }, 500);
        }
        lastTimerState = 'ended';
    } else {
        // 计时器进行中，显示实时时长
        durationElement.textContent = formatDurationChinese(effectiveInteractionTime);
        durationElement.style.color = '';
        
        // 停止闪烁效果
        if (blinkingInterval) {
            clearInterval(blinkingInterval);
            blinkingInterval = null;
        }
        lastTimerState = 'running';
    }
};

// 导出updateDurationDisplay函数供其他模块使用
export { updateDurationDisplay, getDurationDisplayText };
