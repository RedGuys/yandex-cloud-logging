# Yandex Cloud Logging Appender for Log4JS

Sends logging events to [Yandex Cloud Logging](https://cloud.yandex.ru/docs/logging/quickstart). This appender uses [@yandex-cloud/nodejs-sdk](https://www.npmjs.com/package/@yandex-cloud/nodejs-sdk). If you want more information on the configuration options below.

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
* `timeout` - `number` (optional) - queue flush timeout in millisecond
* `resourceId` - `string` (optional) - resource id
* `setCategoryAsResourceType` - `boolean` (optional) - sets resource type from category name, if false, resourceId required

## Example

```javascript
log4js.configure({
  appenders: {
    yandexCloudLogging: {
      type: 'log4js-node-yandex-cloud-logging',
        serviceAccountID: "someServiceAccoutID",
        keyID: "someKeyID",
        keyData: String(fs.readFileSync("privateKey.pem")),
        destination: "someDestination"
    }
  },
  categories: {
    default: { appenders: ['yandexCloudLogging'], level: 'info' }
  }
});

const logger = log4js.getLogger();
logger.info('Some message');
```
