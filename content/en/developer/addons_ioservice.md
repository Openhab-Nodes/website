+++
title = "Develop IO Services"
author = "David Graeff"
weight = 52
tags = []
+++

An IO Service Addon exposes Things and Thing Channels, making them accessible for other services or home automation systems. An example might be a http REST-like interface to control Things, start and create scenes and setup alarms.
This chapter outlines all operations to archive this.

## Register as IO Service

One of the first things you should do is to register your process as an *IO Service*.
The example below registers a service with a few callbacks, that are explained in the following sections.


<div class="mb-2">
	<tab-container>
		<tab-header>
			<tab-header-item class="tab-active">Rust</tab-header-item>
		</tab-header>
		<tab-body>
<tab-body-item >{{< md >}}
``` rust
use ohx::{ioservice};

// ...

fn main() {
    // ...
    // Create registration builder.
    let builder = ioservice::registration_builder::new();
    // Set all mandatory and optional arguments.
    // ...
    // Register service
    ioservice::register(builder.build());
}
```
{{< /md >}}</tab-body-item >
		</tab-body>
    </tab-container>
</div>

## Querying Things and Rules

Thing and Thing Channel States as well as Rules are sensitive information. A user may choose to not share everything with an IO Service. For example if just lightbulbs should be exposed to Amazon Alexa and not the electronic door lock. Another example is a guest account for switching lightbulbs but not other appliances.

For accessing Things, Thing States, Rules and Rule States the THINGS, THINGS_STATES, RULES, and RULES_STATES permission could be acquired. This is *not* the idomatic way for an IO Service and will result in a big privacy warning notification during addon installation.

Instead, you install an IO Service Filter and query for Thing, Thing Channel and Rule State changes.

<div class="mb-2">
	<tab-container>
		<tab-header>
			<tab-header-item class="tab-active">Rust</tab-header-item>
		</tab-header>
		<tab-body>
<tab-body-item >{{< md >}}
```rust
use ohx::{ioservice, users, Connector};

fn filter_installed(addon_connector:&mut Connector, filter: &ioservice::filter, user: &users:user) {
    // Get all things with thing channels
    let things = filter.get_things();
    // Get a stream of things with thing channels and all future changes
    filter.query_things();
}

fn filter_removed(filter: &ioservice::filter, user: &users:user) {
    
}

fn main() {
    // ...
    // Set all mandatory and optional arguments.
    builder = builder.withFilterCallbacks(&filter_installed, &filter_removed);
    // ...
}
```
{{< /md >}}</tab-body-item >
		</tab-body>
    </tab-container>
</div>


## IO Service Filter

An IO Service Filter connects to the *Thing / Rule State* service and is configured by the user with "forwarding" rules, not much different than a software firewall.

{{< mermaid align="left" context="ioservice_input">}}
graph LR;
	thing_state(Thing / Rule State Service) --> 
    thing_state -->|Command| filter<IO Service Filter)
	filter --> service[IO Service]
{{< /mermaid >}}

An IO Service may only send commands to the *Rules* service or the *AddonManager* (via the *Command Queue*) when the filter passes.

{{< mermaid align="left" context="ioservice_commands">}}
graph LR;
    service[IO Service] -->|Command| filter<IO Service Filter)
	filter --> queue(Command Queue)
	queue --> thing_state(Addon Manager)
	queue --> rule_engine(Rule Engine)
{{< /mermaid >}}

## IO Service Access Entities

An IO Service Filter is always linked to a "user", may it be an OHX user account or an IO Service managed "user" or access token. Those could be provided via configuration options to create, edit, modify IO Service accounts/tokens.

Own Access Roles Implementation Example
: An example is the Hue Emulation IO Service. A Hue App needs to pair with the bridge, or in this case OHX. On the <a class="demolink" href="">Maintenance</a> page in **Setup &amp; Maintenance** you find the *Hue Emulation IO Service* in the left side menu. On that configuration screen you can enable pairing. Each device that connects in that time period is assigned to the selected or just created "API Token". This way you can restrict each paired device to an own set of Things and Rules.

OHX App + Dashboard Example
: You need to login as one of the OHX users before you can use the OHX App or Dashboard. The corresponding WebThings IO Service can therefore associate each command and Thing State query with an account. You use the normal user account restriction mechanisms if you want to limit a users capabilities.

### OHX Accounts 

If you use the OHX account system, there is not much you need to do. IO Service Filters will be created automatically for all existing and new users and will also be removed automatically when the user account disappears.

### Own Access Management

You need to register your own access manager in the registration call.


<div class="mb-2">
	<tab-container>
		<tab-header>
			<tab-header-item class="tab-active">Rust</tab-header-item>
		</tab-header>
		<tab-body>
<tab-body-item >{{< md >}}
```rust
use ohx::{ioservice, users};

struct User {
    api_token: String;
    name: String;
}

struct AccessManager {
    users: Vec<User>;
}

impl ioservice::AccessManager for AccessManager {
    // ...
}

fn main() {
    let accessManager = AccessManager:new();
    // ...
    // Set all mandatory and optional arguments.
    builder = builder.withAccessManagement(accessManager);
}
```
{{< /md >}}</tab-body-item >
		</tab-body>
    </tab-container>
</div>

Whenever you create a user, edit a user or remove a user, you must inform the framework. The framework will create / remove IO Service Filters in turn and call you back if you have filter callbacks registered as in the code example of the previous section.
