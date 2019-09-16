+++
title = "Data History / Runtime Metrics"
author = "David Graeff"
weight = 30
tags = []
+++

Collecting runtime metrics is an important factor to evaluate stabilty and detect unusual service behaviour. OHX uses the [Influx Database](https://www.influxdata.com/). 
InfluxDB is a time-series database that can handle millions of data points per second and is able to compact data to minimize storage space.

This chapter introduces into OHX predefined metrics and how to use the API. OHX also stores Thing time-series data (eg the Thing state over time) for opt-in Things in the same database.

## About InfluxDB

InfluxDB uses *Retention Policies* to automate downsampling and data expiration processes. Downsampling means keeping high-precision raw data for a limited time and storing the lower-precision, summarized data for much longer.

Prometheus metric scraping is integrated, which makes InfluxDB compatible to all services that export in the Prometheus format like [etcd](https://github.com/coreos/etcd/blob/master/Documentation/metrics.md) and Kubernetes. Services that are interesting in the area of home automation might not export in Prometheus format yet, but chances are high that a *Prometheus Exporter* has been developed like for example for the MQTT Broker Mosquitto: [Mosquitto Exporter](https://github.com/sapcc/mosquitto-exporter).

OHX encourages Addon developers to use the `libAddon` library and core service developers to use `libRuntimeMetrics` for metrics data pushing. OHX libraries communicate with InfluxDB natively.

A web interface and web APIs are integrated into InfluxDB. It uses the concept of "Dashboards" for grouping and visualizing multiple metrics together. 

## OHX Core Services

Core services have access tokens for InfluxDB and can push metrics as well as query data. The Rust library `libRuntimeMetrics` allows to easily post metrics to the database.

The IAM service will configure InfluxDB on startup, making sure that a "system" user is available. Runtime metrics as well as Thing time-series data are stored on the InfluxDB "system" account.

## Addons

Because of security concerns, addons are not allowed to access InfluxDB directly. But they may export data in Prometheus format and push metrics. The `libaddons` library helps to easily push metrics to the database.

Addons may provide own InfluxDB 2 compatible Dashboards and can push those via `libAddons` to the database. Because Addons do not have access tokens, `libAddons` will communicate via the *StateProxy* service to InfluxDB.
