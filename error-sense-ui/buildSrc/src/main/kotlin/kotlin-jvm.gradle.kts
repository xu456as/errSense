import org.gradle.api.tasks.testing.logging.TestLogEvent

plugins {
    kotlin("jvm")
}

group = "org.openprojectx.ai"

kotlin {
    jvmToolchain(17)
}

dependencies {
//    implementation(libs.kotlinx.coroutines.core)
}

tasks.withType<Test>().configureEach {
    useJUnitPlatform()

    testLogging {
        events(
            TestLogEvent.FAILED,
            TestLogEvent.PASSED,
            TestLogEvent.SKIPPED
        )
    }
}
