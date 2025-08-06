# PaperPlane.js - 变量备忘录 (Variables Memo)

本文档旨在解释 `paperplane.js` 模块中 `this.values` 对象内各个变量的含义、来源和计算方式。这些变量是整个 linkCUP 插件数据处理的核心。

---

## 一、 原始数据 (Raw Data)

这些变量直接来自蓝牙设备的实时数据包。

-   `v`
    -   **含义**: 抽插深度/强度 (Thrust Depth/Intensity)
    -   **类型**: `Number` (0-18)
    -   **描述**: 最核心的原始数据，表示设备当前的物理深度。0表示静止，18表示最深。

-   `p`
    -   **含义**: 当前体位 (Position ID)
    -   **类型**: `Number` (1-10)
    -   **描述**: 代表当前性爱体位的ID。

-   `Yaw`, `Pitch`, `Roll`
    -   **含义**: 陀螺仪姿态数据 (Gyroscope Data)
    -   **类型**: `Number`
    -   **描述**: 设备的三轴姿态数据，用于判断方向和体位。

-   `buttonRelease`
    -   **含义**: 按键事件标志 (Key Press Flag)
    -   **类型**: `Boolean`
    -   **描述**: 当设备上的物理按键被按下时，此标志位变为 `true`，持续约1秒，用于触发特殊事件（如射精）。

---

## 二、 派生数据 (Derived Data)

这些变量是 `paperplane.js` 基于原始数据实时计算出来的，用于丰富交互逻辑。

-   `D`
    -   **含义**: 运动方向 (Direction of Motion)
    -   **类型**: `Number` (`1`, `-1`, `0`)
    -   **描述**: `1` 代表进入 (`v` 增加)，`-1` 代表退出 (`v` 减少)，`0` 代表静止。

-   `thrustCount`
    -   **含义**: 总计抽插次数 (Total Thrust Count)
    -   **类型**: `Number`
    -   **描述**: 从会话开始累计的总抽插次数。每当 `D` 的方向发生改变时（从`1`到`-1`或反之），计数器加一。

-   `F`
    -   **含义**: 抽插频率 (Frequency)
    -   **类型**: `Number`
    -   **描述**: 表示“每分钟的抽插次数”。它是基于过去10秒内的抽插次数 (`tempF`) 计算得出的估算值。

-   `S`
    -   **含义**: 单次抽插速度 (Speed of a Single Thrust)
    -   **类型**: `Number`
    -   **描述**: 表示单次进入或退出的瞬时速度，通过 `v` 值的变化量除以时间差计算得出。这个值反应了动作的快慢。

-   `sPrime`
    -   **含义**: 兴奋度累积值 (Accumulated Intensity for Excitement)
    -   **类型**: `Number`
    -   **描述**: 在10秒周期内，将每次抽插的速度 `S` 累加起来得到的值。它专门用于计算下面的 `B`（角色兴奋度），每10秒重置一次。

-   `B`
    -   **含义**: 角色兴奋度 (Character Excitement Level)
    -   **类型**: `Number` (1-5)
    -   **描述**: 一个模拟AI角色生理反应的变量。它根据 `sPrime` 的大小，在1（平静）到5（浪尖）之间变化，代表角色的兴奋程度。

-   `intensityScore`
    -   **含义**: 消息强度累积值 (Accumulated Intensity for Messaging)
    -   **类型**: `Number`
    -   **描述**: 与 `sPrime` 类似，也是 `S` 的累加值。但它的用途是生成发送给AI的系统消息（例如描述动作是“轻柔的”还是“强烈的”）。它在每次系统消息**发送后**被重置。

-   `sessionStartTime`
    -   **含义**: 会话开始时间 (Session Start Time)
    -   **类型**: `Timestamp`
    -   **描述**: 记录第一次检测到有效运动 (`v > 0`) 的时间戳。

-   `sessionDuration`
    -   **含义**: 会话持续时长 (Session Duration)
    -   **类型**: `Number` (毫秒)
    -   **描述**: 从 `sessionStartTime` 开始计算的会话总时长。
