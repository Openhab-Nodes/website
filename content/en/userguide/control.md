+++
title = "Control your Smarthome"
author = "David Graeff"
weight = 60
tags = ["app","control","android","ios"]
+++

So far you have learned how to administer your installation, install new Addons, add approve discovered Things or configure Things manually. You know how to link and group Things together.

This chapter talks about different ways on how to control your Smarthome, aside from physical devices like Wall-Switches and buttons. Because openHAB X implements the Philips Hue Bridge API, you can use all Hue compatible apps. The native OHX mobile App and the tablet / browser application are introduced in the next sections.

Digitial assistants like Amazon Alexa and Google Home are a perfect way to control your smarthome. Because speech processing happens on Internet servers and those cannot talk directly to your OHX installation
({{< details title="Details" maxwidth="500px" >}}
The reason is that most of the time your ISP is not assigning you a fixed IP (internet Protocol) address and in some regions of the world multiple connections even share a single IP. Routers use Network-Address-Translations (NAT) on top of that, which again splits traffic between your connected devices at home.

That's why a connection is usually established the other way round by the application. openHAB X, connects to an internet service with a well known domain name that can be resolved to an IP address.
{{< /details >}}), the Cloud Connector service is introduced in the following section.


Those interfaces, Apps and Digital Assistants have potentially full access to your Things, in contrast to a fixed Wall-Switch. Do you really want your Alexa to have access to your electronic door lock?
The chapter closes with a few technical background terms. You learn about **State Filters** which allow you to restrict this access.

## Hue Apps

The full spectrum of a Philips Hue bridge is supported. Scenes, Timers, Rules, Rooms and Groups are available. A "Room" is an OHX group that is [tagged](/userguide/tags) with "location".

A Hue "Timer" is an OHX rule tagged that has a relative or absolute time trigger. You will learn about rules in a later chapter. Hue Apps allow you in a very easy and accessible way to create simple time based rules.

Scenes, Timers and Rules created in Hue Apps are also available to the openHAB X Mobile App
and Dashboard App.

{{< callout title="Hue Apps with different access levels" type="info" >}}
Hue Apps require a pairing procedure.
A pairing in openHAB X is user specific. If you login as the administrator and enable Hue App Pairing,
all connected Apps in that period will act on behalf of the administrator user.

Login as a different user and enable pairing. The Hue App will only see Thing Properties that the specific user is allowed to see and control.

Example: Login with the "kids" accout and pair a Hue App. Because kids are not allowed to control the living room TV, that *Thing* will not appear in the just paired Hue app.
{{< /callout >}}

## openHAB X Mobile App

The openHAB X mobile App supports more than just lights and a few sensors like Hue compatible Apps and allow Addon developers to provide own Widgets for Addon specific Things. The OHX authorisation is used to apply user account limits.

The app allows rearrange widgets and group *Things* on different screens. A synchronisation mechanism allows to share widget setups on different mobile devices.

The app is not as animated, polished and colorful as a Hue App though. It is open source however and everyone is invited to improve the App.

## The Dashboard App

This application is targeting (Wall-mounted) tablets. 

Create multiple dashboards and synchronize them to other devices easily.
A *Dashboard* consists of *Tiles* and Things are rendered as *Tiles* that can be placed and also moved around. The Dashboard APP comes with *Tiles* for all common Thing and Thing Property types and Addon developers can provide specific Tiles for their custom Things. With some knowledge of web technologies you can also create your own *Tiles*.

In the configuration screen you can add additional *Tile* repositories, like a github repository of another user.

Theme
: You can select one of the two shipped design themes in the configuration screen or develop your own cascading style sheet (css) based theme and upload it to a github repository.

The default "Home" dashboard has all configured Things displayed.

Things with multiple Thing Properties (like a 2-gang Switch Thing) can be reduced to a single, primary property. If multiple render options exist, for example because an Addon provides a custom *Tile* for a Thing, you can select between them. Things can be added multiple times to a dashboard.

## Amazon Alexa, Google Home

Cloud based assistants require a permanent connection between your openHAB X installation and the cloud infrastructures (either Amazon for Alexa or Google for Google Home).

The *Cloud Connector* service does exactly that. To balance the costs for the permanent connection, a subscription is required. Help out if you think that the price tag can be reduced even more with further engineering.

