import com.github.gradle.node.NodeExtension
import com.github.gradle.node.npm.task.NpmTask

plugins {
    id("com.github.node-gradle.node")
}

group = "org.openprojectx.ai"

extensions.configure<NodeExtension> {
    download.set(true)
    version.set("20.20.1")
    nodeProjectDir.set(projectDir)
}

//val npmInstall by tasks.registering(NpmTask::class) {
//    description = "Installs frontend dependencies using the Node version selected via nvm."
//    group = "node"
//    args.set(listOf("install"))
//    workingDir.set(projectDir)
//}
//
tasks.register<NpmTask>("npmBuild") {
    description = "Builds the frontend with npm."
    group = "build"
    dependsOn("npmInstall")
    args.set(listOf("run", "build"))
    workingDir.set(projectDir)
    environment.set(
        mapOf(
            "BUILD_PATH" to "frontend-build"
        )
    )
}
//
//tasks.register<NpmTask>("npmTest") {
//    description = "Runs the frontend test suite once."
//    group = "verification"
//    dependsOn(npmInstall)
//    args.set(listOf("test", "--", "--watchAll=false"))
//    workingDir.set(projectDir)
//}
//
//tasks.register<NpmTask>("npmStart") {
//    description = "Starts the frontend dev server."
//    group = "application"
//    dependsOn(npmInstall)
//    args.set(listOf("run", "start"))
//    workingDir.set(projectDir)
//}
