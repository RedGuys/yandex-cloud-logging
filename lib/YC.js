const {Destination} = require("@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/logging/v1/log_entry");
const {WriteRequest} = require("@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/logging/v1/log_ingestion_service");
const {LogEntryResource} = require("@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/logging/v1/log_resource");
const {
    IncomingLogEntry,
    LogLevel_Level
} = require("@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/logging/v1/log_entry");
const {LogIngestionServiceClient} = require("@yandex-cloud/nodejs-sdk/dist/generated/yandex/cloud/service_clients");
const debug = require('debug')('log4js:yandex-cloud-logging');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const {Session} = require('@yandex-cloud/nodejs-sdk');

class YC {
    queue = {};

    constructor(serviceAccountID, keyID, keyData, destination, timeout, tokenTimeout) {
        if(tokenTimeout>3600) tokenTimeout = 3600;
        this.serviceAccountID = serviceAccountID;
        this.keyID = keyID;
        this.keyData = keyData;
        this.token = null;
        this.destination = destination;
        this.tokenTimeout = tokenTimeout;
        this.timeout = timeout;
        this.cloudService = null;
        this.generateToken().then(token => {
            const session = new Session({iamToken: token});
            this.cloudService = session.client(LogIngestionServiceClient);
            debug(`cloudService initiated`)
            setInterval(() => {this._sendQueue();},timeout)
            setInterval(() => {this._updateToken();},tokenTimeout*1000)
        });

        if (!this.serviceAccountID) debug('No Service Account ID provided');
        if (!this.keyID) debug('No Service Key ID provided');
        if (!this.keyData) debug('No Key data provided');
    }

    _updateToken() {
        debug("Updating token")
        this.generateToken().then(token => {
            const session = new Session({iamToken: token});
            this.cloudService = session.client(LogIngestionServiceClient);
            debug(`cloudService re-initiated`)
        });
    }

    generateToken() {
        return new Promise((resolve, reject) => {
            if (!(this.token && this.tokenExpire && this.tokenExpire + 60 < Math.floor(new Date() / 1000))) {
                const now = Math.floor(new Date() / 1000);

                const payload = {
                    'aud': 'https://iam.api.cloud.yandex.net/iam/v1/tokens',
                    'iss': this.serviceAccountID,
                    'iat': now,
                    'exp': now + this.tokenTimeout
                };

                const tokenJWT = jwt.sign(payload, this.keyData, {
                    algorithm: 'PS256',
                    keyid: this.keyID
                });

                axios.post('https://iam.api.cloud.yandex.net/iam/v1/tokens', {jwt: tokenJWT}).then(res => {
                    if (res.status === 200) {
                        this.token = res.data.iamToken;
                        this.tokenExpire = now + this.tokenTimeout;
                        resolve(this.token);
                    } else {
                        reject(res);
                    }
                }).catch(err => {
                    reject(err);
                });
            } else {
                resolve(this.token);
            }
        });
    }

    mapLevel(level) {
        switch (level.levelStr) {
            case "ALL":
                return LogLevel_Level.LEVEL_UNSPECIFIED;
            case "MARK":
                return LogLevel_Level.UNRECOGNIZED;
            case "TRACE":
                return LogLevel_Level.TRACE;
            case "DEBUG":
                return LogLevel_Level.DEBUG;
            case "INFO":
                return LogLevel_Level.INFO;
            case "WARN":
                return LogLevel_Level.WARN;
            case "ERROR":
                return LogLevel_Level.ERROR;
            case "FATAL":
                return LogLevel_Level.FATAL;
            case "OFF":
                return LogLevel_Level.LEVEL_UNSPECIFIED;
            default:
                return LogLevel_Level.UNRECOGNIZED;
        }
    }

    _sendQueue() {
        for (let key in this.queue) {
            if (!this.queue.hasOwnProperty(key)) continue;
            let data = this.queue[key];
            delete this.queue[key];
            this._sendElement(data);
            debug(`Sending ${data.lines.length} logs from queue`)
        }
    }

    _sendElement(data) {
        return new Promise((resolve, reject) => {
            this.cloudService.write(WriteRequest.fromPartial({
                destination: Destination.fromPartial({logGroupId: this.destination}),
                resource: LogEntryResource.fromPartial({id: this._transformResource(data.resource)}),
                entries: data.lines.map(line => IncomingLogEntry.fromPartial({
                    message: data.layout(line),
                    timestamp: line.startTime,
                    level: this.mapLevel(line.level)
                }))
            })).then((res) => {
                resolve(res);
            }).catch((err) => {
                reject(err);
            });
        });
    }

    _transformResource(name= "") {
        return this._replaceAll(name.replace(/[^-a-zA-Z0-9_.]/g, '-'), ":", "-")
    }

    _replaceAll(str, find, replace) {
        return str.replace(new RegExp(find, 'g'), replace);
    }

    write(data) {
        if (this.queue[data.resource]) {
            for (let line of data.lines) {
                this.queue[data.resource].lines.push(line);
            }
        } else {
            this.queue[data.resource] = data;
        }
    }
}

module.exports = YC;