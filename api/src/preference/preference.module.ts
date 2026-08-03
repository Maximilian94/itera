import { Module } from '@nestjs/common';
import { PreferencesController } from './preferences.controller';
import { PreferenceService } from './preference.service';

@Module({
  controllers: [PreferencesController],
  providers: [PreferenceService],
  exports: [PreferenceService],
})
export class PreferenceModule {}
