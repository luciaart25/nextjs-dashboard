import bcrypt from 'bcrypt';
import type { TransactionSql } from 'postgres';
import { invoices, customers, revenue, users } from '../lib/placeholder-data';
import { getDatabaseInfo, getErrorMessage, getSql } from '../lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type SqlTransaction = TransactionSql<Record<string, unknown>>;

async function seedUsers(sql: SqlTransaction) {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL
    );
  `;

  const insertedUsers = await Promise.all(
    users.map(async (user) => {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      return sql`
        INSERT INTO users (id, name, email, password)
        VALUES (${user.id}, ${user.name}, ${user.email}, ${hashedPassword})
        ON CONFLICT (id) DO UPDATE
        SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          password = EXCLUDED.password;
      `;
    }),
  );

  return insertedUsers.length;
}

async function seedInvoices(sql: SqlTransaction) {
  await sql`
    CREATE TABLE IF NOT EXISTS invoices (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      amount INT NOT NULL,
      status VARCHAR(255) NOT NULL,
      date DATE NOT NULL
    );
  `;

  const insertedInvoices = await Promise.all(
    invoices.map(
      async (invoice) => {
        await sql`
          DELETE FROM invoices
          WHERE
            customer_id = ${invoice.customer_id}
            AND amount = ${invoice.amount}
            AND status = ${invoice.status}
            AND date = ${invoice.date}
            AND id <> ${invoice.id};
        `;

        return sql`
          INSERT INTO invoices (id, customer_id, amount, status, date)
          VALUES (${invoice.id}, ${invoice.customer_id}, ${invoice.amount}, ${invoice.status}, ${invoice.date})
          ON CONFLICT (id) DO UPDATE
          SET
            customer_id = EXCLUDED.customer_id,
            amount = EXCLUDED.amount,
            status = EXCLUDED.status,
            date = EXCLUDED.date;
        `;
      },
    ),
  );

  return insertedInvoices.length;
}

async function seedCustomers(sql: SqlTransaction) {
  await sql`
    CREATE TABLE IF NOT EXISTS customers (
      id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      email VARCHAR(255) NOT NULL,
      image_url VARCHAR(255) NOT NULL
    );
  `;

  const insertedCustomers = await Promise.all(
    customers.map(
      (customer) => sql`
        INSERT INTO customers (id, name, email, image_url)
        VALUES (${customer.id}, ${customer.name}, ${customer.email}, ${customer.image_url})
        ON CONFLICT (id) DO UPDATE
        SET
          name = EXCLUDED.name,
          email = EXCLUDED.email,
          image_url = EXCLUDED.image_url;
      `,
    ),
  );

  return insertedCustomers.length;
}

async function seedRevenue(sql: SqlTransaction) {
  await sql`
    CREATE TABLE IF NOT EXISTS revenue (
      month VARCHAR(4) NOT NULL UNIQUE,
      revenue INT NOT NULL
    );
  `;

  const insertedRevenue = await Promise.all(
    revenue.map(
      (rev) => sql`
        INSERT INTO revenue (month, revenue)
        VALUES (${rev.month}, ${rev.revenue})
        ON CONFLICT (month) DO UPDATE
        SET revenue = EXCLUDED.revenue;
      `,
    ),
  );

  return insertedRevenue.length;
}

export async function GET() {
  try {
    const sql = getSql('direct');
    const seeded = await sql.begin(async (transaction) => ({
      users: await seedUsers(transaction),
      customers: await seedCustomers(transaction),
      invoices: await seedInvoices(transaction),
      revenue: await seedRevenue(transaction),
    }));

    return Response.json({
      ok: true,
      message: 'Database seeded successfully.',
      database: getDatabaseInfo('direct'),
      seeded,
    });
  } catch (error) {
    return Response.json(
      {
        ok: false,
        message: 'Failed to seed database.',
        error: getErrorMessage(error),
      },
      { status: 500 },
    );
  }
}

export async function POST() {
  return GET();
}
