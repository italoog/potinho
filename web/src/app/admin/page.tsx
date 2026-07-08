import Link from "next/link";
import { getAdminSummary, type MetricsPeriod } from "@/lib/admin-metrics";
import { formatBRL } from "@/lib/money";
import { ORDER_STATUSES } from "@/db/types";
import { STATUS_LABEL } from "@/lib/order-status";

const PERIOD_LABEL: Record<MetricsPeriod, string> = { "7d": "7 dias", "30d": "30 dias", all: "tudo" };
const PERIODS: MetricsPeriod[] = ["7d", "30d", "all"];

function KpiCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-potinho-card">
      <p className="text-xs uppercase tracking-widest text-potinho-texto/50">{label}</p>
      <p className="mt-1 text-3xl font-bold text-potinho-chocolate">{value}</p>
    </div>
  );
}

export default async function AdminResumoPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const { periodo } = await searchParams;
  const period: MetricsPeriod = PERIODS.includes(periodo as MetricsPeriod) ? (periodo as MetricsPeriod) : "30d";
  const summary = await getAdminSummary(period);
  const maxStatusCount = Math.max(1, ...Object.values(summary.statusCounts));

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-bold lowercase text-potinho-chocolate">resumo</h1>
        <div className="flex gap-1 rounded-full bg-white p-1 shadow-potinho-card">
          {PERIODS.map((p) => (
            <Link
              key={p}
              href={`/admin?periodo=${p}`}
              className={`rounded-full px-4 py-1.5 text-xs font-semibold lowercase transition-colors ${
                period === p ? "bg-potinho-chocolate text-potinho-bege" : "text-potinho-texto/60 hover:bg-potinho-fundo"
              }`}
            >
              {PERIOD_LABEL[p]}
            </Link>
          ))}
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard label="receita paga" value={formatBRL(summary.revenueCents)} />
        <KpiCard label="pedidos pagos" value={String(summary.paidOrdersCount)} />
        <KpiCard label="ticket médio" value={formatBRL(summary.averageTicketCents)} />
        <KpiCard label="aguardando produção" value={String(summary.awaitingActionCount)} />
      </div>

      <section className="rounded-3xl bg-white p-6 shadow-potinho-card">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">
          pedidos por status
        </h2>
        <div className="flex flex-col gap-2">
          {ORDER_STATUSES.map((status) => (
            <div key={status} className="flex items-center gap-3 text-sm">
              <span className="w-32 shrink-0 lowercase text-potinho-texto/70">{STATUS_LABEL[status]}</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-potinho-fundo">
                <div
                  className="h-full rounded-full bg-potinho-chocolate"
                  style={{ width: `${(summary.statusCounts[status] / maxStatusCount) * 100}%` }}
                />
              </div>
              <span className="w-8 shrink-0 text-right font-semibold text-potinho-chocolate">
                {summary.statusCounts[status]}
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-potinho-card">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">
          top combinações
        </h2>
        {summary.topCombos.length === 0 ? (
          <p className="text-sm text-potinho-texto/50">sem dados ainda.</p>
        ) : (
          <ul className="flex flex-col gap-3 text-sm">
            {summary.topCombos.map((combo, i) => (
              <li key={i} className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="flex -space-x-1">
                    {combo.colorBase && (
                      <span
                        className="h-4 w-4 rounded-full ring-1 ring-potinho-cinza/40"
                        style={{ backgroundColor: combo.colorBase }}
                      />
                    )}
                    {combo.colorBand && (
                      <span
                        className="h-4 w-4 rounded-full ring-1 ring-potinho-cinza/40"
                        style={{ backgroundColor: combo.colorBand }}
                      />
                    )}
                  </span>
                  <span className="lowercase text-potinho-texto/70">{combo.size}</span>
                </span>
                <span className="font-semibold text-potinho-chocolate">{combo.count}×</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl bg-white p-6 shadow-potinho-card">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-potinho-chocolate">
          últimos pedidos
        </h2>
        {summary.recentOrders.length === 0 ? (
          <p className="text-sm text-potinho-texto/50">nenhum pedido ainda.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-potinho-bege">
            {summary.recentOrders.map((order) => (
              <li key={order.id} className="flex items-center justify-between py-3 text-sm">
                <Link href={`/admin/pedidos/${order.id}`} className="text-potinho-texto hover:underline">
                  {new Date(order.createdAt).toLocaleDateString("pt-BR")} · {order.id.slice(0, 8)}
                </Link>
                <span className="lowercase text-potinho-texto/60">{STATUS_LABEL[order.status]}</span>
                <span className="font-semibold text-potinho-chocolate">{formatBRL(order.totalAmount)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
