+++
title = "Groups"
author = "David Graeff"
weight = 41
tags = ["group"]
+++

A group is a collection of *Things* (*Thing Channels*) that are turned to the same state.
Groups complements *Scenes*. While a *Scene* turns multiple *Things* (*Thing Channels*) to a predefined state,
a *Group* itself must have a type, like being a Switch, and can hold a state. 

You find *Groups* on the left side menu at the <a class="demolink" href="">Thing</a> page.

A group can receive commands like any other *Thing Channel* and forwards the command to all of its children.

A group computes its own state based on the composite Thing (Thing Channel) states.
You can assign a function, that determines how that state is computed. 

Without restrictions on the group type, the following functions can be used:

* **AND: All state S1 ⊶ S1**<br> If all members have state S1, this group has state S1 else state S2
* **NAND: All state S1 ⊶ S2**<br> If all members have state S1, this group has state S2 else state S1
* **OR: Any state S1 ⊶ S1**<br> If any member is state S1, this group has state S1 else state S2
* **NOR: Any state S1 ⊶ S2**<br> If any member is state S1, this group has state S2 else state S1
* **EQUALITY: Equal**<br> Sets the group state to all members equal state otherwise to UNDEF
* **COUNT: Count**<br> Sets the state to the number of members matching the given regular expression with their states

For number type groups:

* **SUM: Sum**<br> Computes the sum of all group members
* **AVG: Average**<br> Computes the average of all group members
* **MIN: Minimum**<br> Computes the minimum of all group members
* **MAX: Maximum**<br> Computes the maximum of all group members

For date/time type groups:

* **LATEST: latest**<br> Computes the latest of all group members
* **EARLIEST: earliest**<br> Computes the earliest of all group members

The default is: **AND**

## Using Groups

Hue Apps as well as the openHAB X App and Dashboard App present you Groups, next to ordinary Things.
If you semantically tag a Group Thing with a location tag, it will also be recognised as Room by Hue Apps.

