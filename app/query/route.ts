import { getDatabaseInfo, getErrorMessage, getSql } from '../lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

async function listInvoices() {
  const sql = getSql();
  const [tableStatus] = await sql<{ table_name: string | null }[]>`
    SELECT to_regclass('public.invoices') AS table_name;
  `;

  if (!tableStatus?.table_name) {
    return {
      seeded: false,
      rows: [],
    };
  }

	const data = await sql`
		SELECT invoices.amount, customers.name
		FROM invoices
	 JOIN customers ON invoices.customer_id = customers.id
		WHERE invoices.amount = 666;
	`;

 	return {
    seeded: true,
    rows: data,
  };
 }

export async function GET() {
  try {
    const result = await listInvoices();

  	return Response.json({
      ok: true,
      message: result.seeded
        ? 'Query executed successfully.'
        : 'Database is connected, but tables are not seeded yet. Run /seed first.',
      database: getDatabaseInfo('pooled'),
      ...result,
    });
   } catch (error) {
   	return Response.json(
      {
        ok: false,
        message: 'Failed to run query.',
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
   }
}
