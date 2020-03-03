# Catatonia
 
Work in progress 2D roguelike platformer browser game. Made with [node.js](https://nodejs.org/en/).

Try the demo [here](www.xabnab.com/cat game/debug/dynamic-shadows/cave/index.html)!

![Demo](gifs/shadow-demo.gif)

## Build your own version:
 Navigate to your clone's directory and install dependencies via `npm`:
 ```
 npm install
 ```
 You can use the [webpack dev server](https://webpack.js.org/configuration/dev-server/) to automatically update your development build every time you save a change. Launch it from your terminal via `npm`:
 ```
 npm run start
 ```
 Your default browser should open a tab to `localhost:8080`, which will automatically refresh every time you save a change.
 
 Finally, build a release bundle to the `dist` folder with:
 ```
 npm run build
 ```
## Dependencies:
* [npm](https://www.npmjs.com/get-npm):  package manager
* [webpack](https://webpack.js.org/guides/getting-started/):  asset bundler 
* [pixi.js](https://www.pixijs.com/):  2D WebGL renderer
* [matter.js](https://www.npmjs.com/package/matter-js):  2D physics engine 
* [rot.js](https://www.npmjs.com/package/rot-js): procedural generation helper library

## Art:
The art for this game was ripped from *Castlevania: Order of Ecclesia*, a Nintendo DS exclusive, originally released by Konami on October 21, 2008. If you like the art in this game, go support Konami and buy that game! 

If you want to make your own project with sprites from this game, you can find them here:
https://www.spriters-resource.com/ds_dsi/castlevaniaorderofecclesia/
