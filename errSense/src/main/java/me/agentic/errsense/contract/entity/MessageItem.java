package me.agentic.errsense.contract.entity;

import com.fasterxml.jackson.annotation.JsonFormat;
import lombok.Data;
import me.agentic.errsense.contract.enums.MessageType;

import java.util.Date;

@Data
public class MessageItem {
    private long id;
    private String role;
    private MessageType type;
    private String content;
    
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ss.SSSXXX")
    private Date timestamp;
}
