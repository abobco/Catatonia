import Matter from 'matter-js/build/matter.min.js';

var Corner = function(mainPt, sidePt1, sidePt2) {
    this.pos = mainPt;
    this.vec1 = Matter.Vector.sub(sidePt1, mainPt);
    this.vec2 = Matter.Vector.sub(sidePt2, mainPt);
}

Corner.prototype.constuctor = Corner;
export {Corner};