+++
title = "Design Principles"
author = "David Graeff"
weight = 11
tags = []
summary = "openHAB X is for developers who crave **efficiency**, **speed**, **security**, **maintainability** and **stability** in a home automation system. Read about the design principles and philosophy in this chapter."
+++

openHAB X is for developers who crave **efficiency**, **speed**, **security**, **maintainability** and **stability** in a home automation system.

{{< col3md class="mx-md-4 mb-4" >}}

#### Efficiency
This design principle often collides with security and maintainability. And it is indeed true that a secure design comes first.

Often roundtrips, type conversions and additional stress on the operating system in form of fast memory allocations/deallocations can be avoided though.

If a refactoring is required to make a component more efficient, so it be!

<split>
#### Speed

In this context it literally means the measureable speed. Nobody wants to wait 2 seconds for a light to turn on after a switch has been pressed.  

If efficiency is considered during development, speed is often inherent. 

The projects [benchmark suite](/benchmark) is perdiodically used to find regressions of for example rule engine rule invocations per second and http API requests per second.


<split>
#### Stability
Stability is a high good for a home control and automation system.

Each individual component is required to implement a selftest and to be prepared to be killed and restarted ("self-healing") at any time.

Strict memory and cpu bounds prevent an unstable overall system if a single component behaves unusually demanding.

Core components must be developed in a programming language that enforces object lifetime awareness.

{{< /col3md >}}

{{< col3md class="mx-md-4 mb-4" >}}

#### Security
The attack space need to be minimal.
An API Gateway concept exposes only one process to the outside (except additional services with own security concepts). It acts as a **circuit breaker** and **rate limiter** to help mitigate Distributed Denial of Service (DDOS) attacks. 

Each component runs in an isolated container with resource limits, capability and write restrictions in place. The root filesystem is assumed to be immutable.
<split>
#### Maintainability

There are multiple ways how you can archive this goal. This project understands a maintainable component as something that has

(1) a well-defined, semantically versioned and documented API,<br>
(2) unit tests,<br>
(3) an integration test.
<split>

#### Reuse

A few projects suffer from the Not-Invented-Here syndrom. openHAB X strives to use other stable software whenever possible.

Storing state is best done in a [Redis Key-Value Database](https://redis.io) for example.

Storing, compressing and visualising historic state is what [Influx Time Series Database](https://influxdata.com) is best known for.
{{< /col3md >}}

## Non obligatory

Some design principles are more of a guideline than obligatory.

{{< col3md class="mx-md-4 mb-4" >}}

#### Scaleability

The current architecture is scalable and new services should always be designed in a scalable fashion if possible.

The filesystem write speed (for configuration changes), network interface and memory speed (for configuration descriptions) and REDIS database speed (Thing and Channel states) define the limits of the current architecture. Interprocess communication is implemented via gRPC and allows core services and addons to run distributed.

{{< /col3md >}}

## Non-goals

{{< col3md class="mx-md-4 mb-4" >}}

#### Backwards compatibility

Providing Long-Term-Stability variants binds developer resources that are rather spend in integrating new solutions and improving existing ones. openHAB X follows a fast-phase-out strategy.

Each component provides a versioned API and is able to run next to an older variant. As soon as all parts of openHAB X are migrated to a new version, the old component will be decommissioned.

Components are versioned according to [Semantic Versioning](https://semver.org/).

Supporting multiple versions or keep deprecated code is not a goal.
<split>

#### Perfect Code

A contribution is **required** to include unit tests and, if necessary, integration tests. That way we can automatically make sure that a software piece works under specified use-cases.

OpenHAB X components are small in code size and are written in a language (Rust) that prevents wrong memory handling in most cases (crashes).

As long as all tests pass and the API stays intact, even less optimal code is accepted. It can easily be identified and replaced with better code.
{{< /col3md >}}
