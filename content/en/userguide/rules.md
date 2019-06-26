+++
title = "Making It Smart: Rule engine"
author = "David Graeff"
weight = 110
tags = ["rules"]
+++

Many rules can run in parallel, but only a single instance per each rule is allowed by default.
You may change that for a specific rule by toggling the "Single Instance" switch to off.

If a rule is triggered again, a previous already running instance is stopped first.

## Rule Limitations

Some people may find it weird to start with limitations. It is absolutely necessary though that you understand what **Rules** mean in openHAB X.

Rules follow a very strict Trigger-Condition-Action schema.