+++
title = "Synergetic effects in using open source projects"
date = "2018-10-10T13:07:31+02:00"
archives = "2018"
tags = ["iot"]
categories = ["lorem"]
author = "David Graeff"
+++

A huge benefit of open source libraries and tools in your software pipeline is the parallel evolution and more code reviews than your own team can ever perform.
A decently documented project can save you a tremendous amount of development hours and costs.
<!--more-->
What does happen though is that your library usecase is not exactly aligned with the original goals and you run into unexpected behaviour within your data domain.
Usually you run into erroneous code paths unveiled by your automated testing.
And this is exactly the time when you or your company should give some love back to the project.

Especially nowadays where a lot of projects have their home on Github, the easy pull request interface on that website allows a patch to be handed in fast and convenient.

[[picture]]

This not only removes the maintainence burden of keeping an own copy of the project,
but if you attach the continuous integration test case, you make sure that kind of error does not happen again and improves the sources code quality.

Watch out for the used license, if your project is propritary. You are generally fine with a MIT, Boost, Apache or Eclipse license.
Those kind of licenses basically require you to list the project, license and author in your legal notices.
A more inconvenient license would be the LGPL, where you are also required to provide the (modified) source code of the used library.

Apart from the license situation, there is a downside, too.
Your code changes might not be approved upstream by the external projects steering commitee or project maintainer which forces you to create a copy (a fork) of that original library.
Sometimes there is not even a single person in charge and the community can't agree on how to proceed with your changes.

If you decide for an open source component, observing and evaluating the development community is strongly advised. In our experience it is still worth considering open source in your next project.
