package me.agentic.errsense.contract.entity;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AgentNodeDTO {

    private Long id;
    private String graphName;
    private String nodeName;
    private Long timestamp;
    private String instruction;
    private String modelName;
    private String agentInitParams;
    private String tools;
    private String nextHops;
    private Long nodeFlag;
    private String status;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
