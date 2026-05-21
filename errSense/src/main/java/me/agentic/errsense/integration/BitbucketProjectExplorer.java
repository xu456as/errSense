package me.agentic.errsense.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.Setter;
import me.agentic.errsense.contract.bitbucket.*;
import me.agentic.errsense.http.ThreadLocalUtil;
import okhttp3.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedList;
import java.util.List;
import java.util.Queue;

/**
 * Bitbucket Data Center REST API 客户端
 * 支持递归遍历仓库下所有文件
 */
@Component
public class BitbucketProjectExplorer {

    private static final MediaType JSON = MediaType.parse("application/json; charset=utf-8");

    @Setter
    @Value("${errSense.bitbucket.baseUrl}")
    private String baseUrl;
    private final OkHttpClient httpClient;
    private final ObjectMapper objectMapper;

    public BitbucketProjectExplorer() {
        this.httpClient = new OkHttpClient.Builder().build();
        this.objectMapper = new ObjectMapper();
    }
    public List<Project> getAllProjects() throws IOException {
        List<Project> allProjects = new ArrayList<>();
        int start = 0;
        int limit = 100;
        boolean isLastPage = false;

        while (!isLastPage) {
            String url = String.format("%s/rest/api/1.0/projects?limit=%d&start=%d", baseUrl, limit, start);
            String response = executeGetRequest(url);

            JsonNode root = objectMapper.readTree(response);
            JsonNode values = root.get("values");

            if (values != null && values.isArray()) {
                for (JsonNode projectNode : values) {
                    Project project = new Project();
                    project.setKey(projectNode.get("key").asText());
                    project.setId(projectNode.get("id").asLong());
                    project.setName(projectNode.get("name").asText());

                    if (projectNode.has("description") && !projectNode.get("description").isNull()) {
                        project.setDescription(projectNode.get("description").asText());
                    }

                    project.setPublic(projectNode.has("public") && projectNode.get("public").asBoolean());
                    allProjects.add(project);
                }
            }

            isLastPage = root.get("isLastPage").asBoolean();
            if (!isLastPage) {
                start = root.get("nextPageStart").asInt();
            }
        }

        return allProjects;
    }

    /**
     * 获取指定项目下的所有仓库
     */
    public List<Repository> getRepositoriesByProject(String projectKey) throws IOException {
        List<Repository> allRepos = new ArrayList<>();
        int start = 0;
        int limit = 100;
        boolean isLastPage = false;

        while (!isLastPage) {
            String url = String.format("%s/rest/api/1.0/projects/%s/repos?limit=%d&start=%d",
                    baseUrl, projectKey, limit, start);
            String response = executeGetRequest(url);

            JsonNode root = objectMapper.readTree(response);
            JsonNode values = root.get("values");

            if (values != null && values.isArray()) {
                for (JsonNode repoNode : values) {
                    Repository repo = new Repository();
                    repo.setSlug(repoNode.get("slug").asText());
                    repo.setId(repoNode.get("id").asLong());
                    repo.setName(repoNode.get("name").asText());
                    repo.setProjectKey(projectKey);

                    if (repoNode.has("description") && !repoNode.get("description").isNull()) {
                        repo.setDescription(repoNode.get("description").asText());
                    }

                    if (repoNode.has("cloneUrl")) {
                        JsonNode cloneUrlNode = repoNode.get("cloneUrl");
                        if (cloneUrlNode != null && !cloneUrlNode.isNull()) {
                            repo.setCloneUrl(cloneUrlNode.asText());
                        }
                    } else if (repoNode.has("links") && repoNode.get("links").has("clone")) {
                        JsonNode cloneLinks = repoNode.get("links").get("clone");
                        if (cloneLinks.isArray() && cloneLinks.size() > 0) {
                            repo.setCloneUrl(cloneLinks.get(0).get("href").asText());
                        }
                    }

                    allRepos.add(repo);
                }
            }

            isLastPage = root.get("isLastPage").asBoolean();
            if (!isLastPage) {
                start = root.get("nextPageStart").asInt();
            }
        }

        return allRepos;
    }

