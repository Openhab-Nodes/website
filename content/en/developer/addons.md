+++
title = "About Addons"
author = "David Graeff"
weight = 50
tags = []
+++

Developing an Addon for openHAB X is not complicated.
Programming libraries are provided for Rust, C++, Java and NodeJS.

This chapter sheds some light on what addons actually are in the [Addon: Technical background](#addon-technical-background) section and introduces into addon development in later sections. Various *template* repositories allow you to easily clone example code and start experimenting and coding.

You will not find library APIs in this documentation, refer to the code repositories if you are looking for those.

There are two types of Addons that require different interfaces to be implemented.

{{< colpic ratio="50" margin="mx-2" >}}

{{< imgicon src="far fa-lightbulb" height="50px" caption="**Binding**" >}}

An Addon that integrates external services or devices is called a Binding. Related service interfaces are: The discovery service interface ("*Inbox*") and the Things interface.

The [Binding](/developer/addons_binding) chapter contains all the details.

<split>

{{< imgicon src="fas fa-exchange-alt" height="50px" caption="**IO Service**" >}}

An IO Service is a type of Addon that exposes Things / Thing Channels. May it be via an http interface for mobile Apps or HomeKit or for example the Hue protocol for Hue Apps.

The [IO Service](/developer/addons_ioservice) chapter contains all the details.

{{< /colpic >}}

Other kinds of addons
: An addon with the purpose of for example voice recognition or a machine learning related service, might not fit into one of the two categories. If you remember the architecture chapter from earlier, openHAB X consists of different core services that are accessible via purpose-specific libraries. If you develop in {{< details title="Rust">}}In other languages you would need to implement the gRPC interfaces.{{< /details >}}, you can just link to those libraries and interoperate with all parts of OHX. 

## Addon: Technical background

To understand what an Addon means for openHAB X, let's have a look at the following figure.

<div class="text-center">
<img src="/img/doc/addon-container.svg" class="w-100 p-3">
</div>

Right in the middle you see the {{< details title="software container(s)" maxwidth="500px" >}}
A **container** is a standard unit of software that packages up code and all its dependencies so the application runs quickly and reliably from one computing environment to another. A **container image** is a lightweight, standalone, executable package of software that includes everything needed to run an application: code, runtime, system tools, system libraries and settings. Containers are not virtual machines!

The Open Container Initiative (OCI), founded by Docker, is a Linux Foundation project to design open standards for operating-system-level virtualization, most importantly containers.
{{< /details >}} (pod) that your Addon is comprised of. In most cases your Addon consists of exactly one container, which runs software that is linked to `libAddon`, to communicate with the `AddonManager` and other core services via Interprocess Communication. OHX uses [gRPC](https://grpc.io/). Sometimes you might require additional external services, like a database. This is when you have more than one container running.

Define network ports, storage, permissions
: The "[Kubernetes Objects](https://kubernetes.io/docs/concepts/overview/working-with-objects/kubernetes-objects/) Yaml file", pictured on the right side of the figure above, is a wide spread file format to describe how to start one or multiple containers in regard to exposed network ports, storage requirements and access to host hardware. openHAB X permissions, explained in a later section, are also specified in that file. 

Author, Addon Name and other metadata
: The "Addon Description File", seen on the left side of the figure above, tells the Addon Registry and users about the authors, the addon *name* (title) and  description. The npm package.json standard has been adopted for this purpose.

### Restrictions &amp; Permissions

A pod (set of containers) runs an in isolated, contained environment and is confined to 100 MB of disk quota and 1 MB of configuration data. A pod might request a larger disk quota via the DISK_QUOTA_500 (500 MB), DISK_QUOTA_1000 (1 GB) and DISK_QUOTA_MAX permissions.

CPU Time is limited to 20% for a pod, except if the user has granted the CPU_MAX permission. Main memory is restricted to 200 MB for an Addon, except if the user has granted the MEM_500 (500 MB), MEM_1000 (1GB) or MEM_MAX permission. Access to hardware like Bluetooth and USB is denied. Request for HW_BLUETOOTH, HW_NETWORK, HW_IC2, HW_GPIO, HW_USB to access respective hardware.

The above restrictions make sure that malicous addons cannot just start mining Bit-Coins on a users system (at least not with full power and to the extend that other services are affected) or abuse it in other ways or overheat the hardware.

If you require further access, you may use the FULL_PRIVILEGE permission. That should be really rare and you rather talk to the core team to add special permissions for your use case. The **Setup &amp; Maintenance** interface will warn a user from accepting this permission.

Any of the above mentioned permissions can also be marked as required. The snips.ai addon for example requires the CPU_MAX permission. A user must accept required permissions during installation, but may deny optional permissions. `libaddon` allows you to query for granted permissions.

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
{{< /md >}}
			</tab-body-item>
			<tab-body-item >
{{< md >}}
[Go 1.10+](https://golang.org/) is required.

See https://code.visualstudio.com/docs/languages/go for the Visual Studio Code extension.
{{< /md >}}
			</tab-body-item>
			<tab-body-item >
{{< md >}}
A C++17 capable compiler like g++7, clang or others is required. The buildsystem is [CMake](https://cmake.org/).

Because C++ does not have a package manager, additional libraries like for networking https://github.com/Qihoo360/evpp are downloaded via a bootstrapping script.

See https://code.visualstudio.com/docs/languages/cpp for the Visual Studio Code extension.
{{< /md >}}
			</tab-body-item>
			<tab-body-item >
{{< md >}}
[NodeJS](https://nodejs.org/) 10+ including the Node Package Manager (npm) is required.

Visual Studio Code supports Javascript development out of the box.
{{< /md >}}
			</tab-body-item>
			<tab-body-item >
{{< md >}}
The Java Development Kit (JDK) 8 or newer is required, for example from Oracle: [Oracle JDK 8](http://www.oracle.com/technetwork/java/javase/downloads/jdk8-downloads-2133151.html).

[Gradle](https://gradle.org/) is the build system tool.

See https://code.visualstudio.com/docs/languages/java for the Visual Studio Code extension.
{{< /md >}}
			</tab-body-item>
		</tab-body>
	</tab-container>
</div>

In each repository you find a `start.sh` file. Open a terminal (for Windows the [new terminal](https://github.com/microsoft/terminal) is recommended).

## Containers

OHX uses containers for distributing addons.
For local testing you do not need to care about containers, just start 

## Define Meta-data

Before you dive into coding, let us define all the required meta data first: 
Most and importantly, the addon description file.

### Configurations in Addons

One type of metadata is configurations. May it be Thing or Addon or Service configuration. Why is that?

Configuration in openHAB X ~~should~~ must always be possible in textual form as well as graphical via forms and dialogs.
For this to work, configuration structure and key-values need to be described in a machine readable fashion. OHX uses JsonSchema for this purpose.
Whenever you require configuration, you start by defining the corresponding JsonSchema.

For example if you have a service `my_service` and like your users to be able to configure a port, username and password:

```yaml
credentials:
  username: a_user
  password: secret_password_hash
port: 1212
```

{{< colpic ratio="50" margin="mx-2" >}}
A corresponding JsonSchemas looks like this:

```json
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
```

<split>

And renders into what you see below. Almost*.

<form class="card p-4"><div class="form-group field field-object"><fieldset><legend>My service configuration</legend><p class="field-description">A description that might be long</p><div class="form-group field field-object"><fieldset class="ml-4"><legend>User Credentials</legend><p class="field-description">Another long description</p><div class="form-group field field-string"><label class="control-label" for="root_credentials_username">Username</label><input type="text" class="form-control" value="Chuck" label="Username"></div><div class="form-group field field-string"><label class="control-label" for="root_credentials_password">Password</label><input type="password" class="form-control" value="secret_password_hash" label="Password"></div></fieldset></div><div class="form-group field field-integer"><label class="control-label" for="root_port">Port<span class="required">*</span></label><input type="number" step="1" class="form-control" value="12" label="Port"></div></fieldset></div></form>

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

{{< callout type="info" >}}
<h4>Version your Configuration</h4>
Addon configuration is kept even if an addon is uninstalled or updated. Version your configuration to not get surprised in a later version of your addon. If you require a clean config, perform a configuration wipe when receiving the `installed` callback.
{{< /callout >}}

#### Tools to generate JSONSchema

Some programming languages support to define JSONSchema in code together with the structs that hold the configuration values, like Rust (macros) and Java (annotations). Those languages therefore don't face the problem of desyncing schema and code.

Because this is not supported in all languages, the idiomatic way is the other way round. You define the JSONSchema (and UISchema). That's your source of truth and you always commit them to your source repository as well. You then generate the programming language specific parts using those schemas.

1. Design your schemas with https://mozilla-services.github.io/react-jsonschema-form/
2. Generate code with: https://app.quicktype.io/. Choose JSON Schema on the left. Choose the target language on the right.

#### Usage in Code

If you register a structure for configuration retrival with `libaddon`, you must also specify the JSONSchema and optionally the UISchema.

{{< callout type="info" >}}
<h4>Dynamic updates</h4>
You can at any time update a JSONSchema. For example in response to a just received configuration or your addons current state.
All connected user interfaces, including Setup &amp; Maintenance will update the rendered forms.
{{< /callout >}}
