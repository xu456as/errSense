# ErrSense UI

React + TypeScript + MUI frontend for the Error Sense dashboard.

## Pages

- Login page
- Developer Report page with search conditions: App Id, Commit Id, Task Id
- Reviewer Report page with editable reviewer fields

## Local development

If `npm` is not on your shell path, run `nvm use 20` first.

1. Start WireMock on port `9090`:

```bash
npm run start:mock
```

2. Start the React app on port `3000`:

```bash
npm start
```

The app uses `REACT_APP_API_BASE_URL=http://localhost:9090/api` in local development.
The login flow is token-based: the UI calls the mock login API, stores the returned token, and sends it as a bearer token on later API calls.

## Gradle

The repo also includes a Gradle scaffold with `buildSrc` convention plugins for frontend tasks.

If you are using `nvm`, select Node 20 first:

```bash
nvm use 20
```

Available Gradle tasks:

```bash
./gradlew npmInstall
./gradlew npmBuild
./gradlew npmTest
./gradlew npmStart
./gradlew frontendJar
./gradlew frontendSourcesJar
./gradlew assemble
./gradlew release --no-configuration-cache
```

The Node integration is configured to use the local Node runtime from `nvm` rather than downloading a separate Node distribution.

Archive outputs:

- `frontendJar`: packages the npm `build/` output as the main JAR artifact
- `frontendSourcesJar`: packages all git-tracked files as the sources JAR

`frontendSourcesJar` uses `git ls-files`, so if Gradle reports configuration-cache incompatibility, run it with:

```bash
./gradlew frontendSourcesJar --no-configuration-cache
```

Project versioning is driven by `gradle.properties`.

## Mock APIs

WireMock mappings live in [`wiremock/mappings`](/data/Git/error-sense-ui/wiremock/mappings).

- `POST /api/v1/auth/login`
- `GET /api/v1/errsense/report/dev-summary`
- `GET /api/v1/errsense/report/owner-review`
- `PUT /api/v1/errsense/report/owner-review/:id`
- Generic `OPTIONS /api/*` preflight handler for local CORS

Mock login response:

- returns a bearer token: `mock-errsense-token`
- report APIs require `Authorization: Bearer mock-errsense-token`

## Build

```bash
npm run build
```

Or with Gradle:

```bash
./gradlew npmBuild
```

## Publishing

The Gradle build is configured for Maven Central publishing with:

- `maven-publish`
- `signing`
- `io.github.gradle-nexus.publish-plugin`
- `net.researchgate.release`

Publish flow:

```bash
./gradlew publishToSonatype closeAndReleaseSonatypeStagingRepository --no-configuration-cache
```

Required environment variables:

- `OSSRH_USERNAME`
- `OSSRH_PASSWORD`
- `SIGNING_KEY_FILE`
- `SIGNING_KEY_PASSWORD`

Release flow:

```bash
./gradlew release --no-configuration-cache
```

The release plugin:

- reads and updates the version from `gradle.properties`
- publishes to Sonatype
- closes and releases the Sonatype staging repository
- creates a Git tag using `<project-name>-<version>`
- requires releases to run from the `master` branch

## Docker

This project uses a standard multi-stage Docker build for container images. Jib is not the recommended path for this frontend-only repo.

Build the image:

```bash
docker build -t ghcr.io/openprojectx/error-sense-ui:latest .
```

Run locally:

```bash
docker run --rm -p 8080:80 ghcr.io/openprojectx/error-sense-ui:latest
```

Local health check:

```bash
curl http://localhost:8080/__admin/health
```

Push to GHCR:

```bash
docker push ghcr.io/openprojectx/error-sense-ui:latest
```

Login example:

```bash
echo "$GITHUB_TOKEN" | docker login ghcr.io -u YOUR_GITHUB_USERNAME --password-stdin
```

## GitHub Actions

GitHub Actions builds and pushes the container image to GHCR using the first 8 characters of the commit SHA as the tag.

Example tag:

```text
ghcr.io/openprojectx/error-sense-ui:5a9619ee
```
