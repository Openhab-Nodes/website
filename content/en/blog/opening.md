+++
title = "openHAB X - Smarthome Framework"
date = "2019-05-10T13:07:31+02:00"
archives = "2019"
tags = ["openHAB"]
categories = ["introduction"]
author = "David Graeff"
+++

What if a system programmer with cloud infrastructure experience is getting serious with the Smarthome topic? That is what ignited the idea of the openHAB X project which strives for ease of use for all types of users, beginners, intermediates and professionals with an industry grade robustness and security considered from the beginning.

When I started this project, I already had been a long time contributor to the <a href="https://www.openhab.org">openHAB</a> project. openHAB itself is a Smarthome solution with a welcoming, helpful community and hundreds of Addons. I once decided to give openHAB a go, because of its interesting concepts to unify amongst so many different devices.

Unfortunately openHAB technical debts and insufficiencies makes it not the best of a candidate for a long-running, stable, self-healing system.


I have outlined the differences of openHAB and this project, openHAB X.

Rust, Design Principles.

It's monolithic architecture executes addons in-process, preventing any modern security mechanisms for process isolation, capability or resource restrictions.

Often I have read in the openHAB community that the complex, non-intuitive configuration format is OK, because the subject Smarthome ought to be a complex one anyway. This project proves that the right graphical user interface with options for textual mode please beginners, intermediates and professionals.

Let's learn from design mistakes of the past! openHAB X's greatest ambition is to eliminate the trade-offs that home automation users have accepted for so long by providing safety and productivity, speed and ergonomics.

Give openHAB X a try and see if its choices work for you.
— David Graeff