package me.agentic.errsense.contract.bitbucket;

public class Repository {
    private long id;
    private String slug;
    private String name;
    private String description;
    private String projectKey;
    private String cloneUrl;

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }
    public String getSlug() { return slug; }
    public void setSlug(String slug) { this.slug = slug; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public String getProjectKey() { return projectKey; }
    public void setProjectKey(String projectKey) { this.projectKey = projectKey; }
    public String getCloneUrl() { return cloneUrl; }
    public void setCloneUrl(String cloneUrl) { this.cloneUrl = cloneUrl; }

    @Override
    public String toString() {
        return String.format("Repository{slug='%s', name='%s'}", slug, name);
    }
}