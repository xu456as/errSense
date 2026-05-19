import org.gradle.jvm.tasks.Jar
import org.gradle.api.file.DuplicatesStrategy
import java.io.File

plugins {
    base
}

val trackedFiles = providers.exec {
    commandLine("git", "ls-files")
    workingDir(project.projectDir)
}.standardOutput.asText.map { output ->
    output
        .lineSequence()
        .map(String::trim)
        .filter(String::isNotEmpty)
        .toList()
}

val trackedFilePatterns = trackedFiles.get()

val frontendJar = tasks.register<Jar>("frontendJar") {
    description = "Packages the npm build output as a JAR artifact."
    group = "build"
    dependsOn("npmBuild")

    archiveBaseName.set(project.name)
    archiveClassifier.set("")

    from(layout.projectDirectory.dir("frontend-build")) {
        into("/")
    }
}

val frontendSourcesJar = tasks.register<Jar>("frontendSourcesJar") {
    description = "Packages all git-tracked files as a sources JAR."
    group = "build"
    dependsOn("npmInstall")
    notCompatibleWithConfigurationCache("Uses git ls-files to resolve tracked source inputs.")

    archiveBaseName.set(project.name)
    archiveClassifier.set("sources")
    duplicatesStrategy = DuplicatesStrategy.FAIL

    trackedFilePatterns.forEach { relativePath ->
        val parentPath = File(relativePath).parent
        from(layout.projectDirectory.file(relativePath)) {
            if (parentPath != null) {
                into(parentPath)
            }
        }
    }
}

tasks.named("assemble") {
    dependsOn(frontendJar, frontendSourcesJar)
}

artifacts {
    add("archives", frontendJar)
    add("archives", frontendSourcesJar)
}
