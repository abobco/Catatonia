import frag from '../shaders/PaletteSwap/paletteSwap.frag'

export class PaletteSwapFilter {
    constructor(texture){
        //texture.mipmap = false;
        this.filter = new PIXI.Filter(null, frag, {Palette: texture });

    }
}