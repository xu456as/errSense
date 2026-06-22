package me.agentic.errsense.contract.entity;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class AgentGraphDTO {

    private Long id;
    private String graphName;
    private String status;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}