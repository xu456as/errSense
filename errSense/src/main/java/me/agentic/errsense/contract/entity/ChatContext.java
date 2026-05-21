package me.agentic.errsense.contract.entity;

import lombok.Data;

import java.util.List;

@Data
public class ChatContext {
    private ErrReportItem item;
    private List<MessageItem> history;
}
