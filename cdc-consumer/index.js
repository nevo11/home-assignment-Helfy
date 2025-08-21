import { Kafka } from 'kafkajs';
import log4js from 'log4js';

log4js.configure({
    appenders: { out: { type: 'stdout' } },
    categories: { default: { appenders: ['out'], level: 'info' } },
});
const logger = log4js.getLogger('cdc-consumer');

const kafkaBrokers = process.env.KAFKA_BROKERS?.split(',') || ['kafka:29092'];
const topic = process.env.KAFKA_TOPIC || 'tidb-cdc';
const groupId = process.env.KAFKA_GROUP || 'cdc-consumer-group';

async function run() {
    const kafka = new Kafka({
        clientId: 'my-app',
        brokers: kafkaBrokers,
        connectionTimeout: 3000,
        retry: {
            retries: 10,
        },
    });
    const consumer = kafka.consumer({ groupId });
    await consumer.connect();
    await consumer.subscribe({ topic, fromBeginning: false });
    logger.info(`Subscribed to topic ${topic}`);

    await consumer.run({
        eachMessage: async ({ message, partition }) => {
            try {
                const value = message.value?.toString() || '';
                const evt = JSON.parse(value);
                // Canal JSON typically has fields: database, table, type, ts, data, old
                const payload = {
                    timestamp: new Date().toISOString(),
                    action: evt.type,
                    database: evt.database,
                    table: evt.table,
                    partition,
                    ts: evt.ts,
                    rows: evt.data,
                };
                logger.info(JSON.stringify(payload));
            } catch (e) {
                logger.error(`Failed to parse message: ${e.message}`);
            }
        },
    });
}

run().catch((e) => {
    logger.error(e);
    process.exit(1);
});
