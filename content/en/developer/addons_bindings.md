+++
title = "Develop Bindings"
author = "David Graeff"
weight = 51
tags = []
+++

This chapter is about developing a Binding for openHAB X. Remember that if your service already exposes Web Things via HTTP or follows the MQTT Homie convention, you don't need to write an Addon.

To integrate a service or a device into openHAB X the framework need to know about the Thing topology and Things itself, like the attached properties, events and actions.

{{< img src="/img/doc/addon-binding-thing.svg" >}}

The following sections walks you through defining Things, their properties, events and actions, Thing configuration and how to keep the frameworks knowledge about a Thing and Thing State in sync.

Each supported programming language has a template repository with multiple examples that you can clone, build and play around with. If you haven't checked one out yet, go back to [Setting up the development enviroment](/developer/addons#setting-up-the-development-enviroment).

Pick the language that you are either familiar with or that helps to solve a problem the easiest way. For instance, because of the project [openzwave](https://github.com/OpenZWave/open-zwave) that is written in C++, it makes sense to pick the C++ SDK for a ZWave based Addon.

Examples in this chapter are written in Rust.

## Things

You have learned about the [Things concept](/userguide/addons#things) in the user guide already.
In the developer context, you need to differentiate between a [Thing Description (TD)](https://w3c.github.io/wot-thing-description/) (defined Properties, Actions, Events) and on the other hand a **Thing instance**.
If a Thing requires configuration, the TD is also accompanied by a [Configuration Description](/developer/addon#configurations-for-addons).

## Thing Description

A Thing Description (TD) is either declared in code, declaratively in a file or as a combination of both. It describes the Properties, Actions and Events and has an ID (ascii "a-zA-Z_" string, unique across the binding), a title and description.
Titles and descriptions optionally use BCP47 language codes (eg "en" for English) for translations.
Default keys are omitted (like "readOnly: false", "writeOnly: false").

{{< code-toggle file="thing_declarative_example" class="code-toggle-limited" >}}
'@context':
  td: https://www.w3.org/2019/wot/td/v1
  iot: https://iot.mozilla.org/schemas
  om: http://www.ontology-of-units-of-measure.org/resource/om-2/
'@type': iot:Lightbulb
actions:
  toggle:
    description: Turn the lamp on or off
events:
  overheating:
    data:
      type: string
    description: Lamp reaches a critical temperature (overheating)
properties:
  status:
    description: current status of the lamp (on|off)
    readOnly: true
    type: string
  temperature:
    description: Lamp temperature
    readOnly: true
    type: number
    minimum: -32.5,
    maximum: 55.2,
    unit: "om:degree_Celsius"
id: lamp_thing
titles:
  en: Lamp Thing
descriptions:
  en: Lamp Thing description
{{< /code-toggle >}}

The [Thing Description (TD)](https://w3c.github.io/wot-thing-description/) specifies in detail how Events, Actions and Properties are defined and which keys are available.<br>
[Specification](https://w3c.github.io/wot-thing-description/#thing)

The schema is very similar for Events, Actions and Properties. You define such an item by an ID (like "overheating" in the event case) and optionally provide a title and description or a map of translated titles and descriptions.

*Actions* usually do not carry any additional data. They are invoked by their ID and if invoked by http, the status code reports a success or failure.<br>[Specification](https://w3c.github.io/wot-thing-description/#actionaffordance)

*Events* optionally have "data", that is of `type` boolean, string, integer, number or array.<br>[Specification](https://w3c.github.io/wot-thing-description/#eventaffordance)

*Properties* can be "readOnly" (default is false) and "writeOnly" (default is false) and must be of `type` boolean, string, integer, number, array, object, binary.

* For the type string you may have a [MIME type](https://developer.mozilla.org/en-US/docs/Web/HTTP/Basics_of_HTTP/MIME_types) set via the "mediaType" key.
* You can restrict valid values of the string type via the "enum" key. For example: `"enum": ["On", "Off"],`
* You can restrict valid values of the array type via the "items" key. For example: `"items": ["item1", "item2"],`. Further restrict the amount of possible selections via "minItems" and "maxItems".
* For the binary type you must have at least one item in the "links" section.
  Each item requires a "mediaType" and a "href", that points to a relative or absolute position on where to find the binary data.
* Numbers and integers can be restricted with "minimum" and "maximum".
* All types can be annotated with a "unit".
  You find valid values for units on http://www.ontology-of-units-of-measure.org/resource/om-2/.

To get an idea, here are some more elaborated examples for properties of the string, array and binary type:

{{< code-toggle file="thing_declarative_example1" class="code-toggle-200 mb-4" >}}
properties:
  an_array:
    title: MyArray
    description: A restricted array
    type: array
    items: ["item1", "item2", "item3"]
    minItems: 1
    maxItems: 2
{{< /code-toggle >}}
{{< code-toggle file="thing_declarative_example2" class="code-toggle-200 mb-4" >}}
properties:
  videofeed:
    title: Video
    description: A video feed of a camera
    type: binary
    links:
      - href: /addon/url/to/videofeed.mp4
        mediaType: video/mp4
{{< /code-toggle >}}
{{< code-toggle file="thing_declarative_example3" class="code-toggle-200 mb-4" >}}
properties:
  an_image:
    title: Cat image
    description: Just because
    type: binary
    links:
      - href: /addon/url/to/image.jpg
        mediaType: image/jpeg
{{< /code-toggle >}}
{{< code-toggle file="thing_declarative_example4" class="code-toggle-200 mb-4" >}}
properties:
  audio_file_or_stream:
    title: Audio
    description: An interface will not auto-play this audio but render a play button
    type: binary
    links:
      - href: /addon/url/to/audio/stream.m3u
        mediaType: audio/mpeg
{{< /code-toggle >}}
{{< code-toggle file="thing_declarative_example5" class="code-toggle-200 mb-4" >}}
properties:
  markdown_formatted_text:
    title: Markdown Text
    description: A renderer of this property would format the text if supported
    type: string
    mediaType: "text/markdown"
{{< /code-toggle >}}

### Semantic tagging

OHX uses the https://iot.mozilla.org/schemas and [Brick schema](https://brickschema.org/) to add some semantic context to Things.
It helps user interfaces to know if a Thing is a light bulb or a rollershutter.
It helps the unit-of-measurement processor to know in which unit your sensor reading is and how to convert it to your region specific unit.
And it helps the natural language processor to know that a temperature Thing is a sensor for when you ask for all sensor readings of a room.

{{< img src="/img/doc/semantic_tags.jpg" maxwidth="100%" >}}

Set the "@type" for Things and Thing properties. Find available types for Things and Properties here: https://iot.mozilla.org/schemas.

{{< code-toggle file="thing_with_type" class="code-toggle-200" >}}
'@type': VideoCamera
properties:
  videofeed:
    "@type": VideoProperty
{{< /code-toggle >}}


Tag your Thing and properties with "Equipment" tags from the Brick schema. Tags in that schema follow a hierachy, meaning that tagging a lightbulb with "LED" inherits "Lighting". Find all tags here: https://github.com/BuildSysUniformMetadata/Brick/blob/master/src/Tags.csv.

{{< code-toggle file="thing_with_type" class="code-toggle-100" >}}
properties:
  temperature:
    tags:
      - HVAC
{{< /code-toggle >}}


### Dynamic TD

The above procedure is very well suited for static Things.
Like a specific light bulb *Thing* where the light bulb device never changes.
You will find yourself using the declarative way most often.

But sometimes your Things are actually not fixed, at least not entirely.
Properties might be added or changed, depending on the capability of a device or service that is mapped to a Thing.

You can also define a TD programmatically, and alter and re-publish a TD at any time.

<div class="mb-2">
<tab-container>
  <tab-header>
    <tab-header-item class="tab-active">Rust</tab-header-item>
  </tab-header>
  <tab-body>
<tab-body-item >{{< md >}}
```rust
use ohx::{ThingDesc, ThingRegistry, Property, Property::PropertyType, Action};
use language_tags::LanguageTag;

fn define_thing(ctx: &AddonContext) {
  // Define actions ...
  let action_refresh = Action::new("refresh")
    //.handler(action_handler) // more on handlers later in this chapter
    .title(langtag!(en), "Refresh Forecast")
    .description(langtag!(en), "Updates the forecast");

  // ... and properties 
  let property_next12 = Property::new("Next12", PropertyType::Number)
    .type("TemperatureProperty") // optional semantic type, see https://iot.mozilla.org/schemas
    .unit("degree celsius")
    //.handler(property_handler) // a writable property would require a handler
    .title(langtag!(en), "Next 12 hours")
    .description(langtag!(en), "Shows the next 12 hours forecast");

  // ... and configuration

  // Build the Thing
  let thing = ThingDesc::new("Forecast12hoursPeriod");
  thing.putAction(action_refresh);
  thing.putProperty(property_next12);
  thing.setTitle(langtag!(en), "Forecast for 12 hours")
  thing.setDescription(langtag!(en), "Long description");
  ThingRegistry::publish(ctx, thing);
}

// You might want to read a thing from file (json, yaml) and just alter it,
// using the file like a template
fn define_thing_from_file(ctx: &AddonContext) {
  let thing = ThingDesc::from_file("things/my-thing-id.json").unwrap();
  ThingRegistry::publish(ctx, thing).unwrap();
}

// Read in all files in a directory and publish them
fn define_things_from_file(ctx: &AddonContext) {
  ThingRegistry::publish_files(ctx, "things/").unwrap();
}

fn edit_thing(ctx: &AddonContext) {
  let thing: ThingDesc = ThingRegistry::get(ctx, "Forecast12hoursPeriod").unwrap();
  thing.setTitle(langtag!(en), "Forecast for 12 hours");
  // ...
  thing.putProperty(property_next12);
  ThingRegistry::publish(ctx, thing);
}
```
{{< /md >}}
  </tab-body-item >
  </tab-body>
  </tab-container>
</div>

No matter if declared in code or declaratively specified, `libAddon` will process and push the resulting *Thing Descriptions* to the [Runtime Configuration Storage](/developer/architecture#configuration-storage).

## Thing Instance

An instance internally is nothing more than an object with a unique id (uid), a reference to the thing description (ref), user assigned tags and required configuration.
Such an object is stored in the [Configuration Database](/developer/architecture#configuration-storage). Let's assume a Weather forecast Thing (id:`mything`) of an addon `myaddon`, that requires no further configuration.

```json
{
  "uid": "my-awesome-thing",
  "ref": "myaddon-mything",
  "config": {},
  "tags": {}
}
```

A user may add a *Thing Instance* manually, by creating a *Thing* in the **Setup &amp; Maintenance** interface for example.
Another way is to accept a *Thing* from the Inbox.
Your Addon does not have to manage all of this, you are called back for each created, altered and about-to-be-removed instance.
How you push ready to consume *Thing instances* to the Inbox is explained in a later section. 

### Handlers

The framework calls you back on various events. This includes when a thing instance got created, or has been edited (tags or configuration has changed) or when the user expressed his wish to remove a Thing instance. This is similar to the [Addon Handlers](/developer/addon#addon-registration).

When the user, a rule or an IO Service issues a command, the framework will also call you back.

<div class="mb-2">
	<tab-container>
		<tab-header>
			<tab-header-item class="tab-active">Rust</tab-header-item>
		</tab-header>
		<tab-body>
<tab-body-item >{{< highlight rust "linenos=table" >}}
use ohx::{AddonContext, ProgressStream, Result, Action, Property, Thing, ThingInstance, ThingInstanceData};

struct MyThingInstance {
  data: ThingInstanceData;
  private_variables: Option<String>;
}

impl ThingInstance for MyThingInstance {
  fn created(data: ThingInstanceData, ctx: &mut AddonContext) -> Option<MyThingInstance> {
    let &mut instance = MyThingInstance(data: data, private_variables: None);
    // link actions and property handlers 
    ctx.on_action(data.thing, "my_action",
      |action: &Action| instance.action_handler(self, ctx, action) )
    ctx.on_property_command(data.thing, "brightness",
      |property: &Property| instance.brightness_handler(self, ctx, property) )
    Some(instance)
  }

  fn modified(&mut self, ctx: &AddonContext, thing: &ThingDesc, data: ThingInstanceData) -> Result<()> {
    self.data = data; // update instance data
    Ok()
  }

  fn remove(self, ctx: &AddonContext, thing: &ThingDesc) -> Progress {
    let progress = Progress::new();

    // other thread; report progress
    progress.percentage(10);
    // done
    progress.done();

    progress
  }

  fn action_handler(&mut self, ctx: &AddonContext, data: ThingInstanceData) -> Progress {
    Progress::done()
  }

  fn brightness_handler(&mut self, ctx: &AddonContext, data: ThingInstanceData) -> Progress {
    Progress::done()
  }
}

fn edit_thing(ctx: &mut AddonContext) {
  let thing: ThingDesc = ThingRegistry::get(ctx, "Forecast12hoursPeriod").unwrap();
  // ...
  ctx.on_instance_created(thing, | data: ThingInstanceData, ctx: &mut AddonContext | -> MyThingInstance::created(data, ctx));
  ThingRegistry::publish(ctx, thing);
}
{{< /highlight >}}</tab-body-item >
		</tab-body>
    </tab-container>
</div>

To understand the code snippet, you should now that all handlers are stored in the `AddonContext` object.
A `Thing` struct contains the Thing ID and Thing Description.
There can be multiple instances for a specific Thing ID.
Those are uniquely identified by their unique id ("uid") which is stored in the `ThingInstanceData` object.
Imagine for example two light bulbs "myaddon-light1" and "myaddon-light2" of the Thing "color-light-thing".

The framework calls `on_instance_created` for a particular Thing ID and expects you to return an object that implements the `ThingInstance` interface (or trait in Rust).
That interface requires a `modified` and `remove` method to be implemented.
During the construction of your `ThingInstance` object, you also register all other thing specific handlers for actions and writable properties.

### Populate the Inbox

If you are able to discover handled devices or services automatically, you should push those discovery results back to the framework. Those end up in the Inbox and can be accepted or hidden by the user.

A discovery result can have a time-to-live (TTL) and might require 
TODO

## Configuration

A Thing might require additional configuration which is described in a *Configuration Description (CD)* JSonSchema file. This is similar to [Addon Configuration](/developer/addon#configurations-for-addons). You need to publish CDs to the [Runtime Configuration Storage](/developer/architecture#configuration-storage), so that editors know how to render a user interface for a Thing configuration.

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

// This will be generated by a tool out of the JSonSchema.
// Do not manually specify if possible!
#[derive(Serialize, Deserialize, Debug)]
struct MyThingConfig {
    username: String;
    password: String;
}

fn upgrade_config_id_cb(...) -> Result<String> {
  // ... handle configuration schema updates, for instance
  // if a field got renamed like from "pwd" to "password.
}

fn main() {
    // ...
    // Publish thing 'thingid' config schemas. No optional ui schema is given in this example.
    Config::schema_publish(ctx, "thingid", "schema/thing_id_schema.json", None).unwrap();
    // To unpublish, for example when a Thing doesn't exist anymore after an update
    Config::schema_unpublish(ctx, "thingid").unwrap();
}
```
{{< /highlight >}}</tab-body-item >
		</tab-body>
    </tab-container>
</div>

You reference required configuration in your TD:

{{< code-toggle file="thing_config" >}}
'@context':
- https://www.w3.org/2019/wot/td/v1
- https://iot.mozilla.org/schemas
'@type': Lightbulb
configuration:
  - "hue_addon/bridge-config"
  - lightbulbconfig
{{< /code-toggle >}}

"configuration" expects a list.
That is because you can split your configuration into smaller pieces (for easier re-use in multiple Things). You can also add configuration descriptions of other addons or core addons. Do this by first name the other addon, append a slash and then the configuration description id like in `hue_addon/bridge-config`. External addons will not automatically be installed though and user-interfaces are not able to render referenced configuration if such addons are not installed.

### Shared Configuration

You are sometimes in the situation where you like to share configuration between Things.
Think of light bulbs on an IKEA Tradfri or Philips Hue Bridge where all light Things share information on how to access the bridge.

In OHX this is done via **shared Thing configuration**. 
Let's think of the Hue bridge example for a moment. What you would do is:

1. Create a Hue Bridge Thing which will perform the pairing process via a "pair" action.
2. Create a configuration description (CD) with the id "bridge-config". This is how the bridge thing stores the access token.
2. Your Hue Bulb Things reference the "bridge-config" CD in their "configuration" section.

No matter if you update that shared configuration on any bulb or in the dedicated bridge Thing, it will affect all other bulbs.
So technically, you wouldn't even need a dedicated bridge Thing. Usually this pattern helps with discovery though, because most often you will first need to configure some form of access, perform a pairing procedure, before you can discover further Things.

## Addon &amp; Thing State

An Addon and configured Things of a Binding Addon usually have some form of *State*. Like a light bulb Thing that has a brightness. This state is expected to be kept / cached within your Addon, so that relative commands like "+5%" can be applied.

openHAB X expects Addons to synchronize their state to the *State Database*. That database is queried to display current Addon, Thing and Thing Property States in user interfaces and is used to trigger *Rules*.

Addons are generally not trusted, that's why they cannot connect to the *State Database* directly.
You use `libAddon` instead, which talks to a proxy process ("State Proxy"). That proxy only forwards state updates that match your Addon-ID.

TODO

## Helpers for common protocols

There are {{< details title="a few">}}Helper libraries for more protocols are welcome.{{< /details>}} helper and tool libraries available to ease mapping http endpoints, mqtt topics and coap endpoints to Things and Thing Properties. 

The following examples are in Rust. For the sake of simplicity we assume the same Thing for all three protocols, defined declaratively:

{{< code-toggle file="thing_declarative_example" >}}
'@context':
- https://www.w3.org/2019/wot/td/v1
- https://iot.mozilla.org/schemas
'@type': Lightbulb
actions:
  toggle:
    description: Turn the lamp on or off
events:
  overheating:
    description: Lamp reaches a critical temperature (overheating)
properties:
  on:
    type: boolean
  temperature:
    readOnly: true
    type: string
id: lamp_thing
{{< /code-toggle >}}

### MQTT

We assume an MQTT **state** topic "*light/123/on*" exists for the "on" state, and we send a "false" or "true" command to an MQTT **command** topic "*light/123/on/set*" to switch the lamp on and off. MQTT only supports strings, so booleans are mapped to "true" and "false" strings implicitely.

We further assume an MQTT state topic on "*light/123/temperature*" and a command topic on "*light/123/toggle"

<div class="mb-2">
<tab-container>
  <tab-header>
    <tab-header-item class="tab-active">Rust</tab-header-item>
  </tab-header>
  <tab-body>
<tab-body-item >{{< md >}}
```rust
use ohx::{Thing, ThingBuilder, ThingRegistry, Property, Property::PropertyType, Action};
use language_tags::LanguageTag;

fn define_thing(ctx: &AddonContext) {
  // Define actions ...
  let action_refresh = Action::new("refresh")
    //.handler(action_handler) // more on handlers later in this chapter
    .title(langtag!(en), "Refresh Forecast")
    .description(langtag!(en), "Updates the forecast");

  // ... and properties 
  let property_next12 = Property::new("Next12", PropertyType::Number)
    .type("TemperatureProperty") // optional semantic type, see https://iot.mozilla.org/schemas
    .unit("degree celsius")
    //.handler(property_handler) // a writable property would require a handler
    .title(langtag!(en), "Next 12 hours")
    .description(langtag!(en), "Shows the next 12 hours forecast");

  // ... and configuration

  // Use the Thing builder (builder pattern) and register the Thing
  let thing = ThingDesc::new("Forecast12hoursPeriod", !vec["https://www.w3.org/2019/wot/td/v1", "https://iot.mozilla.org/schemas"]);
  thing.putAction(action_refresh);
  thing.putProperty(property_next12);
  thing.setTitle(langtag!(en), "Forecast for 12 hours")
  thing.setDescription(langtag!(en), "Long description");
  ThingRegistry::publish(ctx, builder.build());
}

fn edit_thing(ctx: &AddonContext) {
  let thing: ThingDesc = ThingRegistry::get(ctx, "Forecast12hoursPeriod").unwrap();
  thing.setTitle(langtag!(en), "Forecast for 12 hours");
  // ...
  thing.putProperty(property_next12);
  ThingRegistry::publish(ctx, thing);
}
```
{{< /md >}}
  </tab-body-item >
  </tab-body>
  </tab-container>
</div>


TODO

### HTTP
TODO

### CoAP

TODO
