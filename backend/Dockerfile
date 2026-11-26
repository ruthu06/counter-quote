FROM mcr.microsoft.com/dotnet/sdk:8.0
ENV DOTNET_CLI_TELEMETRY_OPTOUT=1 DOTNET_NOLOGO=1
ENV ASPNETCORE_ENVIRONMENT=Development ASPNETCORE_HTTP_PORTS=5080 DataFolder=/data
RUN useradd --create-home --uid 1000 dev
USER dev
COPY --chown=dev . /tmp/restore
RUN cd /tmp/restore/CounterQuote.Api && dotnet tool restore && dotnet restore ..
WORKDIR /src/CounterQuote.Api
EXPOSE 5080
CMD ["dotnet", "run", "--no-launch-profile"]
