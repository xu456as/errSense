plugins {
    java
    id("com.google.cloud.tools.jib")
}

val frontendImage = providers
    .gradleProperty("frontendImage")
    .orElse("ghcr.io/openprojectx/error-sense-ui")

jib {
    from {
        image = "nginx:1.27-alpine"
    }

    to {
        image = frontendImage.get()
        tags = setOf("latest", project.version.toString())
    }

    container {
        ports = listOf("80")
        creationTime = "USE_CURRENT_TIMESTAMP"
        workingDirectory = "/usr/share/nginx/html"
        labels = mapOf(
            "org.opencontainers.image.source" to frontendImage.get(),
            "org.opencontainers.image.title" to project.name
        )
    }

    extraDirectories {
        paths {
            path {
                setFrom(file("build"))
                into = "/usr/share/nginx/html"
            }
        }
    }
}

tasks.named("jib") {
    dependsOn("npmBuild")
    notCompatibleWithConfigurationCache("Jib tasks access Gradle project state at execution time.")
}

tasks.named("jibDockerBuild") {
    dependsOn("npmBuild")
    notCompatibleWithConfigurationCache("Jib tasks access Gradle project state at execution time.")
}

tasks.named("jibBuildTar") {
    dependsOn("npmBuild")
    notCompatibleWithConfigurationCache("Jib tasks access Gradle project state at execution time.")
}
