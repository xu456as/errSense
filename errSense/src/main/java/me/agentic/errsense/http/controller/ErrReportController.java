package me.agentic.errsense.http.controller;

import lombok.RequiredArgsConstructor;
import me.agentic.errsense.contract.entity.ChatContext;
import me.agentic.errsense.contract.entity.ErrReportDTO;
import me.agentic.errsense.contract.entity.ErrReportItem;
import me.agentic.errsense.contract.entity.MessageItem;
import me.agentic.errsense.contract.enums.CriticalLevel;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Collections;
import java.util.List;

@RestController
@RequestMapping("/api/v1/errsense/report")
@RequiredArgsConstructor
public class ErrReportController {
    @PostMapping("/pullChatHistory")
    public ResponseEntity<List<MessageItem>> chatHistory(@RequestBody ChatContext context) {
        String userInput = "";
        if (context.getHistory() != null && !context.getHistory().isEmpty()) {
            MessageItem lastMessage = context.getHistory().get(context.getHistory().size() - 1);
            if ("user".equals(lastMessage.getRole())) {
                userInput = lastMessage.getContent();
            }
        }

        String responseContent = generateMockResponse(userInput, context.getItem());
        MessageItem response = new MessageItem();
        response.setId((int) System.currentTimeMillis());
        response.setRole("assistant");
        response.setType(me.agentic.errsense.contract.enums.MessageType.Answer);
        response.setContent(responseContent);
        response.setTimestamp(new java.util.Date());

        return ResponseEntity.ok(Collections.singletonList(response));
//        return ResponseEntity.ok(Collections.emptyList());
    }
    @PostMapping("/chat")
    public ResponseEntity<MessageItem> chat(@RequestBody ChatContext context) {
        String userInput = "";
        if (context.getHistory() != null && !context.getHistory().isEmpty()) {
            MessageItem lastMessage = context.getHistory().get(context.getHistory().size() - 1);
            if ("user".equals(lastMessage.getRole())) {
                userInput = lastMessage.getContent();
            }
        }

        String responseContent = generateMockResponse(userInput, context.getItem());
        MessageItem response = new MessageItem();
        response.setId((int) System.currentTimeMillis());
        response.setRole("assistant");
        response.setType(me.agentic.errsense.contract.enums.MessageType.Answer);
        response.setContent(responseContent);
        response.setTimestamp(new java.util.Date());

        return ResponseEntity.ok(response);
    }

    private String generateMockResponse(String userInput, ErrReportItem item) {
        if (userInput == null) {
            userInput = "";
        }

        String errorPattern = item != null ? item.getPattern() : "未知错误";

        if (userInput.contains("根因") || userInput.contains("分析") || userInput.contains("原因")) {
            return String.format("【根因分析】针对错误 \"%s\"\n\n" +
                    "• 可能原因：空指针异常通常由对象未初始化或方法返回null导致\n" +
                    "• 代码位置：建议检查 CheckoutPricingService 相关代码\n" +
                    "• 触发条件：可能在并发场景下或特定输入参数时出现\n" +
                    "\n是否需要我提供具体的修复建议？", errorPattern);
        }

        if (userInput.contains("代码") || userInput.contains("修复") || userInput.contains("改")) {
            return "【修复建议】\n\n" +
                    "```java\n" +
                    "// 建议添加空值检查\n" +
                    "if (pricingInfo != null) {\n" +
                    "    // 处理逻辑\n" +
                    "    calculatePrice(pricingInfo);\n" +
                    "} else {\n" +
                    "    log.warn(\"Pricing info is null, using default price\");\n" +
                    "}\n" +
                    "```\n\n" +
                    "是否需要我详细解释这段代码？";
        }

        if (userInput.contains("源码") || userInput.contains("查看")) {
            return String.format("【源码查询】\n\n" +
                    "错误 \"%s\" 相关的源码位置：\n" +
                    "- 文件：com/example/service/CheckoutPricingService.java\n" +
                    "- 方法：calculateCheckoutPrice()\n" +
                    "- 行号：约第 142 行\n" +
                    "\n需要查看具体代码片段吗？", errorPattern);
        }

        if (userInput.contains("解决") || userInput.contains("方案")) {
            return "【解决方案】\n\n" +
                    "1. ✅ 添加空值校验\n" +
                    "2. ✅ 使用 Optional 进行优雅处理\n" +
                    "3. ✅ 添加日志记录便于排查\n" +
                    "4. ✅ 编写单元测试覆盖边界情况\n" +
                    "\n需要我详细说明某一项吗？";
        }

        if (userInput.contains("专家") || userInput.contains("方法")) {
            return "【专家建议】\n\n" +
                    "针对此类问题，业界常用的解决方案包括：\n" +
                    "• 使用防御性编程，在方法入口进行参数校验\n" +
                    "• 采用空对象模式（Null Object Pattern）\n" +
                    "• 使用 Optional 类型强制处理可能为空的值\n" +
                    "• 在关键路径添加断言和日志\n" +
                    "\n如需更深入的分析，请告诉我！";
        }

        // 默认回复
        return String.format("您好！我来帮您分析错误 \"%s\"\n\n" +
                "我可以帮您：\n" +
                "🔍 根因分析 - 分析错误产生的根本原因\n" +
                "💡 解决方向 - 提供具体的修复建议\n" +
                "✏️ 帮我改代码 - 提供代码修改方案\n" +
                "📊 查看源码 - 定位相关代码位置\n" +
                "👨‍🔬 查询专家方法 - 了解业界最佳实践\n" +
                "\n请问您想了解哪方面？", errorPattern);
    }
    

    @GetMapping("/getErrReport")
    public ResponseEntity<ErrReportDTO> getErrReport(
            @RequestParam(required = false) String appId,
            @RequestParam(required = false) String commitId,
            @RequestParam(required = false) String taskId) {

        List<ErrReportItem> reports = List.of(
                createItem("1", "NullPointerException at CheckoutPricingService", 42, CriticalLevel.High),
                createItem("2", "Timeout while calling customer-preference API", 17, CriticalLevel.High),
                createItem("3", "Duplicate key violation on order_audit table", 8, CriticalLevel.Low)
        );
        ErrReportDTO dto = new ErrReportDTO();
        dto.setErrItems(reports);
        return ResponseEntity.ok(dto);
    }

    // ==================== 内部辅助方法 ====================

    private ErrReportItem createItem(String id, String pattern, int appearTime, CriticalLevel level) {
        ErrReportItem item = new ErrReportItem();
        item.setId(id);
        item.setPattern(pattern);
        item.setAppearTimes(appearTime);
        item.setCriticalLevel(level);
        return item;
    }
}