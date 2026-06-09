"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { CheckCircle2, XCircle, Activity, Clock } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from '@screencold/ui';
import { MetricsChart } from "./_components/metrics-chart";

// ──────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────

interface DurationData {
  avg: number;
  min: number;
  max: number;
}

interface JobTypeMetrics {
  rate: number;
  errors: number;
  duration: DurationData;
}

interface MetricsData {
  rate: number;
  errors: number;
  duration: DurationData;
  byType: Record<string, JobTypeMetrics>;
  /** ISO-8601 timestamp of when the metrics were last scraped on the client. */
  timestamp: string;
}

interface ParsedMetricEntry {
  name: string;
  labels: Record<string, string>;
  value: number;
}

// ──────────────────────────────────────────────
// Prometheus text-format parser
// ──────────────────────────────────────────────

/**
 * Parse a Prometheus text-format string into an array of metric entries.
 * Skips comment lines (#) and blank lines.
 */
function parsePrometheusLines(text: string): ParsedMetricEntry[] {
  const entries: ParsedMetricEntry[] = [];

  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    // Matches lines like:
    //   worker_jobs_total{job_type="audit"} 42
    //   worker_jobs_total 42
    const match = line.match(
      /^(\w+)(\{[^}]*\})?\s+(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)$/,
    );
    if (!match) continue;

    const name = match[1]!;
    const rawLabels = match[2];
    const value = parseFloat(match[3]!);

    const labels: Record<string, string> = {};
    if (rawLabels) {
      // Strip { } and split by comma
      const inner = rawLabels.slice(1, -1);
      for (const part of inner.split(",")) {
        const sepIdx = part.indexOf("=");
        if (sepIdx === -1) continue;
        labels[part.slice(0, sepIdx).trim()] = part
          .slice(sepIdx + 1)
          .replace(/^"|"$/g, "");
      }
    }

    entries.push({ name, labels, value });
  }

  return entries;
}

/**
 * Find the first entry matching `name` and (optionally) a label filter.
 * When no labelFilter is supplied, only unlabeled entries match.
 */
function findEntry(
  entries: ParsedMetricEntry[],
  name: string,
  labelFilter?: Record<string, string>,
): ParsedMetricEntry | undefined {
  return entries.find((e) => {
    if (e.name !== name) return false;
    if (labelFilter) {
      return Object.entries(labelFilter).every(
        ([k, v]) => e.labels[k] === v,
      );
    }
    return Object.keys(e.labels).length === 0;
  });
}

/**
 * Parse the Prometheus text returned by /api/metrics into a structured
 * MetricsData object.  Returns null if required metrics are missing.
 */
