'use strict';

/*jshint -W003 */

var Client = require('../lib/client');

var udpServer = require('./tools/udp-server');
var httpsServer = require('./tools/https-server');
var logger = require('bunyan').createLogger({name: 'tests'});

var expect = require('chai').expect;
var sinon = require('sinon');

var udpPort = Math.floor(Math.random() * 10000) + 1000;
var httpPort = Math.floor(Math.random() * 20000) + 10001;

var apiConf = {
    host: '127.0.0.1',
    port: httpPort,
    token: 'my-token'
};

describe('When sending metrics', function () {

    it('should send metrics through UDP', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        var victim = new Client({
            systemStats: false,
            transport: 'udp',
            port: udpPort,
            flushSize: 1
        }, logger);

        // When
        victim.put('my_metric', 1, null, false);

        // Then
        function onResponse(lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(/^application.my_metric 1 \d+$/);
            done();
        }
    });

    it('should send multiple metrics through UDP', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        var victim = new Client({
            systemStats: false,
            transport: 'udp',
            port: udpPort,
            flushSize: 2
        }, logger);

        // When
        victim.put('my_metric1', 1);
        victim.put('my_metric2', 1);

        // Then
        function onResponse(lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(/^application.my_metric1 1 \d+\napplication.my_metric2 1 \d+$/);
            done();
        }
    });

    it('should send metrics through HTTPS', function (done) {
        // Given
        httpsServer.start(httpPort, '127.0.0.1', onResponse);

        var victim = new Client({
            systemStats: false,
            transport: 'http',
            api: apiConf,
            flushSize: 1
        }, logger);

        // When
        victim.put('my_metric', 1);

        // Then
        function onResponse(lines) {
            httpsServer.stop();

            expect(lines).to.match(/^application.my_metric 1 \d+$/);
            done();
        }
    });

    it('should send compressed metrics through HTTPS', function (done) {
        // Given
        httpsServer.start(httpPort, '127.0.0.1', onResponse, 201, true);

        var victim = new Client({
            systemStats: false,
            transport: 'http',
            api: apiConf,
            compression: true,
            flushSize: 1
        }, logger);

        // When
        victim.put('my_metric', 1);

        // Then
        function onResponse(lines) {
            httpsServer.stop();

            expect(lines).to.match(/^application.my_metric 1 \d+$/);
            done();
        }
    });

    it('should send metrics with fixed size flushes', function (done) {
        // Given
        httpsServer.start(httpPort, '127.0.0.1', onResponse);

        var victim = new Client({
            systemStats: false,
            transport: 'http',
            api: apiConf,
            flushSize: 2
        }, logger);

        // When
        victim.put('my_metric1', 1);
        victim.put('my_metric2', 1);

        // Then
        function onResponse(lines) {
            httpsServer.stop();

            expect(lines).to.match(/^application.my_metric1 1 \d+\napplication.my_metric2 1 \d+$/);
            done();
        }
    });

    it('should send metrics with configurable timed flushes', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        var victim = new Client({
            systemStats: false,
            transport: 'udp',
            port: udpPort,
            flushInterval: 10
        }, logger);

        // When
        victim.put('my_metric', 1);

        // Then
        function onResponse(lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(/^application.my_metric 1 \d+$/);
            done();
        }
    });

    it('should send metrics with custom namespace', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        var victim = new Client({
            systemStats: false,
            transport: 'udp',
            port: udpPort,
            flushSize: 1
        }, logger);

        // When
        victim.put('my_metric', 1, {namespace: 'my_namespace'});

        // Then
        function onResponse(lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(/^my_namespace.my_metric 1 \d+$/);
            done();
        }
    });

    it('should send metrics with custom configurable tags', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        var victim = new Client({
            systemStats: false,
            transport: 'udp',
            port: udpPort,
            flushSize: 1,
            tags: {cluster: 'test'}
        }, logger);

        // When
        victim.put('my_metric', 1);

        // Then
        function onResponse(lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(/^application\.my_metric,cluster=test 1 \d+$/);
            done();
        }
    });

    it('should send metrics with custom configurable application tag', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        var victim = new Client({
            systemStats: false,
            transport: 'udp',
            port: udpPort,
            flushSize: 1,
            app: 'test'
        }, logger);

        // When
        victim.put('my_metric', 1);

        // Then
        function onResponse(lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(/^application\.my_metric,app=test 1 \d+$/);
            done();
        }
    });

    it('should send metrics with sample rate', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        var victim = new Client({
            systemStats: false,
            transport: 'udp',
            port: udpPort,
            flushSize: 1,
            sampleRate: 80
        }, logger);

        // When
        victim.put('my_metric', 1, {tags: {}, agg: ['avg'], aggFreq: 10}, false);

        // Then
        function onResponse(lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(/^application.my_metric 1 \d+ avg,10 80$/);
            done();
        }
    });

    it('should send metrics with sampled rate', function (done) {
        // Given
        var randomStub = sinon.stub(Math, 'random').returns(1);

        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        var victim = new Client({
            systemStats: false,
            transport: 'udp',
            port: udpPort,
            flushSize: 2,
            sampleRate: 100
        }, logger);

        // When
        victim.put('my_metric', 1, {agg: ['avg'], aggFreq: 10}, false);
        victim.put('my_metric', 2, { agg: ['avg'], aggFreq: 10}, false);

        // Then
        function onResponse(lines) {
            udpServer.stop();
            randomStub.restore();

            expect(lines.toString()).to.match(/^application\.my_metric 1 \d+ avg,10\napplication\.my_metric 2 \d+ avg,10$/);

            done();
        }
    });

    it('should throw exception when api token is not configured', function() {
        var conf = {
            systemStats: false,
            transport: 'http',
            api: {
                host: '127.0.0.1',
                port: httpPort
            },
            flushSize: 1
        };

        expect(Client.bind(Client, conf, logger)).to.throw('Statful API Token not defined');
    });

    it('should handle HTTPS errors', function (done) {
        // Given
        httpsServer.startWithError(httpPort, '127.0.0.1', onResponse);

        var victim = new Client({
            systemStats: false,
            transport: 'http',
            api: apiConf,
            flushSize: 1
        }, logger);

        // When
        victim.put('my_metric', 1);

        // Then
        function onResponse(lines) {
            httpsServer.stop();

            expect(lines).to.match(/^application.my_metric 1 \d+$/);
            done();
        }
    });

    it('should close client', function () {
        var victim = new Client({}, logger);

        sinon.spy(victim, "close");

        // When
        victim.close();

        // Then

        expect(victim.close.calledOnce).to.be.true;
        victim.close.restore();

    });

    it('should configure global namespace', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        var victim = new Client({
            systemStats: false,
            transport: 'udp',
            port: udpPort,
            flushSize: 1,
            namespace: 'my_namespace'
        }, logger);

        // When
        victim.put('my_metric', 1);

        // Then
        function onResponse(lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(/^my_namespace.my_metric 1 \d+$/);
            done();
        }
    });

    it('should override global configuration', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        var victim = new Client({
            systemStats: false,
            transport: 'udp',
            port: udpPort,
            flushSize: 1,
            namespace: 'my_namespace'
        }, logger);

        // When
        victim.put('my_metric', 1, {namespace: 'my_other_namespace'});

        // Then
        function onResponse(lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(/^my_other_namespace.my_metric 1 \d+$/);
            done();
        }
    });

    it('should handle empty default config', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        var victim = new Client({
            systemStats: false,
            transport: 'udp',
            port: udpPort,
            flushSize: 1,
            default: {}
        }, logger);

        // When
        victim.put('my_metric', 1);

        // Then
        function onResponse(lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(/^application.my_metric 1 \d+$/);
            done();
        }
    });

    it('should instantiate client without logger', function (done) {
        // Given
        udpServer.start(udpPort, '127.0.0.1', null, onResponse);

        var victim = new Client({
            systemStats: false,
            transport: 'udp',
            port: udpPort,
            flushSize: 1
        });

        // When
        victim.put('my_metric', 1);

        // Then
        function onResponse(lines) {
            udpServer.stop();

            expect(lines.toString()).to.match(/^application.my_metric 1 \d+$/);
            done();
        }
    });

    it('should throw when aggregation frequency configuration is invalid', function () {
        var conf = {
            systemStats: false,
            transport: 'udp',
            port: udpPort,
            flushSize: 1,
            default: {
                counter: {
                    aggFreq: {}
                }
            }
        };

        expect(Client.bind(Client, conf)).to.throw('Metric type configuration is invalid, please read the documentation');
    });

    it('should throw when aggregation configuration is invalid', function () {
        var conf = {
            systemStats: false,
            transport: 'udp',
            port: udpPort,
            flushSize: 1,
            default: {
                counter: {
                    agg: {}
                }
            }
        };

        expect(Client.bind(Client, conf)).to.throw('Metric type configuration is invalid, please read the documentation');
    });

    it('should throw when tag configuration is invalid', function () {
        var conf = {
            systemStats: false,
            transport: 'udp',
            port: udpPort,
            flushSize: 1,
            default: {
                counter: {
                    tags: []
                }
            }
        };

        expect(Client.bind(Client, conf)).to.throw('Metric type configuration is invalid, please read the documentation');
    });

    it('should throw when aggregation type is invalid', function () {
        var conf = {
            systemStats: false,
            transport: 'udp',
            port: udpPort,
            flushSize: 1,
            default: {
                counter: {
                    agg: ['sum', 'non existent']
                }
            }
        };

        expect(Client.bind(Client, conf)).to.throw('Metric type configuration is invalid, please read the documentation');
    });

    /*it('should log metrics when dryRun is activated (aggregated and non aggregated metrics)', function (done) {
        // Given
        httpsServer.start(httpPort, '127.0.0.1', {});

        var victim = new Client({
            systemStats: false,
            transport: 'http',
            api: apiConf,
            flushSize: 2,
            dryRun: true
        }, logger);

        sinon.spy(victim.logger, "debug");

        // When
        victim.put('my_metric', 1);
        victim.aggregatedPut('my_metric', 1, 'avg', 60);

        // Then
        expect(victim.logger.debug.getCall(0).args[0]).to.match(/^Flushing metrics \(non aggregated\): application.my_metric 1 \d+$/);

        httpsServer.stop();
        victim.logger.debug.restore();
        done();
    });*/

    it('should send uncompressed aggregated metrics of same agg and aggFreq through HTTPS', function (done) {
        // Given
        httpsServer.start(httpPort, '127.0.0.1', onResponse);

        var victim = new Client({
            systemStats: false,
            transport: 'http',
            api: apiConf,
            flushSize: 2
        }, logger);

        // When
        victim.aggregatedPut('my_metric1', 1, 'avg', 60);
        victim.aggregatedPut('my_metric2', 1, 'avg', 60);

        // Then
        function onResponse(lines) {
            httpsServer.stop();

            expect(lines.toString()).to.match(/^application\.my_metric1 1 \d+\napplication\.my_metric2 1 \d+$/);
            done();
        }
    });

    it('should send compressed aggregated metrics of same agg and aggFreq through HTTPS', function (done) {
        // Given
        httpsServer.start(httpPort, '127.0.0.1', onResponse, 201, true);

        var victim = new Client({
            systemStats: false,
            transport: 'http',
            api: apiConf,
            compression: true,
            flushSize: 2
        }, logger);

        // When
        victim.aggregatedPut('my_metric1', 1, 'avg', 60);
        victim.aggregatedPut('my_metric2', 1, 'avg', 60);

        // Then
        function onResponse(lines) {
            httpsServer.stop();

            expect(lines.toString()).to.match(/^application\.my_metric1 1 \d+\napplication\.my_metric2 1 \d+$/);
            done();
        }
    });
});