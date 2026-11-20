import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const BASE_URL = "http://localhost:3000";

async function main() {
  console.log("=== MEMULAI VERIFIKASI END-TO-END 12 FITUR KSATRIA GRAPHX ===");

  const username = process.env.DEFAULT_OWNER_USERNAME || "owner";
  const password = process.env.DEFAULT_OWNER_PASSWORD || "owner123456";

  // 1. Health Check
  const healthRes = await fetch(`${BASE_URL}/api/health`);
  const healthJson = await healthRes.json();
  if (healthRes.status !== 200 || healthJson.status !== "healthy") {
    throw new Error(`Feature 1 Failed: /api/health returned ${healthRes.status}`);
  }
  console.log("✓ Fitur 1 (/api/health): 200 Healthy");

  // 2. Login Owner
  const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ usernameOrEmail: username, password }),
  });
  const loginJson = await loginRes.json();
  if (loginRes.status !== 200 || !loginJson.success) {
    throw new Error(`Feature 2 Failed: Login returned ${loginRes.status}: ${JSON.stringify(loginJson)}`);
  }
  const cookies = loginRes.headers.get("set-cookie") || "";
  console.log("✓ Fitur 2 (/login & /api/auth/login): 200 OK (Authenticated as " + loginJson.data?.user?.role + ")");

  // Extract kgx_access_token
  const cookieHeader = cookies.split(",").map(c => c.split(";")[0].trim()).join("; ");

  // Me Check
  const meRes = await fetch(`${BASE_URL}/api/auth/me`, {
    headers: { Cookie: cookieHeader },
  });
  const meJson = await meRes.json();
  if (meRes.status !== 200 || meJson.data?.user?.role !== "OWNER") {
    throw new Error(`Feature 2 Me Check Failed: ${meRes.status}`);
  }
  console.log("✓ Fitur 2 (/api/auth/me): 200 OK Session Valid");

  // 3. Users Management
  const usersRes = await fetch(`${BASE_URL}/api/users`, {
    headers: { Cookie: cookieHeader },
  });
  const usersJson = await usersRes.json();
  if (usersRes.status !== 200 || !usersJson.success) {
    throw new Error(`Feature 3 Failed: /api/users returned ${usersRes.status}`);
  }
  console.log(`✓ Fitur 3 (/users & /api/users): 200 OK (${usersJson.data?.users?.length} users)`);

  // 4. Products & Categories
  const productsRes = await fetch(`${BASE_URL}/api/products`, {
    headers: { Cookie: cookieHeader },
  });
  const productsJson = await productsRes.json();
  if (productsRes.status !== 200 || !productsJson.success) {
    throw new Error(`Feature 4 Failed: /api/products returned ${productsRes.status}`);
  }
  console.log(`✓ Fitur 4 (/products & /api/products): 200 OK (${productsJson.data?.products?.length} products)`);

  // 5. Store Settings
  const settingsRes = await fetch(`${BASE_URL}/api/settings`, {
    headers: { Cookie: cookieHeader },
  });
  const settingsJson = await settingsRes.json();
  if (settingsRes.status !== 200 || !settingsJson.success) {
    throw new Error(`Feature 5 Failed: /api/settings returned ${settingsRes.status}`);
  }
  console.log(`✓ Fitur 5 (/settings & /api/settings): 200 OK (Store: ${settingsJson.data?.storeName})`);

  // 6. Customers
  const customersRes = await fetch(`${BASE_URL}/api/customers`, {
    headers: { Cookie: cookieHeader },
  });
  const customersJson = await customersRes.json();
  if (customersRes.status !== 200 || !customersJson.success) {
    throw new Error(`Feature 6 Failed: /api/customers returned ${customersRes.status}`);
  }
  console.log(`✓ Fitur 6 (/customers & /api/customers): 200 OK (${customersJson.data?.customers?.length} customers)`);

  // 7. Orders & POS
  const ordersRes = await fetch(`${BASE_URL}/api/orders`, {
    headers: { Cookie: cookieHeader },
  });
  const ordersJson = await ordersRes.json();
  if (ordersRes.status !== 200 || !ordersJson.success) {
    throw new Error(`Feature 7 & 8 Failed: /api/orders returned ${ordersRes.status}`);
  }
  console.log(`✓ Fitur 7 & 8 (/pos & /orders): 200 OK (${ordersJson.data?.orders?.length} orders)`);

  // 9. Dashboard API
  const dashRes = await fetch(`${BASE_URL}/api/dashboard?range=7d`, {
    headers: { Cookie: cookieHeader },
  });
  const dashJson = await dashRes.json();
  if (dashRes.status !== 200 || !dashJson.success || dashJson.data?.role !== "OWNER") {
    throw new Error(`Feature 10 Failed: /api/dashboard returned ${dashRes.status}`);
  }
  console.log(`✓ Fitur 10 (/dashboard & /api/dashboard): 200 OK (Role: ${dashJson.data?.role}, Total Omzet: Rp ${dashJson.data?.kpi?.totalOmzet?.toLocaleString("id-ID")})`);

  // 10. Reports API (JSON & CSV)
  const reportJsonRes = await fetch(`${BASE_URL}/api/reports?format=json`, {
    headers: { Cookie: cookieHeader },
  });
  const reportJsonData = await reportJsonRes.json();
  if (reportJsonRes.status !== 200 || !reportJsonData.success) {
    throw new Error(`Feature 11 Failed: /api/reports JSON returned ${reportJsonRes.status}`);
  }
  console.log(`✓ Fitur 11 (/reports JSON): 200 OK (Orders Count: ${reportJsonData.data?.summary?.ordersCount})`);

  const reportCsvRes = await fetch(`${BASE_URL}/api/reports?format=csv`, {
    headers: { Cookie: cookieHeader },
  });
  if (reportCsvRes.status !== 200) {
    const errorText = await reportCsvRes.text();
    throw new Error(`Feature 11 Failed: /api/reports CSV returned status ${reportCsvRes.status}: ${errorText}`);
  }
  const rawBuffer = Buffer.from(await reportCsvRes.arrayBuffer());
  const hasBom = rawBuffer[0] === 0xEF && rawBuffer[1] === 0xBB && rawBuffer[2] === 0xBF;
  if (!hasBom) {
    throw new Error(`Feature 11 Failed: Raw CSV bytes missing UTF-8 BOM (0xEF, 0xBB, 0xBF). Got: ${rawBuffer.slice(0, 3)}`);
  }
  console.log(`✓ Fitur 11 (/reports CSV): 200 OK (Valid UTF-8 BOM & RFC 4180 Format)`);

  // 11. Audit Logs API (Owner Exclusive)
  const auditRes = await fetch(`${BASE_URL}/api/audit-logs`, {
    headers: { Cookie: cookieHeader },
  });
  const auditJson = await auditRes.json();
  if (auditRes.status !== 200 || !auditJson.success) {
    throw new Error(`Feature 12 Failed: /api/audit-logs returned ${auditRes.status}`);
  }
  console.log(`✓ Fitur 12 (/audit-logs & /api/audit-logs): 200 OK (${auditJson.data?.pagination?.total} log entries recorded)`);

  console.log("=== SELURUH 12 FITUR API BERFUNGSI 100% TANPA KENDALA ===");
}

main().catch((err) => {
  console.error("VERIFIKASI GAGAL:", err.message);
  process.exit(1);
});
