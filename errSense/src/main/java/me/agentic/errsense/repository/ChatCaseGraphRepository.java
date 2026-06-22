package me.agentic.errsense.repository;

import me.agentic.errsense.model.ChatCaseGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatCaseGraphRepository extends JpaRepository<ChatCaseGraph, Long> {

    Optional<ChatCaseGraph> findByChatCase(String chatCase);

    List<ChatCaseGraph> findByGraphName(String graphName);

    boolean existsByChatCase(String chatCase);

    int deleteByChatCase(String chatCase);
}