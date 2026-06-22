# Stage 1: Build React client
FROM node:22-alpine AS client-build
WORKDIR /src/bookacall.client

COPY src/bookacall.client/package.json src/bookacall.client/package-lock.json ./
RUN npm ci

COPY src/bookacall.client/ ./
RUN npm run build

# Stage 2: Publish ASP.NET Core API with client in wwwroot
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS publish
WORKDIR /src

COPY src/BookACall.Api/BookACall.Api.csproj BookACall.Api/
RUN dotnet restore BookACall.Api/BookACall.Api.csproj -p:DockerBuild=true

COPY src/BookACall.Api/ BookACall.Api/
COPY --from=client-build /src/bookacall.client/dist/ BookACall.Api/wwwroot/

RUN dotnet publish BookACall.Api/BookACall.Api.csproj -c Release -o /app/publish --no-restore -p:DockerBuild=true

# Stage 3: Runtime
FROM mcr.microsoft.com/dotnet/aspnet:10.0 AS runtime
WORKDIR /app

COPY --from=publish /app/publish .

ENV ASPNETCORE_URLS=http://0.0.0.0:8080
EXPOSE 8080

ENTRYPOINT ["sh", "-c", "export ASPNETCORE_URLS=http://0.0.0.0:${PORT:-8080} && exec dotnet BookACall.Api.dll"]
