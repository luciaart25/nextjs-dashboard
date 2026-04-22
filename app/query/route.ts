import { getErrorMessage, getSql } from '../lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function listInvoices() {
  const sql = getSql();
  const [tableStatus] = await sql<{ table_name: string | null }[]>`
    SELECT to_regclass('public.invoices') AS table_name;
  `;

  if (!tableStatus?.table_name) {
    return [];
  }

  const data = await sql`
    SELECT invoices.amount, customers.name
    FROM invoices
    JOIN customers ON invoices.customer_id = customers.id
    WHERE invoices.amount = 666;
  `;

  return data;
}

export async function GET() {
  try {
    return Response.json(await listInvoices());
  } catch (error) {
    return Response.json(
      {
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
