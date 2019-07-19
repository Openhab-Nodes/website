+++
title = "Control your Smarthome"
author = "David Graeff"
weight = 60
tags = ["app","control","android","ios"]
+++

So far you have learned how to administer your installation, install new Addons, add automatically discovered Things or configure Things manually. You know how to link and group Things together.

In this chapter you are introduced to different ways on how to control your Smarthome, aside from physical devices like Wall-Switches and buttons.

Because those interfaces, Apps and Digital Assistants have potentially full access to your Things, in contrast to a fixed linked Wall-Switch, in the first section you learn about restricting this access.

Following sections deal with different available Apps for mobile or tablets. The chapter closes with the Cloud Connector service, that allows digitial assistants like Amazon Alexa and Google Home to work.

## About IO Services

The correct term within openHAB X for a service that expose Thing states is **IO Service** (Input/Output Service). OHX comes with a few IO Services on board, additional ones can be installed via the <a class="demolink" href="">Addons</a> page, as described in the [Install Addons &amp; Devices](/userguide/addons) chapter.

Included are:

* A Hue Emulation Service: The service pretends to be a Hue Bridge, exposing Things, Rules, Scenes, Rooms (mapped to Groups), and Timers (mapped to Scheduled Actions). All Apps that support Hue Brigdes will also work with this service.
* A Web of Things (WoT) Service: This implements the WoT specification, exposing all Things, Scenes and Groups.
* HomeKit: This service implements the HomeKit protocol, exposing all Things, Rooms and Scenes to the Apple universe.
* Cloud Connector Service: Exposes Things, Scenes and Groups to an internet real-time communication bus. Amazon Alexa and Google Home are connected to this bus to know about Thing States also also to command Things.

### Security

### Restricting access: State Filter

In a former chapter you have learned about *Thing Connections* and Link Processors to alter data flow between Things. State Filter are similar. A filter serves as a link between the OHX state (Configured Things, Thing States, Rules etc) and the IO Service. It coodinates data flow and filters data.

A filter is executed with the access token of the IO Service, inheriting all restrictions put on that access token. Optionally it may be coupled to a user account, inheriting all restrictions put on that account. Incoming commands would then act on behalf of that user. Additionally a filter may contain further restrictive rules.

RULES EXAMPLE

Setup multiple filters if you want different filter rules for different users.

MULTIPLE FILTER EXAMPLE

## Hue Apps

You can assign **Properties** to "Rooms", create "Scenes" and use "Timers" and "Rules".

Scenes, Timers and Rules created in Hue Apps are also available to the openHAB X Mobile App
and Dashboard App.

{{< callout title="Hue Apps with different access levels" type="info" >}}
Hue Apps require a pairing procedure.
A pairing in openHAB X is user specific. If you login as the administrator and enable Hue App Pairing,
all connected Apps in that period will act on behalf of the administrator user.

Login as a different user and enable pairing. The Hue App will only see Thing Properties that the specific user is allowed to see and control.
{{< /callout >}}

## openHAB X Mobile App


## The Dashboard App

This application is targeting (Wall-mounted) tablets. 

Create multiple dashboards and synchronize them to other devices easily.
A *Dashboard* consists of *Tiles* and Things are rendered as *Tiles* that can be placed and also moved around. The Dashboard APP comes with *Tiles* for all common Thing and Thing Property types. With some knowledge of web technologies you can also create your own *Tiles*.

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