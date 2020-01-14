import Matter from 'matter-js/build/matter.min.js';
class Corner {
    constructor(mainPt, sidePt1, sidePt2){
        this.pos = mainPt;
        this.vec1 = Matter.Vector.sub(sidePt1, mainPt);
        this.vec2 = Matter.Vector.sub(sidePt2, mainPt);
    }
}

export {Corner};