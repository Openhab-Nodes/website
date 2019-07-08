+++
title = "Develop IO Services"
author = "David Graeff"
weight = 52
tags = []
+++

An IO Service Addon exposes Things and Thing Channels, making them accessible for other services or home automation systems. An example might be a http REST-like interface to control Things, start and create scenes and setup alarms.
This chapter outlines all operations to archive this.

## IO Service Entities

An IO Service may support and may be able to differentiate between multiple access roles or user accounts. Those are either maintained by the service, for example by providing configuration options to create, edit, modify IO Service User accounts or by using the OHX user system.

Hue Emulation Example
: An example is the Hue Emulation IO Service. A Hue App needs to pair with the bridge, or in this case OHX. On the <a class="demolink" href="">Maintenance</a> page in **Setup &amp; Maintenance** you find the *Hue Emulation IO Service* in the left side menu. On that configuration screen you can enable pairing and link created "API tokens" to real OHX users.

OHX App + Dashboard Example
: You need to login as one of the OHX users before you can use the OHX App or Dashboard. The corresponding WebThings IO Service can therefore associate each command and Thing State query with an account.

## Querying Things and Rules

Thing and Thing Channel States as well as Rules are sensitive information. A user may choose to not share everything with an IO Service. For example if just  lightbulbs should be exposed to Amazon Alexa and not the electronic door lock. Or if a guest user account should be able to switch lightbulbs but not other appliances.

All-in is not idiomatic
: For accessing Things, Thing States, Rules and Rule States the THINGS, THINGS_STATES, RULES, and RULES_STATES permission could be acquired. This is *not* the idomatic way for an IO Service and will result in a massive privacy warning notification during addon installation.


If you implement an IO Service, you must always provide means to link or map your "IO Service Users" to OHX accounts. Interally your service will use a "default" IO Service user, if your service does not have the concept of users or access tokens. More to this in a moment. `libAddon` provides helper methods.

Instead, you register for Thing State and Rule 

## IO Service Filter