function parseMetricsPayload(text: string): MetricsData | null {
  const entries = parsePrometheusLines(text);

  const rate = findEntry(entries, "worker_jobs_total")?.value ?? 0;
  const errors = findEntry(entries, "worker_job_errors_total")?.value ?? 0;
  const avgDuration =
    findEntry(entries, "worker_job_duration_ms", {
      quantile: "avg",
    })?.value ?? 0;
  const minDuration =
    findEntry(entries, "worker_job_duration_ms", {
      quantile: "min",
    })?.value ?? 0;
  const maxDuration =
    findEntry(entries, "worker_job_duration_ms", {
      quantile: "max",
    })?.value ?? 0;

  // Collect unique job_type values
  const jobTypes = new Set(
    entries
      .filter((e) => e.labels.job_type !== undefined)
      .map((e) => e.labels.job_type!),
  );

  const byType: Record<string, JobTypeMetrics> = {};

  for (const type of jobTypes) {
    const typeLabels = { job_type: type };
    byType[type] = {
      rate: findEntry(entries, "worker_jobs_total", typeLabels)?.value ?? 0,
      errors:
        findEntry(entries, "worker_job_errors_total", typeLabels)?.value ?? 0,
      duration: {
        avg:
          findEntry(entries, "worker_job_duration_ms", {
            ...typeLabels,
            quantile: "avg",
          })?.value ?? 0,
        min:
          findEntry(entries, "worker_job_duration_ms", {
            ...typeLabels,
            quantile: "min",
          })?.value ?? 0,
        max:
          findEntry(entries, "worker_job_duration_ms", {
            ...typeLabels,
            quantile: "max",
          })?.value ?? 0,
      },
    };
  }

  return {
    rate,
    errors,
    duration: { avg: avgDuration, min: minDuration, max: maxDuration },
    byType,
    timestamp: new Date().toISOString(),
  };
}

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function formatMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(2)}s`;
  return `${Math.round(ms)}ms`;
}

function formatTimestamp(iso: string): string {
  return new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(iso));
}

function errorPercent(errors: number, rate: number): string {
  if (rate === 0) return "—";
  return `${((errors / rate) * 100).toFixed(1)}%`;
}

// ──────────────────────────────────────────────
// Component
// ──────────────────────────────────────────────

export default function ObservabilityPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [metrics, setMetrics] = React.useState<MetricsData | null>(null);
  const [workerStatus, setWorkerStatus] = React.useState<
    "loading" | "healthy" | "unreachable"
  >("loading");
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [durationHistory, setDurationHistory] = React.useState<number[]>([]);
  const [lastUpdated, setLastUpdated] = React.useState<Date | null>(null);

  // ── Admin role check ───────────────────────

  React.useEffect(() => {
    if (status === "loading") return;
    if (status === "unauthenticated") {
      router.push("/login");
      return;
    }

    const userSession = session?.user as
      | { role?: string; roles?: string[] }
      | undefined;
    const isAdmin =
      userSession?.roles?.includes("ADMIN") || userSession?.role === "ADMIN";

    if (!isAdmin) {
      router.push("/login");
    }
  }, [session, status, router]);

  // ── Metrics polling ────────────────────────

  React.useEffect(() => {
    let cancelled = false;

    const fetchMetrics = async (): Promise<void> => {
      try {
        const response = await fetch("/api/metrics");

        if (!response.ok) {
          // Try to parse JSON error body
          const contentType = response.headers.get("content-type") ?? "";
          if (contentType.includes("application/json")) {
            const body = (await response.json()) as {
              worker?: string;
              error?: string;
              statusText?: string;
            };
            if (!cancelled) {
              setWorkerStatus("unreachable");
              setErrorMessage(
                body.error ?? body.statusText ?? `HTTP ${response.status}`,
              );
            }
          } else {
            if (!cancelled) {
              setWorkerStatus("unreachable");
              setErrorMessage(`HTTP ${response.status}: ${response.statusText}`);
            }
          }
          return;
        }

        const text = await response.text();
        const parsed = parseMetricsPayload(text);
        if (parsed === null) {
          if (!cancelled) {
            setWorkerStatus("unreachable");
            setErrorMessage("Unable to parse metrics response");
          }
          return;
        }

        if (cancelled) return;

        setMetrics(parsed);
        setWorkerStatus("healthy");
        setErrorMessage(null);
        setLastUpdated(new Date());

        setDurationHistory((prev) => {
          const next = [...prev, parsed.duration.avg];
          // Keep the last 30 data points for the sparkline
          if (next.length > 30) {
            return next.slice(next.length - 30);
          }
          return next;
        });
      } catch (error: unknown) {
        if (cancelled) return;
        setWorkerStatus("unreachable");
        setErrorMessage(
          error instanceof Error ? error.message : "Failed to fetch metrics",
        );
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 10_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  // ── Auth-guard render ──────────────────────

  if (status === "loading") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-info-600 border-t-transparent" />
      </div>
    );
  }

  const userSession = session?.user as
    | { role?: string; roles?: string[] }
    | undefined;
  const isAdmin =
    userSession?.roles?.includes("ADMIN") || userSession?.role === "ADMIN";
  if (!isAdmin) return null;

  // ── Derived values ─────────────────────────

  const workerHealthy = workerStatus === "healthy";
  const totalRate = metrics?.rate ?? 0;
  const totalErrors = metrics?.errors ?? 0;
  const avgDuration = metrics?.duration.avg ?? 0;
  const maxDuration = metrics?.duration.max ?? 0;

  const jobTypes = metrics
    ? Object.keys(metrics.byType).sort()
    : [];

  // ── Render ─────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-neutral-900">
          Observabilité
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          Métriques RED du worker (taux, erreurs, durée)
        </p>
      </div>

      {/* Status Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Worker Status */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">
              Worker
            </CardTitle>
            {workerHealthy ? (
              <CheckCircle2 className="h-5 w-5 text-success-500" />
            ) : (
              <XCircle className="h-5 w-5 text-error-500" />
            )}
          </CardHeader>
          <CardContent>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-bold ${
                  workerHealthy ? "text-success-600" : "text-error-600"
                }`}
              >
                {workerHealthy ? "Healthy" : "Unreachable"}
              </span>
            </div>
            {errorMessage && (
              <p className="mt-1 text-xs text-error-500">{errorMessage}</p>
            )}
          </CardContent>
        </Card>

        {/* Last Updated */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">
              Dernière mise à jour
            </CardTitle>
            <Clock className="h-5 w-5 text-neutral-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-neutral-900">
              {lastUpdated
                ? formatTimestamp(lastUpdated.toISOString())
                : "—"}
            </p>
            <CardDescription className="mt-1">
              Intervalle: 10s
            </CardDescription>
          </CardContent>
        </Card>

        {/* Total Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">
              Taux total
            </CardTitle>
            <Activity className="h-5 w-5 text-info-500" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-neutral-900">{totalRate}</p>
            <CardDescription className="mt-1">
              Jobs démarrés
            </CardDescription>
          </CardContent>
        </Card>

        {/* Error Rate */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-neutral-500">
              Erreurs
            </CardTitle>
            <XCircle className="h-5 w-5 text-error-400" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-neutral-900">
              {totalErrors} ({errorPercent(totalErrors, totalRate)})
            </p>
            <CardDescription className="mt-1">
              Total ({errorPercent(totalErrors, totalRate)})
            </CardDescription>
          </CardContent>
        </Card>
      </div>

      {/* RED Metrics Table */}
      <Card>
        <CardHeader>
          <CardTitle>Métriques RED</CardTitle>
          <CardDescription>
            Taux, erreurs et durée par type de job
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200">
                  <th className="px-4 py-3 font-medium text-neutral-500">
                    Job Type
                  </th>
                  <th className="px-4 py-3 font-medium text-neutral-500">
                    Rate
                  </th>
                  <th className="px-4 py-3 font-medium text-neutral-500">
                    Errors
                  </th>
                  <th className="px-4 py-3 font-medium text-neutral-500">
                    Error %
                  </th>
                  <th className="px-4 py-3 font-medium text-neutral-500">
                    Avg Duration
                  </th>
                  <th className="px-4 py-3 font-medium text-neutral-500">
                    P99 Latency
                  </th>
                </tr>
              </thead>
              <tbody>
                {/* Aggregated row */}
                <tr className="border-b border-neutral-100 bg-neutral-50 font-semibold">
                  <td className="px-4 py-3 text-neutral-900">All</td>
                  <td className="px-4 py-3 text-neutral-900">{totalRate}</td>
                  <td className="px-4 py-3 text-neutral-900">{totalErrors}</td>
                  <td className="px-4 py-3 text-neutral-900">
                    {errorPercent(totalErrors, totalRate)}
                  </td>
                  <td className="px-4 py-3 text-neutral-900">
                    {formatMs(avgDuration)}
                  </td>
                  <td className="px-4 py-3 text-neutral-900">
                    {formatMs(maxDuration)}
                  </td>
                </tr>

                {/* Per-type rows */}
                {metrics === null ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-neutral-400"
                    >
                      En attente des données du worker…
                    </td>
                  </tr>
                ) : jobTypes.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-neutral-400"
                    >
                      Aucune donnée de job disponible
                    </td>
                  </tr>
                ) : (
                  jobTypes.map((type) => {
                    const jm = metrics.byType[type]!;
                    return (
                      <tr
                        key={type}
                        className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50"
                      >
                        <td className="px-4 py-3 text-neutral-900">{type}</td>
                        <td className="px-4 py-3 text-neutral-700">{jm.rate}</td>
                        <td className="px-4 py-3 text-neutral-700">
                          {jm.errors}
                        </td>
                        <td className="px-4 py-3 text-neutral-700">
                          {errorPercent(jm.errors, jm.rate)}
                        </td>
                        <td className="px-4 py-3 text-neutral-700">
                          {formatMs(jm.duration.avg)}
                        </td>
                        <td className="px-4 py-3 text-neutral-700">
                          {formatMs(jm.duration.max)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Duration Sparkline */}
      <Card>
        <CardHeader>
          <CardTitle>Durée moyenne (historique)</CardTitle>
          <CardDescription>
            Évolution de la durée moyenne des jobs sur les 30 derniers
            échantillons
          </CardDescription>
        </CardHeader>
        <CardContent>
          {durationHistory.length < 2 ? (
            <div className="flex h-16 items-center justify-center text-sm text-neutral-400">
              {workerStatus === "loading"
                ? "Collecte des données…"
                : "Données insuffisantes pour le graphique"}
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <MetricsChart
                data={durationHistory}
                width={600}
                height={80}
                color="#3b82f6"
              />
              <div className="shrink-0 space-y-1 text-xs text-neutral-500">
                <div className="flex justify-between gap-4">
                  <span>Max</span>
                  <span className="font-mono text-neutral-700">
                    {formatMs(Math.max(...durationHistory))}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Min</span>
                  <span className="font-mono text-neutral-700">
                    {formatMs(Math.min(...durationHistory))}
                  </span>
                </div>
                <div className="flex justify-between gap-4">
                  <span>Actuel</span>
                  <span className="font-mono text-neutral-700">
                    {formatMs(durationHistory[durationHistory.length - 1]!)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
