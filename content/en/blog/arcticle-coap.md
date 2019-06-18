+++
title = "Not inventing the wheel again - The lwM2M protocol"
date = "2015-10-10T13:07:31+02:00"
archives = "2015"
tags = ["iot"]
categories = ["lorem"]
author = "David Graeff"
+++

Every new product cycle starts with defining requirements, think of use-cases and operation conditions leading to a selection of RF and application communication protocols.

On the radio / RF front you have the choice of BLE (Bluetooth Low Energy), Z-Wave, WiFi-ah (HaLow), IEEE 802.15.4 based protocols like Zigbee and Thread and many more.
<!--more-->
As usual selecting one of these is very much depending on the products use-cases. There is no clear winner on the horizon and there might pop up one or another other protocol in the future. For this article we consider IP network layer based solutions like Thread (IPv6 based mesh protocol) and Wi-Fi to be ideal candidates for future products. For one reason, because it is easier to integrate those products into existing IP based networks and at the same time mature available diagnostic tools and understanding of IP networks and network congestions.

## MQTT and CoAP IoT protocols

Looking at the application protocols, the Internet of Things momevent yielded some interesting new protocols.
Some older ones were rediscovered. Two of the most promising for small devices are MQTT and CoAP.

Both MQTT and CoAP:

* Are open standards
* Are better suited to constrained environments than HTTP
* Provide mechanisms for asynchronous communication
* Run on IP
* Have a range of implementations

MQTT is a publish/subscribe messaging protocol designed for lightweight M2M communications and follows a client/server model, where every sensor is a client and connects to a server, known as a broker. MQTT is message oriented. Every message is published to an address, known as a topic. Clients may subscribe to multiple topics. Every client subscribed to a topic receives every message published to the topic.

MQTT does not specify any topics nor does it define any messages. This is actually an issue, because every MQTT enabled product defines its own convention on top and there is no consolidation seen yet.

CoAP follows a client/server model, is designed for interoperability with the web and its packets are much smaller than HTTP TCP flows.
Bitfields and mappings from strings to integers are used extensively to save space.
Packets are UDP based and simple to generate and can be parsed in place without consuming extra RAM in constrained devices.
Retries and reordering are implemented in the application stack and UDP broadcast and multicast can be used for addressing.

CoAP defines a standard mechanism for resource discovery. Servers provide a list of their resources (along with metadata about them) at /.well-known/core. These links are in the application/link-format media type and allow a client to discover what resources are provided and what media types they are.

As with MQTT no resources are pre-defined and every other CoAP enabled device uses it own resource structure.

## lwM2M application protocol

As you can see, the use of standardized protocols does not ensure interoperability on the application layer. Therefore, there is a clear need for being able to communicate using structured data models on top of protocols like CoAP, MQTT or HTTP.

This is were the OMA specified lightweight machine to machine protocol enters the race. It is building on CoAP (and DTLS).
It defines bootstrap and device management, as well as a data model.

### Data model

Each LwM2M client presents a data model - standardized, symbolic representation of its configuration and state that is accessible for reading and modifying by LwM2M Servers. It can be thought of as a combination of a hierarchical configuration file, and a view on statistical information about the device and its environment.

The LwM2M data model is very strictly organized as a three-level tree.
Entities on each of those levels are identified with numerical identifiers. Those three levels are:

* Object - each Object represent some different concept of data accessible via the LwM2M client. For example, separate Objects are defined for managing connections with LwM2M servers, for managing network connections, for accessing data from various types of sensors, etc. Each Object is assigned a unique numerical identifier in the range 0-65535, inclusive. OMA manages a registry of known Object IDs. Each Object defines a set of Resources whose meanings are common for each Object Instance.
* Object Instance - some Objects are described as “single-instance” - such Objects always have exactly one Instance with identifier 0. Examples of such Objects include the Device object which describes the device itself, and the Firmware Update object which is used to perform firmware upgrades. Other Objects may have multiple Instances; sometimes the number of Instances may be variable and the Instances themselves may be creatable via LwM2M. Examples of such Objects include the Object that manages connections to LwM2M Servers, Object that represents optional software packages installed on the device, and Objects representing sensors (whose instances are, however, not creatable). Identifiers for each Instance of such Objects may be arbitrarily chosen in the range 0-65534, inclusive - note that 65535 is reserved and forbidden in this context.
* Resource - each Object Instance of a given Object supports the same set of Resources, as defined by the Object definition. Within a given Object, each Resource ID (which may be in the range 0-65535, inclusive) has a well-defined meaning, and represent the same concept. However, some Resources may not be present in some Object Instances, and, obviously, their values and mapping onto real-world entities may be different.
The numerical identifiers on each of these levels form a path, which is used as the path portion of CoAP URLs. For example, a path /1/2/3 refers to Resource ID=3 in Object Instance ID=2 of Object ID=1. Whole Object Instances (/½) or event Objects (/1) may be referred to using this syntax as well.

## Conclusion

By following the lwm2m standard we can rely on existing library implementations, get application interoperability and a mature testing environment.
We have released an open source library for fast and easy lwm2m application development on https://openhab-nodes.github.io/wakaamaNode/api/about/ with a more in-detail description of lwm2m itself. We hope that a standardized application protocol will ensure sustainable products and powerful control management solutions in the future.
