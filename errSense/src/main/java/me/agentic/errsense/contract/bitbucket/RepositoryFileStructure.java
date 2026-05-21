package me.agentic.errsense.contract.bitbucket;

import java.util.List;

public class RepositoryFileStructure {
    private Repository repository;
    private List<RepositoryFile> files;

    public Repository getRepository() { return repository; }
    public void setRepository(Repository repository) { this.repository = repository; }
    public List<RepositoryFile> getFiles() { return files; }
    public void setFiles(List<RepositoryFile> files) { this.files = files; }
}