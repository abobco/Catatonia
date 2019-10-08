import Matter from 'matter-js/build/matter.min.js';

import {Player} from './player.js';

var NPC = function(rectangle, animationMap) {
    // inheritance call
    Player.call(this, rectangle, animationMap);

    // new data

}

// This is neccessary to inherit functions from parent class
NPC.prototype = Object.create(Player.prototype);
// Have to manually change the constructor back to the defined child class constructor
Object.defineProperty(NPC.prototype, 'constructor', {
    value: NPC, 
    enumerable: false, // so that it does not appear in 'for in' loop
    writable: true 
});