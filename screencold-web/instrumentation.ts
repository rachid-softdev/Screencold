export async function register() {
  // OpenTelemetry is provided by the @screencold/telemetry workspace package.
  // Enable by setting OTEL_ENABLED=true (and optionally OTEL_EXPORTER_OTLP_ENDPOINT).
  if (process.env.NEXT_RUNTIME === 'nodejs' && process.env.OTEL_ENABLED === 'true') {
    try {
      const { initializeTelemetry } = await import('@screencold/telemetry');
      initializeTelemetry();
    } catch (err) {
      console.warn('[instrumentation] Failed to initialize OpenTelemetry:', err);
    }
  }
}