What you need to do:

* Choose at least the "Basic Subscription" (monthly based)
* Register your openHAB X installation here on https://www.openhabx.com in the login area.

### Amazon Alexa

* Open the Alexa App on your phone or head to the Amazon Alexa Website and install the Alexa App "openHAB X".
* Pair the "openHAB X Alexa App" to your account on https://www.openhabx.com. Instructions are found within the app.

That's it. Ask Alexa to find devices and she will discover all your (so far) configured Things. Alexa periodically (usually daily) checks for new devices, so even future Things will be available.

## IO Services

The correct term within openHAB X for a service that expose Things is **IO Service** (Input/Output Service). OHX comes with a few IO Services on board, additional ones can be installed via the <a class="demolink" href="">Addons</a> page, as described in the [Install Addons &amp; Devices](/userguide/addons) chapter.

Included are:

* A Hue Emulation Service: The service offers the same software interface like a Philips Hue Bridge, exposing Things, Rules, Scenes, Rooms (mapped to Groups), and Timers (mapped to Scheduled Actions). All Apps that support Hue Brigdes will also work with this service.
* A Web of Things (WoT) Service: This implements the [WoT API](https://iot.mozilla.org/wot/) specification, exposing all Things, Scenes and Groups. This is used by the native mobile and dashboard App of openHAB X.
* HomeKit: This service implements the HomeKit protocol, exposing all Things, Rooms and Scenes to the Apple universe.
* Cloud Connector Service: Exposes Things, Scenes and Groups to an internet real-time communication bus. Amazon Alexa and Google Home are connected to this bus to know about Thing States and also to command Things.

### State Filter

The data flow between the OHX state (Configured Things, Thing States, Rules etc) and the IO Service are constrained and controlled by filters. Those are called **State Filters** and configured on the <a class="demolink" href="">Maintenance</a> page in the sub-section "IO Services".

By default a pass-through State Filter is used if no filter is set up, meaning that an IO Service after installation and configuration has access to all Things.

{{< mermaid align="left" context="state_filter_pass">}}
graph LR;
    thing[Lightbulb Thing] -->|on| filter(Pass-through)
	filter -->|on| ioservice(Hue App)
{{< /mermaid >}}

A filter consists of:

* The type "Whitelist" or "blacklist",
* a [regular expression](https://regex101.com/),
* a target property. The target property is any of "title", "propertyid", "thingid", "addonid", "canonicalid".

A "whitelist" filter explicitely states which *Things* to expose to the IO Service. Whitelist entries are accumulative (for each user separately though).
A "blacklist" filter lists *Things* that must be hidden from an IO Service. Blacklist entries dominate over whitelist entries.

Additional restrictions
: A filter always belongs to the user account that has created the filter and all *Thing* visibility restrictions of that user are also taken into account. That means that a user created whitelist filter for all "light" *Things* has no affect, if that user is not allowed to interact with "light" Things. The administrator can create user-independant filters as an exception.

### Commands

Commands coming from the IO Service destinated at openHAB X ("Switch kitchen ceiling light on") also need to pass the filter system. If the filter for example only allows Things of the living room to be controlled, nothing happens.

{{< mermaid align="left" context="state_filter_cmds">}}
graph LR;
    ioservice(Hue App) -->|"kitchen_ceiling:on"| filter("Filter: .*livingroom.*")
	filter .->|xxx| thing[Lightbulb Thing]
{{< /mermaid >}}

### Example filters

Some example filter configurations are listed below. Again, please have in mind that such configurations are user account specific. If user "Bob" creates a filter to only catch light Things and later on connects with the openHAB X app, he gets all light Things listed. But "Alice" will still see the default Things (all) after connecting with her account.

Only allow Things from Addons that contain "weather" in their ID:

{{< code-toggle file="thing_declarative_example5" class="code-toggle-200 mb-4" >}}
filter:
- regex: ".*weather.*"
  target: addonid
  type: whitelist
{{< /code-toggle >}}

Hide all lock Things:

{{< code-toggle file="thing_declarative_example5" class="code-toggle-200 mb-4" >}}
filter:
- regex: ".*lock.*"
  target: thingid
  type: blacklist
- regex: ".*lock.*"
  target: title
  type: blacklist
{{< /code-toggle >}}
