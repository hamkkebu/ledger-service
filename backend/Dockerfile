# Multi-stage build for Spring Boot application with submodule support

# Stage 1: Build with Gradle
FROM gradle:8.5-jdk17 AS builder

# Set up directory structure to match local development
# backend expects common at ../common/backend
WORKDIR /workspace

# Copy common submodule first (to /workspace/common)
COPY common ./common

# Now set up the backend in /workspace/backend
WORKDIR /workspace/backend

# Copy gradle wrapper and configuration
COPY backend/gradlew backend/gradlew.bat ./
COPY backend/gradle ./gradle
COPY backend/build.gradle backend/settings.gradle ./

# Download dependencies (cache layer)
RUN gradle dependencies --no-daemon -PdockerBuild=true || true

# Copy source code
COPY backend/src ./src

# Build application with dockerBuild property (skip tests for faster build)
RUN gradle clean bootJar --no-daemon -x test -PdockerBuild=true

# Stage 2: Runtime
FROM amazoncorretto:17-alpine

WORKDIR /app

# Copy the built JAR from builder stage
COPY --from=builder /workspace/backend/build/libs/*.jar app.jar

# Expose port
EXPOSE 8082

# Set entrypoint
ENTRYPOINT ["java", "-jar", "app.jar"]