    /**
     * 递归遍历仓库下的所有文件
     * @param projectKey 项目 Key
     * @param repositorySlug 仓库名称
     * @param branch 分支名称（如 "main", "master", "develop"）
     * @return 文件列表（包含完整路径）
     * @throws IOException 网络或解析异常
     */
    public List<RepositoryFile> listAllFilesRecursively(String projectKey, String repositorySlug, String branch)
            throws IOException {
        List<RepositoryFile> allFiles = new ArrayList<>();
        // 使用广度优先遍历
        Queue<String> pathQueue = new LinkedList<>();
        pathQueue.add("");  // 从根目录开始

        while (!pathQueue.isEmpty()) {
            String currentPath = pathQueue.poll();

            // 获取当前目录下的内容
            String url = String.format("%s/rest/api/1.0/projects/%s/repos/%s/browse/%s?at=%s",
                    baseUrl, projectKey, repositorySlug,
                    encodePath(currentPath), encodeBranch(branch));

            String response = executeGetRequest(url);
            JsonNode root = objectMapper.readTree(response);

            JsonNode children = root.get("children");
            if (children != null && children.isArray()) {
                for (JsonNode child : children) {
                    JsonNode node = child.get("node");
                    if (node == null) continue;

                    String path = node.get("path").asText();
                    String name = path.substring(path.lastIndexOf('/') + 1);
                    boolean isDirectory = node.get("type").asText().equals("DIRECTORY");

                    RepositoryFile file = new RepositoryFile();
                    file.setPath(path);
                    file.setName(name);
                    file.setDirectory(isDirectory);
                    file.setSize(node.has("size") ? node.get("size").asLong() : 0);

                    if (node.has("contentId")) {
                        file.setContentId(node.get("contentId").asText());
                    }

                    allFiles.add(file);

                    // 如果是目录，加入队列继续遍历
                    if (isDirectory) {
                        pathQueue.add(path);
                    }
                }
            }
        }

        return allFiles;
    }

    /**
     * 递归遍历所有项目下所有仓库的所有文件
     * @param branch 分支名称
     * @return 按项目、仓库组织的文件结构
     * @throws IOException 网络或解析异常
     */
    public List<ProjectFileStructure> getAllFilesFromAllRepos(String branch) throws IOException {
        List<Project> projects = getAllProjects();
        List<ProjectFileStructure> result = new ArrayList<>();

        for (Project project : projects) {
            ProjectFileStructure projectStructure = new ProjectFileStructure();
            projectStructure.setProject(project);

            List<Repository> repositories = getRepositoriesByProject(project.getKey());
            List<RepositoryFileStructure> repoStructures = new ArrayList<>();

            for (Repository repo : repositories) {
                System.out.println("正在遍历: " + project.getKey() + " / " + repo.getSlug());

                RepositoryFileStructure repoStructure = new RepositoryFileStructure();
                repoStructure.setRepository(repo);
                repoStructure.setFiles(listAllFilesRecursively(project.getKey(), repo.getSlug(), branch));
                repoStructures.add(repoStructure);
            }

            projectStructure.setRepositories(repoStructures);
            result.add(projectStructure);
        }

        return result;
    }

    /**
     * 获取单个文件的内容
     * @param projectKey 项目 Key
     * @param repositorySlug 仓库名称
     * @param filePath 文件路径
     * @param branch 分支名称
     * @return 文件内容（字符串）
     * @throws IOException 网络或解析异常
     */
    public String getFileContent(String projectKey, String repositorySlug, String filePath, String branch)
            throws IOException {
        String url = String.format("%s/rest/api/1.0/projects/%s/repos/%s/browse/%s?at=%s",
                baseUrl, projectKey, repositorySlug,
                encodePath(filePath), encodeBranch(branch));

        String response = executeGetRequest(url);
        JsonNode root = objectMapper.readTree(response);

        JsonNode lines = root.get("lines");
        if (lines != null && lines.isArray()) {
            StringBuilder content = new StringBuilder();
            for (JsonNode line : lines) {
                content.append(line.get("text").asText()).append("\n");
            }
            return content.toString();
        }

        return "";
    }

