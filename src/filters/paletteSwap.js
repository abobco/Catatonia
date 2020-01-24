export class PaletteSwapFilter {
    constructor(frag, texture){
        //texture.mipmap = false;
        this.filter = new PIXI.Filter(null, frag, {Palette: texture });

    }
}