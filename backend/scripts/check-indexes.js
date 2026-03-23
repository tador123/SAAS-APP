const seq = require('./src/config/database');
(async () => {
  const q = "SELECT indexname, indexdef FROM pg_indexes WHERE tablename = ";
  const [ri] = await seq.query(q + "'rooms' ORDER BY indexname");
  console.log("ROOMS:", JSON.stringify(ri, null, 2));
  const [ci] = await seq.query(q + "'menu_categories' ORDER BY indexname");
  console.log("CATS:", JSON.stringify(ci, null, 2));
  const [ti] = await seq.query(q + "'restaurant_tables' ORDER BY indexname");
  console.log("TABLES:", JSON.stringify(ti, null, 2));
  const [mi] = await seq.query("SELECT name FROM sequelize_migrations ORDER BY name");
  console.log("MIGRATIONS:", JSON.stringify(mi));
  process.exit(0);
})().catch(e => { console.error(e.message); process.exit(1); });
