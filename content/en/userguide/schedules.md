+++
title = "Schedules"
author = "David Graeff"
weight = 100
tags = ["rules","timer","alarm"]
+++


{{< colpic ratio="50" >}}

The <a href="" class="demolink">Scheduler</a> page of the **Setup &amp; Maintenance** interface as well as *Hue App Timer Routines* allow for an intuitive handling of everything time based.

All time related functionality is using the Scheduler. That's why you will spot even core services like for example the scheduled Backup plan of the Backup service in the overview.

The Scheduler supports Triggers for

* absolute points in time,

* relative points in time, once and recurring,
* a powerful syntax for expressing recurring events ([Cron Expressions](#powerful-cron-expressions))

<split>

<img src="/img/features/scheduler.png" class="w-100 pt-3" style="transform: perspective(602px) rotateY(-16deg);box-shadow: 5px 8px 8px 0 rgba(0,0,0,0.15);" title="The Scheduler Editor" alt="The Scheduler Editor">

{{< /colpic >}}

{{< advanced >}} Schedules are implemented as **Rules**. You will get to know *Rules* in the next chapter. What you need to know is that a Rule consists of *Triggers*, *Conditions* and *Actions*. The Scheduler is all about time related *Triggers*.


To understand the capabilities of the Scheduler, this chapter explains different aspects by examples.
It helps if you are already familiar with the textual **Rule** declarative syntax (more in the next chapter). The syntax is very straight forward though and is explained when necessary.

Please note that everything shown here can also be explored and created with the graphical **Rule Editor** and all time-related aspects can also be edited via the **Scheduler Editor**.

## Delay an Action

{{< callout type="info" >}}
#### Motivation

* Switch off a specific light bulb, 5 minutes after it has been switched on.
* A motion sensor turns on all lights in the hallway. The scheduler turns them off if no motion has been registered for five minutes.
{{< /callout >}}

There are two ways to archive this. You can either use the "DelayedToggle" Link Processor, as seen in the [Link Channels](/userguide/linkchannels) Chapter or use a Rule with the `delay` *Rule Module*.

{{< mermaid align="left" context="turnon_delay_turnoff">}}
graph LR;
    A[Wall Push Button] -->|triggers| s_on(Turn on)
	s_on --> delay(Delay, 5 min)
    delay --> s_off(Turn off)
{{< /mermaid >}}

There are no downsides to either approach. Both both appear in the <a href="" class="demolink">Scheduler</a> page and thus allow interaction like stopping or restarting. Both ways allow you to programmatically interfere (via the unique rule id eg `switch_off_after_5_min` and delay action id `a_delay_action`.)

**Note**: A Rule does not run in multiple instances by default. If the light is switched **on** again within the 5 minutes time, the already running rule will be stopped and restarted.


An example rule for a *Thing* `my_light` with the *Channel* `brightness` could be this:

{{< code-toggle file="switch_off_after_5_min">}}
switch_off_after_5_min:
  title: Switch off after 5 Minutes
  tags: # optional
    - auto_off_rule 
  triggers:
     -  id: on_state_change
        type: channelchange
        source: my_light.brightness
        equals: "ON"
  actions:
     -  id: a_delay_action
        type: "delay"
        delay_in_sec: 360
     -  id: turn_off
        type: channelcommand
        target: my_light.brightness
        command: "OFF"
{{< /code-toggle >}}

{{< callout type="warning" >}}
#### New to the Syntax?

If you are not yet familiar with the syntax: What you see is a rule, defined by its unique id `switch_off_after_5_min`.
A title and a tag are assigned, as well as one trigger and two actions. The order of actions is important as it corresponds to the execution order. The `a_delay_action` action therefore executes first and then then `turn_off` action. Triggers, conditions and actions require an id (unique within the rule), a *type* and depending on the type a few more arguments.

{{< /callout >}}

The way the *Rule* above works is that it is basically put on hold while executing the `delay` action. The scheduler will resurrect the *Rule* when it is time.

### Scheduled Actions: Caveats

You may wonder why the rule has been tagged (`tags: [auto_off_rule]`).
The reason is that you are often in the situation where scheduled actions counteract on what you want to archive.
Imagine you want to permanentely switch on the lights in the hallway meaning overriding the motion sensor. The above rule will kick in though and turn the light off again.

You have multiple ways to solve this. For example you can add a *Condition* to `switch_off_after_5_min` that checks for the permenant_on switch.

Below is a solution outlined that enables/disables all rules that are tagged with "auto_off_rule".

{{< mermaid align="left" context="enable_disable_motion">}}
graph LR;
    A[Wall Switch] -->|negated ON/OFF| perm_on(Enable/Disable Motion Rule)
    A -->|ON/OFF| lights_action(Switch on/off light)
{{< /mermaid >}}

{{< code-toggle file="perm_switch_on">}}
perm_switch_on:
  title: Switch lights on permanentely or use automatic mode
  triggers:
     -  id: perm_switch
        type: channelchange
        source: my_wall_switch
  actions:
     -  id: perm_on
        title: (Dis/En)able motion rule
        type: "enabledisable"
        target_by_tag: auto_off_rule
        negate: true
        command: "&perm_switch.value"
     -  id: lights_action
        title: Switch on/off light
        type: channelcommand
        target: my_light.brightness
        command: "&perm_switch.value"
{{< /code-toggle >}}

**Please note**: You would usually use a [Link Channel](/userguide/linkchannels) to connect a switch to a light bulb and the rule would only be responsible to turn off the motion sensor automatic. The ideomatic way is to link channels whenever possible and use rules to add automation.

{{< callout type="warning" >}}
#### New to the Syntax?

For convenience every action has a `negate` argument. If set and applicable, the output will be negated. So instead of Enabling the motion sensor rule, it is disabled when the wall switch is in `ON` position.

Another new encounter is the *Output Reference* (`command: "&perm_switch.value"`).
Instead of assigning a static value as command, the value is taken from the output of the `perm_switch` trigger.
Because the `source` of that trigger is a *Switch* the output is either ON or OFF.

{{< /callout >}}

<!-- style B fill:#f9f,stroke:#333,stroke-width:4px -->

## Time Ranges

The *Scheduler* also supports a "Within" functionality, that triggers if the <u>current</u> time is within the <u>configured</u> time and outputs **ON** and triggers another time with the output **OFF** when the time range has been left.

{{< callout type="info" >}}
#### Motivation
Turn the night-light on between 11pm (23h) and 6am.
{{< /callout >}}


{{< code-toggle file="perm_switch_on">}}
perm_switch_on:
  title: Turn the night-light on between 11pm (23h) and 6am.
  triggers:
     -  id: within_time_range
        type: timerange
        time_start: "23:00"
        time_end: "06:00"
  actions:
     -  id: lights_action
        title: Switch night-light
        type: channelcommand
        target: my_light.brightness
        command: "&within_time_range.value"
{{< /code-toggle >}}

## Powerful Cron Expressions

{{< callout type="info" >}}
#### Motivation
Turn on the garden sprinkler every day at 7 in the morning for 5 minutes in the months from May-Oct.
{{< /callout >}}

This is not hard to implement if you know about CRON expressions.

A CRON expression is a string comprising five or six fields (min hour day month dow [year]) separated by white space that represents a set of times. The star character has the special meaning: Always.

This expression `* * * * * *`" for example means "every minute" (a minute is the smalled period you can express with CRON).

<table class="wikitable"><tbody><tr>
<th>Field
</th>
<th>Required
</th>
<th>Allowed values
</th>
<th>Allowed special characters
</th>
</tr>
<tr>
<td>Minutes
</td>
<td>Yes
</td>
<td>0–59
</td>
<td><code>*</code> <code>,</code> <code>-</code>
</td>
</tr>
<tr>
<td>Hours
</td>
<td>Yes
</td>
<td>0–23
</td>
<td><code>*</code> <code>,</code> <code>-</code>
</td>
</tr>
<tr>
<td>Day of month
</td>
<td>Yes
</td>
<td>1–31
</td>
<td><code>*</code> <code>,</code> <code>-</code> <code>?</code> <code>L</code> <code>W</code>
</td>
</tr>
<tr>
<td>Month
</td>
<td>Yes
</td>
<td>1–12 or JAN–DEC
</td>
<td><code>*</code> <code>,</code> <code>-</code>
</td>
</tr>
<tr>
<td>Day of week
</td>
<td>Yes
</td>
<td>0–6 or SUN–SAT
</td>
<td><code>*</code> <code>,</code> <code>-</code> <code>?</code> <code>L</code> <code>#</code>
</td>
</tr>
<tr>
<td>Year
</td>
<td>No
</td>
<td>1970–2099
</td>
<td><code>*</code> <code>,</code> <code>-</code>
</td>
</tr></tbody></table>

Every field allows multiple comma separated values.
To execute something every hour you say `0 * * * *` and to execute on *15:12* you say `12 15 * * *`. There are multiple cron expression generators in the world wide web and the **Setup &amp; Maintenance** Interface also has a powerful UI, if you don't want to wrap your head around it.

A matching expression for the example above is `5 7 * MAY-OCT` (five minutes after 7, every day in the months May to October). A more sophicated example of the previous one that we are going to implement follows.

{{< callout type="info" >}}
#### Motivation
Turn on the garden sprinkler every day at 7 in the morning in the months from May-Oct. Turn it off after 10 mins if the last 3 days had a mid-day temperature above 30°C otherwise after 5 mins. 
{{< /callout >}}

**Note**: Rule limitations are subject of the next chapter. You just need to know that *Rules* follow the strict Trigger-Condition-Action schema. Control flow options like if-then-else are not supported (an exception are JavaScript code blocks). *Actions* can carry their own *Conditions* and that is what we will basing the implementation on.
