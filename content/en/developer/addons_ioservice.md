+++
title = "Develop IO Services"
author = "David Graeff"
weight = 52
tags = []
+++

An IO Service Addon exposes Things and Thing Channels, making them accessible for other services or home automation systems. An example might be a http REST-like interface to control Things, start and create scenes and setup alarms.
This chapter shows you all operations required to archive this.

## Querying Things and Rules

Thing and Thing Channel States as well as Rules are sensitive information. A user may choose to not share everything with an IO Service for that reason or because he for example just want the lightbulbs exposed to Amazon Alexa and not the electronic door lock.

For accessing Thing and Thing Channel States and Rules the THING_STATES and RULES permission could be acquired. But that is not the idomatic way for an IO Service and will also result in a huge privacy warning notification for the user during addon installation.

Instead, you register your addon as an IO Service and use the 

IO Service Users <--> OHX users mapping

## IO Service Filter

