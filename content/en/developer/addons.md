+++
title = "About Addons"
author = "David Graeff"
weight = 50
tags = []
+++

Developing an Addon for openHAB X is not complicated.
Programming libraries are provided for Rust, C++, Java and NodeJS.

This chapter sheds some light on what addons actually are and introduces into addon development. It starts with how to setup your development environment and refers to the various *template* repositories that allow you to easily clone example code.

This text assumes that you know how to open and operate a terminal, because for brevity reasons only command line instructions are given.

## Home Automation Framework n+1

There are a few other open source Home Automation software frameworks out there. Most of them don't meet the high stability and performance standards of OHX, still developing an Addon for OHX shouldn't feel like developing for the n+1 framework.

An idiomatic OHX Addon follows standards whenever possible and runs as an autonomous process, making it hopefully easy to integrate it with other frameworks if necessary.


{{< colpic ratio="50" left="mx-2" right="mx-2" >}}

{{< imgicon src="fas fa-asterisk" height="30px" caption="**Meta Data**" >}}

**Configuration Descriptions** are expressed as [JSonSchema](https://json-schema.org/) &amp; [UISchema](https://github.com/mozilla-services/react-jsonschema-form/blob/master/docs/form-customization.md). Those are used to automatically generate configuration forms.

**Things Declaration** happens via [Web Thing Descriptions](https://w3c.github.io/wot-thing-description/).

This meta data can be transformed into other frameworks formats like [openHABs ThingTypes](https://www.openhab.org/docs/developer/bindings/thing-xml.html).

<split>

{{< imgicon src="fas fa-exchange-alt" height="30px" caption="**Thing States**" >}}

Addon and Thing States are by default published via interprocess communication, gRPC to be precise.

`libThingState` can be swapped with an implementation that instead publishes to MQTT or via the http and websocket based [Web Things API](https://iot.mozilla.org/wot/) for example.

{{< /colpic >}}

## Setting up the development enviroment

This guide assumes that you develop with an Integrated Developer Enviroment (IDE).<br>
A recommended one is [Visual Studio Code](https://code.visualstudio.com/).

The source code of openHAB X is hosted on https://www.github.com. Respective repositories are referenced further down. To retrieve the source code, you either download zipped archives or `git clone` repositories via [git](https://git-scm.com/) (recommended).

Depending on your your target programming language you need to install the required compiler or development runtime.

<div class="mb-2">
	<tab-container>
		<tab-header>
			<tab-header-item class="tab-active">Rust</tab-header-item>
			<tab-header-item>Go</tab-header-item>
			<tab-header-item>C++</tab-header-item>
			<tab-header-item>NodeJS</tab-header-item>
			<tab-header-item>Java</tab-header-item>
		</tab-header>
		<tab-body>
			<tab-body-item >
{{< md >}}
Rust 1.34+ is required. Install via [rustup](https://rustup.rs/) for example.

See https://marketplace.visualstudio.com/items?itemName=rust-lang.rust for the Visual Studio Code extension.

Clone the repository at https://www.github.com/openhab-nodes/addon-rust.

Command line: Change to the desired example directory and start with `cargo run`.
{{< /md >}}
			</tab-body-item>
			<tab-body-item >
{{< md >}}
[Go 1.10+](https://golang.org/) is required.

See https://code.visualstudio.com/docs/languages/go for the Visual Studio Code extension.

Clone the repository at https://www.github.com/openhab-nodes/addon-go.

Command line: Change to the desired example directory and start with `go run src/main.go`.
{{< /md >}}
			</tab-body-item>
			<tab-body-item >
{{< md >}}
A C++17 capable compiler like g++7, clang or others is required. The buildsystem is [CMake](https://cmake.org/).
Additional libraries like for networking https://github.com/Qihoo360/evpp are downloaded during build.

See https://code.visualstudio.com/docs/languages/cpp for the Visual Studio Code extension.

Clone the repository at https://www.github.com/openhab-nodes/addon-cpp.

Command line: Change to the desired example directory and start with `cmake -S . -B build && cmake --build build --target addon --config Debug && ./build/addon`.
{{< /md >}}
			</tab-body-item>
			<tab-body-item >
{{< md >}}
[NodeJS](https://nodejs.org/) 10+ including the Node Package Manager (npm) is required.

Visual Studio Code supports Javascript development out of the box.

Clone the repository at https://www.github.com/openhab-nodes/addon-nodejs.

Command line: Change to the desired example directory and start with `npm run start`.
{{< /md >}}
			</tab-body-item>
			<tab-body-item >
{{< md >}}
The Java Development Kit (JDK) 8 or newer is required, for example from Oracle: [Oracle JDK 8](http://www.oracle.com/technetwork/java/javase/downloads/jdk8-downloads-2133151.html).

[Gradle](https://gradle.org/) is the build system tool.

See https://code.visualstudio.com/docs/languages/java for the Visual Studio Code extension.

Clone the repository at https://www.github.com/openhab-nodes/addon-java.

Command line: Change to the desired example directory and start with `gradle && java -jar ./target/addon.jar`.
{{< /md >}}
			</tab-body-item>
		</tab-body>
	</tab-container>
</div>

At this point in time you are already able to edit and play around with the example addons.
To start your own addon, you first define required metadata and configuration descriptions.
That is what the next sections are about.

### Test without Containers

Addons and also openHAB X core services are bundled into software containers for distribution and execution. Containers are explained in a later section.

For running an addon in a debug session, containers are not recommended. The interaction between the debugger and the encapsulated addon container process might be interfered by the operating system. Instead:

1. Execute `sh ./start_all.sh` of the [core repository](https://www.github.com/openhab-nodes/core) on the command line to start openHAB X.
2. Start your Addon (or an example Addon) via the command line given above, like `cargo run` for a Rust addon or `npm run start` for NodeJS orr use the respective debugger to start the process.

### Test With Production OHX

It is possible to run your addon on your developer machine and have your (production) OHX installation running on a different system.

For this to work, you first need to create an access token on the <a class="demolink" href="">Maintenance</a> page with the "REMOTE_ADDON" permission. Add additional permissions as needed. 

Start your addon with the environment variable `REMOTE_OHX=192.168.1.11` set (change the IP accordingly) and the environment variable `REMOTE_OHX_ACCESS` should be set to your token, like `REMOTE_OHX_ACCESS=e5868ebb4445fc2ad9f9...49956c1cb9ddefa0d421`.

The addon **should** report that it will attempt to connect to a remote instance.
Depending on the granted permissions you will have access to Things, Thing States, Thing States history, the user database etc.

{{< callout type="warning" >}}
Please note, that the configuration and Addon Things are stored on the remote OHX installation.
{{< /callout >}}

{{< callout type="info" >}}
As long as you do not grant full cpu, memory and disk quota permissions, it is generally safe to develop an addon with your production OHX. It is almost impossible to break anything or render the installation unstable.
{{< /callout >}}

## Addon Types

Addons can be categorized into two main purposes.

{{< colpic ratio="50" left="mx-2" right="mx-2" >}}

{{< imgicon src="far fa-lightbulb" height="50px" caption="**Binding**" >}}

An Addon that integrates external services, hardware or devices is called a Binding. Related service interfaces are: The discovery service interface ("*Inbox*") and the Things interface.

The [Binding](/developer/addons_binding) chapter contains all the details.

<split>

{{< imgicon src="fas fa-exchange-alt" height="50px" caption="**IO Service**" >}}

An IO Service is a type of Addon that exposes Things and Thing States. May it be via an http interface for mobile Apps or HomeKit or for example the Hue protocol for Hue Apps.

The [IO Service](/developer/addons_ioservice) chapter contains all the details.

{{< /colpic >}}

## Addon Registration

One of the first things you do is to register your process as an Addon.
The **Addon Manager** will record your process id and container id and the IAM service will use those immutable data for granting further permission based access.

If you have a `static/` directory, that will also be examined during the registration process. See the [User Interfaces](/developer/frontend_apps) chapter for more information on what the static directory is used for.

The example below registers a service with some optional callbacks.

<div class="mb-2">
	<tab-container>
		<tab-header>
			<tab-header-item class="tab-active">Rust</tab-header-item>
		</tab-header>
		<tab-body>
<tab-body-item >{{< highlight rust "linenos=table" >}}
use ohx::{Addon, AddonContext, ProgressReport, Result};

// Called when upgraded by the framework
fn upgraded(ctx: &AddonContext) -> Result<()> {
    Ok()
}

// Called when freshly installed
fn installed(ctx: &AddonContext) -> Result<()> {
    Ok()
}

// Called when about to be removed
fn remove(ctx: &AddonContext, progress: &ProgressReport) -> Result<()> {
    Ok()
}

fn main() {
    // Create registration builder.
    let builder = Addon::registration_builder::new("");
    // Set all mandatory and optional arguments.
    builder = builder.with_upgraded_cb(&upgraded).with_installed_cb(&installed).with_remove_cb(&remove)
    // Register service
    let ctx: AddonContext = Addon::register(builder.build()).unwrap();
}
{{< /highlight >}}</tab-body-item >
		</tab-body>
    </tab-container>
</div>

The `remove` callback allows you to block the removal process for up to 5 minutes for clean up or backup up purposes. You must post a progress update during that time with no more than 30 seconds between each report. As soon as you have posted a 100% progress update, your addon will be shut down and removed. You cannot dismiss the users removal request.

## Addon Actions & Events

Addons should not expect users to skim through log files to identify issues or require a user interaction.

An Addon should use the *Events* API for user interaction. An Addon should NOT use events to show debug information or everything that rather goes into the log.

**Setup &amp; Maintenance** lists all possible actions of an Addon on the respective Addon page and also displays incoming Addon Events. Events have a lifetime and are stored by openHAB X for that time. Received Evenets can be listed on the <a href="" class="demolink">Addon</a> page.

Events and Actions are registered during the addon registration phase.

<div class="mb-2">
	<tab-container>
		<tab-header>
			<tab-header-item class="tab-active">Rust</tab-header-item>
		</tab-header>
		<tab-body>
<tab-body-item >{{< highlight rust "linenos=table" >}}
use ohx::{Addon, AddonContext, ProgressReport, Result, Action, Event};

fn do_something_action(ctx: &AddonContext, action: &Thing::Action) {
}

fn main() {
    let action_doit = Action::new("do_something")
      .handler(&do_something_action)
      .title(langtag!(en), "Amazing Action")
      .description(langtag!(en), "A description of the amazing action");
    
    let event = Event::new(ctx, "ack_event", Some(Duration::from_secs(60)))
        .title(langtag!(en), "Amazing Action Executed")
        .message(langtag!(en), "A longer message");
        .actions(vec!["do_something"]); // Actions be be linked from the event

    // Create registration builder.
    let builder = Addon::registration_builder::new();
    // Set all mandatory and optional arguments.
    builder = builder.add_action(action_doit).add_event(event)
    // Register service
    let ctx: AddonContext = Addon::register(builder.build());
}
{{< /highlight >}}</tab-body-item >
		</tab-body>
    </tab-container>
</div>

Addons can communicate with the user via events and actions. You can edit the title and message of such a notification before publishing it, but you can only use events that you have declared during the registration. *Events* optionally have a lifetime, like in the example above (`Duration::from_secs(60)`). A timed out event will disappear from user-interfaces or will never be shown to a user that logs in at a later time.

An event is published like so:

<div class="mb-2">
	<tab-container>
		<tab-header>
			<tab-header-item class="tab-active">Rust</tab-header-item>
		</tab-header>
		<tab-body>
<tab-body-item >{{< highlight rust "linenos=table" >}}
use ohx::{AddonContext, Event};

fn show_event(ctx: &AddonContext) {
    let mut event : Event = ctx.event("ack_event").unwrap();
    event.title(langtag!(en), "The title")
         .message(langtag!(en), "A longer message")
         .publish();
}
{{< /highlight >}}</tab-body-item >
		</tab-body>
    </tab-container>
</div>

## Configurations for Addons

Configuration, may it be Thing or Addon or Service configuration, in openHAB X must be possible in textual form as well as graphical via forms and dialogs.
For this to work, the configuration meta data or configuration description is necessary. 
OHX uses **JsonSchema** for this purpose.

{{< callout type="danger" >}}
Whenever you require configuration, you start by defining the corresponding JsonSchema.
{{< /callout >}}

For example if you have a service `my_service` and like your users to be able to configure a port, username and password. Username and password form a unit "credentials":

```yaml
credentials:
  username: a_user
  password: secret_password_hash
port: 1212
```

{{< colpic ratio="50" left="mx-2" right="mx-2" >}}
A corresponding JsonSchemas looks like this:

{{< code-toggle file="switch_off_after_5_min" active="json" >}}
{
  "title": "My service configuration",
  "description": "A description that might be long",
  "type": "object",
  "required": [
    "port"
  ],
  "properties": {
    "credentials": {
      "type": "object",
      "title": "User credentials",
      "description": "Another long description",
      "properties": {
        "username": {
          "type": "string",
          "title": "Username",
          "default": "a_user"
        },
        "password": {
          "type": "string",
          "title": "Password",
          "minLength": 3
        }
      }
    },
    "port": {
      "type": "integer",
      "title": "Port"
    }
  }
}
{{< /code-toggle >}}

<split>

And renders into what you see below. Almost*.

<form class="card p-4"><div class="form-group field field-object"><fieldset><legend>My service configuration</legend><p class="field-description">A description that might be long</p><div class="form-group field field-object" style="border-left: gray solid; padding-left: 20px;"><fieldset><legend>User Credentials</legend><p class="field-description">Another long description</p><div class="form-group field field-string"><label class="control-label" for="root_credentials_username">Username</label><input type="text" class="form-control" value="Chuck" label="Username"></div><div class="form-group field field-string"><label class="control-label" for="root_credentials_password">Password</label><input type="password" class="form-control" value="secret_password_hash" label="Password"></div></fieldset></div><div class="form-group field field-integer"><label class="control-label" for="root_port">Port<span class="required">*</span></label><input type="number" step="1" class="form-control" value="12" label="Port"></div></fieldset></div></form>

<small>*A second schema <b>UISchema</b> complements JsonSchema. It is used for translations and to further specify on how to render specific fields like the password field.</small>

{{< details title="See a UISchema example for the above form" >}}
```json
{
  "credentials": {
    "username": {
      "ui:autofocus": true,
      "ui:emptyValue": ""
    },
    "password": {
      "ui:widget": "password",
      "ui:help": "Hint: Make it strong!"
    }
  },
  "port": {
    "ui:widget": "updown",
    "ui:title": "Port (translated)",
    "ui:description": "(an additional description)"
  }
}
```
{{< /details >}}

{{< /colpic >}}

### Tools to generate JSONSchema

Some programming languages support to define JSONSchema in code together with the structs that hold the configuration values. Those languages therefore don't face the problem of desyncing schema and code, but others will.

Because this is not supported in all languages, the idiomatic way is the other way round. You define the JSONSchema (and UISchema). That's your source of truth and you always commit them to your source repository as well. You then generate the programming language specific parts using those schemas.

1. Design your schemas with https://mozilla-services.github.io/react-jsonschema-form/
2. Generate code with: https://app.quicktype.io/. Choose JSON Schema on the left. Choose the target language on the right.

### Register Configuration Schemas

If you register a structure for configuration retrival with `libaddon`, you must also specify the JSONSchema and optionally the UISchema.

<div class="mb-2">
	<tab-container>
		<tab-header>
			<tab-header-item class="tab-active">Rust</tab-header-item>
		</tab-header>
		<tab-body>
<tab-body-item >{{< highlight rust "linenos=table" >}}
use serde::{Serialize, Deserialize};
use semver::Version;
use ohx::{Config};

// This is for demonstration only. A code generator like the one
// mentioned above will create a separate file for configuration structs.

#[derive(Serialize, Deserialize, Debug)]
struct Credentials {
    username: String;
    password: String;
}

#[derive(Serialize, Deserialize, Debug)]
struct ServiceConfig {
    credentials: Option<Credentials>
    port: Option<i32>
}

fn upgrade_config_id_cb(...) -> Result<String> {
  // ...
}

fn main() {
    // ...
    // Publish schema. No optional ui schema is given in this example.
    Config::schema_publish(ctx, "schema/config_id_schema.json", None).unwrap();
    // Synchronously request a configuration object. Should only happen on startup.
    let config : Option<ServiceConfig> = Config::get(ctx, "config_id", &upgrade_config_id_cb).unwrap();
}
```
{{< /highlight >}}</tab-body-item >
		</tab-body>
    </tab-container>
</div>

{{< callout type="info" title="Dynamic schema updates">}}
You can at any time update a JSONSchema. For example in response to a just received configuration or your addons current state.
All connected user interfaces, including Setup &amp; Maintenance will update the rendered forms.
{{< /callout >}}

### Listen to configuration changes

Configuration may be altered by the user during runtime.
It is up to you on how to react to changes.

The idiomatic way is to use the stream API `register_lister` instead of the `get` method.
The listener callback method will be called for the inital configuration.

Via a computed hash over the configuration you will only be called back for actual changes.

<div class="mb-2">
	<tab-container>
		<tab-header>
			<tab-header-item class="tab-active">Rust</tab-header-item>
		</tab-header>
		<tab-body>
<tab-body-item >{{< highlight rust "linenos=table" >}}
// ...

fn config_changed(config_id: &str, config: Option<ServiceConfig>) {

}

fn upgrade_config_id_cb(...) -> Result<String> {
  // ...
}

fn main() {
    // ...
    Config::register_lister(ctx, "config_id", &config_changed, &upgrade_config_id_cb);
}
```
{{< /highlight >}}</tab-body-item >
		</tab-body>
    </tab-container>
</div>

### Update-Paths for Configuration

Sometimes you need to restructure your addon and your configuration structure changes. This includes service as well as Thing configurations.

As seen in the last example, openHAB X calls you back if your addon version doesn't match your configuration version for a given config_id. Add migration paths for each new version to an `upgrade_cb` function as seen in the following example.

<div class="mb-2">
	<tab-container>
		<tab-header>
			<tab-header-item class="tab-active">Rust</tab-header-item>
		</tab-header>
		<tab-body>
<tab-body-item >{{< highlight rust "linenos=table" >}}
// ...

// Upgrading from version 1.1 via 1.2 to 2.0
fn upgrade_cb(config:&str, current_version:Version, new_version:Version) -> Result<String> {
  let version = current_version;
  let mut new_conf = config.to_own();

  if version == Version::new(1,1,0) {
    // do your conversion on new_conf
    version = Version::new(1,2,0);
  }
  if version == Version::new(1,2,0) {
    // do your conversion on new_conf
    version = Version::new(2,0,0);
  }

  return new_conf;
}
```
{{< /highlight >}}</tab-body-item >
		</tab-body>
    </tab-container>
</div>

So far this did not include users Thing configuration. Thing config auto-migration works similar to the concept above. It is optional to provide a migration method, but your *Binding* users will definitely enjoy that feature.

<div class="mb-2">
	<tab-container>
		<tab-header>
			<tab-header-item class="tab-active">Rust</tab-header-item>
		</tab-header>
		<tab-body>
<tab-body-item >{{< highlight rust "linenos=table" >}}
// ...

// Upgrading from version 1.1 via 1.2 to 2.0
fn upgrade_things_cb(thing_id:&str, config:&str, current_version:Version, new_version:Version) -> Result<String> {
  // ...
}

fn main() {
    // ...
    Config::migrate_things(&upgrade_things_cb);
}
```
{{< /highlight >}}</tab-body-item >
		</tab-body>
    </tab-container>
</div>

## Bundle Addon to Container

Your addon executable and all libraries to execute your Addon binary are bundled into a container.
A recipe tells a container image creation tool how to bundle your addon. OHX uses the [Dockerfile](https://docs.docker.com/engine/reference/builder/) format and therefore expect a file with that name in your source code repository.

The template repositories already contain `Dockerfile`s.
Depending on your programming language the recipe looks slightly different.
The following file is for a Rust based addon.

```dockerfile
FROM rust:1.35-slim
WORKDIR /usr/src/myapp
COPY . .
RUN cargo install --path .
HEALTHCHECK --interval=30s --timeout=2s --retries=2 CMD grpc_health_probe -addr=localhost:443 -connect-timeout 250ms -rpc-timeout 100ms
EXPOSE 443
LABEL version="1.0"
LABEL description="This text illustrates \
that label-values can span multiple lines."
LABEL maintainer="Author name <your-email@addr.com>"
CMD ["myapp"]
```

Change the `LABEL version`, `maintainer` and `description` accordingly.
A few parameters may need to be adjusted for your needs, for example `HEALTHCHECK` and `EXPOSE`.

The template repositories contain a build script `./build.sh`, but you can also manually call `docker build`: `docker build . -name ohx-addon-name` or `podman build . -name ohx-addon-name`.

## Prepare For Publishing

OHX uses containers for distributing addons and a [Docker Compose](https://docs.docker.com/compose/) file `docker-compose.yml` that describes how to start your container(s).

Although the software Docker compose itself is not used in the standalone installation, the file format is a well understood, simple and documented format for container setups.
Metadata like the addon title, description, author information as well as mandatory and optional permissions and network setup are part of this declaration.

The following example for an imaginary addon called "ohx-addon-name" lists two container services. 
The first entry references the addon application (which we named "ohx-addon-name" in the section above) and the second service entry an mqtt broker container for demonstrational purposes.

Find the full file specification at https://docs.docker.com/compose/compose-file/.


```yaml
version: '3.7'
services:
  ohx-addon-name:
    build:
      context: ./
      dockerfile: Dockerfile
    ports:
    - "5000:5000"
    volumes:
    - logvolume01:/var/log
    depends_on:
    - mqttbroker
  mqttbroker:
    image: eclipse-mosquitto:latest
    volumes:
    - logvolume01:/var/log
    ports:
    - "1883:1883"
volumes:
  logvolume01: {}
metadata:
  name: ohx-addon-name
  version: "1.0"
  category: binding
  authors: ["your name"]
  title: "My addon"
  titles:
    de: "A translated title"
  description: "A long description that *may* use markdown and \n line breaks"
  supports:
    manufacturers: ["Samsong"]
    products: ["XT-1247"]
  permissions:
    mandatory:
    - id: HW_BLUETOOTH
      reason: "This addon connects to HW via Bluetooth."
    optional: []
  homepage: "https://example.com"
  github: "https://www.github.com/my/repository"
```

The `ohx-addon-name` entry with the `build` key points to the dockerfile that creates the image. The `build` key is implicit and can be left out if the standard "Dockerfile" name has been used and if that file resides in the same directory as the `docker-compose.yml` file.

All addon metadata sits under "metadata". 

* `title` and `description` can be translated by having the 2 or 3 letter language code as subkey to `titles` or `descriptions`. (eg *de* for German).
* `version` Assign your addon a version. Consider to use semantic versioning.
* `category` is either "binding" or "ioservice". Leave this key out if none of those are matching.
* `supports` This object contains to lists `manufacturers` and `products`. Add all matching entries. For an Addon that supports specific Samsung TVs, you would set the keys accordingly. 
* `permissions` List the mandatory and optional permissions. You may optionally tell the user why a permission is necessary via the `reason` field. See the next section for further information.
* `homepage` A website for that addon. Might just point to a Github repository.
* `github` An optional key to the github page of your addon. If this is set, a "Report an Issue" link will appear whenever appropriate in the **Setup &amp; Maintenance** interface. The addon registry page will show your repository "stars" and issue count. It will also be used as homepage if no `homepage` has been set. If you use Github releases (you should!) for distributing new addon versions, the **AddonsManager** will notice this and periodically check for new releases.
* `logo_url` An optional url to a logo graphics file that is display in the addon manager and on the addon registry page. Must be square and ideally it is in 200x200px resolution. If this is not set, your github repostory is checked if it contains a "logo.png" file in the root directory.

### Process Management Addon

If your Addon is some form of process management interface, it needs to share the process id namespace and maybe also the {{< details title="IPC (POSIX/SysV IPC)" >}}IPC (POSIX/SysV IPC) namespace provides separation of named shared memory segments, semaphores and message queues.

Shared memory segments are used to accelerate inter-process communication at memory speed, rather than through pipes or through the network stack.{{< /details>}} namespace. Do so with:

```yml
pid: "host"
ipc: "host"
```

### Hardware

If your addon interacts with the host kernel directly for tasks like network hardware management, serial interface configuration and hardware related kernel calls, you have some options.

Add Linux [capabilities](http://man7.org/linux/man-pages/man7/capabilities.7.html). That is possible via the `cap_add` and `cap_drop` keys. See https://docs.docker.com/compose/compose-file/#cap_add-cap_drop.

```yaml
cap_add:
  - ALL

cap_drop:
  - NET_ADMIN
  - SYS_ADMIN
```

Use explicit device file mapping. This is not recommended.

```yml
devices:
  - "/dev/ttyUSB0:/dev/ttyUSB0"
```

Use OHX permissions. The supervisior process will make sure that your container gets access to related hardware file nodes. The following permissions are currently supported.

* USB: You need the HW_USB permission
* Bluetooth: HW_BLUETOOTH
* I2C: HW_I2C
* Cameras: HW_CAM. This is most of the time a subset of the USB permission because many cameras are integrated via USB. This permission allows you to access the video4linux (eg `/dev/video*`) device files.

A later section talks about permissions and restrictions in more detail.
If you forget to declare required hardware in the Kubernetes Pods file, you will **not have access.**

### Networking

By default a single network for your addon is set up. Each container of your addon joins the default network with an own IP address and is both reachable by other containers on that network, and discoverable by them at a hostname identical to the container name.

Let's examine the relevant networking parts of the example from above:

```yaml
version: '3.7'
services:
  mqttbroker:
    image: eclipse-mosquitto:latest
    ports:
    - 1883
```

Each container can now look up the hostname "mqttbroker" and get back the appropriate container’s IP address. For example, to connect to the mqtt broker you would use the URI `mqtt://username:password@mqttbroker:1883`.

If your addon needs full network host access you can set `network_mode`. This is not recommended and will result in a big warning during addon installation.

```yaml
network_mode: host
```

Instead you should explicitely name the ports that you want to be exposed. A few examples:

```yml
ports:
 - "3000"
 - "3000-3005"
 - "8000:8000"
 - "9090-9091:8080-8081"
 - "49100:22"
 - "127.0.0.1:8001:8001"
 - "127.0.0.1:5000-5010:5000-5010"
 - "6060:6060/udp"
```

As you can see, you can expose single ports (`3000`), a port range (`3000-3005`), map container ports to host ports (`8000:8000`) and restrict ports to specific network interfaces like localhost (`127.0.0.1`). The default port type is TCP, for UDP use a `/udp` suffix.

If you expose a port, without mapping it, that port is only visible to other containers and is not visible to the host network interface. To make the mqtt broker from above potentially accessible from the Internet, you would use a port mapping like so:

```yaml
version: '3.7'
services:
  mqttbroker:
    image: eclipse-mosquitto:latest
    ports:
    - "1883:1883"
```

TCP Port 8443 is always exported and used for interprocess communication (gRPC).
UDP Port 5353 is mapped to the same host port for service discovery announcements via mDNS.

#### Access Internet

Outgoing connections (addresses outside of the container network subnet) are by default blocked. If your addon requires certain network services, you must list them under the `firewall_allow` key. A few examples:

```yml
version: '3.7'
services:
  mqttbroker:
    image: eclipse-mosquitto:latest
    firewall_allow:
    - "www.google.com"
    - "*.example.com"
    - "8.8.8.8"
    - "8.8.8.8/24"
    - "*"
```

### Restrictions &amp; Permissions

A container runs in an isolated, contained environment and is confined to 100 MB of disk quota and 1 MB of configuration data. A container might request a larger disk quota via the DISK_QUOTA_500 (500 MB), DISK_QUOTA_1000 (1 GB) and DISK_QUOTA_MAX permissions.

CPU Time is limited to 20% for a container, except if the user has granted the CPU_MAX permission. Main memory is restricted to 200 MB for an Addon, except if the user has granted the MEM_500 (500 MB), MEM_1000 (1GB) or MEM_MAX permission. Access to hardware like Bluetooth and USB is denied. Request for HW_BLUETOOTH, HW_NETWORK, HW_IC2, HW_GPIO, HW_USB to access respective hardware.

A container is restricted in the list of allowed kernel system calls it can make. Linux seccomp and AppArmor profiles are in use.

The above restrictions make sure that malicous addons cannot just raise its allowd CPU time and start mining Bit-Coins (at least not with full power and to the extend that other services are affected) or abuse it in other ways or overheat the hardware.

If you require further access, you may use the `privileged` key. That should be really rare and you rather talk to the core team to add special permissions for your use case. The **Setup &amp; Maintenance** interface will warn a user from accepting a privileged Addon.

Any of the above mentioned permissions can be mandatory or optional. The snips.ai addon for example requires the CPU_MAX permission for working correctly.

A user must accept required permissions during installation, but may deny optional permissions.

`libaddon` allows you to query for granted and denied permissions.


<div class="mb-2">
	<tab-container>
		<tab-header>
			<tab-header-item class="tab-active">Rust</tab-header-item>
		</tab-header>
		<tab-body>
<tab-body-item >{{< highlight rust "linenos=table" >}}
use ohx::{AddonContext, Permissions};

fn main() {
    // ...
    let ctx: AddonContext = register;
    // ...
    let list_granted = Permissions::granted(ctx).unwrap();
    let list_denied = Permissions::denied(ctx).unwrap();
}
```
{{< /highlight >}}</tab-body-item >
		</tab-body>
    </tab-container>
</div>

## Publish to Addon Registry

To make your Addon appear in the list of Addons on **Setup &amp; Maintenance** in the <a href="" class="demolink">Addon</a> section or here on the website, you want to publish it. 

Publishing is done via a command line utility.

1. Create an [account](/login) here on the website. Each Addon entry must be associated with an account.
2. Create an account on https://hub.docker.com/. Your addon containers will be uploaded to the hub.
2. If you haven't installed Rust yet, you need at least [Cargo](https://doc.rust-lang.org/cargo/getting-started/installation.html)
3. Install the tool with `cargo install ohx-publish`.
4. If your addon is hosted in a git repository and you are executing the tool in a repository directory, make sure that the workspace is clean and everything is commited.
4. The utility does not take any arguments and is expected to be executed in the directory that contains the `docker-compose.yml` file: `./ohx-publish`.

Your `docker-compose.yml` file is analysed to find out about your addons name and version. 

Publish for the first time
: If you haven't published anything yet from your addon directory, the tool opens https://www.openhabx.com and in a second step https://hub.docker.com/ for you to authenticate. If there is no addon from another user with the same name, your addon is build and published.

If there is an older version, that version is archived and replaced with the new version. 

{{< details type="info" >}}
If your Addon is written in a language that is compiled to machine code (Rust, C++, Go), it needs to be cross compiled to Armv7 and Armv8. This will require about 1 GB disk space for the compiler toolchains. You are expected to build on an x86-64 machine.
{{< /details >}}

### Addon Reviews

An Addon can get the "reviewed" badge by Addon registry maintainers. The build artifacts are associated with your git revision during build. Your source code at the given git revision will be checked for malicous code, and code quality in terms of resource leakage.