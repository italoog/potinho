import { beforeAll, describe, expect, it } from "vitest";
import { PGlite } from "@electric-sql/pglite";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { eq } from "drizzle-orm";
import * as schema from "./schema";
import { comedouroPet } from "./seed-data";
import { customerSchema, orderConfigurationSchema, productParamSchema, variantsSchema } from "./types";

let db: ReturnType<typeof drizzle<typeof schema>>;

beforeAll(async () => {
  const client = new PGlite();
  db = drizzle(client, { schema });
  await migrate(db, { migrationsFolder: "./drizzle" });
});

describe("modelo de dados (migrations reproduzíveis do zero)", () => {
  it("seed do comedouro insere e o param_schema valida contra o contrato zod", async () => {
    const [inserted] = await db.insert(schema.products).values(comedouroPet).returning();
    expect(inserted.slug).toBe("comedouro-pet");

    const [row] = await db
      .select()
      .from(schema.products)
      .where(eq(schema.products.slug, "comedouro-pet"));

    // JSONB round-trip preserva o schema de parâmetros do PRD §8
    const parsedParams = productParamSchema.parse(row.paramSchema);
    expect(parsedParams).toHaveLength(3);
    expect(parsedParams.map((p) => p.type)).toEqual(["text", "color", "select"]);

    const parsedVariants = variantsSchema.parse(row.variants);
    expect(parsedVariants[0].ref).toBe("15cm");
    expect(row.basePrice).toBe(8990);
  });

  it("pedido persiste configuration imutável + customer + snapshot", async () => {
    const [product] = await db.select().from(schema.products).limit(1);

    const configuration = { pet_name: "THOR", color: "#1E5AA8", size: "15cm" };
    const customer = {
      name: "Mariana Silva",
      email: "mariana@example.com",
      phone: "+5511999990000",
      address: {
        street: "Rua das Flores",
        number: "123",
        neighborhood: "Jardim",
        city: "São Paulo",
        state: "SP",
        zip: "01234-567",
      },
    };

    const [order] = await db
      .insert(schema.orders)
      .values({
        productId: product.id,
        totalAmount: 8990,
        shippingAmount: 1500,
        customer,
        configuration,
        snapshotUrl: "/uploads/snapshots/test.png",
      })
      .returning();

    expect(order.status).toBe("pending");
    expect(order.publicToken).toBeTruthy();
    expect(orderConfigurationSchema.parse(order.configuration)).toEqual(configuration);
    expect(customerSchema.parse(order.customer).address.state).toBe("SP");
  });

  it("slug de produto é único (índice)", async () => {
    await expect(db.insert(schema.products).values(comedouroPet)).rejects.toThrow();
  });

  it("stripe_session_id é único quando presente (idempotência do webhook)", async () => {
    const [product] = await db.select().from(schema.products).limit(1);
    const base = {
      productId: product.id,
      totalAmount: 1000,
      customer: {
        name: "Teste",
        email: "t@t.com",
        phone: "11999990000",
        address: {
          street: "A",
          number: "1",
          neighborhood: "B",
          city: "C",
          state: "SP",
          zip: "01234-567",
        },
      },
      configuration: { pet_name: "REX" },
    };
    await db.insert(schema.orders).values({ ...base, stripeSessionId: "cs_test_dup" });
    await expect(
      db.insert(schema.orders).values({ ...base, stripeSessionId: "cs_test_dup" }),
    ).rejects.toThrow();
  });
});
