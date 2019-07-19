+++
title = "Data History / Runtime Metrics"
author = "David Graeff"
weight = 30
tags = []
+++

This chapter is about collecting runtime metrics.

InfluxDB 2 has a web interface already integrated. It uses the concept of "Dashboard" for grouping multiple metric visualisation together on one screen. For all existing and new OHX user accounts a matching InfluxDB user is created.

## Pushing a Runtime Metric to InfluxDB

Because of security concerns, addons are not allowed to access InfluxDB directly. Instead addons use `libaddons` API which communicates via the *StateProxy* service to InfluxDB.

Addons may provide own InfluxDB 2 compatible Dashboards and can push those via `libAddons` to the database.

......

Core services interact with InfluxDB directly via `libRuntimeMetrics` after they have obtained an access token from IAM.

......