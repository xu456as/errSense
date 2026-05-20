package me.agentic.errsense.contract.entity;

import lombok.Data;

import java.util.List;

@Data
public class ErrReportDTO {
    private List<ErrReportItem> errItems;
}
