# Contributing
Disclaimer: This guide on how to contribute is in progress. Any suggestions are welcome.

## Feature documentation
We find it useful to create a feature centric documentation so it could be more useful.
Feature documentation may contain three parts:
* Feature implementation demonstration within Microfleet Demo App
* Feature recipe
* Config reference

### Implement feature within Microfleet Demo App
You may implement the feature in our demo application first, to provide some basic working example. It may be an action 
handler that demonstrates how to use some plugin. It should be covered with necessary and sufficient tests.


1. Clone or fork [Microfleet Demo App repository](https://github.com/microfleet/create-microfleet-app)
2. Implement feature, cover it with tests
3. Make a pull request with description of the feature

### Create a recipe 
You should describe a recipe on how to implement this feature. The recipe should contain a step-by-step guide of 
the implementation. Your experience from implementing it within the demo application could be very helpful.
Otherwise, describe a minimum working scenario. The recipe may also contain the recommendations on how to check if 
you're on the right way, to ensure every step moves you forward. You may also provide a troubleshooting guide for 
implementing this feature.


1. Clone or fork [Microfleet Core repository](https://github.com/microfleet/core)
2. Add a recipe to the [Recipes docs directory](https://github.com/microfleet/core/tree/master/packages/core/docs/recipes)
3. Enlist it into the [Recipes table of contents](https://github.com/microfleet/core/blob/master/packages/core/docs/recipes.md)
4. Make a pull request that states what scope of documentation you have covered

Example: [Quick start recipe](https://github.com/microfleet/core/blob/master/packages/core/docs/recipes/quick-start.md)

### Make necessary config references
After you are done with a recipe, you should ensure every mentioned config setting has at least its description, 
containing the setting name, value type and add links to recipes to provide some feature context.


1. Clone or fork [Microfleet Core repository](https://github.com/microfleet/core)
2. Add a reference to the [References docs directory](https://github.com/microfleet/core/tree/master/packages/core/docs/reference)
They are grouped by plugins. 
3. Enlist it into the [Reference table of contents](https://github.com/microfleet/core/blob/master/packages/core/docs/reference.md)
4. Add links to the recipe and feature implementation pull request if you have made it.
5. Make a pull request that states what scope of documentation you have covered 

Example: [AMQP Plugin config reference](https://github.com/microfleet/core/blob/master/packages/core/docs/reference/service/plugins/amqp.md)

### Full feature documentation example
No really good example yet. Let's make it! 


