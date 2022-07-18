/* eslint no-console:0 */

'use strict';

const debug = require('debug')('log4js:yandex-cloud-logging');
const YC = require("./YC");

/**
 * Yandex Cloud Logging Appender. Sends logging events to yandex cloud using @yandex-cloud/nodejs-sdk.
 *
 * @param config object with yandex cloud configuration data
 * {
 *   serviceAccountID: 'service account id',
 *   keyID: 'key id',
 *   keyData: 'key data',
 *   timeout: 1000 (milliseconds),
 *   resourceId: 'resource id',
 *   setCategoryAsResourceType: true
 * }
 * @param layout a function that takes a logevent and returns a string (defaults to objectLayout).
 */
function ycAppender(config, layout) {
    const client = new YC(config.serviceAccountID, config.keyID, config.keyData, config.destination, config.timeout?config.timeout:1000, config.resourceId, typeof config.setCategoryAsResourceType=="boolean"?config.setCategoryAsResourceType:true);

    debug('creating appender.');

    function app(loggingEvent) {
        debug('sending log event to yandex cloud');
        client.write(
            {
                layout,
                resource:loggingEvent.categoryName,
                lines:[loggingEvent]
            }
        )
    }

    app.shutdown = function (cb) {
        debug('shutdown called');
        cb();
    };

    return app;
}

function configure(config, layouts) {
    let layout = layouts.messagePassThroughLayout;
    if (config.layout) {
        layout = layouts.layout(config.layout.type, config.layout);
    }
    debug('configuring new appender');
    return ycAppender(config, layout);
}


module.exports.configure = configure;