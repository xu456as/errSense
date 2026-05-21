package me.agentic.errsense.contract.bitbucket;

public class RepositoryFile {
    private String path;
    private String name;
    private boolean isDirectory;
    private long size;
    private String contentId;

    public String getPath() { return path; }
    public void setPath(String path) { this.path = path; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public boolean isDirectory() { return isDirectory; }
    public void setDirectory(boolean directory) { isDirectory = directory; }
    public long getSize() { return size; }
    public void setSize(long size) { this.size = size; }
    public String getContentId() { return contentId; }
    public void setContentId(String contentId) { this.contentId = contentId; }

    @Override
    public String toString() {
        String type = isDirectory ? "\uD83D\uDCC1" : "\uD83D\uDCC4";
        return String.format("%s %s (%d bytes)", type, path, size);
    }
}