import cron from 'node-cron';
import { resetCreditsForAllPlans } from '../lib/credits';
import { createLogger } from '../lib/logger';

const logger = createLogger({ module: 'credit-reset-cron' });

export function startCreditResetCron(): void {
  // Run at midnight on the 1st of every month
  cron.schedule('0 0 1 * *', async () => {
    logger.info('Starting monthly credit reset');
    try {
      const result = await resetCreditsForAllPlans();
      logger.info({ reset: result.reset, skipped: result.skipped }, 'Monthly credit reset completed');
    } catch (err) {
      logger.error({ err }, 'Monthly credit reset failed');
    }
  });

  logger.info('Credit reset cron scheduled: 0 0 1 * *');
}
