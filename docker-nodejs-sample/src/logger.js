const log4js = require('log4js');

log4js.configure({
    appenders: {
        out: {
            type: 'stdout',
            layout: {
                type: 'pattern',
                pattern: '{"timestamp":"%d{ISO8601}","level":"%p","category":"%c","message":"%m","context":%x{context}}',
                tokens: {
                    context: function (logEvent) {
                        try {
                            return JSON.stringify(logEvent.context || {});
                        } catch (e) {
                            return '{}';
                        }
                    },
                },
            },
        },
    },
    categories: { default: { appenders: ['out'], level: 'info' } },
});

const getLogger = (category) => log4js.getLogger(category);

module.exports = {
    getLogger,
}; 