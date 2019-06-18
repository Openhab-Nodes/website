+++
title = "Developer documentation"
+++

{{< readfile file="developer/_partials/authorsnote.inc" markdown="false" >}}

<p class="p-4">
Welcome to <b>The openHAB X Developer Documentation</b>, an introductory guide to make you familiar with design principles, the project philosophy, overall architecture as well component specific architecture.
</p>

## Who This Guide Is For
This documentation assumes that you’ve written code in another programming language but doesn’t make any assumptions about which one.
We don’t spend a lot of time talking about what programming is or how to think about it. If you’re entirely new to programming, you would be better served by reading a book that specifically provides an introduction to programming first.

You will mostly hear about concepts and architectures. A few examples here and there are given in [Rust](https://doc.rust-lang.org/book), as that is the programming language that all core components are written in.

## How to Use This Guide

In general, this guide assumes no specific reading order. Except the very first chapter about the architecture. Later chapters build on concepts presented in there.

## Design Principles

openHAB X is for developers who crave **efficiency**, **speed**, **security**, **maintainability** and **stability** in a home automation system.

* ***efficiency*** This design principle often collides with security and maintainability. And it is indeed true that a secure design comes first. Often roundtrips, type conversions and additional stress on the operating system in form of fast memory allocations/deallocations can be avoided though. If a refactoring is required to make a component more efficient, so it be!

* ***speed*** If efficiency is considered during development, speed often is inherent. In this context it literally means the measureable speed of for example rule engine rule invocations per second, http API requests per second and so on. Nobody wants to wait 2 seconds for a light to turn on after a switch has been pressed.

* ***security*** openHAB X follows the concept of an API Gateway, eg only one process is accessible to the outside. It acts as a circuit breaker and rate limiter to make the overall system Distributed Denial of Service (DDOS) safe. It also performs authorisation in tandem with the IAM Service. Each component runs in an isolated container with resource limits, capability and write restrictions in place. If you are using the openHAB X distribution, the root filesystem is immutable and only a minimal amount of processes are running.

* ***maintainability***  There are multiple ways how you can archive this goal. This project understands a maintainable component as something that has<br>(1) **documentation**, (2) **unit tests**,  (3) **an integration test**.

* ***stability*** The chosen programming language Rust makes it explicitly hard to leak resources. Because stability is a high good for a home control and automation system, each individual component is required to implement a "/selftest" http endpoint and to be prepared to be killed and restarted ("self-healing") at any time. Strict memory and cpu bounds prevent an unstable overall system if a single component behaves unusually demanding.

Aspects that are nice to have:

* ***scaleability*** The currect architecture allows [limits](/limits).

Non-goals are:

* ***Backwards compatibility*** Each component provides a versioned API and is able to run next to an older variant. As soon as all parts of openHAB X are migrated to a new version, the old component will be decommissioned. All components are versioned according to [Semantic Versioning](https://semver.org/). Supporting multiple versions or keep deprecated code is not a goal.
* ***100% perfect code*** The reason for having unit tests and integration tests is to allow submissions to flow in faster. Peer reviews are only performed to detect malicous code submissions and general bad design decisions. As long as all tests pass and the API stays intact, even less optimal code is accepted, as long as it tries to take account of the mentioned design principles. The reason is that openHAB X components are relatively small in code size and handle specific tasks only on purspose. Parts can be ripped of and reimplemented if necessary.

## Code of Conduct

We are committed to providing a friendly, safe and welcoming environment for all. Please check the [Code of Conduct](/conduct) for more details.

## Chapter summary
<split>


## How to Contribute

openHAB X uses <button class="btn-link contexthelp" id="aboutgit" title="Context help">Git</button> as its version control system and [GitHub](https://www.github.com/openhab-nodes) for hosting the different repositories and source code.

<template data-popover="aboutgit">
<p style="max-width: 500px">
You will get in contact with <i><a href="https://git-scm.com/" target="_blank">Git</a></i> in many places and it makes sense to get yourself familiar with its basic commands and concepts. There are many pages to learn about Git. Try <a href="http://rogerdudler.github.io/git-guide" target="_blank">Git - The Simple Guide</a> as a start. In Git it is common to send *Pull Requests* from your own source code clone back to the official repository.
</p>
</template>
<ui-tooltip target="aboutgit"></ui-tooltip>

We are always thrilled to receive pull requests, and do our best to process them as fast as possible. Not sure if that typo is worth a pull request? Do it! We will appreciate it.

If your pull request is not accepted on the first try, don't be discouraged! If there's a problem with the implementation, hopefully you received feedback on what to improve.

openHAB X consists of various components, organised in multiple repositories.

<table class="table">
<thead>
<tr>
<th>Component</th>
<th>Prog. Lang</th>
<th>GitHub Repository</th>
</tr>
</thead>
<tbody>
<tr>
<td>Android/iOS APP</td>
<td>Dart/Flutter</td>
<td><a href="https://www.github.com/openhab-nodes/mobileapp">https://www.github.com/openhab-nodes/mobileapp</a></td>
</tr>
<tr>
<td>Operating System / openHAB X Distribution</td>
<td>Bash, DockerFile, Buildroot Scripts</td>
<td><a href="https://www.github.com/openhab-nodes/openhabx-os">https://www.github.com/openhab-nodes/openhabx-os</a></td>
</tr>
<tr>
<td>IdentifyAccessManager,<br>StaticFileServe, <br>ReverseProxy/ApiGateway, <br>Status, <br>AddonsManager, <br>InitialUserSetup, <br>ServiceConfig, <br>RulesEngine, <br>ChannelLinks, <br>AddonRegistry, <br>Backup&amp;Restore</td>
<td>Rust</td>
<td><a href="https://www.github.com/openhab-nodes/openhabx-core">https://www.github.com/openhab-nodes/openhabx-core</a></td>
</tr>
<tr>
<td>openHAB Core Shim</td>
<td>Java</td>
<td><a href="https://www.github.com/openhab-nodes/openhab-core-shim">https://www.github.com/openhab-nodes/openhab-core-shim</a></td>
</tr>
<tr>
<td>Addon Connectors: <ul> <li> libAddonOHConnector <li> libAddonWoTConnector</ul></td>
<td>Rust</td>
<td><a href="https://www.github.com/openhab-nodes/openhabx-addon-connectors">https://www.github.com/openhab-nodes/openhabx-addon-connectors</a></td>
</tr>
<tr>
<td>Cloud Connector, Alexa Lambda, Google Home Action</td>
<td>Rust</td>
<td><a href="https://www.github.com/openhab-nodes/openhabx-cloud-connector">https://www.github.com/openhab-nodes/openhabx-cloud-connector</a></td>
</tr>
<tr>
<td>WifiConnectionManager</td>
<td>Rust</td>
<td><a href="https://www.github.com/openhab-nodes/wifi-connection-manager">https://www.github.com/openhab-nodes/wifi-connection-manager</a></td>
</tr>
<tr>
<td>IOServices: <ul> <li> IOHueEmulation <li> IOWebThings </ul></td>
<td>Rust</td>
<td><a href="https://www.github.com/openhab-nodes/openhabx-ioservices">https://www.github.com/openhab-nodes/openhabx-ioservices</a></td>
</tr>
</tbody>
</table>

We’d love to have you contribute, too.
