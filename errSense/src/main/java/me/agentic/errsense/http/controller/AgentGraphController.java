package me.agentic.errsense.http.controller;

import me.agentic.errsense.contract.entity.AgentGraphDTO;
import me.agentic.errsense.contract.entity.ChatCaseGraphDTO;
import me.agentic.errsense.model.AgentGraph;
import me.agentic.errsense.model.ChatCaseGraph;
import me.agentic.errsense.repository.AgentGraphRepository;
import me.agentic.errsense.repository.ChatCaseGraphRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/graph")
public class AgentGraphController {

    private final AgentGraphRepository agentGraphRepository;
    private final ChatCaseGraphRepository chatCaseGraphRepository;

    public AgentGraphController(AgentGraphRepository agentGraphRepository,
                                ChatCaseGraphRepository chatCaseGraphRepository) {
        this.agentGraphRepository = agentGraphRepository;
        this.chatCaseGraphRepository = chatCaseGraphRepository;
    }

    @GetMapping("/chatCases")
    public ResponseEntity<List<String>> chatCases() {
        List<String> list = new ArrayList<>();
        list.add("ViewSource");
        list.add("Confluence");
        return ResponseEntity.ok(list);
    }
    // ==================== AgentGraph CRUD ====================

    @GetMapping
    public ResponseEntity<List<AgentGraphDTO>> getAllGraphs() {
        List<AgentGraphDTO> dtos = agentGraphRepository.findAll().stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/{id}")
    public ResponseEntity<AgentGraphDTO> getGraphById(@PathVariable Long id) {
        return agentGraphRepository.findById(id)
                .map(this::convertToDTO)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/by-name/{graphName}")
    public ResponseEntity<AgentGraphDTO> getGraphByName(@PathVariable String graphName) {
        return agentGraphRepository.findByGraphName(graphName)
                .map(this::convertToDTO)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/status/{status}")
    public ResponseEntity<List<AgentGraphDTO>> getGraphsByStatus(@PathVariable String status) {
        List<AgentGraphDTO> dtos = agentGraphRepository.findByStatus(status).stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PostMapping
    public ResponseEntity<AgentGraphDTO> createGraph(@RequestBody AgentGraphDTO dto) {
        if (agentGraphRepository.existsByGraphName(dto.getGraphName())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        AgentGraph entity = convertToEntity(dto);
        AgentGraph saved = agentGraphRepository.save(entity);
        return ResponseEntity.status(HttpStatus.CREATED).body(convertToDTO(saved));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AgentGraphDTO> updateGraph(@PathVariable Long id,
                                                     @RequestBody AgentGraphDTO dto) {
        return agentGraphRepository.findById(id)
                .map(existing -> {
                    existing.setGraphName(dto.getGraphName());
                    existing.setStatus(dto.getStatus());
                    existing.setDescription(dto.getDescription());
                    AgentGraph updated = agentGraphRepository.save(existing);
                    return ResponseEntity.ok(convertToDTO(updated));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteGraph(@PathVariable Long id) {
        if (agentGraphRepository.existsById(id)) {
            agentGraphRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    // ==================== ChatCaseGraph CRUD ====================

    @GetMapping("/chat-case")
    public ResponseEntity<List<ChatCaseGraphDTO>> getAllChatCaseGraphs() {
        List<ChatCaseGraphDTO> dtos = chatCaseGraphRepository.findAll().stream()
                .map(this::convertToChatCaseDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/chat-case/{id}")
    public ResponseEntity<ChatCaseGraphDTO> getChatCaseGraphById(@PathVariable Long id) {
        return chatCaseGraphRepository.findById(id)
                .map(this::convertToChatCaseDTO)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/chat-case/by-case/{chatCase}")
    public ResponseEntity<ChatCaseGraphDTO> getChatCaseGraphByCase(@PathVariable String chatCase) {
        return chatCaseGraphRepository.findByChatCase(chatCase)
                .map(this::convertToChatCaseDTO)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @GetMapping("/chat-case/by-graph/{graphName}")
    public ResponseEntity<List<ChatCaseGraphDTO>> getChatCaseGraphsByGraph(@PathVariable String graphName) {
        List<ChatCaseGraphDTO> dtos = chatCaseGraphRepository.findByGraphName(graphName).stream()
                .map(this::convertToChatCaseDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PostMapping("/chat-case")
    public ResponseEntity<ChatCaseGraphDTO> createChatCaseGraph(@RequestBody ChatCaseGraphDTO dto) {
        if (chatCaseGraphRepository.existsByChatCase(dto.getChatCase())) {
            return ResponseEntity.status(HttpStatus.CONFLICT).build();
        }
        ChatCaseGraph entity = convertToChatCaseEntity(dto);
        ChatCaseGraph saved = chatCaseGraphRepository.save(entity);
        return ResponseEntity.status(HttpStatus.CREATED).body(convertToChatCaseDTO(saved));
    }

    @PutMapping("/chat-case/{id}")
    public ResponseEntity<ChatCaseGraphDTO> updateChatCaseGraph(@PathVariable Long id,
                                                                @RequestBody ChatCaseGraphDTO dto) {
        return chatCaseGraphRepository.findById(id)
                .map(existing -> {
                    existing.setChatCase(dto.getChatCase());
                    existing.setGraphName(dto.getGraphName());
                    existing.setDescription(dto.getDescription());
                    ChatCaseGraph updated = chatCaseGraphRepository.save(existing);
                    return ResponseEntity.ok(convertToChatCaseDTO(updated));
                })
                .orElse(ResponseEntity.notFound().build());
    }

    @DeleteMapping("/chat-case/{id}")
    public ResponseEntity<Void> deleteChatCaseGraph(@PathVariable Long id) {
        if (chatCaseGraphRepository.existsById(id)) {
            chatCaseGraphRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }
        return ResponseEntity.notFound().build();
    }

    // ==================== Conversion ====================

    private AgentGraphDTO convertToDTO(AgentGraph entity) {
        AgentGraphDTO dto = new AgentGraphDTO();
        dto.setId(entity.getId());
        dto.setGraphName(entity.getGraphName());
        dto.setStatus(entity.getStatus());
        dto.setDescription(entity.getDescription());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }

    private AgentGraph convertToEntity(AgentGraphDTO dto) {
        AgentGraph entity = new AgentGraph();
        entity.setGraphName(dto.getGraphName());
        entity.setStatus(dto.getStatus());
        entity.setDescription(dto.getDescription());
        return entity;
    }

    private ChatCaseGraphDTO convertToChatCaseDTO(ChatCaseGraph entity) {
        ChatCaseGraphDTO dto = new ChatCaseGraphDTO();
        dto.setId(entity.getId());
        dto.setChatCase(entity.getChatCase());
        dto.setGraphName(entity.getGraphName());
        dto.setDescription(entity.getDescription());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }

    private ChatCaseGraph convertToChatCaseEntity(ChatCaseGraphDTO dto) {
        ChatCaseGraph entity = new ChatCaseGraph();
        entity.setChatCase(dto.getChatCase());
        entity.setGraphName(dto.getGraphName());
        entity.setDescription(dto.getDescription());
        return entity;
    }
}