export async function register() {
  // OpenTelemetry is initialized when @opentelemetry packages are installed
  // and OTEL_EXPORTER_OTLP_ENDPOINT env var is set
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.OTEL_ENABLED === 'true') {
    console.log('[instrumentation] OpenTelemetry configured but packages not yet installed');
    console.log('[instrumentation] Run: pnpm add @opentelemetry/sdk-node @opentelemetry/exporter-trace-otlp-http @opentelemetry/resources @opentelemetry/semantic-conventions @opentelemetry/sdk-trace-base @opentelemetry/core @opentelemetry/instrumentation-http @opentelemetry/instrumentation-express');
  }
}
