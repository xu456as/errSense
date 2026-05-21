package me.agentic.errsense.contract.bitbucket;

public class Project {
    private long id;
    private String key;
    private String name;
    private String description;
    private boolean isPublic;

    public long getId() { return id; }
    public void setId(long id) { this.id = id; }
    public String getKey() { return key; }
    public void setKey(String key) { this.key = key; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public boolean isPublic() { return isPublic; }
    public void setPublic(boolean aPublic) { isPublic = aPublic; }

    @Override
    public String toString() {
        return String.format("Project{key='%s', name='%s'}", key, name);
    }
}