# linkCUP Interface Plugin for SillyTavern

这是一个为SillyTavern设计的linkCUP设备接口插件，通过蓝牙连接实现实时数据传输和AI角色互动。

## 主要功能

### 🔗 设备连接
- 通过Web Bluetooth API连接linkCUP设备
- 实时接收和处理设备数据
- 支持设备断线重连机制

### 📊 数据显示与统计
- **实时数据显示**: 当前体位、运动方向、抽插频率
- **统计信息**: 总计次数（优化算法，除以2向下取整）、角色兴奋度
- **性爱时长**: 统一格式显示，支持暂停/恢复功能
- **设备状态**: Yaw/Pitch/Roll三轴数据

### 🎵 智能音频系统
- **呼吸音频**: 根据兴奋程度(B值)动态调整播放间隔
  - B=1: 每3秒播放一次
  - B=2: 每2秒播放一次  
  - B=3: 每1秒播放一次
  - B=4: 每0.75秒播放一次
  - B=5: 每0.6秒播放一次
- **呻吟音频**: 基于体位和兴奋程度智能选择音频文件
- **精确时间控制**: 基于真实时间的0.5秒D=0检测机制

### 🤖 AI角色互动
- **周期性报告**: 每10秒向AI角色发送动作报告
- **特殊事件检测**: 
  - 重新插入事件
  - 拔出事件
  - 高潮事件（按键触发）
  - **体位变化检测**: 自动检测体位变化并发送英文模板消息
- **自然语言生成**: 使用TextGenerator生成描述性的系统消息

### 🎮 用户界面
- **体位选择器**: 10种预设体位，支持图标显示
- **音频控制**: 独立的呼吸和呻吟音频开关
- **自动体位**: 可选的自动体位切换功能
- **状态反馈**: 实时显示连接状态和事件提示

## 安装说明

1. 将插件文件夹放置在SillyTavern的plugins目录中
2. 在SillyTavern的config.yaml文件中启用服务器插件：`enableServerPlugins: true`
3. 重启SillyTavern
4. 在扩展菜单中找到"linkCUP"插件

## 使用方法

### 基本连接
1. 在扩展菜单中找到"linkCUP"插件
2. 点击"Connect linkCUP"按钮
3. 从蓝牙设备列表中选择您的linkCUP设备
4. 连接成功后，界面将显示实时数据

### 功能配置
- **音频设置**: 使用呼吸/呻吟开关控制音频播放
- **体位选择**: 点击体位图标或启用自动体位功能
- **角色选择**: 确保在SillyTavern中选择了AI角色以接收互动消息

## 数据报告格式

插件会定期向AI角色发送以下类型的系统消息：

### 周期性动作报告
```
System: {{user}} is engaging in sexual activity with {{char}}. Current position: [体位名称]. {{user}}'s thrusting intensity is [强度级别] with [节奏描述] rhythm. {{char}}'s excitement level is [兴奋程度] (showing [心形符号]).
```

### 体位变化报告
```
System: {{user}} and {{char}}'s sexual position has changed from [前一体位] to [当前体位].
```

### 特殊事件报告
- **重新插入**: 描述重新插入动作和当前状态
- **拔出**: 描述拔出动作和角色反应
- **高潮**: 描述高潮事件和角色兴奋状态

## 技术架构

### 核心组件
- **index.js**: 主入口文件，处理插件初始化和UI加载
- **paperplane.js**: 数据处理核心，计算统计指标和事件检测
- **messageManager.js**: 消息管理器，处理AI角色互动逻辑
- **textGenerator.js**: 文本生成器，创建自然语言描述
- **audioManager.js**: 音频管理器，控制呼吸和呻吟音频播放
- **uiManager.js**: UI管理器，处理界面更新和用户交互

### 数据流程
1. **设备连接**: Web Bluetooth API → 原始数据接收
2. **数据处理**: PaperPlane类 → 计算统计指标和事件检测
3. **UI更新**: UIManager → 实时显示数据和状态
4. **音频播放**: AudioManager → 根据状态播放相应音频
5. **AI互动**: MessageManager + TextGenerator → 生成并发送系统消息

## 最近更新

### v2.0 功能增强
- ✅ 优化总计次数计算逻辑（除以2向下取整）
- ✅ 统一性爱时长显示格式，移动到合适位置
- ✅ 新增体位变化自动检测和英文模板消息
- ✅ 改进呼吸音频的精确时间控制
- ✅ 修复远程服务器环境下的UI显示问题

### 兼容性改进
- 支持本地和远程服务器环境
- 改进Nginx反向代理兼容性
- 多路径UI文件加载机制

## 开发说明

### 文件结构
```
linkCUP/
├── index.js              # 主入口文件
├── paperplane.js         # 数据处理核心
├── messageManager.js     # 消息管理
├── textGenerator.js      # 文本生成
├── audioManager.js       # 音频管理
├── uiManager.js          # UI管理
├── public/
│   ├── linkcup.html      # UI界面
│   ├── style.css         # 样式文件
│   ├── breath/           # 呼吸音频文件
│   ├── moan/             # 呻吟音频文件
│   └── position-icons/   # 体位图标
└── README.md
```

### 调试功能
- 控制台日志输出
- 状态消息显示
- 事件时间戳记录

## 故障排除

### 常见问题
1. **无法连接设备**: 确保浏览器支持Web Bluetooth API
2. **UI不显示**: 检查文件路径和服务器配置
3. **音频不播放**: 确认音频文件存在且格式正确
4. **AI不响应**: 确保选择了角色且消息管理器正常工作

### 技术支持
如遇到问题，请检查浏览器控制台的错误信息，并参考CHANGELOG.md了解最新修复内容。
