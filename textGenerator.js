// textGenerator.js - Natural Language Message Generator for linkCUP
// 将linkCUP数据转换为System身份的自然语言描述，减少LLM上下文负担
// 使用SillyTavern的{{user}}和{{char}}占位符系统

class TextGenerator {
    constructor() {
        // 体位描述映射
        this.positionNames = {
            1: "missionary position",
            2: "left side entry",
            3: "right side entry", 
            4: "doggy style",
            5: "cowgirl position",
            6: "reverse cowgirl",
            7: "left side cowgirl",
            8: "right side cowgirl",
            9: "face-to-face pin-down",
            10: "prone bone position"
        };

        // 兴奋程度描述 (B值1-5对应的状态)
        this.excitementLevels = {
            1: "calm and relaxed",
            2: "slightly aroused", 
            3: "moderately excited",
            4: "highly aroused",
            5: "extremely excited"
        };

        // 强度描述词汇
        this.intensityDescriptions = {
            low: ["gentle", "slow", "tender", "soft"],
            medium: ["steady", "rhythmic", "moderate", "consistent"],
            high: ["intense", "vigorous", "passionate", "forceful"],
            extreme: ["wild", "frantic", "overwhelming", "explosive"]
        };

        // 节奏描述
        this.rhythmDescriptions = {
            slow: ["leisurely pace", "unhurried rhythm", "slow and deliberate"],
            moderate: ["steady rhythm", "consistent pace", "regular tempo"],
            fast: ["rapid pace", "quick rhythm", "fast tempo"],
            frantic: ["frantic pace", "urgent rhythm", "desperate tempo"]
        };
    }

    /**
     * 生成体位变化描述 (Position Change Event)
     * System身份向{{char}}报告{{user}}的体位变化
     */
    generatePositionChange(data) {
        const { previousPosition, currentPosition } = data;
        
        const previousPositionName = this.positionNames[previousPosition] || `position ${previousPosition}`;
        const currentPositionName = this.positionNames[currentPosition] || `position ${currentPosition}`;
        
        // 构建System身份的自然语言描述，明确表达体位变化
        let description = `{{user}} and {{char}}'s sexual position has changed from ${previousPositionName} to ${currentPositionName}. `;
        description += `They are now engaging in intimate activities in the new ${currentPositionName}.`;

        return this.wrapSystemMessage(description);
    }

    /**
     * 生成周期性动作描述 (Periodic Action)
     * System身份向{{char}}报告{{user}}的动作
     */
    generatePeriodicAction(data) {
        const { P, C, I, B } = data;
        
        const position = this.positionNames[P] || "current position";
        const excitement = this.excitementLevels[B] || "aroused";
        
        // 根据强度选择描述词汇
        let intensityLevel, rhythmLevel;
        if (I < 20) {
            intensityLevel = "low";
            rhythmLevel = "slow";
        } else if (I < 50) {
            intensityLevel = "medium"; 
            rhythmLevel = "moderate";
        } else if (I < 80) {
            intensityLevel = "high";
            rhythmLevel = "fast";
        } else {
            intensityLevel = "extreme";
            rhythmLevel = "frantic";
        }

        const intensityWord = this.getRandomFromArray(this.intensityDescriptions[intensityLevel]);
        const rhythmPhrase = this.getRandomFromArray(this.rhythmDescriptions[rhythmLevel]);

        // 构建System身份的自然语言描述，明确表达正在进行的动作
        let description = `{{user}} is actively penetrating and thrusting into {{char}} while positioned in ${position}. `;
        description += `Current session: ${C} deep thrusts with ${intensityWord} penetrating movements at a ${rhythmPhrase}. `;
        description += `{{char}} appears ${excitement} and is actively responding to each thrust and penetration.`;

        return this.wrapSystemMessage(description);
    }

    /**
     * 生成重新插入事件描述 (Re-insertion Event)
     * System身份向{{char}}报告{{user}}重新插入的动作
     */
    generateReInsertion(data) {
        const { P, B, V } = data;
        
        const position = this.positionNames[P] || "current position";
        const excitement = this.excitementLevels[B] || "aroused";
        
        // 重新插入的随机描述短语
        const reinsertionPhrases = [
            "has fully re-entered and penetrated {{char}}",
            "has thrust back inside {{char}} and resumed penetration", 
            "is now deeply penetrating {{char}} once more",
            "has re-inserted and is actively thrusting into {{char}}",
            "is back inside {{char}} with renewed penetration"
        ];
        
        const phrase = this.getRandomFromArray(reinsertionPhrases);
        
        // 构建System身份的自然语言描述，明确表达重新插入后的状态
        let description = `Following a brief withdrawal, {{user}} ${phrase} while positioned in ${position}. `;
        description += `{{char}} appears ${excitement} as deep penetration resumes and intimate thrusting continues.`;
        
        return this.wrapSystemMessage(description);
    }

