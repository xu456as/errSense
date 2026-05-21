package me.agentic.errsense.contract.bitbucket;

import java.util.List;

public class ProjectFileStructure {
    private Project project;
    private List<RepositoryFileStructure> repositories;

    public Project getProject() { return project; }
    public void setProject(Project project) { this.project = project; }
    public List<RepositoryFileStructure> getRepositories() { return repositories; }
    public void setRepositories(List<RepositoryFileStructure> repositories) { this.repositories = repositories; }
}