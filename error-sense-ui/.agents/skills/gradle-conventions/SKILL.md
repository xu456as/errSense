---
name: gradle-conventions
description: Use when working on Gradle builds in this repository or when creating Gradle files, Kotlin DSL build logic, buildSrc convention plugins, settings.gradle.kts, or shared JVM/Kotlin build conventions. Prefer the repo-local templates under assets/templates/gradle-buildsrc.
---

# Gradle Conventions

Apply this skill when the task involves Gradle, especially:

- creating or editing `settings.gradle.kts`
- introducing `buildSrc` shared build logic
- writing Kotlin DSL convention plugins in `buildSrc/src/main/kotlin`
- standardizing JVM or Kotlin module configuration
- migrating ad hoc Gradle logic into reusable conventions

## Workflow

1. Check whether the repo already has `settings.gradle.kts`, `build.gradle.kts`, `gradle/libs.versions.toml`, and `buildSrc/`.
2. If the build is missing or needs to be standardized, start from the repo-local templates in `assets/templates/gradle-buildsrc/`.
3. Keep top-level build scripts minimal. Prefer reusable convention plugins over repeating plugin and task configuration across modules.
4. When adding shared logic, put it in `buildSrc/src/main/kotlin/*.gradle.kts` and apply it from module builds.
5. Reuse the main version catalog from `buildSrc` instead of hardcoding plugin coordinates in multiple places.
6. Keep JVM toolchain settings explicit and consistent across the build.
7. When configuring tests, prefer `tasks.withType<Test>().configureEach` so settings apply uniformly.

## Defaults

- Prefer Kotlin DSL: `*.gradle.kts`
- Prefer `buildSrc` convention plugins for shared build logic
- Prefer `jvmToolchain(17)` unless the repo already uses another Java version
- Prefer Maven Central for standard JVM dependencies unless the repo already requires additional repositories
- Prefer version catalogs for dependency coordinates when the repo has `gradle/libs.versions.toml`

## Guardrails

- Do not duplicate the same plugin, toolchain, or test configuration in multiple module build files if it can live in a convention plugin.
- Do not introduce `buildSrc` if the repo already uses an alternative shared-build mechanism consistently; extend the existing mechanism instead.
- Do not hardcode dependency versions across several files when a version catalog is available.
- Keep comments short and only where they clarify Gradle-specific behavior.

## Resources

- Reusable Gradle templates live in `assets/templates/gradle-buildsrc/`.
- Use those files as a starting point, then adapt `rootProject.name`, module includes, repositories, toolchain version, and dependency coordinates for the target repo.
