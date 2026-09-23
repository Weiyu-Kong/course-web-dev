const fs = require('node:fs/promises');
const path = require('node:path');
const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'railway_demo',
};

async function main() {
  // SQL identifiers cannot use parameter placeholders. Validate the configured
  // database name before inserting it into the teaching scripts.
  if (!/^[A-Za-z0-9_]+$/.test(dbConfig.database)) {
    throw new Error('DB_NAME may contain only letters, digits, and underscores.');
  }
  const connection = await mysql.createConnection({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    multipleStatements: true,
  });
  const databaseDirectory = path.resolve(__dirname, '../database');
  const databaseIdentifier = `\`${dbConfig.database}\``;
  const schemaTemplate = await fs.readFile(path.join(databaseDirectory, 'schema.sql'), 'utf8');
  const seedTemplate = await fs.readFile(path.join(databaseDirectory, 'seed.sql'), 'utf8');
  const schema = schemaTemplate.replaceAll('railway_demo', databaseIdentifier);
  const seed = seedTemplate.replaceAll('railway_demo', databaseIdentifier);
  await connection.query(schema);
  await connection.query(seed);
  await connection.end();
  console.log(`Database "${dbConfig.database}" initialized and seeded.`);
}

main().catch((error) => {
  console.error('Database initialization failed:', error.message);
  process.exit(1);
});
