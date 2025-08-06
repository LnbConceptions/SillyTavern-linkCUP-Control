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
    
    // Load ECharts script dynamically
    const eChartsUrl = 'https://cdn.jsdelivr.net/npm/echarts@5.5.0/dist/echarts.min.js';
    if (!document.querySelector(`script[src="${eChartsUrl}"]`)) {
        const script = document.createElement('script');
        script.src = eChartsUrl;
        script.onload = () => {
            console.log("ECharts loaded successfully for UI Manager.");
            chartInstance = echarts.init(chartContainer);
            const option = {
                grid: { top: 8, right: 10, bottom: 24, left: 10 },
                xAxis: { type: 'time', splitLine: { show: false }, axisLabel: { show: false } },
                yAxis: { type: 'value', min: 0, max: 18, splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } }, axisLabel: { show: false } },
                tooltip: { show: false },
                series: [{ data: chartData, type: 'line', smooth: true, showSymbol: false, lineStyle: { color: '#ff007f', width: 2 } }]
            };
            chartInstance.setOption(option);
        };
        script.onerror = (err) => console.error("Failed to load ECharts:", err);
        document.head.appendChild(script);
    }
};

export const updateUI = (values) => {
    const dataContainer = document.getElementById(`linkcup-data-container`);
    if (!dataContainer) return;

    const positionMap = {
        1: '正常位', 2: '左侧入位', 3: '右侧入位', 4: '背后位', 5: '正面骑乘位',
        6: '背面骑乘位', 7: '左侧骑乘位', 8: '右侧骑乘位', 9: '正面压迫位', 10: '背面压迫位'
    };
    const excitementMap = { 1: '平静', 2: '唤起', 3: '兴奋', 4: '激动', 5: '浪尖' };

    dataContainer.innerHTML = `
        <li><strong>当前体位:</strong> ${positionMap[values.p] || '未知'}</li>
        <li><strong>运动方向:</strong> ${values.D === 1 ? '进入' : values.D === -1 ? '退出' : '静止'}</li>
        <li><strong>抽插频率:</strong> ${values.F} 次/分钟</li>
        <li><strong>总计次数:</strong> ${values.thrustCount}</li>
        <li><strong>角色兴奋度:</strong> ${excitementMap[values.B] || '未知'}</li>
        <li><strong>Yaw:</strong> ${values.Yaw} | <strong>Pitch:</strong> ${values.Pitch} | <strong>Roll:</strong> ${values.Roll}</li>
    `;

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
    console.log("UIManager: UI reset.");
};

export const resizeChart = () => {
    if (chartInstance) {
        chartInstance.resize();
    }
};
