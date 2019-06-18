+++
title = "The beauty of C++ abstractions in the embedded domain"
date = "2015-10-10T13:07:31+02:00"
archives = "2015"
tags = ["iot"]
categories = ["lorem"]
author = "David Graeff"
+++

The question of C++'s suitability for embedded software development stays a hard discussed topic amongst members of both the C and C++ community.
Let me put a disclaimber here, that **Kompound.solutions** is advocating C++ and benefiting from its numeruous langauge features, especially in the embedded domain.
<!--more-->
See [Bjarne Stroustrup "Abstraction and the C++ machine model"](http://www.stroustrup.com/abstraction-and-machine.pdf) for more information.
We do stick to a few in-house rules though and disable or not using parts of the c++ core language, noticably:

* Exceptions: The time needed to handle an exception depends on the distance (measured in function calls) from the throw-point to the catch-point and the number of objects needed to be destroyed on the way. There is also a high probability that generating the backtrace need to access slow disk/flash storage and on top of that Exceptions are also using the free store.
* Runtime polymorphism: This concept can actually be used to avoid large, harder to maintain conditionals. You just need to bear in mind that a conditional jump / indirection will be generated in assembler and sometimes a simple switch that would be converted to a fast jump table is the better choice.
* RTTI (dynamic_cast, type_id): I cannot thing of a usecase where the indeterministic dynamic_cast or object attached run-time type information are of any use in embedded applications. Just avoid / disable them.
* Free store / heap: Allocating data structures like std::function, std::string and most of the containers like std::vector and std::list without a custom allocator will cause heap fragmentation with a deterioration of allocation performance over time. On constrained devices fragmentation can even mean out of memory errors at some point. 

If you avoid mentioned features of the language and std libraries, C++ can help you writing much more elegant
and easier to maintain code while staying as optimal or better than a straigt C implementation.

Let's dive into some C++ abstractions and analyse how they affect generated assembler.
Forced type safety already decreases the likelihood of some classes of errors in the code as we will see throughout this series of articles.
We will explicitely not discuss the object oriented programming concept or design patterns,
but highlight some common issues happing in C, that can be solved by C++s powerful abstraction.

By abstraction as in "abstract", I do not mean "vague" or "imprecise".
The ideal is a one-to-one correspondence between application concepts and precisely defined entities in the source code.
C forces us to ignore "separation of concerns", often by mixing memory management and complex error handling into application code. We want to:
* Represent concepts directly in code
* Represent independent concepts independently in code
* Represent relationships among concepts directly in code
* Combine concepts freely in code when (and only when) combination makes sense
  * Examples of "relationships among concepts" are hierarchies (as used in object-oriented
    programming) parameterized types and algorithms (as used in generic programming). [ICESS'04, B. Stroustrup, 2005]

This article series will span across the following topics over the next weeks:

* **Custom class new/delete operator**: Using the free store on embedded, memory constrained devices is very likely something you want to avoid. Specific data structures (objects) like parsed json trees of an incoming network packet might use dedicated memory, a memory pool, instead to avoid heap fragmentation. Learn how to use class new/delete operators as a convenient, maintainable pattern.
* **Class wrapper for GPIO/Register access**: Accessing and manipulating GPIO registers requires you to manually bit shift and mask or to consider all the invariants like disabling/enabling interrupts. C++ will help you to write a very clean abstraction that is not only so much easier to read but produces also the same assembler as the C solution. 
* **std algorithms (sort, iterate, find)**: Quantify and analyse some C++ std algorithms and C algorithms generated assembler. You might be surprised of the results.
* **View abstractions (std::array, std::array_view, gls::span, std::string_view)**: Avoid errors of the category out of array bounds by using types which do know their lengths.
* **stdext::inplace_function, std::optional, std::expected**: Learn about C++ abstractions that help structuring your control flow. Without using C++ exceptions we need C-like ways of reporting function error conditions. This article is also looking at an alternative to function pointers for callbacks to allow more kinds of Callables like capturing lambdas and function objects without using the free store.
* **C++ template based state machine**: This article presents you a C++ finite state machine (FSM) library. The FSM and individual states are modeled as C++ classes. Although much more elegant and maintainable, the generated assembler is still as efficient as a handcrafted C state machine.

The series might be extended over time. “If it's elegant, flexible, high-level, general, readable, it must be slow and complicated”. Hopefully I was able to show you at least some aspects of C++ that absolutely to not prove this quote. If you have learned a new modern C++ pattern for your next product, even better.
