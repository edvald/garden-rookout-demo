###########
# BUILDER #
###########
FROM maven:3.5.2-jdk-8-alpine AS build

WORKDIR /code

RUN curl -L "https://repository.sonatype.org/service/local/artifact/maven/redirect?r=central-proxy&g=com.rookout&a=rook&v=LATEST" -o rook.jar

COPY pom.xml /code/pom.xml
RUN ["mvn", "dependency:resolve"]
RUN ["mvn", "verify"]

# Adding source, compile and package into a fat jar
COPY ["src/main", "/code/src/main"]
RUN ["mvn", "package"]

########
# PROD #
########
FROM openjdk:8-jre-alpine AS prod

WORKDIR /app

COPY --from=build /code/target/worker-jar-with-dependencies.jar /app
CMD ["java", "-XX:+UnlockExperimentalVMOptions", "-XX:+UseCGroupMemoryLimitForHeap", "-jar", "/app/worker-jar-with-dependencies.jar"]


#######
# DEV #
#######
FROM prod as dev

COPY --from=build /code/rook.jar /app/rook.jar
