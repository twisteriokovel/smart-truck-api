import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AddressModule } from './address/address.module';
import { TruckModule } from './truck/truck.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MongooseModule.forRoot(process.env.MONGODB_URI!),
    AuthModule,
    AddressModule,
    TruckModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
