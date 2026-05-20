package me.agentic.errsense.http.controller;

import lombok.RequiredArgsConstructor;
import me.agentic.errsense.contract.entity.ErrReportDTO;
import me.agentic.errsense.contract.entity.ErrReportItem;
import me.agentic.errsense.contract.enums.CriticalLevel;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/errsense/report")
@CrossOrigin(origins = "*")
@RequiredArgsConstructor
public class ErrReportController {

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