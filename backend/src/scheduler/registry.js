const cron = require("node-cron");
const logger = require("../utils/logger");

class CronJobRegistry {
  constructor() {
    this.jobs = new Map();
  }

  register(job) {
    if (!job?.name || !job?.schedule || typeof job?.action !== "function") {
      throw new Error("Invalid cron job definition: name, schedule, and action are required.");
    }

    const task = cron.schedule(job.schedule, async () => {
      const start = Date.now();
      try {
        await job.action();
        logger.debug(`[CRON] Job "${job.name}" completed in ${Date.now() - start}ms`);
      } catch (error) {
        logger.error(`[CRON] Job "${job.name}" failed:`, error);
      }
    });

    this.jobs.set(job.name, task);
    logger.info(`[CRON] Registered job "${job.name}" (${job.schedule})`);

    if (job.runOnInit) {
      logger.info(`[CRON] Running initial execution for: ${job.name}`);
      Promise.resolve(job.action()).catch((error) => {
        logger.error(`[CRON] Initial execution failed for "${job.name}":`, error);
      });
    }
  }

  stopAll() {
    for (const [name, task] of this.jobs) {
      task.stop();
      logger.debug(`[CRON] Stopped job: ${name}`);
    }
    this.jobs.clear();
  }
}

module.exports = new CronJobRegistry();
