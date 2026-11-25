export function calcAdMetrics(input: {
  adSpend: number;
  impressions: number;
  clicks: number;
  orders: number;
  orderAmount: number;
}) {
  const { adSpend, impressions, clicks, orders, orderAmount } = input;
  const ctr = impressions > 0 ? (clicks / impressions) * 100 : 0;
  const cvr = clicks > 0 ? (orders / clicks) * 100 : 0;
  const cpc = clicks > 0 ? Math.round(adSpend / clicks) : 0;
  const cpa = orders > 0 ? Math.round(adSpend / orders) : 0;
  const roas = adSpend > 0 ? (orderAmount / adSpend) * 100 : 0;
  return {
    ctr: Math.round(ctr * 100) / 100,
    cvr: Math.round(cvr * 100) / 100,
    cpc,
    cpa,
    roas: Math.round(roas * 100) / 100,
  };
}

export function summarizeCosts(
  costs: Array<{
    adSpend: number;
    impressions: number;
    clicks: number;
    orders: number;
    orderAmount: number;
  }>,
) {
  const totals = costs.reduce(
    (acc, row) => {
      acc.adSpend += row.adSpend;
      acc.impressions += row.impressions;
      acc.clicks += row.clicks;
      acc.orders += row.orders;
      acc.orderAmount += row.orderAmount;
      return acc;
    },
    { adSpend: 0, impressions: 0, clicks: 0, orders: 0, orderAmount: 0 },
  );
  return { ...totals, ...calcAdMetrics(totals) };
}
