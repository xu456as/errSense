package me.agentic.errsense.http.controller;

import me.agentic.errsense.contract.entity.LoginDTO;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/errsense")
@CrossOrigin(origins = "*")
public class LoginController {

    @GetMapping("/login")
    public ResponseEntity<LoginDTO> login(
            @RequestParam String username,
            @RequestParam String passKey) {
        if ("admin".equals(username) && "123456".equals(passKey)) {
            LoginDTO dto = new LoginDTO();
            dto.setAuth(true);
            dto.setToken("admin");
            return ResponseEntity.ok(dto);
        }
        LoginDTO dto = new LoginDTO();
        dto.setAuth(false);
        dto.setToken(null);
        return ResponseEntity.ok(dto);
    }
}