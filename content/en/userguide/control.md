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

### Restricting access: IO Service Filter

In a former chapter you have learned about Thing Channel Links and Link Processors to alter data flow between Channels. IO Service Filter are similar. A filter serves as a link between the OHX state (Configured Things, Thing States, Rules etc) and the IO Service. It coodinates data flow and filters data.

A filter is executed with the access token of the IO Service, inheriting all restrictions put on that access token. Optionally it may be coupled to a user account, inheriting all restrictions put on that account. Incoming commands would then act on behalf of that user. Additionally a filter may contain further restrictive rules.

RULES EXAMPLE

Setup multiple filters if you want different filter rules for different users.

MULTIPLE FILTER EXAMPLE

## Hue Apps

You can assign **Channels** to "Rooms", create "Scenes" and use "Timers" and "Rules".

Scenes, Timers and Rules created in Hue Apps are also available to the openHAB X Mobile App
and Dashboard App.

{{< callout title="Hue Apps with different access levels" type="info" >}}
Hue Apps require a pairing procedure.
A pairing in openHAB X is user specific. If you login as the administrator and enable Hue App Pairing,
all connected Apps in that period will act on behalf of the administrator user.

Login as a different user and enable pairing. The Hue App will only see Thing Channels that the specific user is allowed to see and control.
{{< /callout >}}

## openHAB X Mobile App

## Dashboard App

## Amazon Alexa, Google Home, HomeKit

