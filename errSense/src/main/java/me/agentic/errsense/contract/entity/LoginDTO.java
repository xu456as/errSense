package me.agentic.errsense.contract.entity;

import lombok.Data;

@Data
public class LoginDTO {
    private boolean auth;
    private String token;
    private Long expiredIn;
}
