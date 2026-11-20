# Imagem de execução do backend; o JAR é compilado e testado no GitHub Actions.
FROM eclipse-temurin:21-jdk-alpine
WORKDIR /app
COPY app.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-jar", "app.jar"]
