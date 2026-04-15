import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';

dotenv.config({ path: ['.env', '../../.env'] });

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://planview:planview_dev_secret_2026@localhost:5432/planview',
  entities: ['src/database/entities.ts'],
  migrations: ['src/database/migrations/*.ts'],
  synchronize: false,
  logging: ['error', 'warn', 'migration'],
});
