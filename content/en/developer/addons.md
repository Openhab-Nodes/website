+++
title = "About Addons"
author = "David Graeff"
weight = 50
tags = []
+++

Developing an Addon for openHAB X is not complicated.
Programming libraries are provided for Rust, C++, Java and NodeJS.

This chapter sheds some light on what addons actually are and introduces into addon development. It starts with how to setup your development environment and refers to the various *template* repositories that allow you to easily clone example code.

This text assumes that you know how to open and operate a terminal, because for brevity reasons only command line instructions are given most of the time.

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
Rust 1.32+ is required. Install via [rustup](https://rustup.rs/) for example.

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

Usually an Addon and also openHAB X core services are bundled into software containers for distributing. Containers are explained in a later section.
For local testing, containers are not required though.

1. Execute `sh ./start_all.sh` of the [core repository](https://www.github.com/openhab-nodes/core) on the command line to start openHAB X.
2. And then start your addon or the example addon via the command line given above, like `cargo run` for a Rust addon or `npm run start` for NodeJS.

### Test With Production OHX

It is possible to run your addon on your developer machine and have your (production) OHX installation running on a different system.
For this to work, you first need to create an access token on the <a class="demolink" href="">Maintenance</a> page with the "REMOTE_ADDON" permission. Add additional permissions as needed. You are basically executing the procedure that happens when an addon is installed.

Start your addon with the environment variable `REMOTE_OHX=192.168.1.11` set (change the IP accordingly) and the environment variable `REMOTE_OHX_ACCESS` should be set to your token, like `REMOTE_OHX_ACCESS=e5868ebb4445fc2ad9f9...49956c1cb9ddefa0d421`.

The addon should report that it will attempt to connect to a remote instance.
Please note, that configuration is not shared across devices.
Depending on the granted permissions you will have access to Things and Thing states, Thing Channel history, the user database etc.

{{< callout type="info" >}}
As long as you do not grant full cpu, memory and disk quota permissions, it is generally safe to develop an addon towards your production OHX. It is almost impossible to break anything or render the installation unstable.
{{< /callout >}}

## Addon Types

If you remember the architecture chapter from earlier, openHAB X consists of different core services that are accessible via purpose-specific libraries. Two main types of Addons are especially important for OHX and have utility libaries available for easier implementation and help with common operations.

{{< colpic ratio="50" left="mx-2" right="mx-2" >}}

{{< imgicon src="far fa-lightbulb" height="50px" caption="**Binding**" >}}

An Addon that integrates external services, hardware or devices is called a Binding. Related service interfaces are: The discovery service interface ("*Inbox*") and the Things interface.

The [Binding](/developer/addons_binding) chapter contains all the details.

<split>

{{< imgicon src="fas fa-exchange-alt" height="50px" caption="**IO Service**" >}}

An IO Service is a type of Addon that exposes Things / Thing Channels. May it be via an http interface for mobile Apps or HomeKit or for example the Hue protocol for Hue Apps.

The [IO Service](/developer/addons_ioservice) chapter contains all the details.

{{< /colpic >}}

## Addon-Manger Callbacks



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

A longer example is given in the walkthrough section in the [Binding](/developer/addons_binding) chapter.

### Tools to generate JSONSchema

Some programming languages support to define JSONSchema in code together with the structs that hold the configuration values, like Rust (macros) and Java (annotations). Those languages therefore don't face the problem of desyncing schema and code.

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
<tab-body-item >{{< md >}}
```rust
use serde::{Serialize, Deserialize};
use semver::Version;
use ohx::{Configs};

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
    // Publish schemas. No optional ui schema is given in this example.
    let json_schema = fs::read_to_string("schema/config_id_schema.json").unwrap();
    Configs::publish(&json_schema, None).unwrap();
    // Synchronously request a configuration object. Should only happen on startup.
    let config : Option<ServiceConfig> = Configs::get("config_id", &upgrade_config_id_cb).unwrap();
}
```
{{< /md >}}</tab-body-item >
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

It is generally a better idea to use this asyncronous API instead of the `get` method.
The listener callback method will also be called for the inital configuration.
Via a computed hash over the configuration you will only be called back for actual changes.

<div class="mb-2">
	<tab-container>
		<tab-header>
			<tab-header-item class="tab-active">Rust</tab-header-item>
		</tab-header>
		<tab-body>
<tab-body-item >{{< md >}}
```rust

// ...

fn config_changed(config_id: &str, config: Option<ServiceConfig>) {

}

fn upgrade_config_id_cb(...) -> Result<String> {
  // ...
}

fn main() {
    // ...
    Config::register_lister("config_id", &config_changed, &upgrade_config_id_cb);
}
```
{{< /md >}}</tab-body-item >
		</tab-body>
    </tab-container>
</div>

### Update-Paths for Configuration

Sometimes you need to restructure your addon and your configuration structure changes. This includes service as well as users Thing configurations.

As seen in the last example, openHAB X calls you back if your addon version doesn't match your configuration version for a given config_id. You should keep adding migration paths to an `upgrade_cb` function as seen in the following example.

<div class="mb-2">
	<tab-container>
		<tab-header>
			<tab-header-item class="tab-active">Rust</tab-header-item>
		</tab-header>
		<tab-body>
<tab-body-item >{{< md >}}
```rust

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
{{< /md >}}</tab-body-item >
		</tab-body>
    </tab-container>
</div>

So far this did not include users Thing configuration. Thing config auto-migration works similar to the concept above. It is absolutely optional to provide a migration method, but your *Binding* users will definitely enjoy that feature.

<div class="mb-2">
	<tab-container>
		<tab-header>
			<tab-header-item class="tab-active">Rust</tab-header-item>
		</tab-header>
		<tab-body>
<tab-body-item >{{< md >}}
```rust

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
{{< /md >}}</tab-body-item >
		</tab-body>
    </tab-container>
</div>

## Metadata &amp; Prepare For Publishing

OHX uses containers for distributing addons and a [Kubernetes Objects](https://kubernetes.io/docs/concepts/overview/working-with-objects/kubernetes-objects/) file that describes how to start your container(s) and that contains all  metadata like addon name, description and so on.

### Containerize

A container is your addon executable and all other software, except the operating system kernel, to run your addon.
A recipe tells a container image creation tool how to bundle your addon. OHX uses the `Dockerfile` format and therefore expect a file with that name in your source code repository.

The template repositories already contain `Dockerfile`s.
Depending on your programming language the recipe looks slightly different.
The following file is for a Rust based addon.

```dockerfile
FROM rust:1.35-slim
WORKDIR /usr/src/myapp
COPY . .
RUN cargo install --path .
CMD ["myapp"]
```

The template repositories contain a build script `./build.sh`, but you can also manually call `docker build` for example, like: `docker build . -name ohx-addon-name` or `podman build . -name ohx-addon-name`.

### Kubernetes Pods File

The next step is to write the *Kubernetes Objects* file. Although the software Kubernetes itself is not used, the file format is a well understood and documented format for container setups.

Metadata like the addon title, description, author information as well as mandatory and optional permissions are part of this declaration.

The following example for an imaginary addon called "ohx-addon-name" lists two containers. `apiVersion` is always `v1` and `kind` must be set to `Pod` (A pod is a set of containers).
The first container entry references the addon application (which we named "ohx-addon-name" in the section above) and an mqtt broker container for demonstrational purposes.

You 
```yaml
---
 apiVersion: v1
 kind: Pod
 spec:
   containers:
     - name: ohx-addon-name
       image: ohx-addon-name
       ports:
         - containerPort: 80
     - name: mqtt-broker
       image: eclipse-mosquitto:latest
       ports:
        - port: 1883
          protocol: TCP
        - containerPort: 9001
          protocol: TCP
    securityContext:
      allowPrivilegeEscalation: false
      privileged: false
      readOnlyRootFilesystem: true
    tty: true
 metadata:
   name: ohx-addon-name
   uid: "ohx-addon-v1.0"
   labels:
     version: "1.0"
     category: binding
     authors: ["your name"]
     title: "My addon"
     title_de: "A translated title"
     description: "A long description that *may* use markdown and \n line breaks"
     supports:
       manufacturers: ["Samsong"]
       products: ["XT-1247"]
     permissions:
       mandatory:
        - id: HW_BLUETOOTH
          reason: "This addon connects to HW via Bluetooth."
       optional: []
     homepage: "https://www.github.com/my/repository"
     github_releases: "https://www.github.com/my/repository"
     issues_web: "https://www.github.com/my/repository/issues"
```

The `image: ohx-addon-name` line points to the image that is created with the local Dockerfile.

Hardware
: If your addon interacts with hardware like Bluetooth directly (via kernel system calls), you need to set `allowPrivilegeEscalation` and `privileged` to true. This is not necessary for libusb access (but you need the HW_USB permission). The next section talks about permissions and restrictions in more detail.

Networking
: Define `containerPort` if ports should be only opened for the device that is running the container, meaning that only other addons and containers can interact with that service. Use `port` for ports that should be opened on the host operating system. In the example above an mqtt broker is exposed and potentially reachable via the internet.

You can map a containers port to a different host port. Use a structure like this:
```yaml
ports:
- port: 1883
  hostPort: 8000
  protocol: TCP
```

Metadata
: All addon metadata sits under "metadata->labels". 

.

* `title` and `description` can be translated by appending the 2 or 3 letter language code to the key (eg `title_de` for German).
* `version` Assign your addon a version. Consider to use semantic versioning.
* `category` is either "binding" or "ioservice". Leave this key out if none of those are matching.
* `supports` This object contains to lists `manufacturers` and `products`. Add all matching entries. For an Addon that supports specific Samsung TVs, you would set the keys accordingly. 
* `permissions` List the mandatory and optional permissions. You may optionally tell the user why a permission is necessary via the `reason` field. See the next section for further information.
* `homepage` A website for that addon. Might just point to a Github repository.
* `github_releases` An optional key to the github releases page. This should be set if Github releases are used for distributing new addon versions. The **AddonsManager** will periodically check for new releases.
* `issues_web` If this is set, a "Report an Issue" link will appear whenever appropriate in the **Setup &amp; Maintenance** interface.

### Restrictions &amp; Permissions

A pod (set of containers) runs an in isolated, contained environment and is confined to 100 MB of disk quota and 1 MB of configuration data. A pod might request a larger disk quota via the DISK_QUOTA_500 (500 MB), DISK_QUOTA_1000 (1 GB) and DISK_QUOTA_MAX permissions.

CPU Time is limited to 20% for a pod, except if the user has granted the CPU_MAX permission. Main memory is restricted to 200 MB for an Addon, except if the user has granted the MEM_500 (500 MB), MEM_1000 (1GB) or MEM_MAX permission. Access to hardware like Bluetooth and USB is denied. Request for HW_BLUETOOTH, HW_NETWORK, HW_IC2, HW_GPIO, HW_USB to access respective hardware.

The above restrictions make sure that malicous addons cannot just start mining Bit-Coins on a users system (at least not with full power and to the extend that other services are affected) or abuse it in other ways or overheat the hardware.

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
<tab-body-item >{{< md >}}
```rust
use ohx::{Addon};

// ...

fn main() {
    // ...
    let list_granted = Addon::granted_permissions().unwrap();
    let list_denied = Addon::denied_permissions().unwrap();
}
```
{{< /md >}}</tab-body-item >
		</tab-body>
    </tab-container>
</div>

