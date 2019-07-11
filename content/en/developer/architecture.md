+++
title = "openHAB X Architecture"
author = "David Graeff"
weight = 20
tags = []
+++

This chapter talks about the general architecture of openHAB X and how services interact with each other. This overview provides an insight on what technologies and protocols are used in which situations and also talks about alternatives when appropriate. openHAB X generally tries to use as much already existing solutions as possible, as long as those somehow fit into the OHX [design principles](/developer/design_principles).

To get a general idea of all involved components, let's have a look at the following picture.

.................

openHAB X makes use of some external services. The state database is a REDIS instance. The historic state database an InfluxDB 2 instance. Users are stored and retrieved via the [LDAP interface](https://en.wikipedia.org/wiki/Lightweight_Directory_Access_Protocol). OHX comes with the lightweight ldap service [GlAuth](https://github.com/glauth/glauth) for this reason. All other services are called OHX Core Services and are introduced in the next few sections. You find in-depth discussions and API usage examples in separate chapters.

## IPC / RPC: Interprocess Communication

openHAB X follows a microservices architecture. Services interact via remote procedure calls with each other. gRPC with protobuf has been chosen as the interprocess protocol and mechanism.

## API Gateway / Reverse Proxy

Each service in openHAB X implements its own http based management API as http+websockets.

The only process however that exposes ports in a standard installation (without an MQTT Broker etc) is the **API Gateway** process. It exposes an http (80), https (430) port supporting http1 and http2 including websockets and proxies calls to the respective service.

It implements rate limiting to circumvent DDOS attacks. 

A service, but also an addon, can register an http endpoint (like for example "/api" for the hue emulation IO Service). Services with a higher ranking are preferred for the same endpoint request over services with a lower ranking. The user can influence service rankings, system services have the highest.

The API Gateway is also a static file server for web-based user interfaces. It serves interfaces under `/static/ui/{interfacename}`. The **Setup &amp; Maintenance** interface is served as the root http endpoint, but lists all other interfaces on its home page.

## Addons &amp; Addon Manager

An Addon in OHX may consist of multiple processes (services), but at least one is an isolated process that registers itself to the **AddonsManger** service and implements one or more interfaces ("binding", "IO Service"). Addon processes are untrusted processes. Therefore they do not have direct access to the state database (Redis) or historic state database (InfluxDB) and communicate via a proxy process (**StateProxy**). *StateProxy* allows to install filters to limit Thing and Thing State exposure.

For easy distribution and enhanced resource control as well as enforcing security features, Addon processes are bundled and running as *software containers*. A set of containers is called a *Pod*.

{{< callout title="Containers" type="info" >}}
A **container** is a standard unit of software that packages up code and all its dependencies so the application runs quickly and reliably from one computing environment to another. Containers are not virtual machines! A container process can be easily restricted in its resource usage, including main memory, cpu time, disk and network access as well as direct hardware control. A known container implementation is {{< details title="Docker" maxwidth="500px" >}}
Docker is just one of many container engines. OHX uses vendor neutral software containers, defined by the OCI.

The Open Container Initiative (OCI), founded by Docker, is a Linux Foundation project to design open standards for operating-system-level virtualization, most importantly containers.
{{< /details >}}.
{{< /callout >}}


A container is first of all like any other executable. It requires enviroment variables, command line arguments and configuration to work properly. openHAB X uses the [Kubernetes Objects](https://kubernetes.io/docs/concepts/overview/working-with-objects/kubernetes-objects/) Yaml file format. It is a wide spread file format to describe how to start one or multiple containers in regard to exposed network ports, storage requirements and access to host hardware. The addons chapter, more specifically [Metadata & Prepare For Publishing](/developer/addons/#metadata-amp-prepare-for-publishing) guides through all the details concerning this file. An alternative would have been Docker-Compose, which is not vendor-neutral though.

The addon manager process maintains a list of registered and running addons. It also talks to [podman](https://podman.io/), the daemonless container engine that is used together with openHAB X, for starting installed addons.

In most cases your Addon consists of exactly one container, which runs software that is linked to `libAddon`. Sometimes you might require additional external services, like a database. This is when you have more than one container running.

To understand how an Addon communicates with OHX, have a look at the following figure and focus on the top, left box first.

<div class="text-center">
<img src="/img/doc/addon-container.svg" class="w-100 p-3">
</div>

1. Your Addon registers to *AddonsManager*. The *AddonsManager* will in turn request service tokens from the `IAM` service (not shown in the picture).
2. The *AddonsManager* will start a dedicated process, the *StateProxy* which is equipped with access tokens for the *State Database (Redis)* and the *Historic State Database (InfluxDB)*.
3. `libAddon` will communicate with the *StateProxy* for querying and listening to Thing and Rule states (current and historic).
3. `libAddon` will push Thing and Thing Channel state updates to *StateProxy* which in turn pushes changes to Redis and InfluxDB.
4. `libAddon` will communicate with the *Command Queue* service for issuing commands.

We refine this model in the dedicated sections about binding and IO Service development in the [Addons](/developer/addons) chapter.

Web-based User interfaces, bundled as npm package, are also installed via the Addon Manager, but do not interface with the service at all. They are hosted by the *API Gateway* service as mentioned earlier.

## Configuration Storage

Configuration in openHAB X is Service configuration, Inbox accepted Things, Manually configured Things, Rules, Rule Templates.

Configuration happens in *Namespaces*. Each addon and each service gets its own namespace and has **no** access to configuration in any other namespace. An exception is, if the CONFIG_ALL permission has been acquired by a service.

This is implemented via software [container volumes](https://docs.docker.com/storage/volumes/), pointing each to a subdirectory of `${OHX_HOME}/config`. Configuration of the namespace "addon-zwave" for instance can be found in `${OHX_HOME}/config/addon-zwave`.

Standalone
: In a standalone installation, the operating systems filesystem is immutable, including the `/etc` directory. An overlayfs is mounted, using files residing in the openHAB X configuration storage under the namespace "os-etc". Most importantely this includes Wifi and Network Configuration (networkmanager) and Supervisior configuration (systemd).

Checkpoints & Restore
: openHAB X supports configuration checkpoints and restoring. Git is used to archive a specific point in time. Git remotes can be added in the **Backup &amp; Restore** service. Automatic commits are performed every 24 hours and if remotes are added and credentials are present, automatic pushes happes as well. Creating a configuration checkpoint means git tagging. Restoring means checking out a previous tag.

This architecture allows to synchronize openHAB X instances. If the periodic git commit and push cycle is not instant enough, GlusterFS or a similar scalable network filesystem works.

## Identity and Access Management (IAM)

There are great, advanced, maintained and open source solutions for identity and access management like [Keycloak](https://www.keycloak.org/). Unfortunately those solutions are not really scaling down to a few megabyes of memory usage with an estimated user count of 1 or 2 per installation. Keycloak for example is a Java application, meaning that a jvm need to be loaded as well.

Requirements for this service are:

* Interprocess / service authentication, including scopes / permissions
* Revokable access tokens
* User database, holding user credentials but also permissions, thing & rules filter and potentially other meta data
* Compatible to an enterprise interface for user management

SAML 2 is too complex and heavy with its big xml SOAP messaging and embedded x509 signatures for openHABs SSO and service authentication. JsonWebTokens (JWT) on top of OAuth 2 are used.

OpenHAB X IAM implements [OpenID Connect Discovery](https://openid.net/connect/) for the idenity broker part with an ldap backend as the credentials database.

IAM is probably the most powerful service. It is responsible for provisioning tokens to all other services and the entire interprocess communication comes to a halt if no tokens or invalid tokens are issued. An attacker that gained access to IAM has basically full control.

Access Tokens in OHX are jwt's (JSonWebToken), meaning a json object that is base64 encoded. Such a token can carry additional information, which is used to communicate connection endpoints (like the Redis DB URL or an Influx DB username+password).

### Securing Core Services

It is generally assumed that the root filesystem and operating system binaries, especially the supervisior one are not compromised. The supervisior process (systemd on the standalone installation) generates a random one-time access token for each core service and passes it via stdin.

The supervisior will start IAM and pass all generated access tokens to it. As mentioned each token is valid for exactly one connection attempt. 

If a core service looses connection to IAM or connection is denied it will quit and the supervisior starts it again with a newly generated token, notifying IAM.

This procedure prevents 3rd party addon processes or other injected services to pretend being a core service and gain access tokens. This procedure does not help if a core service has been taken over by malicous code during runtime.

Each service does only have as much privilege as it needs and runs in a separate software container with limited assigned memory, restricted filesystem access, constant CPU usage and system call monitoring (SELinux).

## Rule Engine

The rule engine service is responsible for executing rules. The service caches rules (up to 10 MB) and keeps its cache coherent via filesystem change notifications. It runs a configurable thread pool with a default set of 5 threads, meaning 5 rules can run in parallel. Important to note is that delayed rules are suspended and do not count towards the limit. A *Rule* is generally not assumed to run long, but certain scenarios like a light animation sequence or a file upload might block a rule thread for a good reason.

More information about the rule engine implementation can be found in the [Rule Engine](/developer/ruleengine) chapter.

## State: Redis / InfluxDB Databases

The Redis database is configured for 3 concurrent connections. Redis supports "namespacing"  by numbered "databases". Database 0 is used for general key-value storage. Database 1 for Thing and Rule States.

Because nothing substantial is stored in Redis, persistence is by default turned off.

InfluxDB 2 has a web interface already integrated. It uses the concept of "Dashboard" for grouping multiple metric visualisation together on one screen. For all existing and new OHX user accounts a matching InfluxDB user is created.

IAM additionally maintains temporary users on InfluxDB with restricted table access that it passes on to other services.

Certain dashboards are auto-generated by the *Addon Manager* on start for each user. For example the runtime metrics dashboard for memory, CPU usage, Rule invocations etc. The *Setup & Maintenance* interface allows to "observe" a *Thing* or *Thing Channel*. Observing means that the Thing ID / Thing Channel ID is added to the shared **StateProxy** configuration and a dashboard is created for the currently logged in user.

The supervisior passes the database connection urls and credentials to the IAM service. All services with the STATE permission will get an access token (jwt) that contains the those information.

## Offline voice recognition

Integrating an offline voice recognition service is a bit tedious. That's why OHX focuses on Snips.Ai for now although there are other open source and commercial alternatives on the market.

Snips.Ai components are written in C++, Rust and Go and bundled as software containers. To offer fast recognition speed, Snips.Ai containers have the CPU_FULL and MEMORY_500MB permissions set. You should use microphone arrays that already do pre-processing like noise cancelling to offload work from the CPU.

The home automation "Intents" are installed by default in various languages. The implementation is done via an "IO Service Addon" so that a user can filter and restrict which Things and Rules are exposed to Snips.Ai.

The ecosystem of Snips.Ai also consists of a marketplace for additional "Intents" and "Apps". You may install those, but it is not guaranteed that they survive an OHX update or operating system update.

## Cloud Connector

The *Cloud Connector* is an "IO Service Addon" that exposes your allowed Things, Thing Channels to a Google Firestore database and listens to Firestore Real-Time changes, extracting commands that are send to the *Command Queue* service.

This allows cloud functions on Amazon and Google infrastructure to interact with Amazon Alexa and Google Home in basically real-time.

The *Cloud Connector* also contains *Cloud Backup* which periodically zips your configuration directory, encrypt it and pushes it to the Google Firestore drive.