# Yandex Cloud Logging Appender for Log4JS

Sends logging events to [Yandex Cloud Logging](https://cloud.yandex.ru/docs/logging/quickstart). This appender uses [@yandex-cloud/nodejs-sdk](https://www.npmjs.com/package/@yandex-cloud/nodejs-sdk).

## Features
- Sends logs to Yandex Cloud Logging.
- Support for `jsonPayload`. If your log message is a JSON or ends with a JSON object (e.g., `logger.info("Message", { key: "value" })`), it will be automatically extracted and sent as `jsonPayload`.
- Periodic batch sending.
- Resource type and ID configuration.
- Typescript support.

## Installation

`npm install log4js-node-yandex-cloud-logging`

`npm install log4js`
(This is a plug-in appender for [log4js](https://log4js-node.github.io/log4js-node/), so you'll need that as well)


## Configuration

* `type` - `log4js-node-yandex-cloud-logging`
* `serviceAccountID` - `string` - id of your service account
* `keyID` - `string` - id of your auth key
* `keyData` - `string` - content of your private key
* `destination` - `string` - destination group id
* `timeout` - `number` (optional, default 1000) - queue flush timeout in millisecond
* `resourceId` - `string` (optional) - resource id
* `setCategoryAsResourceType` - `boolean` (optional, default true) - sets resource type from category name, if false, resourceId required

## Example

```javascript
const log4js = require('log4js');

log4js.configure({
  appenders: {
    yandexCloudLogging: {
      type: 'log4js-node-yandex-cloud-logging',
      serviceAccountID: "your-sa-id",
      keyID: "your-key-id",
      keyData: "your-private-key",
      destination: "your-log-group-id"
    }
  },
  categories: {
    default: { appenders: ['yandexCloudLogging'], level: 'info' }
  }
});

const logger = log4js.getLogger();
logger.info('Hello World');
logger.info('JSON data', { foo: 'bar', nested: { a: 1 } });
```
