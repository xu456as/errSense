plugins {
    `kotlin-dsl`
}

kotlin {
    jvmToolchain(17)
}

dependencies {
    implementation(libs.kotlin.gradle.plugin)
    implementation(libs.gradle.node.plugin)
    implementation(libs.jib.gradle.plugin)
}
