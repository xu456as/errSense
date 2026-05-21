package me.agentic.errsense.contract.entity;

import lombok.Data;
import me.agentic.errsense.contract.enums.CriticalLevel;

@Data
public class ErrReportItem {
    private String appId;
    private String commitId;
    private String repoName;
    private String branchName;
    private String id;
    private String pattern;
    private String stackTrace;
    private int appearTimes;
    private CriticalLevel criticalLevel;
}
