+++
title = "Design Principles"
author = "David Graeff"
weight = 11
tags = []
summary = "openHAB X is for developers who crave **efficiency**, **speed**, **security**, **maintainability** and **stability** in a home automation system. Read about the design principles and philosophy in this chapter."
+++

openHAB X is for developers who crave **efficiency**, **speed**, **security**, **maintainability** and **stability** in a home automation system.

* ***efficiency*** This design principle often collides with security and maintainability. And it is indeed true that a secure design comes first. Often roundtrips, type conversions and additional stress on the operating system in form of fast memory allocations/deallocations can be avoided though. If a refactoring is required to make a component more efficient, so it be!

* ***speed*** If efficiency is considered during development, speed often is inherent. In this context it literally means the measureable speed of for example rule engine rule invocations per second, http API requests per second and so on. Nobody wants to wait 2 seconds for a light to turn on after a switch has been pressed. The projects [benchmark suite](/benchmark) is perdiodically used to find regressions.

* ***security***
   - Reduce attack space (open ports, reachable services) to the maximum. openHAB X follows the concept of an API Gateway, eg only one process (exlucing the MQTT Broker and other external services here) is accessible to the outside. It acts as a **circuit breaker** and **rate limiter** to make the overall system Distributed Denial of Service (DDOS) safe. It also performs **authorisation** in tandem with the IAM Service.
   - Isolation. Each component runs in an isolated container with resource limits, capability and write restrictions in place. If you are using the openHAB X distribution, the root filesystem is immutable and only a minimal amount of processes are running.<br><br>
* ***maintainability***  There are multiple ways how you can archive this goal. This project understands a maintainable component as something that has<br>(1) **a well-defined, semantically versioned and documented API**, (2) **unit tests**,  (3) **an integration test**.

* ***stability*** The chosen programming language Rust makes it explicitly hard to leak resources. Because stability is a high good for a home control and automation system, each individual component is required to implement a "/selftest" http endpoint and to be prepared to be killed and restarted ("self-healing") at any time. Strict memory and cpu bounds prevent an unstable overall system if a single component behaves unusually demanding.

Aspects that are nice to have:

* ***scaleability*** The currect architectures limits are defined by the filesystem write speed (for configuration changes), network interface and memory speed (for configuration descriptions) and REDIS database speed (Thing and Channel states). Historic thing and channel states are stored to a RefluxDB. REDIS and RefluxDB are horizontally scalable and *etcd* or other distributed key-value / file services can be used for configurations. 

Non-goals are:

* ***Backwards compatibility*** Each component provides a versioned API and is able to run next to an older variant. As soon as all parts of openHAB X are migrated to a new version, the old component will be decommissioned. All components are versioned according to [Semantic Versioning](https://semver.org/). Supporting multiple versions or keep deprecated code is not a goal.
* ***100% perfect code*** The reason for having unit tests and integration tests is to allow submissions to flow in faster. Peer reviews are only performed to detect malicous code submissions and general bad design decisions. As long as all tests pass and the API stays intact, even less optimal code is accepted, as long as it tries to take account of the mentioned design principles. The reason is that openHAB X components are relatively small in code size and handle specific tasks only on purspose. Parts can be ripped of and reimplemented if necessary.
