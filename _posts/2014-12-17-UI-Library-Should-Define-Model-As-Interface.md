---
layout: post
title: UUID
---

## UI library should define model as interface instead of concrete class 

When developing an GUI app, we often write the domain layer and the UI layer, and use controllers to condinate these 2 layers, aka MVC.

A UI library usually has its own defined data model, so does the domain layer. As less relation between these 2 kinds of data models, as the UI library and domain layer more generic.

To achieve this, When designing a UI library, the model should be defined as interfaces instead of concrete classes. Because, to make UI code working with domain layer code, all we need is creating adapers which extends the domain layer model as well as implements the UI data model interfaces.