    /**
     * 生成拔出事件描述 (Withdrawal Event)
     * System身份向{{char}}报告{{user}}拔出的动作
     */
    generateWithdrawal(data) {
        const { P, B } = data;
        
        const position = this.positionNames[P] || "the current position";
        const excitement = this.excitementLevels[B] || "aroused";

        const withdrawalPhrases = [
            "{{user}} has completely withdrawn and pulled out from {{char}}",
            "{{user}} has fully disengaged and separated from penetrating {{char}}", 
            "{{user}} has pulled out entirely, ending the penetration of {{char}}",
            "{{user}} has withdrawn completely from the intimate penetration of {{char}}"
        ];

        const phrase = this.getRandomFromArray(withdrawalPhrases);
        const description = `${phrase} while previously positioned in ${position}. {{char}} remains ${excitement} despite the pause in penetration and thrusting activity.`;

        return this.wrapSystemMessage(description);
    }

    /**
     * 生成高潮事件描述 (Climax Event)
     * System身份向{{char}}报告{{user}}达到高潮的情况
     */
    generateClimax(data) {
        const { P, B, E, T } = data;
        
        const position = this.positionNames[P] || "current position";
        const excitement = this.excitementLevels[B] || "extremely excited";
        const duration = this.formatDuration(T);

        // 根据E参数（射精位置）生成更准确的描述
        let ejaculationDescription;
        if (E === 'inside') {
            const insidePhrases = [
                "{{user}} is ejaculating deep inside {{char}} during penetration",
                "{{user}} is cumming inside {{char}} while still thrusting",
                "{{user}} is releasing inside {{char}} during intimate penetration",
                "{{user}} is finishing inside {{char}} with final deep thrusts"
            ];
            ejaculationDescription = this.getRandomFromArray(insidePhrases);
        } else {
            const outsidePhrases = [
                "{{user}} is ejaculating outside after withdrawing from {{char}}",
                "{{user}} is cumming outside after pulling out from {{char}}", 
                "{{user}} is releasing outside after ending penetration of {{char}}",
                "{{user}} is finishing outside after withdrawing from intimate penetration"
            ];
            ejaculationDescription = this.getRandomFromArray(outsidePhrases);
        }

        let description = `${ejaculationDescription} while positioned in ${position}. `;
        description += `本次性爱，用户性爱动作总共持续了${duration}。`;
        description += `{{char}} appears ${excitement} during this climactic moment of intimate connection.`;

        return this.wrapSystemMessage(description);
    }

    /**
     * 包装系统消息并添加指导说明
     * 明确System身份，指导{{char}}如何响应
     */
    wrapSystemMessage(description) {
        const instruction = "This message describes {{user}}'s physical actions in the real world. " +
                          "IMPORTANT: Stay completely in character as {{char}}. " +
                          "Do not write any OOC (Out of Character) content, meta-commentary, or analysis. " +
                          "Do not reference this system message or acknowledge it exists. " +
                          "Do not write anything in brackets like [OOC: ...] or similar formats. " +
                          "Simply respond naturally as {{char}} would react to the physical situation described, " +
                          "maintaining full immersion in the roleplay scenario.";
        
        return `${description}\n\n${instruction}`;
    }

    /**
     * 格式化持续时间（中文格式）
     */
    formatDuration(seconds) {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const remainingSeconds = seconds % 60;
        
        let result = "";
        if (hours > 0) {
            result += `${hours}小时`;
        }
        if (minutes > 0) {
            result += `${minutes}分`;
        }
        if (remainingSeconds > 0 || result === "") {
            result += `${remainingSeconds}秒`;
        }
        
        return result;
    }

    /**
     * 从数组中随机选择一个元素，增加描述的多样性
     */
    getRandomFromArray(array) {
        return array[Math.floor(Math.random() * array.length)];
    }
}

// 导出模块 (ES6格式，用于浏览器环境)
export { TextGenerator };