package me.agentic.errsense.contract.entity;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class ChatCaseGraphDTO {

    private Long id;
    private String chatCase;
    private String graphName;
    private String description;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}