    /**
     * 执行 GET 请求
     */
    private String executeGetRequest(String url) throws IOException {
        String bearToken = "";
        bearToken = ThreadLocalUtil.getHeader("bearToken");
        Request request = new Request.Builder()
                .url(url)
                .header("Authorization", "Bearer " + bearToken)
                .header("Accept", "application/json")
                .get()
                .build();

        try (Response response = httpClient.newCall(request).execute()) {
            String responseBody = response.body() != null ? response.body().string() : "";

            if (!response.isSuccessful()) {
                throw new IOException(String.format(
                        "HTTP %d: %s%nURL: %s%nResponse: %s",
                        response.code(), response.message(), url, responseBody
                ));
            }

            return responseBody;
        }
    }

    /**
     * 对路径进行 URL 编码
     */
    private String encodePath(String path) {
        if (path == null || path.isEmpty()) {
            return "";
        }
        try {
            // 使用 OkHttp 的编码方式，保留 / 字符
            String[] parts = path.split("/");
            StringBuilder encoded = new StringBuilder();
            for (int i = 0; i < parts.length; i++) {
                if (i > 0) encoded.append("/");
                encoded.append(java.net.URLEncoder.encode(parts[i], "UTF-8"));
            }
            return encoded.toString();
        } catch (java.io.UnsupportedEncodingException e) {
            return path;
        }
    }

    /**
     * 对分支名称进行 URL 编码
     */
    private String encodeBranch(String branch) {
        try {
            return java.net.URLEncoder.encode(branch, "UTF-8");
        } catch (java.io.UnsupportedEncodingException e) {
            return branch;
        }
    }

    public static void main(String[] args) {
        String bitbucketUrl = "https://your-bitbucket-server.com";
        String bearerToken = "your-personal-access-token";
        String branch = "main";  // 指定分支名称

        BitbucketProjectExplorer explorer = new BitbucketProjectExplorer();
        explorer.setBaseUrl(bitbucketUrl);
        ThreadLocalUtil.setHeader("bearToken", bearerToken);

        try {
            // 示例1: 遍历单个仓库下所有文件
            System.out.println("=== 遍历单个仓库 ===");
            String projectKey = "PROJ";
            String repoSlug = "my-repo";

            List<RepositoryFile> files = explorer.listAllFilesRecursively(projectKey, repoSlug, branch);
            System.out.println("共找到 " + files.size() + " 个文件/目录");

            // 按类型分组输出
            System.out.println("\n📁 目录:");
            files.stream().filter(RepositoryFile::isDirectory).forEach(System.out::println);

            System.out.println("\n📄 文件:");
            files.stream().filter(f -> !f.isDirectory()).forEach(System.out::println);

            // 示例2: 遍历所有项目下所有仓库的所有文件
            System.out.println("\n=== 遍历所有项目及仓库 ===");
            List<ProjectFileStructure> allFiles = explorer.getAllFilesFromAllRepos(branch);

            for (ProjectFileStructure projectStruct : allFiles) {
                System.out.println("\n📁 项目: " + projectStruct.getProject().getName());
                for (RepositoryFileStructure repoStruct : projectStruct.getRepositories()) {
                    System.out.println("  📦 仓库: " + repoStruct.getRepository().getName());
                    System.out.println("     📄 文件数: " + repoStruct.getFiles().size());

                    // 可选：输出前10个文件作为示例
                    repoStruct.getFiles().stream()
                            .limit(10)
                            .forEach(f -> System.out.println("       " + f));
                }
            }

            // 示例3: 获取某个文件的内容
            System.out.println("\n=== 获取文件内容 ===");
            String filePath = "src/main/java/Example.java";
            String content = explorer.getFileContent(projectKey, repoSlug, filePath, branch);
            System.out.println("文件内容预览:\n" + content.substring(0, Math.min(500, content.length())));

        } catch (IOException e) {
            System.err.println("Error: " + e.getMessage());
            e.printStackTrace();
        }
    }
}