import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { SeedDataService } from './seed-data.service';

async function runSeed() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const seedService = app.get(SeedDataService);

  try {
    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
      case 'seed': {
        const months = parseInt(args[1]) || 3;
        await seedService.seedOrdersAndTrips(months);
        break;
      }
      case 'clear':
        await seedService.clearSeedData();
        break;
      default:
        console.log('Available commands:');
        console.log(
          '  seed [months] - Generate seed data for specified months (default: 3)',
        );
        console.log('  clear - Clear existing seed data');
        console.log('');
        console.log('Examples:');
        console.log('  npm run seed seed 6 - Generate 6 months of data');
        console.log('  npm run seed clear - Clear seed data');
        break;
    }
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exit(1);
  } finally {
    await app.close();
  }
}

runSeed();
