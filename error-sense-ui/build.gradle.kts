import net.researchgate.release.ReleaseExtension

plugins {
    `maven-publish`
    signing
    id("io.github.gradle-nexus.publish-plugin") version "2.0.0"
    id("net.researchgate.release") version "3.1.0"
    id("node-frontend")
    id("frontend-archive")
    id("frontend-jib")
}

group = "org.openprojectx.ai"

allprojects {
    repositories {
        mavenCentral()
    }
}

publishing {
    publications {
        create<MavenPublication>("mavenFrontend") {
            artifactId = project.name
            artifact(tasks.named("frontendJar"))
            artifact(tasks.named("frontendSourcesJar"))

            pom {
                name.set(project.name)
                description.set("React frontend for the Error Sense dashboard")
                url.set("https://github.com/openprojectx/error-sense-ui")

                licenses {
                    license {
                        name.set("Apache License 2.0")
                        url.set("https://www.apache.org/licenses/LICENSE-2.0")
                    }
                }

                developers {
                    developer {
                        id.set("openprojectx")
                        name.set("OpenProjectX")
                        email.set("admin@openprojectx.org")
                    }
                }

                scm {
                    url.set("https://github.com/openprojectx/error-sense-ui")
                    connection.set("scm:git:https://github.com/openprojectx/error-sense-ui.git")
                    developerConnection.set("scm:git:ssh://git@github.com:openprojectx/error-sense-ui.git")
                }
            }
        }
    }
}

signing {
    val keyFile = System.getenv("SIGNING_KEY_FILE")
    val keyPass = System.getenv("SIGNING_KEY_PASSWORD")

    if (!keyFile.isNullOrBlank()) {
        val keyText = file(keyFile).readText()
        useInMemoryPgpKeys(keyText, keyPass)
        sign(publishing.publications)
    }
}

nexusPublishing {
    repositories {
        sonatype {
            nexusUrl.set(uri("https://ossrh-staging-api.central.sonatype.com/service/local/"))
            snapshotRepositoryUrl.set(uri("https://central.sonatype.com/repository/maven-snapshots/"))
            username.set(System.getenv("OSSRH_USERNAME"))
            password.set(System.getenv("OSSRH_PASSWORD"))
        }
    }
}

configure<ReleaseExtension> {
    buildTasks.set(listOf("publishToSonatype", "closeAndReleaseSonatypeStagingRepository"))
    versionPropertyFile.set("gradle.properties")
    tagTemplate.set("\$name-\$version")

    with(git) {
        requireBranch.set("master")
    }
}
