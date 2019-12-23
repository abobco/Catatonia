# Catatonia
 
Work in progress 2D stealth/platformer browser game. Made with [node.js](https://nodejs.org/en/).

Try the demo [here](http://www.xabnab.com/cat%20game/debug/index.html)!

![Demo 1](gifs/cat-demo.gif)

## Build your own version:
 Navigate to your clone's directory and install dependencies via `npm`:
 ```
 npm install
 npm run build
 ```
 Then, host the `dist` folder with an http server and navigate to the `index.html` file in a browser to test your local build of the game. 
 
 If you don't know how to do this, I recommend using the [http-server](https://github.com/http-party/http-server) node package. Install it globally with:
 ```
 npm install http-server -g
 ```
Then, open a new terminal in `path/to/your/clone/dist` and run the command:
```
http-server
```
Finally, navigate to `http://localhost:8080/index.html` in a browser to test your local build of the game.

## Dependencies:
* [npm](https://www.npmjs.com/get-npm):  package manager
* [webpack](https://webpack.js.org/guides/getting-started/):  asset bundler 
* [pixi.js](https://www.pixijs.com/):  2D WebGL renderer
* [matter.js](https://www.npmjs.com/package/matter-js):  2D physics engine 
* [nipplejs](https://www.npmjs.com/package/nipplejs):  virtual joysticks for touch devices
* [rot.js](https://www.npmjs.com/package/rot-js): procedural generation helper library

## Art:
The art for this game was ripped from *Castlevania: Order of Ecclesia*, a Nintendo DS exclusive, originally released by Konami on October 21, 2008. If you like the art in this game, go support Konami and buy that game! 

If you want to make your own project with sprites from this game, you can find them here:
https://www.spriters-resource.com/ds_dsi/castlevaniaorderofecclesia/
